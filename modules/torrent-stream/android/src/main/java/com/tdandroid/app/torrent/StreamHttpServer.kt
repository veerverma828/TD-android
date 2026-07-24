package com.tdandroid.app.torrent

import android.util.Log
import org.libtorrent4j.TorrentHandle
import org.libtorrent4j.TorrentInfo
import java.io.File
import java.io.IOException
import java.io.OutputStream
import java.io.RandomAccessFile
import java.net.InetAddress
import java.net.ServerSocket
import java.net.Socket
import java.util.concurrent.Executors

private const val TAG = "StreamHttpServer"

// How long pumpFile() will wait for playback to reach a byte range that hasn't
// downloaded yet before giving up on the response and letting ExoPlayer retry.
private const val PIECE_STALL_TIMEOUT_MS = 60_000L
private const val PIECE_POLL_INTERVAL_MS = 150L

// How many pieces ahead of a request get an urgent deadline - covers a couple of
// ExoPlayer read-aheads without starving the rest of the sequential download.
private const val PRIORITY_WINDOW_PIECES = 12

private class ActiveStream(
    val handle: TorrentHandle,
    val torrentInfo: TorrentInfo,
    val fileIndex: Int,
    val filePath: File,
)

// Loopback-only HTTP/1.1 server that serves a single "currently playing" torrent
// file straight off disk as libtorrent writes it, honoring Range requests so
// ExoPlayer can seek. Not a general web server - one fixed /stream path, one
// active file at a time, matching this app's single-player-at-once model.
class StreamHttpServer {
    private val serverSocket = ServerSocket(0, 8, InetAddress.getByName("127.0.0.1"))
    private val pool = Executors.newCachedThreadPool()
    @Volatile private var running = false
    @Volatile private var active: ActiveStream? = null

    val port: Int get() = serverSocket.localPort
    val isAlive: Boolean get() = running

    fun start() {
        running = true
        Thread({
            while (running) {
                val socket = try {
                    serverSocket.accept()
                } catch (e: IOException) {
                    if (running) Log.w(TAG, "accept() failed", e)
                    continue
                }
                pool.execute { handleClient(socket) }
            }
        }, "torrent-http-accept").apply { isDaemon = true; start() }
    }

    fun setActiveStream(handle: TorrentHandle, torrentInfo: TorrentInfo, fileIndex: Int, saveDir: File) {
        val path = File(torrentInfo.files().filePath(fileIndex, saveDir.absolutePath))
        active = ActiveStream(handle, torrentInfo, fileIndex, path)
    }

    fun stop() {
        running = false
        active = null
        try {
            serverSocket.close()
        } catch (_: IOException) {
        }
        pool.shutdownNow()
    }

    private fun handleClient(socket: Socket) {
        try {
            val input = socket.getInputStream().bufferedReader(Charsets.ISO_8859_1)
            val requestLine = input.readLine() ?: return
            val headers = mutableMapOf<String, String>()
            while (true) {
                val line = input.readLine() ?: break
                if (line.isEmpty()) break
                val idx = line.indexOf(':')
                if (idx > 0) headers[line.substring(0, idx).trim().lowercase()] = line.substring(idx + 1).trim()
            }

            val stream = active
            val output = socket.getOutputStream()
            if (stream == null) {
                writeStatus(output, 503, "Service Unavailable")
                return
            }

            val fileSize = stream.torrentInfo.files().fileSize(stream.fileIndex)
            var rangeStart = 0L
            var rangeEnd = fileSize - 1
            var isPartial = false
            val rangeHeader = headers["range"]
            if (rangeHeader != null && rangeHeader.startsWith("bytes=")) {
                val parts = rangeHeader.removePrefix("bytes=").split("-")
                rangeStart = parts.getOrNull(0)?.takeIf { it.isNotEmpty() }?.toLongOrNull() ?: 0L
                rangeEnd = parts.getOrNull(1)?.takeIf { it.isNotEmpty() }?.toLongOrNull() ?: (fileSize - 1)
                isPartial = true
            }
            if (rangeEnd >= fileSize) rangeEnd = fileSize - 1
            if (rangeStart < 0 || rangeStart > rangeEnd) {
                writeStatus(output, 416, "Range Not Satisfiable", mapOf("Content-Range" to "bytes */$fileSize"))
                return
            }

            val contentLength = rangeEnd - rangeStart + 1
            val contentType = guessContentType(stream.filePath.name)
            if (isPartial) {
                writeStatus(
                    output, 206, "Partial Content", mapOf(
                        "Content-Range" to "bytes $rangeStart-$rangeEnd/$fileSize",
                        "Content-Length" to contentLength.toString(),
                        "Accept-Ranges" to "bytes",
                        "Content-Type" to contentType,
                        "Connection" to "close",
                    )
                )
            } else {
                writeStatus(
                    output, 200, "OK", mapOf(
                        "Content-Length" to contentLength.toString(),
                        "Accept-Ranges" to "bytes",
                        "Content-Type" to contentType,
                        "Connection" to "close",
                    )
                )
            }
            if (requestLine.startsWith("HEAD")) return

            pumpFile(output, stream, rangeStart, rangeEnd)
        } catch (_: IOException) {
            // Client disconnected or seeked away mid-response - not an error.
        } finally {
            try {
                socket.close()
            } catch (_: IOException) {
            }
        }
    }

