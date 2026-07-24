package com.tdandroid.app.torrent

import org.libtorrent4j.AlertListener
import org.libtorrent4j.Priority
import org.libtorrent4j.SessionManager
import org.libtorrent4j.TorrentFlags
import org.libtorrent4j.TorrentHandle
import org.libtorrent4j.TorrentInfo
import org.libtorrent4j.alerts.AddTorrentAlert
import org.libtorrent4j.alerts.Alert
import org.libtorrent4j.alerts.AlertType
import java.io.File
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

class StreamNotReadyException(message: String) : Exception(message)

data class TorrentStreamFile(val index: Int, val name: String, val size: Long)

private class TorrentSession(val torrentInfo: TorrentInfo, val saveDir: File)

// Single-flight P2P engine: exactly one SessionManager and one active HTTP stream
// server for the whole app, matching the app's "one thing plays at a time" model.
// A real BitTorrent swarm (DHT + peers), not a debrid API - fetchFiles() resolves
// magnet metadata from the swarm itself, startStream() downloads sequentially and
// hands back a local HTTP URL the existing ExoPlayer pipeline can play directly.
object TorrentEngine {
    private const val METADATA_TIMEOUT_SECONDS = 30
    private const val ADD_TORRENT_TIMEOUT_SECONDS = 15L

    private var session: SessionManager? = null
    private val sessions = ConcurrentHashMap<String, TorrentSession>()
    private var httpServer: StreamHttpServer? = null

    @Synchronized
    private fun ensureStarted(): SessionManager {
        val existing = session
        if (existing != null && existing.isRunning) return existing
        val s = SessionManager()
        s.start()
        session = s
        return s
    }

    // Resolves magnet -> torrent metadata via DHT/peers (no download yet) and
    // caches it keyed by infohash so startStream() can look it up by that same key.
    @Synchronized
    fun fetchFiles(magnetUri: String, tempDir: File): Pair<String, List<TorrentStreamFile>> {
        val s = ensureStarted()
        tempDir.mkdirs()
        val data = s.fetchMagnet(magnetUri, METADATA_TIMEOUT_SECONDS, tempDir)
            ?: throw StreamNotReadyException("Couldn't find this torrent on the network (no peers/DHT nodes responded in time). Try again.")
        val ti = TorrentInfo.bdecode(data)
        val infoHash = ti.infoHash().toHex()
        sessions[infoHash] = TorrentSession(ti, File(tempDir, infoHash))
        val files = (0 until ti.numFiles()).map { i ->
            TorrentStreamFile(i, ti.files().fileName(i), ti.files().fileSize(i))
        }
        return infoHash to files
    }

    @Synchronized
    fun startStream(infoHash: String, fileIndex: Int): String {
        val s = ensureStarted()
        val ts = sessions[infoHash]
            ?: throw StreamNotReadyException("Unknown torrent - fetch its file list again.")
        val ti = ts.torrentInfo
        if (fileIndex < 0 || fileIndex >= ti.numFiles()) {
            throw StreamNotReadyException("Invalid file selection.")
        }
        ts.saveDir.mkdirs()

        val priorities = Priority.array(Priority.IGNORE, ti.numFiles())
        priorities[fileIndex] = Priority.TOP_PRIORITY

        var handle = s.find(ti.infoHash())
        if (handle == null || !handle.isValid) {
            val latch = CountDownLatch(1)
            val handleRef = AtomicReference<TorrentHandle>()
            val listener = object : AlertListener {
                override fun types(): IntArray? = null
                override fun alert(alert: Alert<*>) {
                    if (alert.type() == AlertType.ADD_TORRENT) {
                        val added = (alert as AddTorrentAlert).handle()
                        if (added.infoHash() == ti.infoHash()) {
                            handleRef.set(added)
                            latch.countDown()
                        }
                    }
                }
            }
            s.addListener(listener)
            try {
                s.download(ti, ts.saveDir, null, priorities, null, TorrentFlags.SEQUENTIAL_DOWNLOAD)
                latch.await(ADD_TORRENT_TIMEOUT_SECONDS, TimeUnit.SECONDS)
            } finally {
                s.removeListener(listener)
            }
            handle = handleRef.get() ?: s.find(ti.infoHash())
        }
        if (handle == null || !handle.isValid) {
            throw StreamNotReadyException("Failed to start downloading this torrent.")
        }

        // Re-assert selection every call: covers both a brand new torrent and the
        // user picking a different file from one that's already added.
        handle.prioritizeFiles(priorities)
        handle.resume()

        var server = httpServer
        if (server == null || !server.isAlive) {
            server = StreamHttpServer()
            server.start()
            httpServer = server
        }
        server.setActiveStream(handle, ti, fileIndex, ts.saveDir)
        return "http://127.0.0.1:${server.port}/stream"
    }

    @Synchronized
    fun stop() {
        httpServer?.stop()
        httpServer = null
        session?.stop()
        session = null
        sessions.clear()
    }
}
