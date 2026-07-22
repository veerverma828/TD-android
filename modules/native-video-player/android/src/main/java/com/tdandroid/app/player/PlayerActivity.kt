package com.tdandroid.app.player

import android.app.PictureInPictureParams
import android.content.pm.ActivityInfo
import android.content.res.Configuration
import android.media.AudioManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.util.Rational
import android.view.KeyEvent
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.addCallback
import androidx.activity.compose.setContent
import androidx.compose.runtime.mutableStateOf
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.media3.common.C
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.Tracks
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.mediacodec.MediaCodecUtil
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

/**
 * Thin controller: owns Activity lifecycle, wires gesture/PiP/Compose callbacks
 * to the ExoPlayer instance, and delegates media-source construction, track
 * handling, buffering, and error recovery to dedicated collaborators
 * (MediaSourceFactory, TrackManager, BufferManager, ErrorRecoveryManager,
 * PlaybackAnalyticsListener) instead of owning that logic itself.
 */
@UnstableApi
class PlayerActivity : ComponentActivity() {

    private var player: ExoPlayer? = null
    private lateinit var config: JSONObject
    private lateinit var settingsJson: JSONObject
    private var gestureController: PlayerGestureController? = null
    private var audioManager: AudioManager? = null
    private var contentId: String? = null
    private var finished = false
    // Observable (drives PlayerRoot's surface_type swap - see onPictureInPictureModeChanged)
    // rather than a plain var, so Compose recomposes with the PiP-specific PlayerView.
    private val inPictureInPicture = mutableStateOf(false)
    private var wasPlayingBeforeStop = false

    private val errorRecoveryManager = ErrorRecoveryManager(object : ErrorRecoveryManager.Callbacks {
        override fun retryPrepareAtCurrentPosition() {
            player?.apply {
                val position = currentPosition
                prepare()
                seekTo(position)
                playWhenReady = true
            }
        }

        override fun rebuildPlayerAfterDecoderFailure() = rebuildPlayer()

        override fun reportFatalError(message: String, code: String) {
            emitEvent(
                "nativePlayerError",
                Arguments.createMap().apply {
                    putContentId()
                    putString("message", message)
                    putString("code", code)
                },
            )
        }
    })

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

    // Backs the AndroidView(player=...) below — rebuilding the ExoPlayer instance
    // (decoder-failure recovery) needs Compose to recompose with the new instance,
    // so the player reference itself must be observable state, not a plain val.
    private val playerState = mutableStateOf<ExoPlayer?>(null)

    private val hideHandler = Handler(Looper.getMainLooper())
    private val hideRunnable = Runnable { if (!locked.value) controlsVisible.value = false }

    // True while a track-selection menu is open — scheduleAutoHide() no-ops while this is
    // set (menus cover the overlay; hiding it underneath would surface abruptly on close).
    private var menuOpen = false

    private var currentBrightness = 0.5f

    private val tvRemoteController = TvRemoteInputController(object : TvRemoteCallbacks {
        override fun isControlsVisible() = controlsVisible.value
        override fun isLocked() = locked.value
        override fun showControlsForNavigation() { controlsVisible.value = true }
        override fun onInteraction() = scheduleAutoHide()
        override fun onPlayPauseToggle() = togglePlayPause()
        override fun onFastForwardHoldStart() = startSpeedBoost()
        override fun onFastForwardHoldEnd() = endSpeedBoost()
    })

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        hideSystemBars()

        // Registered here (before Compose's setContent) so it sits at lower priority than
        // PlayerRoot's own BackHandler — that one intercepts first once composed (menu-close /
        // hide-controls / exit chain) and this only fires when nothing else claims Back.
        // Overriding onBackPressed() directly instead of using the dispatcher would bypass
        // that chain entirely for any device still routing Back through the legacy path
        // (TV remote, 3-button nav) since it doesn't call through to Compose's callback.
        onBackPressedDispatcher.addCallback(this) {
            android.util.Log.d("BackDebug", "Activity-level dispatcher fallback fired (Compose BackHandler did not intercept)")
            finishWithResult()
        }

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
        // onDestroy() during a same-task activity swap — so if a video was just closed
        // and another opened right after, the old ExoPlayer's release() hasn't necessarily
        // run yet. Synchronously stop, clear surface & media items, and release any alive
        // previous ExoPlayer instance so hardware decoder resources are freed before building
        // a new player instance.
        lastPlayer?.let { previous ->
            try {
                previous.stop()
                previous.clearMediaItems()
                previous.clearVideoSurface()
                previous.release()
            } catch (e: Exception) {
                Log.w(TAG, "Error tearing down previous ExoPlayer: ${e.message}")
            }
        }
        lastPlayer = null
        activePlayer = null

