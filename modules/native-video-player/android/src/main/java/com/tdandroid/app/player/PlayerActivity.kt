package com.tdandroid.app.player

import android.app.PictureInPictureParams
import android.content.res.Configuration
import android.media.AudioManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.util.Rational
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.mutableStateOf
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.TrackSelectionOverride
import androidx.media3.common.Tracks
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.mediacodec.MediaCodecUtil
import androidx.media3.exoplayer.mediacodec.MediaCodecRenderer
import androidx.media3.ui.AspectRatioFrameLayout
import com.facebook.react.bridge.Arguments
import com.tdandroid.app.player.ui.PlayerControlsCallbacks
import com.tdandroid.app.player.ui.PlayerControlsState
import com.tdandroid.app.player.ui.PlayerPalette
import com.tdandroid.app.player.ui.PlayerRoot
import com.tdandroid.app.player.ui.TrackOption
import com.tdandroid.app.player.ui.parseThemeColor
import org.json.JSONObject
import kotlin.math.roundToInt

@UnstableApi
class PlayerActivity : ComponentActivity() {

    private var player: ExoPlayer? = null
    private lateinit var config: JSONObject
    private lateinit var settingsJson: JSONObject
    private var gestureController: PlayerGestureController? = null
    private var audioManager: AudioManager? = null
    private var contentId: String? = null
    private var finished = false

    private val progressHandler = Handler(Looper.getMainLooper())
    private val progressRunnable = object : Runnable {
        override fun run() {
            emitProgress()
            progressHandler.postDelayed(this, 1000)
        }
    }

    private val controlsVisible = mutableStateOf(true)
    private val locked = mutableStateOf(false)
    private val paused = mutableStateOf(true)
    private val currentTime = mutableStateOf(0.0)
    private val duration = mutableStateOf(0.0)
    private val volumeIndicator = mutableStateOf<Float?>(null)
    private val brightnessIndicator = mutableStateOf<Float?>(null)
    private val seekPreview = mutableStateOf<Double?>(null)
    private val speedBoostIndicator = mutableStateOf<Float?>(null)
    private var speedBeforeBoost: Float? = null
    private val audioTracks = mutableStateOf<List<TrackOption>>(emptyList())
    private val textTracks = mutableStateOf<List<TrackOption>>(emptyList())

    private val hideHandler = Handler(Looper.getMainLooper())
    private val hideRunnable = Runnable { if (!locked.value) controlsVisible.value = false }

    private var currentBrightness = 0.5f

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        hideSystemBars()

        val raw = intent.getStringExtra(EXTRA_CONFIG_JSON) ?: "{}"
        config = JSONObject(raw)
        settingsJson = config.optJSONObject("settings") ?: JSONObject()
        contentId = config.optString("contentId").takeIf { it.isNotBlank() }

        if (settingsJson.optBoolean("keepScreenAwake", true)) {
            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }

        currentBrightness = window.attributes.screenBrightness.takeIf { it in 0f..1f } ?: 0.5f
        audioManager = getSystemService(AUDIO_SERVICE) as AudioManager

        // Android runs this Activity's onCreate() BEFORE the previous PlayerActivity's
        // onDestroy() during a same-task activity swap (normal lifecycle guarantee, not a
        // bug) — so if a video was just closed and another opened right after, the old
        // ExoPlayer's release() hasn't necessarily run yet when we get here. Confirmed via
        // logcat: the new player's hardware decoder session (Codec2/MediaTek HEVC) started
        // configuring ~100ms BEFORE the old one's decoder stop/destroy landed — two decoder
        // sessions briefly alive at once, and this device's hardware decoder can't serve
        // both, so the second video gets no frames (black screen). Forcing a synchronous
        // release of any still-alive previous player here guarantees full decoder teardown
        // completes before this Activity requests its own decoder session.
        activePlayer?.release()
        activePlayer = null

        val exoPlayer = buildPlayer()
        player = exoPlayer
        activePlayer = exoPlayer

