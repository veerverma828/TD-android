package com.tdandroid.app.torrent

import android.content.Context
import android.util.Log
import org.libtorrent4j.AddTorrentParams
import org.libtorrent4j.AlertListener
import org.libtorrent4j.AnnounceEntry
import org.libtorrent4j.Priority
import org.libtorrent4j.SessionManager
import org.libtorrent4j.SessionParams
import org.libtorrent4j.TorrentFlags
import org.libtorrent4j.TorrentHandle
import org.libtorrent4j.TorrentInfo
import org.libtorrent4j.alerts.Alert
import org.libtorrent4j.alerts.AlertType
import org.libtorrent4j.alerts.TorrentAlert
import org.libtorrent4j.alerts.TrackerAlert
import org.libtorrent4j.swig.error_code
import java.io.File
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong
import java.util.concurrent.locks.ReentrantLock
import kotlin.concurrent.withLock

private const val TAG = "TorrentEngine"

data class TorrentStreamFile(val index: Int, val name: String, val size: Long)

// Streamed to JS while a resolve/buffer is in flight. The old implementation showed
// one static "Finding torrent..." string for up to 30 seconds and then failed, which
// is indistinguishable from a hang - this carries enough detail for the UI to prove
// progress is being made (or to show honestly that it isn't).
data class TorrentProgress(
    val phase: String,
    val message: String,
    val peers: Int = 0,
    val seeds: Int = 0,
    val dhtNodes: Long = 0,
    val progress: Double = 0.0,
    val downloadRate: Long = 0,
)

typealias ProgressSink = (TorrentProgress) -> Unit

private class ResolvedTorrent(
    val torrentInfo: TorrentInfo,
    val saveDir: File,
    @Volatile var handle: TorrentHandle?,
)

// Tracks the handful of swarm facts that TorrentStatus doesn't expose. Registered
// once for the session's lifetime; everything else is polled off the handle, which
// avoids trying to keep a parallel copy of state libtorrent already owns.
private class SwarmObserver : AlertListener {
    @Volatile var dhtBootstrapped = false
    private val trackersReplied = ConcurrentHashMap.newKeySet<String>()
    private val trackersErrored = ConcurrentHashMap.newKeySet<String>()

    override fun types(): IntArray? = null

    override fun alert(alert: Alert<*>) {
        try {
            when (alert.type()) {
                AlertType.DHT_BOOTSTRAP -> dhtBootstrapped = true
                AlertType.TRACKER_REPLY -> key(alert)?.let { trackersReplied.add(it) }
                AlertType.TRACKER_ERROR -> key(alert)?.let { trackersErrored.add(it) }
                else -> {}
            }
        } catch (e: Exception) {
            // Alert dispatch runs on libtorrent's own thread; an exception escaping
            // here takes down alert delivery for the whole session.
            Log.w(TAG, "alert handling failed", e)
        }
    }

    private fun key(alert: Alert<*>): String? {
        val tracker = (alert as? TrackerAlert<*>)?.trackerUrl() ?: return null
        val handle = (alert as? TorrentAlert<*>)?.handle() ?: return null
        if (!handle.isValid) return null
        return "${handle.infoHash().toHex()}|$tracker"
    }

    fun repliedFor(infoHash: String) = trackersReplied.count { it.startsWith("$infoHash|") }
    fun erroredFor(infoHash: String) = trackersErrored.count { it.startsWith("$infoHash|") }

    fun reset() {
        trackersReplied.clear()
        trackersErrored.clear()
        dhtBootstrapped = false
    }
}

// Single-flight P2P engine: exactly one SessionManager and one active HTTP stream
// server for the whole app, matching the app's "one thing plays at a time" model.
// A real BitTorrent swarm (DHT + peers), not a debrid API - fetchFiles() resolves
// magnet metadata from the swarm itself, startStream() downloads sequentially and
// hands back a local HTTP URL the existing ExoPlayer pipeline can play directly.
object TorrentEngine {

    // Metadata resolution budget per attempt. Generous, but never spent idle: the
    // escalation ladder below fires throughout, and progress is reported the whole
    // time so the user can cancel instead of staring at a spinner.
    private const val METADATA_TIMEOUT_MS = 45_000L
    private const val METADATA_ATTEMPTS = 2

