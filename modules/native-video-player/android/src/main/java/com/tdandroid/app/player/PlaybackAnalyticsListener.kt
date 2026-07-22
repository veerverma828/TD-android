package com.tdandroid.app.player

import androidx.media3.common.C
import androidx.media3.common.Format
import androidx.media3.common.MimeTypes
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.analytics.AnalyticsListener
import androidx.media3.exoplayer.source.LoadEventInfo
import androidx.media3.exoplayer.source.MediaLoadData
import java.io.IOException

/**
 * Media3's built-in analytics hook (already on the classpath via media3-exoplayer,
 * no new dependency) — the "Analytics" concern kept separate from playback control.
 * Mostly observes and logs through PlaybackLogger; the one exception is [onHdrChanged],
 * which the Activity uses to switch the window's color mode — without that, HDR content
 * decodes correctly (verified via analytics.videoFormat logs) but Android composites it
 * through the normal SDR pipeline, so PQ/HLG pixel data renders dark and washed out
 * instead of actually HDR-bright. That's a display-pipeline setting only the Activity's
 * Window can make, so it's threaded out via callback rather than reaching into the
 * Activity directly from here.
 */
@UnstableApi
class PlaybackAnalyticsListener(
    private val onHdrChanged: (Boolean) -> Unit = {},
) : AnalyticsListener {

    override fun onDroppedVideoFrames(eventTime: AnalyticsListener.EventTime, droppedFrames: Int, elapsedMs: Long) {
        if (droppedFrames <= 0) return
        PlaybackLogger.warn("analytics.droppedFrames", "count" to droppedFrames, "elapsedMs" to elapsedMs)
    }

    override fun onVideoDecoderInitialized(
        eventTime: AnalyticsListener.EventTime,
        decoderName: String,
        initializedTimestampMs: Long,
        initializationDurationMs: Long,
    ) {
        PlaybackLogger.event("analytics.videoDecoder", "name" to decoderName, "initMs" to initializationDurationMs)
    }

    override fun onAudioDecoderInitialized(
        eventTime: AnalyticsListener.EventTime,
        decoderName: String,
        initializedTimestampMs: Long,
        initializationDurationMs: Long,
    ) {
        PlaybackLogger.event("analytics.audioDecoder", "name" to decoderName, "initMs" to initializationDurationMs)
    }

    override fun onVideoInputFormatChanged(
        eventTime: AnalyticsListener.EventTime,
        format: Format,
        decoderReuseEvaluation: androidx.media3.exoplayer.DecoderReuseEvaluation?,
    ) {
        val colorInfo = format.colorInfo
        val hdrKind = when {
            format.sampleMimeType == MimeTypes.VIDEO_DOLBY_VISION -> "DolbyVision"
            colorInfo?.colorTransfer == C.COLOR_TRANSFER_ST2084 -> "HDR10"
            colorInfo?.colorTransfer == C.COLOR_TRANSFER_HLG -> "HLG"
            else -> "SDR"
        }
        PlaybackLogger.event(
            "analytics.videoFormat",
            "mimeType" to format.sampleMimeType,
            "codecs" to format.codecs,
            "resolution" to "${format.width}x${format.height}",
            "hdrKind" to hdrKind,
            "bitDepth" to colorInfo?.lumaBitdepth,
        )
        onHdrChanged(hdrKind != "SDR")
    }

    override fun onAudioInputFormatChanged(
        eventTime: AnalyticsListener.EventTime,
        format: Format,
        decoderReuseEvaluation: androidx.media3.exoplayer.DecoderReuseEvaluation?,
    ) {
        PlaybackLogger.event(
            "analytics.audioFormat",
            "mimeType" to format.sampleMimeType,
            "channels" to format.channelCount,
            "sampleRate" to format.sampleRate,
        )
    }

    override fun onIsLoadingChanged(eventTime: AnalyticsListener.EventTime, isLoading: Boolean) {
        PlaybackLogger.event("analytics.buffering", "isLoading" to isLoading, "positionMs" to eventTime.eventPlaybackPositionMs)
    }

    override fun onLoadError(
        eventTime: AnalyticsListener.EventTime,
        loadEventInfo: LoadEventInfo,
        mediaLoadData: MediaLoadData,
        error: IOException,
        wasCanceled: Boolean,
    ) {
        PlaybackLogger.warn(
            "analytics.loadError",
            "uri" to loadEventInfo.uri,
            "wasCanceled" to wasCanceled,
            "message" to error.message,
        )
    }
}