        val exoPlayer = buildPlayer()
        player = exoPlayer
        activePlayer = exoPlayer
        lastPlayer = exoPlayer
        playerState.value = exoPlayer

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
            val activePlayerValue = playerState.value ?: return@setContent
            val controlsState = PlayerControlsState(
                locked = locked.value,
                paused = paused.value,
                currentTime = currentTime.value,
                duration = duration.value,
                title = title,
                hasNextEpisode = hasNextEpisode,
            )

            PlayerRoot(
                player = activePlayerValue,
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
                isInPictureInPicture = inPictureInPicture.value,
                onMenuOpenChanged = { open -> onMenuOpenChanged(open) },
                onHideControls = {
                    controlsVisible.value = false
                    hideHandler.removeCallbacks(hideRunnable)
                },
            )
        }

        loadMedia(config.optDouble("resumePositionSeconds", 0.0))
        scheduleAutoHide()
    }

    override fun onStart() {
        super.onStart()
        progressHandler.removeCallbacks(progressRunnable)
        progressHandler.post(progressRunnable)
        if (!inPictureInPicture.value && wasPlayingBeforeStop) {
            player?.play()
        }
    }

    override fun onStop() {
        super.onStop()
        // PiP keeps the decoder running by design (that's the whole point of PiP) — only
        // pause when actually backgrounded, otherwise a home-press / app-switch would leave
        // the decoder decoding frames nobody can see (battery drain, wasted CPU, ANR risk
        // if it fights the system for resources while not foregrounded).
        if (!inPictureInPicture.value) {
            wasPlayingBeforeStop = player?.isPlaying == true
            player?.pause()
            progressHandler.removeCallbacks(progressRunnable)
        }
    }

    // -----------------------------------------------------------------
    // Player setup
    // -----------------------------------------------------------------

    private fun buildPlayer(): ExoPlayer {
        val loadControl = BufferManager.buildLoadControl(this, settingsJson.optString("bufferPreference", "balanced"))

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
                addAnalyticsListener(PlaybackAnalyticsListener(onHdrChanged = ::applyHdrColorMode))
            }
    }

    /**
     * HDR video (Dolby Vision/HDR10/HLG) uses a different brightness curve (PQ/HLG) than SDR.
     * Without switching the window into HDR color mode, Android composites HDR pixel data
     * through the normal SDR pipeline — the decoder output is correct, but the screen renders
     * it dark/washed out. COLOR_MODE_HDR is a request, not a guarantee; unsupported
     * displays/devices silently ignore it, so this is safe to call unconditionally.
     */
    private fun applyHdrColorMode(isHdr: Boolean) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val targetMode = if (isHdr) ActivityInfo.COLOR_MODE_HDR else ActivityInfo.COLOR_MODE_DEFAULT
        if (window.colorMode == targetMode) return
        window.colorMode = targetMode
        PlaybackLogger.event("display.colorMode", "hdr" to isHdr)
    }

    /** Decoder-init failures aren't always recoverable in-place — a fresh ExoPlayer instance
     * re-triggers renderer selection from scratch, which is what actually picks a different
     * decoder path (a bare retry on the same instance replays the same failure). */
    private fun rebuildPlayer() {
        val oldPlayer = player
        val resumePositionMs = oldPlayer?.currentPosition ?: 0L
        try {
            oldPlayer?.stop()
            oldPlayer?.clearMediaItems()
            oldPlayer?.clearVideoSurface()
            oldPlayer?.release()
        } catch (e: Exception) {
            Log.w(TAG, "Error releasing ExoPlayer during recovery rebuild: ${e.message}")
        }

        val newPlayer = buildPlayer()
        player = newPlayer
        activePlayer = newPlayer
        lastPlayer = newPlayer
        playerState.value = newPlayer
        loadMedia(resumePositionMs / 1000.0)
    }

    private fun loadMedia(resumeSeconds: Double) {
        val streamUrl = config.optString("streamUrl")
        val subtitleUrl = config.optString("subtitleUrl").takeIf { it.isNotBlank() }
        val subtitleLanguage = config.optString("subtitleLanguage").takeIf { it.isNotBlank() }

        val mediaItem = MediaSourceFactory.buildMediaItem(streamUrl, subtitleUrl, subtitleLanguage)
        val mediaSource = MediaSourceFactory.buildMediaSource(this, mediaItem, streamUrl)

        player?.apply {
            setMediaSource(mediaSource)
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
                // Reached READY again after a prior error path (or never errored at all) —
                // give a future error a fresh recovery budget instead of inheriting stale counts.
                errorRecoveryManager.reset()
            } else if (playbackState == Player.STATE_ENDED) {
                emitEvent("nativePlayerEnded", Arguments.createMap().apply { putContentId() })
                requestNextOrClose()
            }
        }

        override fun onTracksChanged(tracks: Tracks) {
            audioTracks.value = TrackManager.tracksOfType(tracks, C.TRACK_TYPE_AUDIO)
            textTracks.value = TrackManager.tracksOfType(tracks, C.TRACK_TYPE_TEXT)
        }

        override fun onPlayerError(error: PlaybackException) {
            errorRecoveryManager.handle(error)
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
                    PlaybackLogger.warn("hdr.capabilityCheck", "mimeType" to mimeType, "result" to "noDecoders")
                    continue
                }
                infos.forEach { info ->
                    PlaybackLogger.event(
                        "hdr.capabilityCheck",
                        "mimeType" to mimeType,
                        "decoder" to info.name,
                        "hardware" to info.hardwareAccelerated,
                        "secure" to info.secure,
                    )
                }
            } catch (e: MediaCodecUtil.DecoderQueryException) {
                PlaybackLogger.warn("hdr.capabilityCheck", "mimeType" to mimeType, "error" to e.message)
            }
        }
    }

    private fun selectTrack(type: Int, option: TrackOption) {
        val exoPlayer = player ?: return
        TrackManager.selectTrack(exoPlayer, type, option)
    }

    private fun disableTrackType(type: Int) {
        val exoPlayer = player ?: return
        TrackManager.disableTrackType(exoPlayer, type)
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
            startSpeedBoost()
        }

        override fun onSpeedBoostEnd() = endSpeedBoost()
    }

    // Shared by touch press-hold (gestureCallbacks above) and the TV remote's OK-hold
    // (tvRemoteController below) — one implementation, two input sources.
    private fun startSpeedBoost() {
        val exoPlayer = player ?: return
        speedBeforeBoost = exoPlayer.playbackParameters.speed
        val multiplier = settingsJson.optDouble("pressHoldSpeedMultiplier", 2.0).toFloat()
        exoPlayer.setPlaybackSpeed(multiplier)
        speedBoostIndicator.value = multiplier
    }

    private fun endSpeedBoost() {
        val exoPlayer = player ?: return
        val restoreSpeed = speedBeforeBoost ?: return
        exoPlayer.setPlaybackSpeed(restoreSpeed)
        speedBeforeBoost = null
        speedBoostIndicator.value = null
    }

    private fun togglePlayPause() {
        player?.let { it.playWhenReady = !it.playWhenReady }
    }

    private fun controlsCallbacks() = object : PlayerControlsCallbacks {
        override fun onPlayPause() = togglePlayPause()

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
        inPictureInPicture.value = isInPictureInPictureMode
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
        if (menuOpen) return
        val autoHideMs = settingsJson.optInt("autoHideMs", 5000)
        if (autoHideMs > 0) hideHandler.postDelayed(hideRunnable, autoHideMs.toLong())
    }

    /** Passed to PlayerRoot — pauses/resumes the auto-hide timer around a track-selection menu. */
    private fun onMenuOpenChanged(open: Boolean) {
        menuOpen = open
        if (open) hideHandler.removeCallbacks(hideRunnable) else scheduleAutoHide()
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

    // Single centralized interception point for all TV remote key handling — delegates
    // entirely to TvRemoteInputController so DPAD/OK logic lives in one testable place
    // instead of scattered across key-event listeners.
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.keyCode == KeyEvent.KEYCODE_BACK) {
            android.util.Log.d("BackDebug", "Activity.dispatchKeyEvent BACK action=${event.action}")
        }
        if (tvRemoteController.dispatchKeyEvent(event)) return true
        val result = super.dispatchKeyEvent(event)
        if (event.keyCode == KeyEvent.KEYCODE_BACK) {
            android.util.Log.d("BackDebug", "Activity.dispatchKeyEvent BACK super result=$result")
        }
        return result
    }

    override fun onDestroy() {
        progressHandler.removeCallbacks(progressRunnable)
        hideHandler.removeCallbacksAndMessages(null)
        if (!finished) finishWithResult()
        player?.let { p ->
            try {
                p.stop()
                p.clearMediaItems()
                p.clearVideoSurface()
                p.release()
            } catch (e: Exception) {
                Log.w(TAG, "Error releasing ExoPlayer in onDestroy: ${e.message}")
            }
        }
        if (activePlayer === player) activePlayer = null
        if (lastPlayer === player) lastPlayer = null
        player = null
        playerState.value = null
        super.onDestroy()
    }

    companion object {
        const val EXTRA_CONFIG_JSON = "config_json"
        private const val TAG = "NativePlayer"

        // Process-wide — see the onCreate() comment above for why this needs to be
        // synchronously released before building the next PlayerActivity's player.
        private var activePlayer: ExoPlayer? = null
        private var lastPlayer: ExoPlayer? = null

        // Set right before finish(); consumed once by MainActivity.onResume().
        var returningFromPlayer = false
    }
}