    // Escalation points inside a single attempt.
    private const val ESCALATE_REANNOUNCE_MS = 6_000L
    private const val ESCALATE_FORCE_MS = 16_000L

    // A cold DHT has an empty routing table; issuing a lookup against it immediately
    // is what burns most of a naive 30s budget. Wait briefly for the routing table to
    // populate - but never hard-fail on it, because trackers alone can carry a torrent.
    private const val DHT_WARMUP_TIMEOUT_MS = 8_000L
    private const val DHT_MIN_NODES = 10L

    private const val PREBUFFER_TIMEOUT_MS = 60_000L
    private const val PREBUFFER_TARGET_BYTES = 2L * 1024 * 1024
    private const val PREBUFFER_MIN_PIECES = 3
    // If not one peer has connected this long into buffering, more waiting won't help.
    private const val PREBUFFER_NO_PEER_GRACE_MS = 25_000L

    private const val POLL_INTERVAL_MS = 250L

    private val lifecycleLock = ReentrantLock()
    private val torrents = ConcurrentHashMap<String, ResolvedTorrent>()

    @Volatile private var session: SessionManager? = null
    @Volatile private var observer: SwarmObserver? = null
    @Volatile private var httpServer: StreamHttpServer? = null
    @Volatile private var appContext: Context? = null

    // Bumped by cancel()/stop(); every wait loop compares against the value it
    // captured at entry. Lets a user backing out interrupt a 45s resolve immediately
    // without any of the wait loops holding a lock that stop() would need.
    private val generation = AtomicLong(0)

    private class OpToken(val value: Long)

    private fun newToken() = OpToken(generation.get())

    private fun OpToken.checkCancelled() {
        if (generation.get() != value) {
            throw StreamNotReadyException("Cancelled.", TorrentFailureCode.CANCELLED)
        }
    }

    fun attachContext(context: Context?) {
        if (context != null) appContext = context.applicationContext
    }

    // Session start is the only thing that needs the lock, and it is short. Every
    // long wait below runs outside it, so cancel()/stop() is never queued behind an
    // in-flight resolve - the previous @Synchronized-everything design meant a user
    // navigating away had to wait out the full metadata timeout first.
    private fun ensureSession(): SessionManager = lifecycleLock.withLock {
        val existing = session
        if (existing != null && existing.isRunning) return existing

        val fresh = SessionManager(false)
        val obs = SwarmObserver()
        fresh.addListener(obs)
        fresh.start(SessionParams(TorrentSessionConfig.build()))
        if (!fresh.isDhtRunning) fresh.startDht()
        session = fresh
        observer = obs
        Log.i(TAG, "session started, listening on ${runCatching { fresh.listenEndpoints() }.getOrNull()}")
        fresh
    }

    fun fetchFiles(
        magnetUri: String,
        tempDir: File,
        onProgress: ProgressSink = {},
    ): Triple<String, List<TorrentStreamFile>, String> {
        val token = newToken()
        tempDir.mkdirs()

        val infoHash = parseInfoHash(magnetUri)
        torrents[infoHash]?.let { cached ->
            // Already resolved this session - skip the swarm entirely.
            return Triple(infoHash, filesOf(cached.torrentInfo), cached.torrentInfo.name() ?: "")
        }

        val saveDir = File(tempDir, infoHash)
        var lastDiagnostics: TorrentDiagnostics? = null

        for (attempt in 1..METADATA_ATTEMPTS) {
            token.checkCancelled()
            val s = ensureSession()

            if (attempt > 1) {
                // Most commonly this retry exists because the device changed networks
                // (Wi-Fi -> mobile) mid-resolve, which leaves libtorrent's sockets bound
                // to an interface that no longer routes. Rebinding is a real recovery
                // step, not just another go at the same broken state.
                Log.i(TAG, "retry $attempt: reopening network sockets")
                runCatching { s.reopenNetworkSockets() }
                onProgress(TorrentProgress("retry", "Reconnecting to the network..."))
            }

            awaitDhtWarmup(s, token, onProgress)

            val handle = addOrFind(s, magnetParams(magnetUri), saveDir)
            val started = System.currentTimeMillis()
            try {
                val ti = awaitMetadata(s, handle, infoHash, token, onProgress, started)
                torrents[infoHash] = ResolvedTorrent(ti, saveDir, handle)
                // Nothing should download until the user actually picks a file; without
                // this libtorrent starts pulling the whole torrent from piece 0 the
                // instant metadata lands, on a metered mobile connection, for a file
                // list the user may well just close.
                runCatching { handle.prioritizeFiles(Priority.array(Priority.IGNORE, ti.numFiles())) }
                return Triple(infoHash, filesOf(ti), ti.name() ?: "")
            } catch (e: StreamNotReadyException) {
                if (e.code == TorrentFailureCode.CANCELLED) throw e
                lastDiagnostics = snapshot(s, handle, infoHash, System.currentTimeMillis() - started)
                Log.w(TAG, "metadata attempt $attempt failed: ${lastDiagnostics.summary()}")
                if (attempt == METADATA_ATTEMPTS) break
            }
        }

        val diag = lastDiagnostics ?: TorrentDiagnostics(hasNetwork = NetworkProbe.hasNetwork(appContext))
        throw StreamNotReadyException(diag.userMessage(), diag.classify(), diag.summary())
    }