    private fun pumpFile(output: OutputStream, stream: ActiveStream, start: Long, endInclusive: Long) {
        val pieceLength = stream.torrentInfo.pieceLength()
        val fileOffsetInTorrent = stream.torrentInfo.files().fileOffset(stream.fileIndex)
        val lastPiece = stream.torrentInfo.files().lastPieceIndexAtFile(stream.fileIndex)

        // One prioritization burst per request (i.e. per seek) - not per poll tick -
        // so we boost the requested region once and then just wait for it to land.
        prioritize(stream, fileOffsetInTorrent, pieceLength, start)

        RandomAccessFile(stream.filePath, "r").use { raf ->
            var pos = start
            val buffer = ByteArray(64 * 1024)
            var stallStartedAt = 0L
            while (pos <= endInclusive) {
                val available = availableContiguousBytes(stream, fileOffsetInTorrent, pieceLength, lastPiece)
                if (pos >= available) {
                    if (stallStartedAt == 0L) stallStartedAt = System.currentTimeMillis()
                    if (System.currentTimeMillis() - stallStartedAt > PIECE_STALL_TIMEOUT_MS) {
                        throw IOException("Timed out waiting for torrent data at offset $pos")
                    }
                    Thread.sleep(PIECE_POLL_INTERVAL_MS)
                    continue
                }
                stallStartedAt = 0L
                val toRead = minOf(buffer.size.toLong(), endInclusive - pos + 1, available - pos).toInt()
                if (toRead <= 0) continue
                raf.seek(pos)
                val read = raf.read(buffer, 0, toRead)
                if (read <= 0) continue
                output.write(buffer, 0, read)
                pos += read
            }
            output.flush()
        }
    }

    // Contiguous bytes readable from the start of the file, i.e. up to (but not
    // including) the first not-yet-downloaded piece that overlaps this file.
    private fun availableContiguousBytes(stream: ActiveStream, fileOffsetInTorrent: Long, pieceLength: Int, lastPiece: Int): Long {
        // Plain status() leaves the piece bitfield unpopulated (zero-length) - indexing
        // into it then segfaults native-side (SIGSEGV in bitfield_get_bit) instead of
        // throwing. QUERY_PIECES is required to actually get a piece bitmap back.
        val pieces = stream.handle.status(TorrentHandle.QUERY_PIECES).pieces()
        // getBit() on an out-of-range index is a native OOB read (SIGSEGV, not a
        // catchable exception) - bail out to "nothing available yet" instead of
        // trusting the bitfield is sized to numPieces() on every call.
        if (pieces.isEmpty || pieces.size() <= 0) return 0L
        var pieceIdx = (fileOffsetInTorrent / pieceLength).toInt()
        val maxPiece = minOf(lastPiece, pieces.size() - 1)
        while (pieceIdx <= maxPiece && pieces.getBit(pieceIdx)) pieceIdx++
        val boundary = pieceIdx.toLong() * pieceLength
        val fileSize = stream.torrentInfo.files().fileSize(stream.fileIndex)
        return (boundary - fileOffsetInTorrent).coerceIn(0, fileSize)
    }

    private fun prioritize(stream: ActiveStream, fileOffsetInTorrent: Long, pieceLength: Int, atByte: Long) {
        try {
            val pieceIdx = ((fileOffsetInTorrent + atByte) / pieceLength).toInt()
            stream.handle.clearPieceDeadlines()
            var deadline = 0
            for (p in pieceIdx..(pieceIdx + PRIORITY_WINDOW_PIECES)) {
                stream.handle.setPieceDeadline(p, deadline)
                deadline += 200
            }
        } catch (e: Exception) {
            Log.w(TAG, "piece prioritization failed", e)
        }
    }

    private fun writeStatus(output: OutputStream, code: Int, reason: String, headers: Map<String, String> = emptyMap()) {
        val sb = StringBuilder()
        sb.append("HTTP/1.1 $code $reason\r\n")
        headers.forEach { (k, v) -> sb.append("$k: $v\r\n") }
        sb.append("\r\n")
        output.write(sb.toString().toByteArray(Charsets.ISO_8859_1))
        output.flush()
    }

    private fun guessContentType(fileName: String): String = when (fileName.substringAfterLast('.', "").lowercase()) {
        "mkv" -> "video/x-matroska"
        "mp4", "m4v" -> "video/mp4"
        "avi" -> "video/x-msvideo"
        "webm" -> "video/webm"
        "ts" -> "video/mp2t"
        else -> "application/octet-stream"
    }
}
