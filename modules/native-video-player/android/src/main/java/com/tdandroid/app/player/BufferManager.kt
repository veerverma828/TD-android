package com.tdandroid.app.player

import android.app.ActivityManager
import android.content.Context
import androidx.media3.exoplayer.DefaultLoadControl

/**
 * Single place buffer-tuning lives. Three tiers trade startup/seek speed against
 * playback stability and memory, matching the user-facing "bufferPreference" setting:
 *  - low: fastest startup/seek, least memory, more likely to rebuffer on unstable
 *    connections (torrent relay hasn't downloaded ahead far enough).
 *  - balanced: default — reasonable startup with a decent stall cushion.
 *  - high: slower to start, but rides out longer network stalls without rebuffering —
 *    best for slow/unstable torrent sources.
 *
 * On top of the time-based tiers, a byte cap bounds actual RAM use — see
 * targetBufferBytesFor() below. Without it, a 4K/HDR stream buffers the same
 * *duration* as a 1080p stream but at several times the memory, since buffer
 * memory scales with bitrate, not just seconds. That's what let a 4K AV1 HDR10
 * stream push a 1.7GB-RAM Android TV box into the system lowmemorykiller.
 */
object BufferManager {

    // Generic per-track-type default the media3 team ships (media3's DefaultLoadControl
    // computes ~13-18MB per track type when no explicit cap is set); used as the
    // "normal device" ceiling here so behavior on capable devices is unchanged.
    private const val DEFAULT_TARGET_BUFFER_BYTES = 64 * 1024 * 1024 // 64MB

    // Tighter cap for devices Android itself (or their small total RAM) flags as
    // memory-constrained — cuts buffer memory roughly in half on exactly the
    // devices most likely to get killed under memory pressure.
    private const val LOW_RAM_TARGET_BUFFER_BYTES = 24 * 1024 * 1024 // 24MB

    private const val LOW_RAM_TOTAL_MEM_THRESHOLD_BYTES = 2L * 1024 * 1024 * 1024 // 2GB

    fun buildLoadControl(context: Context, bufferPreference: String): DefaultLoadControl {
        val (minBufferMs, maxBufferMs) = when (bufferPreference) {
            "low" -> 15_000 to 30_000
            "high" -> 30_000 to 90_000
            else -> 20_000 to 50_000
        }
        val lowRam = isLowRamDevice(context)
        val targetBufferBytes = if (lowRam) LOW_RAM_TARGET_BUFFER_BYTES else DEFAULT_TARGET_BUFFER_BYTES

        PlaybackLogger.event(
            "buffer.configured",
            "preference" to bufferPreference,
            "minBufferMs" to minBufferMs,
            "maxBufferMs" to maxBufferMs,
            "targetBufferBytes" to targetBufferBytes,
            "lowRamDevice" to lowRam,
        )
        return DefaultLoadControl.Builder()
            .setBufferDurationsMs(minBufferMs, maxBufferMs, 1_000, 2_000)
            .setTargetBufferBytes(targetBufferBytes)
            .build()
    }

    private fun isLowRamDevice(context: Context): Boolean {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
            ?: return false
        // ActivityManager.isLowRamDevice() is a manufacturer-set flag — many budget/older
        // Android TV and Fire TV boxes with genuinely small RAM never set it, so it's
        // checked but not trusted alone; actual totalMem is the reliable signal on those.
        if (activityManager.isLowRamDevice) return true
        val memoryInfo = ActivityManager.MemoryInfo()
        activityManager.getMemoryInfo(memoryInfo)
        return memoryInfo.totalMem in 1 until LOW_RAM_TOTAL_MEM_THRESHOLD_BYTES
    }
}