    fun startStream(
        infoHash: String,
        fileIndex: Int,
        onProgress: ProgressSink = {},
    ): String {
        val token = newToken()
        val s = ensureSession()
        val ts = torrents[infoHash]
            ?: throw StreamNotReadyException(
                "This torrent is no longer loaded — go back and pick the source again.",
                TorrentFailureCode.INTERNAL,
            )
        val ti = ts.torrentInfo
        if (fileIndex < 0 || fileIndex >= ti.numFiles()) {
            throw StreamNotReadyException("Invalid file selection.", TorrentFailureCode.INTERNAL)
        }
        ts.saveDir.mkdirs()

        // The handle dies if the session was torn down and rebuilt between listing the
        // files and picking one. Re-add from the metadata we already hold rather than
        // from a magnet, so this costs nothing - going back through the swarm for
        // metadata we've had all along is what makes "pick a file" feel like a second
        // full resolve.
        val handle = (ts.handle?.takeIf { it.isValid })
            ?: addOrFind(s, torrentInfoParams(ti), ts.saveDir).also { ts.handle = it }

        val priorities = Priority.array(Priority.IGNORE, ti.numFiles())
        priorities[fileIndex] = Priority.TOP_PRIORITY
        handle.prioritizeFiles(priorities)
        handle.setFlags(TorrentFlags.SEQUENTIAL_DOWNLOAD)
        handle.unsetFlags(TorrentFlags.UPLOAD_MODE)
        handle.resume()

        prebuffer(s, handle, ts, fileIndex, token, onProgress)

        return lifecycleLock.withLock {
            var server = httpServer
            if (server == null || !server.isAlive) {
                server = StreamHttpServer()
                server.start()
                httpServer = server
            }
            server.setActiveStream(handle, ti, fileIndex, ts.saveDir)
            "http://127.0.0.1:${server.port}/stream"
        }
    }

    // Interrupts whatever resolve/buffer is in flight without tearing the session
    // down, so the next attempt reuses an already-warm DHT routing table.
    fun cancel() {
        generation.incrementAndGet()
    }

    fun stop() {
        generation.incrementAndGet()
        lifecycleLock.withLock {
            httpServer?.stop()
            httpServer = null
            val s = session
            val obs = observer
            if (s != null && obs != null) runCatching { s.removeListener(obs) }
            obs?.reset()
            s?.stop()
            session = null
            observer = null
            // Downloaded pieces live under cacheDir/torrent-stream/<infoHash> (see
            // TorrentStreamModule) - stop() previously only tore down the network
            // session/HTTP server and left this data on disk indefinitely, since nothing
            // else ever deletes it. session.stop() blocks until libtorrent has fully shut
            // down, so it's safe to delete the backing directories right after.
            torrents.values.forEach { runCatching { it.saveDir.deleteRecursively() } }
            torrents.clear()
        }
    }

