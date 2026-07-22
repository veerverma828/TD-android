package com.tdandroid.app.player

import android.content.Context
import android.net.Uri
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.datasource.HttpDataSource
import androidx.media3.exoplayer.dash.DashMediaSource
import androidx.media3.extractor.DefaultExtractorsFactory
import androidx.media3.exoplayer.hls.HlsMediaSource
import androidx.media3.exoplayer.source.MediaSource
import androidx.media3.exoplayer.source.ProgressiveMediaSource
import androidx.media3.exoplayer.upstream.DefaultLoadErrorHandlingPolicy
import androidx.media3.exoplayer.upstream.LoadErrorHandlingPolicy
import kotlin.math.min

/**
 * Builds the MediaItem + MediaSource for a stream URL.
 *
 * Beyond ExoPlayer's default extension-based inference, this explicitly detects
 * HLS (.m3u8) and DASH (.mpd) URLs and routes them to the matching MediaSource —
 * some Stremio addons hand back manifest URLs with no/odd extensions, and without
 * this the player has no compatible source and fails immediately ("unsupported
 * format") instead of playing. Everything else (MP4/MKV/WebM/TS progressive and
 * local files) goes through a DefaultExtractorsFactory tuned to tolerate unusual
 * container metadata rather than throwing.
 */
@UnstableApi
object MediaSourceFactory {

    fun buildMediaItem(
        streamUrl: String,
        subtitleUrl: String?,
        subtitleLanguage: String?,
    ): MediaItem {
        val builder = MediaItem.Builder().setUri(Uri.parse(streamUrl))
        if (subtitleUrl != null) {
            val subtitleConfig = MediaItem.SubtitleConfiguration.Builder(Uri.parse(subtitleUrl))
                .setMimeType(if (subtitleUrl.endsWith(".vtt", true)) MimeTypes.TEXT_VTT else MimeTypes.APPLICATION_SUBRIP)
                .setLanguage(subtitleLanguage)
                .setSelectionFlags(C.SELECTION_FLAG_DEFAULT)
                .build()
            builder.setSubtitleConfigurations(listOf(subtitleConfig))
        }
        return builder.build()
    }

    fun buildMediaSource(context: Context, mediaItem: MediaItem, streamUrl: String): MediaSource {
        val httpDataSourceFactory = DefaultHttpDataSource.Factory()
            .setConnectTimeoutMs(15_000)
            .setReadTimeoutMs(15_000)
            .setAllowCrossProtocolRedirects(true)
        val dataSourceFactory = DefaultDataSource.Factory(context, httpDataSourceFactory)
        val errorHandlingPolicy = StreamingLoadErrorHandlingPolicy()

        val lowerUrl = streamUrl.lowercase()
        return when {
            lowerUrl.contains(".m3u8") -> {
                PlaybackLogger.event("mediaSource.selected", "type" to "hls", "url" to streamUrl)
                HlsMediaSource.Factory(dataSourceFactory)
                    .setLoadErrorHandlingPolicy(errorHandlingPolicy)
                    .createMediaSource(mediaItem)
            }
            lowerUrl.contains(".mpd") -> {
                PlaybackLogger.event("mediaSource.selected", "type" to "dash", "url" to streamUrl)
                DashMediaSource.Factory(dataSourceFactory)
                    .setLoadErrorHandlingPolicy(errorHandlingPolicy)
                    .createMediaSource(mediaItem)
            }
            else -> {
                PlaybackLogger.event("mediaSource.selected", "type" to "progressive", "url" to streamUrl)
                val extractorsFactory = DefaultExtractorsFactory()
                    .setConstantBitrateSeekingEnabled(true)
                    .setConstantBitrateSeekingAlwaysEnabled(true)
                ProgressiveMediaSource.Factory(dataSourceFactory, extractorsFactory)
                    .setLoadErrorHandlingPolicy(errorHandlingPolicy)
                    .createMediaSource(mediaItem)
            }
        }
    }
}

/**
 * Tuned for HTTP/torrent-relay streaming: brief stalls (relay hasn't buffered
 * the next torrent piece yet, transient network blip) should retry with backoff
 * instead of failing the whole playback. Non-retryable HTTP responses (404/403/
 * 410/451 — dead link, revoked debrid link, geo-block) give up immediately
 * instead of burning retries on something that will never succeed.
 */
private class StreamingLoadErrorHandlingPolicy : DefaultLoadErrorHandlingPolicy() {
    private val maxRetries = 6

    override fun getRetryDelayMsFor(loadErrorInfo: LoadErrorHandlingPolicy.LoadErrorInfo): Long {
        val exception = loadErrorInfo.exception
        if (exception is HttpDataSource.InvalidResponseCodeException) {
            val code = exception.responseCode
            if (code == 403 || code == 404 || code == 410 || code == 451) {
                PlaybackLogger.warn("mediaSource.retry.abandoned", "httpCode" to code)
                return C.TIME_UNSET
            }
        }
        if (loadErrorInfo.errorCount > maxRetries) {
            PlaybackLogger.warn("mediaSource.retry.exhausted", "attempts" to loadErrorInfo.errorCount)
            return C.TIME_UNSET
        }
        val delay = min(1000L shl (loadErrorInfo.errorCount - 1), 8_000L)
        PlaybackLogger.event("mediaSource.retry", "attempt" to loadErrorInfo.errorCount, "delayMs" to delay)
        return delay
    }

    override fun getMinimumLoadableRetryCount(dataType: Int): Int = maxRetries
}
