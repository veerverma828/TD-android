package com.tdandroid.app.torrent

import org.libtorrent4j.SettingsPack
import org.libtorrent4j.swig.settings_pack.bool_types
import org.libtorrent4j.swig.settings_pack.int_types
import org.libtorrent4j.swig.settings_pack.string_types

// Session-level tuning for streaming-from-a-phone, which is a very different
// workload from the "seed a library on a desktop" defaults libtorrent ships with:
// we want metadata and the first pieces as fast as possible, we're almost always
// behind carrier-grade NAT (so incoming connections rarely work and every peer has
// to be dialed out to), and the process may die at any moment.
internal object TorrentSessionConfig {

    // libtorrent's built-in bootstrap list is short and its hosts are regularly
    // unreachable from mobile networks. A cold DHT with an unreachable bootstrap
    // host is the difference between "resolves in 3s" and "times out at 30s", so
    // this deliberately spreads across independent operators.
    private val DHT_BOOTSTRAP_NODES = listOf(
        "router.bittorrent.com:6881",
        "dht.transmissionbt.com:6881",
        "router.utorrent.com:6881",
        "dht.libtorrent.org:25401",
        "router.bittorrent.cloud:6881",
    )

    // Appended to every magnet that doesn't already carry its own trackers (and, on
    // escalation, to ones that do). DHT alone resolves popular torrents fine but is
    // slow-to-hopeless for anything mid-tail; a couple of live UDP trackers usually
    // return a peer list in under a second. Kept short on purpose - each one costs
    // an announce, and a long list mostly buys duplicate peers.
    val FALLBACK_TRACKERS = listOf(
        "udp://tracker.opentrackr.org:1337/announce",
        "udp://open.demonii.com:1337/announce",
        "udp://open.stealth.si:80/announce",
        "udp://tracker.torrent.eu.org:451/announce",
        "udp://exodus.desync.com:6969/announce",
        "udp://explodie.org:6969/announce",
        "udp://opentracker.io:6969/announce",
        "udp://tracker.dler.org:6969/announce",
        "http://tracker.openbittorrent.com:80/announce",
        "udp://tracker.openbittorrent.com:6969/announce",
    )