    fun diagnosticsSnapshot(): String {
        val s = session ?: return "session=stopped net=${if (NetworkProbe.hasNetwork(appContext)) "up" else "down"}"
        return TorrentDiagnostics(
            dhtNodes = runCatching { s.dhtNodes() }.getOrDefault(0),
            dhtBootstrapped = observer?.dhtBootstrapped ?: false,
            hasNetwork = NetworkProbe.hasNetwork(appContext),
            listenEndpoints = runCatching { s.listenEndpoints() }.getOrDefault(emptyList()),
        ).summary()
    }

    // --- internals -------------------------------------------------------------

    private fun filesOf(ti: TorrentInfo): List<TorrentStreamFile> =
        (0 until ti.numFiles()).map { i ->
            TorrentStreamFile(i, ti.files().fileName(i), ti.files().fileSize(i))
        }

    private fun parseInfoHash(magnetUri: String): String {
        val params = try {
            AddTorrentParams.parseMagnetUri(magnetUri)
        } catch (e: Exception) {
            throw StreamNotReadyException(
                "This source link is malformed and can't be opened.",
                TorrentFailureCode.INVALID_MAGNET,
            )
        }
        val hashes = params.infoHashes
        val best = if (hashes.hasV1()) hashes.v1 else hashes.best
        val hex = best?.toHex()
        if (hex.isNullOrBlank() || best.isAllZeros) {
            throw StreamNotReadyException(
                "This source link has no torrent hash and can't be opened.",
                TorrentFailureCode.INVALID_MAGNET,
            )
        }
        return hex.lowercase()
    }

    private fun magnetParams(magnetUri: String): AddTorrentParams {
        val params = try {
            AddTorrentParams.parseMagnetUri(magnetUri)
        } catch (e: Exception) {
            throw StreamNotReadyException(
                "This source link is malformed and can't be opened.",
                TorrentFailureCode.INVALID_MAGNET,
            )
        }
        // Merge the magnet's own trackers with the public fallback set. This is the
        // single biggest reliability win here: a bare `magnet:?xt=urn:btih:...` (which
        // is exactly what this app used to build) is DHT-only, and DHT alone is slow
        // to hopeless for anything but the most popular torrents. A live UDP tracker
        // usually returns a peer list in well under a second.
        val trackers = LinkedHashSet<String>()
        runCatching { params.trackers }.getOrNull()?.let { trackers.addAll(it) }
        trackers.addAll(TorrentSessionConfig.FALLBACK_TRACKERS)
        params.trackers = trackers.toList()
        return params
    }

    private fun torrentInfoParams(torrentInfo: TorrentInfo): AddTorrentParams {
        val params = AddTorrentParams()
        params.setTorrentInfo(torrentInfo)
        // Set explicitly: reading infoHashes back off a params that only has `ti` set
        // returns zeros, which would make the "already in session?" lookup in
        // addOrFind silently miss and re-add a torrent that is already there.
        runCatching { params.infoHashes = torrentInfo.infoHashes() }
        params.trackers = TorrentSessionConfig.FALLBACK_TRACKERS
        return params
    }

    private fun addOrFind(
        s: SessionManager,
        params: AddTorrentParams,
        saveDir: File,
    ): TorrentHandle {
        // A torrent already in the session (duplicate add, or one we resolved earlier
        // this session) must be reused - re-adding it is an error in libtorrent and
        // was a silent failure mode of the old fetchMagnet-based path.
        val existing = runCatching { s.find(params.infoHashes.best) }.getOrNull()
        if (existing != null && existing.isValid) return existing

        saveDir.mkdirs()
        params.savePath = saveDir.absolutePath

        // Explicit flags: no AUTO_MANAGED (the queue manager will happily pause the
        // one torrent we care about) and no PAUSED. Sequential from the start because
        // this is only ever used for streaming.
        params.flags = TorrentFlags.SEQUENTIAL_DOWNLOAD.or_(TorrentFlags.UPDATE_SUBSCRIBE)

        val ec = error_code()
        val swigHandle = s.swig().add_torrent(params.swig(), ec)
        if (ec.failed()) {
            val recovered = runCatching { s.find(params.infoHashes.best) }.getOrNull()
            if (recovered != null && recovered.isValid) return recovered
            throw StreamNotReadyException(
                "Couldn't start this torrent (${ec.message()}).",
                TorrentFailureCode.INTERNAL,
            )
        }
        val handle = TorrentHandle(swigHandle)
        if (!handle.isValid) {
            throw StreamNotReadyException("Couldn't start this torrent.", TorrentFailureCode.INTERNAL)
        }
        return handle
    }