        gestureController = PlayerGestureController(
            context = this,
            settings = GestureSettings(
                gesturesEnabled = settingsJson.optBoolean("gesturesEnabled", true),
                brightnessEnabled = settingsJson.optBoolean("brightnessGestureEnabled", true),
                volumeEnabled = settingsJson.optBoolean("volumeGestureEnabled", true),
                horizontalSeekEnabled = settingsJson.optBoolean("horizontalSeekGestureEnabled", true),
                doubleTapSeekEnabled = settingsJson.optBoolean("doubleTapSeekEnabled", true),
                sensitivity = settingsJson.optDouble("gestureSensitivity", 1.0).toFloat(),
                pressHoldSpeedEnabled = settingsJson.optBoolean("pressHoldSpeedEnabled", true),
            ),
            callbacks = gestureCallbacks(),
            screenWidthPx = resources.displayMetrics.widthPixels,
        )

        val theme = config.optJSONObject("theme") ?: JSONObject()
        val palette = PlayerPalette(
            accent = parseThemeColor(theme.optString("accent", null), PlayerPalette().accent),
            textOnAccent = parseThemeColor(theme.optString("textOnAccent", null), PlayerPalette().textOnAccent),
        )
        val title = config.optString("title", "")
        val hasNextEpisode = config.optBoolean("hasNextEpisode", false)
        val resizeMode = when (settingsJson.optString("resizeMode", "fit")) {
            "fill" -> AspectRatioFrameLayout.RESIZE_MODE_ZOOM
            "crop" -> AspectRatioFrameLayout.RESIZE_MODE_ZOOM
            "stretch" -> AspectRatioFrameLayout.RESIZE_MODE_FILL
            else -> AspectRatioFrameLayout.RESIZE_MODE_FIT
        }

        setContent {
            val controlsState = PlayerControlsState(
                locked = locked.value,
                paused = paused.value,
                currentTime = currentTime.value,
                duration = duration.value,
                title = title,
                hasNextEpisode = hasNextEpisode,
            )

            PlayerRoot(
                player = exoPlayer,
                initialResizeMode = resizeMode,
                palette = palette,
                controlsVisible = controlsVisible.value,
                state = controlsState,
                callbacks = controlsCallbacks(),
                onActivity = { scheduleAutoHide() },
                onScrimTouch = { event -> gestureController?.onTouch(event) ?: false },
                audioTracks = audioTracks.value,
                textTracks = textTracks.value,
                onSelectAudioTrack = { selectTrack(C.TRACK_TYPE_AUDIO, it) },
                onSelectTextTrack = { option ->
                    if (option == null) disableTrackType(C.TRACK_TYPE_TEXT) else selectTrack(C.TRACK_TYPE_TEXT, option)
                },
                volumeLevel = volumeIndicator.value,
                brightnessLevel = brightnessIndicator.value,
                seekPreviewSeconds = seekPreview.value,
                speedBoostLevel = speedBoostIndicator.value,
            )
        }