    fun build(): SettingsPack {
        val sp = SettingsPack()

        // Listen on both stacks with an ephemeral port. Mobile networks are
        // increasingly IPv6-only with NAT64, where a v4-only session can reach
        // nothing at all; a fixed port is also more likely to be firewalled than
        // one the OS picks.
        sp.setString(string_types.listen_interfaces.swigValue(), "0.0.0.0:0,[::]:0")

        // Peer discovery: every mechanism on. DHT and trackers cover the internet,
        // LSD covers "another device on this Wi-Fi already has it".
        sp.setBoolean(bool_types.enable_dht.swigValue(), true)
        sp.setBoolean(bool_types.enable_lsd.swigValue(), true)
        sp.setString(string_types.dht_bootstrap_nodes.swigValue(), DHT_BOOTSTRAP_NODES.joinToString(","))
        // Off by default in libtorrent: only ask the DHT once trackers have failed.
        // For streaming we want both racing from t=0.
        sp.setBoolean(bool_types.use_dht_as_fallback.swigValue(), false)
        sp.setBoolean(bool_types.dht_aggressive_lookups.swigValue(), true)

        // Announce to every tracker/tier in parallel rather than walking tiers in
        // order. Costs a few extra announces, saves the multi-second serial walk
        // through dead trackers that would otherwise eat the metadata budget.
        sp.setBoolean(bool_types.announce_to_all_trackers.swigValue(), true)
        sp.setBoolean(bool_types.announce_to_all_tiers.swigValue(), true)
        sp.setBoolean(bool_types.prefer_udp_trackers.swigValue(), true)
        // Public trackers routinely have expired or self-signed certs; refusing them
        // silently drops working peer sources.
        sp.setBoolean(bool_types.validate_https_trackers.swigValue(), false)

        // NAT traversal. Useless on carrier-grade NAT but free, and on home Wi-Fi it
        // turns the session from outbound-only into properly connectable, which is
        // what makes a torrent with few seeds actually work.
        sp.setBoolean(bool_types.enable_upnp.swigValue(), true)
        sp.setBoolean(bool_types.enable_natpmp.swigValue(), true)

        // Both transports both directions. uTP is what gets through most mobile
        // middleboxes; TCP is what most desktop peers actually offer.
        sp.setBoolean(bool_types.enable_outgoing_utp.swigValue(), true)
        sp.setBoolean(bool_types.enable_incoming_utp.swigValue(), true)
        sp.setBoolean(bool_types.enable_outgoing_tcp.swigValue(), true)
        sp.setBoolean(bool_types.enable_incoming_tcp.swigValue(), true)

        // Present as a mainstream client. A non-trivial number of trackers and peers
        // reject or deprioritise fingerprints they don't recognise.
        sp.setString(string_types.user_agent.swigValue(), "libtorrent/2.1.0")
        sp.setString(string_types.peer_fingerprint.swigValue(), "-LT2100-")

        // Connection budget. Defaults are tuned for a machine seeding hundreds of
        // torrents; we run exactly one and want it to find peers fast.
        sp.setInteger(int_types.connections_limit.swigValue(), 300)
        sp.setInteger(int_types.active_downloads.swigValue(), 4)
        sp.setInteger(int_types.active_limit.swigValue(), 8)
        sp.setInteger(int_types.active_dht_limit.swigValue(), 8)
        sp.setInteger(int_types.active_tracker_limit.swigValue(), 16)
        // How many peers to attempt per second. The default (10) makes a cold start
        // crawl through the peer list; 60 gets a swarm connected in the first second.
        sp.setInteger(int_types.connection_speed.swigValue(), 60)
        // Extra connection attempts allowed in the first moments of a torrent -
        // exactly the burst a stream start needs.
        sp.setInteger(int_types.torrent_connect_boost.swigValue(), 100)
        sp.setInteger(int_types.max_peerlist_size.swigValue(), 4000)

        // Timeouts: fail a dead peer/tracker fast so its slot goes to a live one,
        // rather than holding a connection open for the 60s default.
        sp.setInteger(int_types.peer_connect_timeout.swigValue(), 10)
        sp.setInteger(int_types.handshake_timeout.swigValue(), 15)
        sp.setInteger(int_types.tracker_completion_timeout.swigValue(), 20)
        sp.setInteger(int_types.tracker_receive_timeout.swigValue(), 12)
        sp.setInteger(int_types.stop_tracker_timeout.swigValue(), 2)
        // Don't sit on a stalled piece request; re-request it elsewhere.
        sp.setInteger(int_types.piece_timeout.swigValue(), 15)
        sp.setInteger(int_types.request_timeout.swigValue(), 20)
        // Re-announce aggressively while we're actively hunting for peers.
        sp.setInteger(int_types.min_announce_interval.swigValue(), 30)

        // Streaming reads whole pieces in order, so asking peers for a full piece at
        // a time (rather than interleaving partial requests across many) markedly
        // reduces the time-to-first-playable-byte.
        sp.setInteger(int_types.whole_pieces_threshold.swigValue(), 20)
        sp.setBoolean(bool_types.piece_extent_affinity.swigValue(), true)

        // We are a leech by design here: this is a streaming client on a metered,
        // battery-powered device, not a seedbox. Cap upload rather than disabling it
        // (many trackers/peers penalise pure leeches, which costs us download speed).
        sp.setInteger(int_types.upload_rate_limit.swigValue(), 96 * 1024)
        sp.setInteger(int_types.download_rate_limit.swigValue(), 0)
        sp.setBoolean(bool_types.seeding_outgoing_connections.swigValue(), false)

        // The alert queue is our only view into what the session is doing; the
        // default is small enough that a busy start drops the very alerts the
        // diagnostics below depend on.
        sp.setInteger(int_types.alert_queue_size.swigValue(), 4000)

        // Guard against a hostile magnet trying to make us buffer an enormous
        // "metadata" blob in memory.
        sp.setInteger(int_types.max_metadata_size.swigValue(), 8 * 1024 * 1024)

        return sp
    }
}