    private fun awaitDhtWarmup(s: SessionManager, token: OpToken, onProgress: ProgressSink) {
        if (s.dhtNodes() >= DHT_MIN_NODES) return
        val deadline = System.currentTimeMillis() + DHT_WARMUP_TIMEOUT_MS
        while (System.currentTimeMillis() < deadline) {
            token.checkCancelled()
            val nodes = s.dhtNodes()
            if (nodes >= DHT_MIN_NODES) return
            onProgress(
                TorrentProgress(
                    phase = "dht",
                    message = "Connecting to the BitTorrent network...",
                    dhtNodes = nodes,
                )
            )
            Thread.sleep(POLL_INTERVAL_MS)
        }
        // Deliberately not fatal: trackers can carry the whole resolve on networks
        // where DHT's UDP traffic is filtered.
        Log.i(TAG, "DHT warmup incomplete (${s.dhtNodes()} nodes); continuing on trackers")
    }

    private fun awaitMetadata(
        s: SessionManager,
        handle: TorrentHandle,
        infoHash: String,
        token: OpToken,
        onProgress: ProgressSink,
        startedAt: Long,
    ): TorrentInfo {
        val deadline = startedAt + METADATA_TIMEOUT_MS
        var reannounced = false
        var forced = false

        while (System.currentTimeMillis() < deadline) {
            token.checkCancelled()
            if (!handle.isValid) {
                throw StreamNotReadyException("Torrent handle went away.", TorrentFailureCode.INTERNAL)
            }

            val status = handle.status()
            if (status.hasMetadata()) {
                val ti = handle.torrentFile()
                if (ti != null) return ti
            }

            val elapsed = System.currentTimeMillis() - startedAt

            // Escalation ladder. Each rung is a distinct action, not just more waiting:
            // first re-ask both peer sources, then force past libtorrent's minimum
            // announce interval so trackers get hit again rather than being sat on.
            if (!reannounced && elapsed > ESCALATE_REANNOUNCE_MS) {
                reannounced = true
                Log.i(TAG, "escalating: DHT announce + tracker re-announce")
                runCatching { handle.forceDHTAnnounce() }
                runCatching { handle.forceReannounce() }
            }
            if (!forced && elapsed > ESCALATE_FORCE_MS) {
                forced = true
                Log.i(TAG, "escalating: adding fallback trackers + forced re-announce")
                runCatching {
                    val known = handle.trackers().mapNotNull { it.url() }.toHashSet()
                    TorrentSessionConfig.FALLBACK_TRACKERS
                        .filter { it !in known }
                        .forEach { handle.addTracker(AnnounceEntry(it)) }
                }
                runCatching { handle.forceReannounce(0, -1, TorrentHandle.IGNORE_MIN_INTERVAL) }
                runCatching { handle.forceDHTAnnounce() }
            }

            onProgress(
                TorrentProgress(
                    phase = "metadata",
                    message = describeMetadataProgress(status.numPeers(), status.listPeers(), s.dhtNodes()),
                    peers = status.numPeers(),
                    seeds = status.numSeeds(),
                    dhtNodes = s.dhtNodes(),
                )
            )
            Thread.sleep(POLL_INTERVAL_MS)
        }

        val diag = snapshot(s, handle, infoHash, System.currentTimeMillis() - startedAt)
        throw StreamNotReadyException(diag.userMessage(), diag.classify(), diag.summary())
    }

    private fun describeMetadataProgress(connected: Int, discovered: Int, dhtNodes: Long): String = when {
        connected > 0 -> "Connected to $connected peer${if (connected == 1) "" else "s"} — fetching file list..."
        discovered > 0 -> "Found $discovered peer${if (discovered == 1) "" else "s"} — connecting..."
        dhtNodes > 0 -> "Searching the swarm for this torrent..."
        else -> "Connecting to the BitTorrent network..."
    }

