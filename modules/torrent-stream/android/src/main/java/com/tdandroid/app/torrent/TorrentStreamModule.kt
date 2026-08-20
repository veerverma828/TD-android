package com.tdandroid.app.torrent

import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.util.concurrent.Executors

class TorrentStreamModule : Module() {

    // Resolving a magnet legitimately blocks for tens of seconds. Running that on
    // Expo's shared module executor would occupy a worker other modules need, so
    // torrent work gets its own single thread - which also enforces the engine's
    // one-operation-at-a-time model for free.
    private val ioExecutor = Executors.newSingleThreadExecutor { r ->
        Thread(r, "torrent-engine").apply { isDaemon = true }
    }

    override fun definition() = ModuleDefinition {
        Name("TorrentStream")

        Events("torrentProgress")

        OnCreate {
            TorrentEngine.attachContext(appContext.reactContext)
        }

        OnDestroy {
            ioExecutor.shutdownNow()
        }

        AsyncFunction("getFiles") { magnetUri: String, promise: Promise ->
            submit(promise) {
                val context = appContext.reactContext
                TorrentEngine.attachContext(context)
                val tempDir = File(context?.cacheDir, "torrent-stream")
                val (torrentId, files, name) = TorrentEngine.fetchFiles(magnetUri, tempDir, ::emitProgress)
                mapOf(
                    "torrentId" to torrentId,
                    "name" to name,
                    "files" to files.map { f ->
                        mapOf("id" to f.index, "name" to f.name, "size" to f.size)
                    },
                )
            }
        }

        AsyncFunction("startStream") { torrentId: String, fileId: Int, promise: Promise ->
            submit(promise) {
                TorrentEngine.startStream(torrentId, fileId, ::emitProgress)
            }
        }

        // Aborts an in-flight resolve/buffer without tearing the session down, so the
        // next attempt still benefits from the warmed-up DHT routing table.
        AsyncFunction("cancel") {
            TorrentEngine.cancel()
        }

        AsyncFunction("stop") { promise: Promise ->
            // Cancel synchronously, tear down on the worker. The teardown itself has to
            // queue behind whatever is already running on ioExecutor, so if the cancel
            // were queued too it would only take effect *after* the in-flight resolve
            // ran to completion - i.e. closing the player would still wait out a full
            // metadata timeout before anything actually stopped.
            TorrentEngine.cancel()
            submit(promise) {
                TorrentEngine.stop()
                null
            }
        }

        AsyncFunction("diagnostics") {
            TorrentEngine.diagnosticsSnapshot()
        }
    }

    private fun submit(promise: Promise, block: () -> Any?) {
        ioExecutor.execute {
            try {
                promise.resolve(block())
            } catch (e: StreamNotReadyException) {
                // Carry the classification through to JS so the UI can decide whether
                // to offer "retry", "pick another source", or a network hint - rather
                // than showing the same dead-end string for every failure.
                promise.reject(
                    CodedException(
                        "ERR_TORRENT_${e.code.name}",
                        listOfNotNull(e.message, e.diagnostics?.let { "[$it]" }).joinToString(" "),
                        e,
                    )
                )
            } catch (e: Throwable) {
                promise.reject(CodedException("ERR_TORRENT_INTERNAL", e.message ?: "Torrent engine failed", e))
            }
        }
    }

    private fun emitProgress(progress: TorrentProgress) {
        try {
            sendEvent(
                "torrentProgress",
                mapOf(
                    "phase" to progress.phase,
                    "message" to progress.message,
                    "peers" to progress.peers,
                    "seeds" to progress.seeds,
                    "dhtNodes" to progress.dhtNodes.toDouble(),
                    "progress" to progress.progress,
                    "downloadRate" to progress.downloadRate.toDouble(),
                ),
            )
        } catch (_: Throwable) {
            // Progress is advisory - never let a dead JS bridge fail the download.
        }
    }
}
