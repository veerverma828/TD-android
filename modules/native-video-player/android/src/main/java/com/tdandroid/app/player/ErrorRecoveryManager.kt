package com.tdandroid.app.player

import androidx.media3.common.PlaybackException
import androidx.media3.exoplayer.mediacodec.MediaCodecRenderer

/**
 * Owns playback-error classification and recovery. Nothing here loops forever:
 * each recovery path is tried at most once (decoder rebuild) or a small bounded
 * number of times (IO/network retry) before giving up and surfacing a real error
 * to JS — matching "retry intelligently, do not loop forever, never leave the
 * player in a crashed/unrecoverable state."
 *
 * MediaSourceFactory's LoadErrorHandlingPolicy already retries transient loader-level
 * IO errors with backoff; if THAT is exhausted and the error still reaches here,
 * this does one bounded extra attempt at re-preparing from the last known position
 * (covers e.g. a torrent relay that dropped the connection entirely and needs a
 * fresh HTTP request, not just a retried chunk load).
 */
class ErrorRecoveryManager(private val callbacks: Callbacks) {

    interface Callbacks {
        fun retryPrepareAtCurrentPosition()
        fun rebuildPlayerAfterDecoderFailure()
        fun reportFatalError(message: String, code: String)
    }

    private enum class Classification { DECODER_INIT, IO_NETWORK, UNSUPPORTED, OTHER }

    private var ioRetryCount = 0
    private var decoderRebuildAttempted = false

    /** Call when a new media item starts loading successfully, so a later error gets a fresh retry budget. */
    fun reset() {
        ioRetryCount = 0
        decoderRebuildAttempted = false
    }

    fun handle(error: PlaybackException) {
        val classification = classify(error)
        val cause = error.cause
        val decoderName = (cause as? MediaCodecRenderer.DecoderInitializationException)?.codecInfo?.name
        PlaybackLogger.error(
            "player.error",
            error,
            "classification" to classification,
            "errorCode" to error.errorCodeName,
            "decoderName" to decoderName,
        )

        when (classification) {
            Classification.DECODER_INIT -> {
                if (!decoderRebuildAttempted) {
                    decoderRebuildAttempted = true
                    PlaybackLogger.warn("player.recovery.decoderRebuild", "previousDecoder" to decoderName)
                    callbacks.rebuildPlayerAfterDecoderFailure()
                } else {
                    fail(error)
                }
            }
            Classification.IO_NETWORK -> {
                if (ioRetryCount < MAX_IO_RETRIES) {
                    ioRetryCount++
                    PlaybackLogger.warn("player.recovery.ioRetry", "attempt" to ioRetryCount, "max" to MAX_IO_RETRIES)
                    callbacks.retryPrepareAtCurrentPosition()
                } else {
                    fail(error)
                }
            }
            Classification.UNSUPPORTED, Classification.OTHER -> fail(error)
        }
    }

    private fun fail(error: PlaybackException) {
        callbacks.reportFatalError(error.message ?: "Playback error", error.errorCodeName)
    }

    private fun classify(error: PlaybackException): Classification = when (error.errorCode) {
        PlaybackException.ERROR_CODE_DECODER_INIT_FAILED,
        PlaybackException.ERROR_CODE_DECODER_QUERY_FAILED,
        PlaybackException.ERROR_CODE_DECODING_FAILED,
        -> Classification.DECODER_INIT

        PlaybackException.ERROR_CODE_DECODING_FORMAT_EXCEEDS_CAPABILITIES,
        PlaybackException.ERROR_CODE_DECODING_FORMAT_UNSUPPORTED,
        PlaybackException.ERROR_CODE_PARSING_CONTAINER_MALFORMED,
        PlaybackException.ERROR_CODE_PARSING_MANIFEST_MALFORMED,
        PlaybackException.ERROR_CODE_PARSING_CONTAINER_UNSUPPORTED,
        PlaybackException.ERROR_CODE_PARSING_MANIFEST_UNSUPPORTED,
        -> Classification.UNSUPPORTED

        in 2000..2999 -> Classification.IO_NETWORK

        else -> Classification.OTHER
    }

    private companion object {
        const val MAX_IO_RETRIES = 2
    }
}