    // Hands the player a URL only once there is actually something to play. Returning
    // immediately (as this used to) meant ExoPlayer opened the stream, blocked inside
    // the HTTP server waiting for piece 0, and eventually surfaced an opaque playback
    // error instead of a diagnosable one from here.
    private fun prebuffer(
        s: SessionManager,
        handle: TorrentHandle,
        ts: ResolvedTorrent,
        fileIndex: Int,
        token: OpToken,
        onProgress: ProgressSink,
    ) {
        val ti = ts.torrentInfo
        val pieceLength = ti.pieceLength()
        if (pieceLength <= 0) return

        val targetPieces = maxOf(
            PREBUFFER_MIN_PIECES,
            Math.ceil(PREBUFFER_TARGET_BYTES.toDouble() / pieceLength).toInt(),
        )

        // Ask libtorrent for exactly the pieces we're about to serve, in order.
        runCatching {
            val fileOffset = ti.files().fileOffset(fileIndex)
            val firstPiece = (fileOffset / pieceLength).toInt()
            handle.clearPieceDeadlines()
            for (i in 0 until targetPieces) {
                handle.setPieceDeadline(firstPiece + i, i * 100)
            }
        }

        val startedAt = System.currentTimeMillis()
        val deadline = startedAt + PREBUFFER_TIMEOUT_MS
        var sawPeer = false

        while (System.currentTimeMillis() < deadline) {
            token.checkCancelled()
            if (!handle.isValid) {
                throw StreamNotReadyException("Torrent handle went away.", TorrentFailureCode.INTERNAL)
            }
            val status = handle.status()
            if (status.numPeers() > 0) sawPeer = true

            val (have, total) = PieceAvailability.windowProgress(handle, ti, fileIndex, 0L, targetPieces)
            if (total > 0 && have >= total) return

            val elapsed = System.currentTimeMillis() - startedAt
            // No peer at all this far in means the swarm isn't going to show up.
            // Fail here with real diagnostics rather than handing the player a URL
            // that will just stall and produce a generic playback error.
            if (!sawPeer && elapsed > PREBUFFER_NO_PEER_GRACE_MS) {
                val diag = snapshot(s, handle, ti.infoHash().toHex(), elapsed)
                throw StreamNotReadyException(diag.userMessage(), diag.classify(), diag.summary())
            }

            onProgress(
                TorrentProgress(
                    phase = "buffering",
                    message = if (status.numPeers() > 0) {
                        "Buffering from ${status.numPeers()} peer${if (status.numPeers() == 1) "" else "s"}..."
                    } else {
                        "Connecting to peers..."
                    },
                    peers = status.numPeers(),
                    seeds = status.numSeeds(),
                    dhtNodes = s.dhtNodes(),
                    progress = if (total > 0) have.toDouble() / total else 0.0,
                    downloadRate = status.downloadRate().toLong(),
                )
            )
            Thread.sleep(POLL_INTERVAL_MS)
        }

        // Buffer never filled, but peers exist and bytes may be trickling in - let
        // playback start rather than refusing outright; the HTTP server will pace it.
        Log.w(TAG, "prebuffer timed out; starting playback anyway")
    }

    private fun snapshot(
        s: SessionManager,
        handle: TorrentHandle?,
        infoHash: String,
        elapsedMs: Long,
    ): TorrentDiagnostics {
        val status = runCatching { handle?.takeIf { it.isValid }?.status() }.getOrNull()
        val obs = observer
        return TorrentDiagnostics(
            elapsedMs = elapsedMs,
            dhtNodes = runCatching { s.dhtNodes() }.getOrDefault(0L),
            dhtBootstrapped = obs?.dhtBootstrapped ?: false,
            peersConnected = status?.numPeers() ?: 0,
            peersDiscovered = status?.listPeers() ?: 0,
            seedsConnected = status?.numSeeds() ?: 0,
            trackersTotal = runCatching { handle?.trackers()?.size }.getOrNull() ?: 0,
            trackersReplied = obs?.repliedFor(infoHash) ?: 0,
            trackerErrors = obs?.erroredFor(infoHash) ?: 0,
            hasMetadata = status?.hasMetadata() ?: false,
            hasNetwork = NetworkProbe.hasNetwork(appContext),
            listenEndpoints = runCatching { s.listenEndpoints() }.getOrDefault(emptyList()),
        )
    }
}