        loadMedia(config.optDouble("resumePositionSeconds", 0.0))
        scheduleAutoHide()
        progressHandler.post(progressRunnable)
    }

    // -----------------------------------------------------------------
    // Player setup
    // -----------------------------------------------------------------

    private fun buildPlayer(): ExoPlayer {
        val bufferPreference = settingsJson.optString("bufferPreference", "balanced")
        val (minBufferMs, maxBufferMs) = when (bufferPreference) {
            "low" -> 15_000 to 30_000
            "high" -> 30_000 to 90_000
            else -> 20_000 to 50_000
        }
        val loadControl = DefaultLoadControl.Builder()
            .setBufferDurationsMs(minBufferMs, maxBufferMs, 1_000, 2_000)
            .build()
        // PREFER (not ON): several WEB-DL MKVs ship E-AC3/DTS audio with no platform
        // decoder on most phones — video plays but audio silently drops unless the
        // FFmpeg extension renderer (media3-ffmpeg-decoder) is preferred over the
        // platform one whenever both claim support for a track.
        //
        // setEnableDecoderFallback(true): without this, a device that advertises but
        // fails to actually configure a Dolby Vision / HDR10 decoder (common on
        // profile 5/7 DV or flaky vendor HDR codecs) throws instead of retrying with
        // the next-best decoder (e.g. the HEVC base-layer decoder for DV, or an SDR
        // path) — the failure previously surfaced as a silent black screen.
        val renderersFactory = DefaultRenderersFactory(this)
            .setExtensionRendererMode(DefaultRenderersFactory.EXTENSION_RENDERER_MODE_PREFER)
            .setEnableDecoderFallback(true)

        logHdrDecoderCapabilities()

        val audioAttributes = androidx.media3.common.AudioAttributes.Builder()
            .setUsage(C.USAGE_MEDIA)
            .setContentType(C.AUDIO_CONTENT_TYPE_MOVIE)
            .build()

        return ExoPlayer.Builder(this, renderersFactory)
            .setLoadControl(loadControl)
            .setAudioAttributes(audioAttributes, /* handleAudioFocus= */ true)
            .build()
            .apply {
                playWhenReady = false
                addListener(playerListener())
            }
    }

    private fun loadMedia(resumeSeconds: Double) {
        val streamUrl = config.optString("streamUrl")
        val subtitleUrl = config.optString("subtitleUrl").takeIf { it.isNotBlank() }
        val subtitleLanguage = config.optString("subtitleLanguage").takeIf { it.isNotBlank() }

        val mediaItemBuilder = MediaItem.Builder().setUri(Uri.parse(streamUrl))
        if (subtitleUrl != null) {
            val subtitleConfig = MediaItem.SubtitleConfiguration.Builder(Uri.parse(subtitleUrl))
                .setMimeType(if (subtitleUrl.endsWith(".vtt", true)) MimeTypes.TEXT_VTT else MimeTypes.APPLICATION_SUBRIP)
                .setLanguage(subtitleLanguage)
                .setSelectionFlags(C.SELECTION_FLAG_DEFAULT)
                .build()
            mediaItemBuilder.setSubtitleConfigurations(listOf(subtitleConfig))
        }

        player?.apply {
            setMediaItem(mediaItemBuilder.build())
            prepare()
            if (resumeSeconds > 0) seekTo((resumeSeconds * 1000).toLong())
            val speed = settingsJson.optDouble("defaultSpeed", 1.0).toFloat()
            setPlaybackSpeed(speed)
            playWhenReady = true
        }
    }

    private fun playerListener() = object : Player.Listener {
        override fun onIsPlayingChanged(isPlaying: Boolean) {
            paused.value = !isPlaying
        }

        override fun onPlaybackStateChanged(playbackState: Int) {
            if (playbackState == Player.STATE_READY) {
                duration.value = (player?.duration ?: 0L).coerceAtLeast(0L) / 1000.0
            } else if (playbackState == Player.STATE_ENDED) {
                emitEvent("nativePlayerEnded", Arguments.createMap().apply { putContentId() })
                requestNextOrClose()
            }
        }

        override fun onTracksChanged(tracks: Tracks) {
            audioTracks.value = tracksOfType(tracks, C.TRACK_TYPE_AUDIO)
            textTracks.value = tracksOfType(tracks, C.TRACK_TYPE_TEXT)
            logVideoTrackSelection(tracks)
        }

        override fun onPlayerError(error: PlaybackException) {
            logDecoderError(error)
            emitEvent(
                "nativePlayerError",
                Arguments.createMap().apply {
                    putContentId()
                    putString("message", error.message ?: "Playback error")
                    putString("code", error.errorCodeName)
                },
            )
        }
    }

    // -----------------------------------------------------------------
    // HDR / Dolby Vision diagnostics
    // -----------------------------------------------------------------

    /** Logs whether this device advertises DV/HDR10/HDR10+/HLG decoding, before any track is loaded. */
    private fun logHdrDecoderCapabilities() {
        for (mimeType in listOf(MimeTypes.VIDEO_DOLBY_VISION, MimeTypes.VIDEO_H265, MimeTypes.VIDEO_AV1)) {
            try {
                val infos = MediaCodecUtil.getDecoderInfos(mimeType, false, false)
                if (infos.isEmpty()) {
                    Log.w(TAG, "HDR capability check: no decoders found for $mimeType")
                    continue
                }
                infos.forEach { info ->
                    val profiles = info.capabilities?.profileLevels?.joinToString { pl -> "profile=${pl.profile}" } ?: "unknown"
                    Log.i(TAG, "HDR capability check: $mimeType decoder=${info.name} hardware=${info.hardwareAccelerated} secure=${info.secure} $profiles")
                }
            } catch (e: MediaCodecUtil.DecoderQueryException) {
                Log.w(TAG, "HDR capability check failed for $mimeType: ${e.message}")
            }
        }
    }

    /** Logs the codec/HDR profile actually selected for the current video track once tracks resolve. */
    private fun logVideoTrackSelection(tracks: Tracks) {
        tracks.groups.forEach { group ->
            if (group.type != C.TRACK_TYPE_VIDEO) return@forEach
            for (i in 0 until group.length) {
                if (!group.isTrackSelected(i)) continue
                val format = group.getTrackFormat(i)
                val colorInfo = format.colorInfo
                val hdrKind = when {
                    format.sampleMimeType == MimeTypes.VIDEO_DOLBY_VISION -> "DolbyVision"
                    colorInfo?.colorTransfer == C.COLOR_TRANSFER_ST2084 -> "HDR10"
                    colorInfo?.colorTransfer == C.COLOR_TRANSFER_HLG -> "HLG"
                    else -> "SDR"
                }
                Log.i(
                    TAG,
                    "Video track selected: mimeType=${format.sampleMimeType} codecs=${format.codecs} " +
                        "hdrKind=$hdrKind colorSpace=${colorInfo?.colorSpace} colorTransfer=${colorInfo?.colorTransfer} " +
                        "bitDepth=${colorInfo?.lumaBitdepth} resolution=${format.width}x${format.height}",
                )
            }
        }
    }

    /** Logs decoder name + init cause on playback failure, so DV/HDR fallback behavior is traceable. */
    private fun logDecoderError(error: PlaybackException) {
        val cause = error.cause
        if (cause is MediaCodecRenderer.DecoderInitializationException) {
            Log.e(
                TAG,
                "Decoder init failed: mimeType=${cause.mimeType} decoderName=${cause.codecInfo?.name} " +
                    "secureDecoderRequired=${cause.secureDecoderRequired}",
                cause,
            )
        } else {
            Log.e(TAG, "Player error [${error.errorCodeName}]: ${error.message}", error)
        }
    }

    private fun tracksOfType(tracks: Tracks, type: Int): List<TrackOption> {
        val result = mutableListOf<TrackOption>()
        tracks.groups.forEachIndexed { groupIndex, group ->
            if (group.type != type) return@forEachIndexed
            for (i in 0 until group.length) {
                if (!group.isTrackSupported(i)) continue
                val format = group.getTrackFormat(i)
                val label = format.label ?: format.language?.uppercase() ?: "Track ${i + 1}"
                result.add(TrackOption(groupIndex, i, label, group.isTrackSelected(i)))
            }
        }
        return result
    }

    private fun selectTrack(type: Int, option: TrackOption) {
        val exoPlayer = player ?: return
        val group = exoPlayer.currentTracks.groups.getOrNull(option.groupIndex) ?: return
        exoPlayer.trackSelectionParameters = exoPlayer.trackSelectionParameters.buildUpon()
            .setOverrideForType(TrackSelectionOverride(group.mediaTrackGroup, option.indexInGroup))
            .setTrackTypeDisabled(type, false)
            .build()
    }

    private fun disableTrackType(type: Int) {
        val exoPlayer = player ?: return
        exoPlayer.trackSelectionParameters = exoPlayer.trackSelectionParameters.buildUpon()
            .setTrackTypeDisabled(type, true)
            .build()
    }

    // -----------------------------------------------------------------
    // Gesture + control callbacks
    // -----------------------------------------------------------------

    private fun gestureCallbacks() = object : PlayerGestureCallbacks {
        override fun onSingleTap() {
            if (locked.value) return
            controlsVisible.value = !controlsVisible.value
            if (controlsVisible.value) scheduleAutoHide() else hideHandler.removeCallbacks(hideRunnable)
        }

        override fun onDoubleTapSeek(forward: Boolean) {
            if (locked.value) return
            seekBy(settingsJson.optInt("seekDurationSeconds", 10) * if (forward) 1 else -1)
        }

        override fun onBrightnessDelta(delta: Float) {
            if (locked.value) return
            currentBrightness = (currentBrightness + delta).coerceIn(0.01f, 1f)
            window.attributes = window.attributes.apply { screenBrightness = currentBrightness }
            brightnessIndicator.value = currentBrightness
            hideHandler.postDelayed({ brightnessIndicator.value = null }, 800)
        }

        override fun onVolumeDelta(delta: Float) {
            if (locked.value) return
            val am = audioManager ?: return
            val max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
            val current = am.getStreamVolume(AudioManager.STREAM_MUSIC)
            val next = (current + (delta * max).roundToInt()).coerceIn(0, max)
            if (next != current) am.setStreamVolume(AudioManager.STREAM_MUSIC, next, 0)
            volumeIndicator.value = next.toFloat() / max
            hideHandler.postDelayed({ volumeIndicator.value = null }, 800)
        }

        override fun onSeekDrag(deltaSeconds: Double) {
            if (locked.value) return
            seekPreview.value = deltaSeconds
        }

        override fun onSeekCommit(deltaSeconds: Double) {
            if (locked.value) return
            seekPreview.value = null
            seekBy(deltaSeconds.toInt())
        }

        override fun onSpeedBoostStart() {
            if (locked.value) return
            val exoPlayer = player ?: return
            speedBeforeBoost = exoPlayer.playbackParameters.speed
            val multiplier = settingsJson.optDouble("pressHoldSpeedMultiplier", 2.0).toFloat()
            exoPlayer.setPlaybackSpeed(multiplier)
            speedBoostIndicator.value = multiplier
        }

        override fun onSpeedBoostEnd() {
            val exoPlayer = player ?: return
            val restoreSpeed = speedBeforeBoost ?: return
            exoPlayer.setPlaybackSpeed(restoreSpeed)
            speedBeforeBoost = null
            speedBoostIndicator.value = null
        }
    }

    private fun controlsCallbacks() = object : PlayerControlsCallbacks {
        override fun onPlayPause() {
            player?.let { it.playWhenReady = !it.playWhenReady }
        }

        override fun onSeekBack() = seekBy(-settingsJson.optInt("seekDurationSeconds", 10))
        override fun onSeekForward() = seekBy(settingsJson.optInt("seekDurationSeconds", 10))

        override fun onLockToggle() {
            locked.value = !locked.value
            if (!locked.value) scheduleAutoHide()
        }

        override fun onBack() = finishWithResult()

        override fun onNext() = requestNextOrClose()

        override fun onSeekTo(fraction: Float) {
            val dur = player?.duration ?: return
            if (dur <= 0) return
            player?.seekTo((dur * fraction).toLong())
        }

        override fun onAudioTracksClick() = Unit
        override fun onSubtitleTracksClick() = Unit
        override fun onResizeModeClick() = Unit
        override fun onPipClick() = enterPip()
    }

    // -----------------------------------------------------------------
    // Picture-in-picture
    // -----------------------------------------------------------------

    private fun enterPip() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        if (locked.value) return
        val exoPlayer = player
        val width = exoPlayer?.videoFormat?.width ?: 0
        val height = exoPlayer?.videoFormat?.height ?: 0
        val paramsBuilder = PictureInPictureParams.Builder()
        if (width > 0 && height > 0) {
            // Rational requires both bounds within [1, 239] per PictureInPictureParams contract —
            // extreme aspect ratios (e.g. ultrawide test streams) would otherwise crash enterPictureInPictureMode.
            val ratio = Rational(width, height)
            if (ratio.numerator > 0 && ratio.denominator > 0 &&
                ratio.toFloat() in (1f / 2.39f)..2.39f
            ) {
                paramsBuilder.setAspectRatio(ratio)
            }
        }
        try {
            enterPictureInPictureMode(paramsBuilder.build())
        } catch (e: IllegalStateException) {
            Log.w(TAG, "enterPictureInPictureMode failed: ${e.message}")
        }
    }

    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        if (!locked.value && player?.isPlaying == true) enterPip()
    }

    override fun onPictureInPictureModeChanged(isInPictureInPictureMode: Boolean, newConfig: Configuration) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
        // PiP window has no room/need for the controls chrome or gesture hints.
        controlsVisible.value = !isInPictureInPictureMode
        if (isInPictureInPictureMode) {
            hideHandler.removeCallbacks(hideRunnable)
            // Sticky-immersive (hidden system bars) mid-transition is a known trigger on
            // several OEM skins for the compositor leaving a stale black overlay where this
            // window was, instead of revealing the launcher behind the shrunk PiP rect —
            // releasing the hide here avoids it since PiP doesn't need immersive chrome anyway.
            WindowInsetsControllerCompat(window, window.decorView).show(WindowInsetsCompat.Type.systemBars())
        } else {
            scheduleAutoHide()
            hideSystemBars()
        }
        // The RN screen underneath (src/app/player.tsx) is a deliberate blank placeholder —
        // PlayerActivity normally fully covers it. Shrinking into PiP exposes it, so the JS
        // side needs to navigate to a real screen behind the floating PiP window.
        emitEvent(
            "nativePlayerPipModeChanged",
            Arguments.createMap().apply {
                putContentId()
                putBoolean("isInPictureInPicture", isInPictureInPictureMode)
            },
        )
    }

    private fun seekBy(deltaSeconds: Int) {
        val exoPlayer = player ?: return
        val target = (exoPlayer.currentPosition + deltaSeconds * 1000L)
            .coerceIn(0, exoPlayer.duration.coerceAtLeast(0))
        exoPlayer.seekTo(target)
    }

    private fun scheduleAutoHide() {
        hideHandler.removeCallbacks(hideRunnable)
        val autoHideMs = settingsJson.optInt("autoHideMs", 4000)
        if (autoHideMs > 0) hideHandler.postDelayed(hideRunnable, autoHideMs.toLong())
    }

    // -----------------------------------------------------------------
    // Bridge events
    // -----------------------------------------------------------------

    private fun com.facebook.react.bridge.WritableMap.putContentId() {
        putString("contentId", contentId)
    }

    private fun emitEvent(name: String, params: com.facebook.react.bridge.WritableMap) {
        NativePlayerModule.emit(name, params)
    }

    private fun emitProgress() {
        val exoPlayer = player ?: return
        currentTime.value = exoPlayer.currentPosition / 1000.0
        emitEvent(
            "nativePlayerProgress",
            Arguments.createMap().apply {
                putContentId()
                putDouble("currentTime", currentTime.value)
                putDouble("duration", duration.value)
                putBoolean("paused", paused.value)
            },
        )
    }

    private fun requestNextOrClose() {
        emitEvent("nativePlayerRequestNext", Arguments.createMap().apply { putContentId() })
    }

    private fun finishWithResult() {
        if (finished) return
        finished = true
        // Read by MainActivity.onResume() — see its comment for why closing this
        // landscape-locked Activity needs a guaranteed fresh window on the way back.
        returningFromPlayer = true
        val exoPlayer = player
        val finalPosition = (exoPlayer?.currentPosition ?: 0L) / 1000.0
        val finalDuration = (exoPlayer?.duration ?: 0L).coerceAtLeast(0L) / 1000.0
        emitEvent(
            "nativePlayerClosed",
            Arguments.createMap().apply {
                putContentId()
                putDouble("finalPositionSeconds", finalPosition)
                putDouble("finalDurationSeconds", finalDuration)
            },
        )
        finish()
    }

    private fun hideSystemBars() {
        val controller = WindowInsetsControllerCompat(window, window.decorView)
        controller.hide(WindowInsetsCompat.Type.systemBars())
        controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    }

    override fun onBackPressed() {
        finishWithResult()
    }

    override fun onDestroy() {
        progressHandler.removeCallbacks(progressRunnable)
        hideHandler.removeCallbacksAndMessages(null)
        if (!finished) finishWithResult()
        // Only clear the shared reference if nothing newer has already replaced it — a
        // fresh PlayerActivity's onCreate() may have already released this exact instance
        // and installed its own by the time this onDestroy() runs.
        if (activePlayer === player) activePlayer = null
        player?.release()
        player = null
        super.onDestroy()
    }

    companion object {
        const val EXTRA_CONFIG_JSON = "config_json"
        private const val TAG = "NativePlayer"

        // Process-wide — see the onCreate() comment above for why this needs to be
        // synchronously released before building the next PlayerActivity's player.
        private var activePlayer: ExoPlayer? = null

        // Set right before finish(); consumed once by MainActivity.onResume().
        var returningFromPlayer = false
    }
}
