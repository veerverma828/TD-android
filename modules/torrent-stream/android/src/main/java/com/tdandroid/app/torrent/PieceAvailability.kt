package com.tdandroid.app.torrent

import org.libtorrent4j.TorrentHandle
import org.libtorrent4j.TorrentInfo

// Shared between the HTTP server (how much can I serve right now?) and the engine
// (has enough buffered to start playing?). Both previously either duplicated this
// or got it subtly wrong.
internal object PieceAvailability {

    // Contiguous readable bytes starting at `fromByteInFile`.
    //
    // The important word is *from*: the previous implementation always scanned from
    // the file's first piece, so availability was really "contiguous bytes from byte
    // 0". After a seek that reads as ~nothing available at the seek target even once
    // those pieces have landed, and the reader stalls until every piece before the
    // seek point downloads too - i.e. seeking forward in a partially-downloaded file
    // could never work.
    fun contiguousBytesFrom(
        handle: TorrentHandle,
        torrentInfo: TorrentInfo,
        fileIndex: Int,
        fromByteInFile: Long,
    ): Long {
        val pieceLength = torrentInfo.pieceLength()
        if (pieceLength <= 0) return 0L
        val fileSize = torrentInfo.files().fileSize(fileIndex)
        if (fromByteInFile < 0 || fromByteInFile >= fileSize) return 0L

        // Plain status() leaves the piece bitfield unpopulated (zero-length) - indexing
        // into it then segfaults native-side (SIGSEGV in bitfield_get_bit) instead of
        // throwing. QUERY_PIECES is required to actually get a piece bitmap back.
        val pieces = handle.status(TorrentHandle.QUERY_PIECES).pieces()
        // getBit() on an out-of-range index is a native OOB read (SIGSEGV, not a
        // catchable exception) - bail out to "nothing available yet" instead of
        // trusting the bitfield is sized to numPieces() on every call.
        if (pieces.isEmpty || pieces.size() <= 0) return 0L

        val fileOffset = torrentInfo.files().fileOffset(fileIndex)
        val lastPiece = torrentInfo.files().lastPieceIndexAtFile(fileIndex)
        val maxPiece = minOf(lastPiece, pieces.size() - 1)

        val absoluteStart = fileOffset + fromByteInFile
        var pieceIdx = (absoluteStart / pieceLength).toInt()
        if (pieceIdx > maxPiece) return 0L
        // The piece covering the requested byte must itself be present, otherwise
        // nothing is readable here no matter what follows it.
        if (!pieces.getBit(pieceIdx)) return 0L

        while (pieceIdx <= maxPiece && pieces.getBit(pieceIdx)) pieceIdx++
        val boundaryAbsolute = pieceIdx.toLong() * pieceLength
        val availableEndInFile = (boundaryAbsolute - fileOffset).coerceAtMost(fileSize)
        return (availableEndInFile - fromByteInFile).coerceAtLeast(0L)
    }

    // How many of the next `windowPieces` pieces starting at `fromByteInFile` are
    // present. Used to decide "buffered enough to hand this to the player".
    fun windowProgress(
        handle: TorrentHandle,
        torrentInfo: TorrentInfo,
        fileIndex: Int,
        fromByteInFile: Long,
        windowPieces: Int,
    ): Pair<Int, Int> {
        val pieceLength = torrentInfo.pieceLength()
        if (pieceLength <= 0) return 0 to 0
        val pieces = handle.status(TorrentHandle.QUERY_PIECES).pieces()
        if (pieces.isEmpty || pieces.size() <= 0) return 0 to 0

        val fileOffset = torrentInfo.files().fileOffset(fileIndex)
        val lastPiece = torrentInfo.files().lastPieceIndexAtFile(fileIndex)
        val maxPiece = minOf(lastPiece, pieces.size() - 1)
        val startPiece = ((fileOffset + fromByteInFile) / pieceLength).toInt()
        if (startPiece > maxPiece) return 0 to 0

        val endPiece = minOf(startPiece + windowPieces - 1, maxPiece)
        var have = 0
        var total = 0
        for (p in startPiece..endPiece) {
            total++
            if (pieces.getBit(p)) have++
        }
        return have to total
    }
}
