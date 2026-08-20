package com.tdandroid.app.torrent

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities

// Why a resolve failed, as opposed to just "it failed". Every one of these wants a
// different action from the user, and the old single error string sent everyone to
// "try again" - including people in airplane mode and people asking for a torrent
// that no longer has a single seeder anywhere.
enum class TorrentFailureCode {
    OFFLINE,          // no usable network on the device at all
    P2P_BLOCKED,      // we have internet, but nothing P2P got through (UDP/DHT filtered)
    DEAD_TORRENT,     // network is healthy, swarm answered, nobody has this content
    NO_METADATA,      // peers found and connected, but none would serve the metadata
    STALLED,          // metadata fine, but no data pieces are arriving
    CANCELLED,        // user backed out
    INVALID_MAGNET,
    INTERNAL,
}

class StreamNotReadyException(
    message: String,
    val code: TorrentFailureCode = TorrentFailureCode.INTERNAL,
    val diagnostics: String? = null,
) : Exception(message)

// A point-in-time picture of what the session actually managed to do. Collected
// whether or not the resolve succeeded, because "it worked but took 40s" and "it
// failed" have the same interesting fields.
data class TorrentDiagnostics(
    val elapsedMs: Long = 0,
    val dhtNodes: Long = 0,
    val dhtBootstrapped: Boolean = false,
    val peersConnected: Int = 0,
    val peersDiscovered: Int = 0,
    val seedsConnected: Int = 0,
    val trackersTotal: Int = 0,
    val trackersReplied: Int = 0,
    val trackerErrors: Int = 0,
    val hasMetadata: Boolean = false,
    val hasNetwork: Boolean = true,
    val listenEndpoints: List<String> = emptyList(),
) {
    // Deliberately compact and single-line: this rides along on the error so it ends
    // up in logcat and in bug reports, and it is the only way to tell these cases
    // apart after the fact.
    fun summary(): String = buildString {
        append("elapsed=${elapsedMs}ms")
        append(" net=${if (hasNetwork) "up" else "down"}")
        append(" dht=$dhtNodes${if (dhtBootstrapped) "" else "(not bootstrapped)"}")
        append(" trackers=$trackersReplied/$trackersTotal replied")
        if (trackerErrors > 0) append(" (${trackerErrors} errored)")
        append(" peers=$peersConnected connected")
        append(" seeds=$seedsConnected")
        append(" discovered=$peersDiscovered")
        append(" metadata=$hasMetadata")
        if (listenEndpoints.isNotEmpty()) append(" listen=${listenEndpoints.joinToString("|")}")
    }

    fun classify(): TorrentFailureCode = when {
        !hasNetwork -> TorrentFailureCode.OFFLINE
        // Nothing P2P worked at all: the DHT never found a node AND no tracker ever
        // answered. That is a network filtering UDP/BitTorrent, not a dead torrent -
        // telling the user "no seeders" here would be actively misleading.
        dhtNodes == 0L && trackersReplied == 0 -> TorrentFailureCode.P2P_BLOCKED
        // The swarm was reachable and we asked it; nobody at all had this content.
        peersDiscovered == 0 -> TorrentFailureCode.DEAD_TORRENT
        // Peers exist but wouldn't hand over the metadata. Usually a swarm of other
        // magnet-only clients that are themselves still waiting for it.
        !hasMetadata -> TorrentFailureCode.NO_METADATA
        else -> TorrentFailureCode.STALLED
    }

    fun userMessage(): String = when (classify()) {
        TorrentFailureCode.OFFLINE ->
            "No internet connection. Check your Wi-Fi or mobile data and try again."
        TorrentFailureCode.P2P_BLOCKED ->
            "Your network is blocking peer-to-peer traffic — nothing on the BitTorrent network responded, " +
                "though the connection itself works. Mobile networks and public/work Wi-Fi commonly block this. " +
                "Try mobile data, a different network, or a VPN."
        TorrentFailureCode.DEAD_TORRENT ->
            "No one is sharing this torrent right now. The network answered fine, but this release has no " +
                "active seeders — pick a different source, ideally one with more seeders."
        TorrentFailureCode.NO_METADATA ->
            "Found peers for this torrent, but none of them would send its file list. " +
                "This usually means the swarm is all downloaders and no seeders — try another source."
        TorrentFailureCode.STALLED ->
            "Connected to peers, but no data is coming through fast enough to play. " +
                "Try a source with more seeders, or a different network."
        TorrentFailureCode.CANCELLED -> "Cancelled."
        TorrentFailureCode.INVALID_MAGNET -> "This source link is malformed and can't be opened."
        TorrentFailureCode.INTERNAL -> "Couldn't start this torrent stream."
    }
}

internal object NetworkProbe {
    // Only reports what Android itself already knows - no request, no latency. Used
    // to separate "the device has no network" from "the network is hostile to P2P",
    // which are the two failure modes users confuse the most.
    fun hasNetwork(context: Context?): Boolean {
        if (context == null) return true // unknown; don't claim the user is offline
        return try {
            val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
                ?: return true
            val network = cm.activeNetwork ?: return false
            val caps = cm.getNetworkCapabilities(network) ?: return false
            caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        } catch (_: Exception) {
            true
        }
    }
}
