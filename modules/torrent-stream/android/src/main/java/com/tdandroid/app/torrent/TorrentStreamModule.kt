package com.tdandroid.app.torrent

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class TorrentStreamModule : Module() {

    override fun definition() = ModuleDefinition {
        Name("TorrentStream")

        AsyncFunction("getFiles") { magnetUri: String ->
            val tempDir = File(appContext.reactContext?.cacheDir, "torrent-stream")
            val (torrentId, files) = TorrentEngine.fetchFiles(magnetUri, tempDir)
            mapOf(
                "torrentId" to torrentId,
                "files" to files.map { f ->
                    mapOf("id" to f.index, "name" to f.name, "size" to f.size)
                },
            )
        }

        AsyncFunction("startStream") { torrentId: String, fileId: Int ->
            TorrentEngine.startStream(torrentId, fileId)
        }

        AsyncFunction("stop") {
            TorrentEngine.stop()
        }
    }
}
