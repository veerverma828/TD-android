package com.tdandroid.app.player.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.AspectRatio
import androidx.compose.material.icons.filled.Audiotrack
import androidx.compose.material.icons.filled.Brightness6
import androidx.compose.material.icons.filled.Forward10
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.LockOpen
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PictureInPictureAlt
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Replay10
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.Subtitles
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.toArgb
import androidx.media3.ui.CaptionStyleCompat
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import android.app.UiModeManager
import android.content.Context
import android.content.res.Configuration
import kotlin.math.roundToInt

// ---------------------------------------------------------------------------
// TV device detection — gates auto-focus/focus-ring so touch phones don't
// show a "hovering" highlighted row by default (only real TV needs it for
// d-pad navigation).
// ---------------------------------------------------------------------------

fun isTvDevice(context: Context): Boolean {
    val uiModeManager = context.getSystemService(Context.UI_MODE_SERVICE) as? UiModeManager
    return uiModeManager?.currentModeType == Configuration.UI_MODE_TYPE_TELEVISION
}

// ---------------------------------------------------------------------------
// TV focus-ring visual — mirrors the RN side's TVFocusRing.tsx contract
// (scale-up + accent border, animated) using Compose's own focus/key APIs.
// Purely visual; navigation itself is Compose's default focus traversal.
// ---------------------------------------------------------------------------

@Composable
fun Modifier.tvFocusRing(accent: Color, shape: Shape = CircleShape): Modifier {
    var isFocused by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(if (isFocused) 1.08f else 1f, label = "tvFocusScale")
    val borderAlpha by animateFloatAsState(if (isFocused) 1f else 0f, label = "tvFocusBorderAlpha")
    return this
        .onFocusChanged { isFocused = it.isFocused }
        .scale(scale)
        .border(width = 2.dp, color = accent.copy(alpha = borderAlpha), shape = shape)
        .focusable()
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

data class PlayerPalette(
    val accent: Color = Color(0xFF3B82F6),
    val textOnAccent: Color = Color.White,
)

val LocalPlayerPalette = compositionLocalOf { PlayerPalette() }

fun parseThemeColor(hex: String?, fallback: Color): Color {
    if (hex.isNullOrBlank()) return fallback
    return try {
        Color(android.graphics.Color.parseColor(hex))
    } catch (e: IllegalArgumentException) {
        fallback
    }
}

// ---------------------------------------------------------------------------
// Contracts shared with PlayerActivity
// ---------------------------------------------------------------------------

data class TrackOption(
    val groupIndex: Int,
    val indexInGroup: Int,
    val label: String,
    val selected: Boolean,
)

data class PlayerControlsState(
    val locked: Boolean,
    val paused: Boolean,
    val currentTime: Double,
    val duration: Double,
    val title: String,
    val hasNextEpisode: Boolean,
)

interface PlayerControlsCallbacks {
    fun onPlayPause()
    fun onSeekBack()
    fun onSeekForward()
    fun onLockToggle()
    fun onBack()
    fun onNext()
    fun onSeekTo(fraction: Float)
    fun onAudioTracksClick()
    fun onSubtitleTracksClick()
    fun onResizeModeClick()
    fun onPipClick()
}

enum class TrackSheetKind { AUDIO, TEXT }

data class ResizeOption(val label: String, val mode: Int)

val ResizeOptions = listOf(
    ResizeOption("Fit", AspectRatioFrameLayout.RESIZE_MODE_FIT),
    ResizeOption("Crop", AspectRatioFrameLayout.RESIZE_MODE_ZOOM),
    ResizeOption("Stretch", AspectRatioFrameLayout.RESIZE_MODE_FILL),
)

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

@UnstableApi
@Composable
fun PlayerRoot(
    player: ExoPlayer,
    initialResizeMode: Int,
    palette: PlayerPalette,
    controlsVisible: Boolean,
    state: PlayerControlsState,
    callbacks: PlayerControlsCallbacks,
    onActivity: () -> Unit,
    onScrimTouch: (android.view.MotionEvent) -> Boolean,
    audioTracks: List<TrackOption>,
    textTracks: List<TrackOption>,
    onSelectAudioTrack: (TrackOption) -> Unit,
    onSelectTextTrack: (TrackOption?) -> Unit,
    volumeLevel: Float?,
    brightnessLevel: Float?,
    seekPreviewSeconds: Double?,
    speedBoostLevel: Float?,
) {
    var tracksSheetKind by remember { mutableStateOf<TrackSheetKind?>(null) }
    var resizeMode by remember { mutableStateOf(initialResizeMode) }
    var resizeToast by remember { mutableStateOf<Pair<Int, String>?>(null) }

    CompositionLocalProvider(LocalPlayerPalette provides palette) {
        Box(Modifier.fillMaxSize().background(Color.Black)) {
            AndroidView(
                modifier = Modifier.fillMaxSize(),
                factory = { ctx ->
                    // Inflated (not `PlayerView(ctx)`) so the texture_view surface_type from
                    // the XML applies — see res/layout/player_view.xml for why (PiP black-screen fix).
                    (android.view.LayoutInflater.from(ctx).inflate(com.tdandroid.app.player.R.layout.player_view, null) as PlayerView).apply {
                        this.player = player
                        useController = false
                        this.resizeMode = resizeMode
                        subtitleView?.setStyle(
                            CaptionStyleCompat(
                                Color.White.toArgb(),
                                Color.Transparent.toArgb(),
                                Color.Transparent.toArgb(),
                                CaptionStyleCompat.EDGE_TYPE_OUTLINE,
                                Color.Black.toArgb(),
                                null,
                            ),
                        )
                    }
                },
                update = { view ->
                    view.player = player
                    view.resizeMode = resizeMode
                },
            )

            // Gesture-catching scrim — ALWAYS present regardless of controls visibility,
            // so volume/brightness/seek swipes keep working while controls are hidden.
            // Drawn BELOW the controls chrome (added first = lowest z) so button taps
            // are claimed by the buttons themselves; empty areas fall through to here.
            // Uses pointerInput+awaitEachGesture (NOT pointerInteropFilter — unreliable
            // when combined with sibling pointer-input nodes) keyed on Unit so the
            // gesture-tracking coroutine survives recomposition.
            Box(
                Modifier
                    .fillMaxSize()
                    .pointerInput(Unit) {
                        awaitEachGesture {
                            val downTime = android.os.SystemClock.uptimeMillis()
                            val down = awaitFirstDown(requireUnconsumed = false)
                            val downEvent = android.view.MotionEvent.obtain(
                                downTime, downTime, android.view.MotionEvent.ACTION_DOWN,
                                down.position.x, down.position.y, 0,
                            )
                            // Do NOT recycle these — GestureDetector (PlayerGestureController)
                            // posts a delayed message to confirm single-tap vs double-tap and
                            // may still hold a reference past this call. Recycling here returns
                            // the MotionEvent to Android's pool, which can silently corrupt it
                            // before that delayed check runs, dropping single-tap detection.
                            onScrimTouch(downEvent)
                            down.consume()
                            while (true) {
                                val event = awaitPointerEvent()
                                val change = event.changes.firstOrNull { it.id == down.id } ?: break
                                val eventTime = android.os.SystemClock.uptimeMillis()
                                val action = if (change.pressed) android.view.MotionEvent.ACTION_MOVE else android.view.MotionEvent.ACTION_UP
                                val moveEvent = android.view.MotionEvent.obtain(
                                    downTime, eventTime, action,
                                    change.position.x, change.position.y, 0,
                                )
                                onScrimTouch(moveEvent)
                                change.consume()
                                if (!change.pressed) break
                            }
                        }
                    },
            )

            PlayerControlsOverlay(
                visible = controlsVisible,
                state = state,
                callbacks = object : PlayerControlsCallbacks {
                    override fun onPlayPause() = callbacks.onPlayPause()
                    override fun onSeekBack() = callbacks.onSeekBack()
                    override fun onSeekForward() = callbacks.onSeekForward()
                    override fun onLockToggle() = callbacks.onLockToggle()
                    override fun onBack() = callbacks.onBack()
                    override fun onNext() = callbacks.onNext()
                    override fun onSeekTo(fraction: Float) = callbacks.onSeekTo(fraction)
                    override fun onAudioTracksClick() {
                        tracksSheetKind = TrackSheetKind.AUDIO
                    }
                    override fun onSubtitleTracksClick() {
                        tracksSheetKind = TrackSheetKind.TEXT
                    }
                    override fun onResizeModeClick() {
                        val currentIndex = ResizeOptions.indexOfFirst { it.mode == resizeMode }.coerceAtLeast(0)
                        val next = ResizeOptions[(currentIndex + 1) % ResizeOptions.size]
                        resizeMode = next.mode
                        resizeToast = ((resizeToast?.first ?: 0) + 1) to next.label
                    }
                    override fun onPipClick() = callbacks.onPipClick()
                },
                onActivity = onActivity,
            )

            VolumeIndicator(level = volumeLevel)
            BrightnessIndicator(level = brightnessLevel)
            SeekIndicator(deltaSeconds = seekPreviewSeconds)
            SpeedBoostIndicator(multiplier = speedBoostLevel)
            ResizeModeToast(toast = resizeToast, onExpire = { resizeToast = null })

            tracksSheetKind?.let { kind ->
                TrackSelectionSheet(
                    kind = kind,
                    audioTracks = audioTracks,
                    textTracks = textTracks,
                    onSelectAudio = { onSelectAudioTrack(it) },
                    onSelectText = { onSelectTextTrack(it) },
                    onDismiss = { tracksSheetKind = null },
                )
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Controls overlay chrome — pure buttons/bars, no gesture handling of its own.
// Tap-outside-to-hide / tap-to-show and swipe gestures are handled by the
// always-on scrim in PlayerRoot underneath this; buttons here simply sit on
// top of it in z-order, so Compose hit-testing gives them priority.
// ---------------------------------------------------------------------------

@Composable
fun PlayerControlsOverlay(
    visible: Boolean,
    state: PlayerControlsState,
    callbacks: PlayerControlsCallbacks,
    onActivity: () -> Unit,
) {
    val palette = LocalPlayerPalette.current

    if (state.locked) {
        val unlockFocus = remember { FocusRequester() }
        LaunchedEffect(visible) { if (visible) unlockFocus.requestFocus() }
        AnimatedVisibility(visible = visible, enter = fadeIn(), exit = fadeOut()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.BottomEnd) {
                IconButton(
                    onClick = { callbacks.onLockToggle(); onActivity() },
                    modifier = Modifier.padding(24.dp).focusRequester(unlockFocus).tvFocusRing(palette.accent),
                ) {
                    Icon(Icons.Filled.Lock, contentDescription = "Unlock", tint = Color.White)
                }
            }
        }
        return
    }

    // One FocusRequester per control, plus a remembered "last focused" one so
    // re-showing the overlay (after tap-to-hide) restores focus to whichever
    // control the user was on, instead of always resetting — the native-side
    // mirror of the RN app's useRestoreFocus.
    val backFocus = remember { FocusRequester() }
    val resizeFocus = remember { FocusRequester() }
    val audioFocus = remember { FocusRequester() }
    val subsFocus = remember { FocusRequester() }
    val lockFocus = remember { FocusRequester() }
    val pipFocus = remember { FocusRequester() }
    val seekBackFocus = remember { FocusRequester() }
    val playPauseFocus = remember { FocusRequester() }
    val seekForwardFocus = remember { FocusRequester() }
    val nextFocus = remember { FocusRequester() }
    val sliderFocus = remember { FocusRequester() }
    var lastFocused by remember { mutableStateOf(playPauseFocus) }

    LaunchedEffect(visible) { if (visible) lastFocused.requestFocus() }

    AnimatedVisibility(visible = visible, enter = fadeIn(), exit = fadeOut()) {
        Box(Modifier.fillMaxSize()) {
            // Top gradient bar
            Row(
                Modifier
                    .fillMaxWidth()
                    .background(Brush.verticalGradient(listOf(Color.Black.copy(alpha = 0.6f), Color.Transparent)))
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(
                    onClick = { callbacks.onBack(); onActivity() },
                    modifier = Modifier.focusRequester(backFocus)
                        .onFocusChanged { if (it.isFocused) lastFocused = backFocus }
                        .tvFocusRing(palette.accent),
                ) {
                    Icon(Icons.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
                }
                Text(
                    state.title,
                    color = Color.White,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(start = 4.dp).weight(1f),
                )
                IconButton(
                    onClick = { callbacks.onResizeModeClick(); onActivity() },
                    modifier = Modifier.focusRequester(resizeFocus)
                        .onFocusChanged { if (it.isFocused) lastFocused = resizeFocus }
                        .tvFocusRing(palette.accent),
                ) {
                    Icon(Icons.Filled.AspectRatio, contentDescription = "Video fit", tint = Color.White)
                }
                IconButton(
                    onClick = { callbacks.onAudioTracksClick(); onActivity() },
                    modifier = Modifier.focusRequester(audioFocus)
                        .onFocusChanged { if (it.isFocused) lastFocused = audioFocus }
                        .tvFocusRing(palette.accent),
                ) {
                    Icon(Icons.Filled.Audiotrack, contentDescription = "Audio track", tint = Color.White)
                }
                IconButton(
                    onClick = { callbacks.onSubtitleTracksClick(); onActivity() },
                    modifier = Modifier.focusRequester(subsFocus)
                        .onFocusChanged { if (it.isFocused) lastFocused = subsFocus }
                        .tvFocusRing(palette.accent),
                ) {
                    Icon(Icons.Filled.Subtitles, contentDescription = "Subtitles", tint = Color.White)
                }
                IconButton(
                    onClick = { callbacks.onLockToggle(); onActivity() },
                    modifier = Modifier.focusRequester(lockFocus)
                        .onFocusChanged { if (it.isFocused) lastFocused = lockFocus }
                        .tvFocusRing(palette.accent),
                ) {
                    Icon(Icons.Filled.LockOpen, contentDescription = "Lock", tint = Color.White)
                }
                IconButton(
                    onClick = { callbacks.onPipClick(); onActivity() },
                    modifier = Modifier.focusRequester(pipFocus)
                        .onFocusChanged { if (it.isFocused) lastFocused = pipFocus }
                        .tvFocusRing(palette.accent),
                ) {
                    Icon(Icons.Filled.PictureInPictureAlt, contentDescription = "Picture in picture", tint = Color.White)
                }
            }

            // Center transport controls
            Row(
                Modifier.align(Alignment.Center),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(
                    onClick = { callbacks.onSeekBack(); onActivity() },
                    modifier = Modifier.size(56.dp).focusRequester(seekBackFocus)
                        .onFocusChanged { if (it.isFocused) lastFocused = seekBackFocus }
                        .tvFocusRing(palette.accent),
                ) {
                    Icon(Icons.Filled.Replay10, contentDescription = "Seek back", tint = Color.White, modifier = Modifier.size(32.dp))
                }
                Spacer(Modifier.width(28.dp))
                IconButton(
                    onClick = { callbacks.onPlayPause(); onActivity() },
                    modifier = Modifier.size(72.dp)
                        .focusRequester(playPauseFocus)
                        .onFocusChanged { if (it.isFocused) lastFocused = playPauseFocus }
                        .tvFocusRing(palette.accent)
                        .clip(RoundedCornerShape(50))
                        .background(Color.White.copy(alpha = 0.15f)),
                ) {
                    Icon(
                        if (state.paused) Icons.Filled.PlayArrow else Icons.Filled.Pause,
                        contentDescription = if (state.paused) "Play" else "Pause",
                        tint = Color.White,
                        modifier = Modifier.size(40.dp),
                    )
                }
                Spacer(Modifier.width(28.dp))
                IconButton(
                    onClick = { callbacks.onSeekForward(); onActivity() },
                    modifier = Modifier.size(56.dp).focusRequester(seekForwardFocus)
                        .onFocusChanged { if (it.isFocused) lastFocused = seekForwardFocus }
                        .tvFocusRing(palette.accent),
                ) {
                    Icon(Icons.Filled.Forward10, contentDescription = "Seek forward", tint = Color.White, modifier = Modifier.size(32.dp))
                }
                if (state.hasNextEpisode) {
                    Spacer(Modifier.width(28.dp))
                    IconButton(
                        onClick = { callbacks.onNext(); onActivity() },
                        modifier = Modifier.size(48.dp).focusRequester(nextFocus)
                            .onFocusChanged { if (it.isFocused) lastFocused = nextFocus }
                            .tvFocusRing(palette.accent),
                    ) {
                        Icon(Icons.Filled.SkipNext, contentDescription = "Next episode", tint = Color.White, modifier = Modifier.size(28.dp))
                    }
                }
            }

            // Bottom gradient bar with seek bar
            Column(
                Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.7f))))
                    .padding(horizontal = 16.dp, vertical = 6.dp),
            ) {
                val fraction = if (state.duration > 0) (state.currentTime / state.duration).toFloat().coerceIn(0f, 1f) else 0f
                var sliderFocused by remember { mutableStateOf(false) }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(formatTime(state.currentTime), color = Color.White, fontSize = 12.sp, modifier = Modifier.width(48.dp))
                    Slider(
                        value = fraction,
                        onValueChange = { callbacks.onSeekTo(it); onActivity() },
                        modifier = Modifier.weight(1f).padding(horizontal = 4.dp)
                            .focusRequester(sliderFocus)
                            .onFocusChanged {
                                sliderFocused = it.isFocused
                                if (it.isFocused) lastFocused = sliderFocus
                            }
                            // D-pad Left/Right while the seek bar has focus seeks by a fixed
                            // step (same as the seek-back/forward buttons) rather than trying
                            // to drag the slider's fractional value via key events — the one
                            // narrow, justified spot in this app that needs custom key handling.
                            .onKeyEvent { keyEvent ->
                                if (keyEvent.type != KeyEventType.KeyDown) return@onKeyEvent false
                                when (keyEvent.key) {
                                    Key.DirectionLeft -> { callbacks.onSeekBack(); onActivity(); true }
                                    Key.DirectionRight -> { callbacks.onSeekForward(); onActivity(); true }
                                    else -> false
                                }
                            }
                            .focusable(),
                        colors = SliderDefaults.colors(
                            thumbColor = palette.accent,
                            activeTrackColor = palette.accent,
                            inactiveTrackColor = if (sliderFocused) Color.White.copy(alpha = 0.5f) else Color.White.copy(alpha = 0.25f),
                        ),
                    )
                    Text(formatTime(state.duration), color = Color.White, fontSize = 12.sp, modifier = Modifier.width(48.dp))
                }
            }
        }
    }
}

private fun formatTime(seconds: Double): String {
    if (seconds.isNaN() || seconds < 0) return "0:00"
    val total = seconds.roundToInt()
    val h = total / 3600
    val m = (total % 3600) / 60
    val s = total % 60
    return if (h > 0) "%d:%02d:%02d".format(h, m, s) else "%d:%02d".format(m, s)
}

// ---------------------------------------------------------------------------
// Gesture indicators — VolumeIndicator/BrightnessIndicator MUST size their
// BoxWithConstraints with fillMaxWidth().fillMaxHeight(), otherwise it
// shrink-wraps to the pill content and Modifier.align(...) below becomes a
// no-op, misaligning the pill (root cause of a prior alignment bug).
// ---------------------------------------------------------------------------

@Composable
fun VolumeIndicator(level: Float?) {
    if (level == null) return
    BoxWithConstraints(Modifier.fillMaxWidth().fillMaxHeight()) {
        Row(
            Modifier
                .align(Alignment.CenterEnd)
                .padding(end = 48.dp)
                .clip(RoundedCornerShape(20.dp))
                .background(Color.Black.copy(alpha = 0.6f))
                .padding(horizontal = 14.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Filled.VolumeUp, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text("${(level.coerceIn(0f, 1f) * 100).roundToInt()}%", color = Color.White, fontSize = 13.sp)
        }
    }
}

@Composable
fun BrightnessIndicator(level: Float?) {
    if (level == null) return
    BoxWithConstraints(Modifier.fillMaxWidth().fillMaxHeight()) {
        Row(
            Modifier
                .align(Alignment.CenterStart)
                .padding(start = 48.dp)
                .clip(RoundedCornerShape(20.dp))
                .background(Color.Black.copy(alpha = 0.6f))
                .padding(horizontal = 14.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Filled.Brightness6, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text("${(level.coerceIn(0f, 1f) * 100).roundToInt()}%", color = Color.White, fontSize = 13.sp)
        }
    }
}

@Composable
fun SeekIndicator(deltaSeconds: Double?) {
    if (deltaSeconds == null) return
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        val sign = if (deltaSeconds >= 0) "+" else "-"
        Text(
            "$sign${formatTime(kotlin.math.abs(deltaSeconds))}",
            color = Color.White,
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier
                .clip(RoundedCornerShape(20.dp))
                .background(Color.Black.copy(alpha = 0.6f))
                .padding(horizontal = 18.dp, vertical = 10.dp),
        )
    }
}

@Composable
fun SpeedBoostIndicator(multiplier: Float?) {
    if (multiplier == null) return
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
        Row(
            Modifier
                .padding(top = 72.dp)
                .clip(RoundedCornerShape(20.dp))
                .background(Color.Black.copy(alpha = 0.6f))
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                "${formatSpeedLabel(multiplier)}x",
                color = Color.White,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}

private fun formatSpeedLabel(speed: Float): String =
    if (speed == speed.roundToInt().toFloat()) speed.roundToInt().toString() else "%.2f".format(speed).trimEnd('0').trimEnd('.')

@Composable
fun ResizeModeToast(toast: Pair<Int, String>?, onExpire: () -> Unit) {
    if (toast == null) return
    LaunchedEffect(toast.first) {
        kotlinx.coroutines.delay(1200)
        onExpire()
    }
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        AnimatedVisibility(visible = true, enter = fadeIn(), exit = fadeOut()) {
            Text(
                toast.second,
                color = Color.White,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .background(Color.Black.copy(alpha = 0.6f))
                    .padding(horizontal = 24.dp, vertical = 12.dp),
            )
        }
    }
}

// ---------------------------------------------------------------------------
// Track selection
// ---------------------------------------------------------------------------

@Composable
fun TrackSelectionSheet(
    kind: TrackSheetKind,
    audioTracks: List<TrackOption>,
    textTracks: List<TrackOption>,
    onSelectAudio: (TrackOption) -> Unit,
    onSelectText: (TrackOption?) -> Unit,
    onDismiss: () -> Unit,
) {
    val palette = LocalPlayerPalette.current
    Box(
        Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.55f))
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onDismiss,
            ),
    ) {
        Column(
            Modifier
                .align(Alignment.CenterEnd)
                .fillMaxHeight()
                .width(280.dp)
                .background(Color(0xFF121212))
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                    onClick = {},
                )
                .padding(16.dp),
        ) {
            when (kind) {
                TrackSheetKind.AUDIO -> {
                    Text("Audio", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Spacer(Modifier.height(8.dp))
                    if (audioTracks.isEmpty()) {
                        Text("No audio tracks found", color = Color.White.copy(alpha = 0.6f), fontSize = 13.sp)
                    }
                    audioTracks.forEachIndexed { index, track ->
                        TrackRow(track.label, track.selected, palette.accent, isFirst = index == 0) { onSelectAudio(track) }
                    }
                }

                TrackSheetKind.TEXT -> {
                    Text("Subtitles", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Spacer(Modifier.height(8.dp))
                    TrackRow("Off", textTracks.none { it.selected }, palette.accent, isFirst = true) { onSelectText(null) }
                    textTracks.forEach { track ->
                        TrackRow(track.label, track.selected, palette.accent) { onSelectText(track) }
                    }
                }
            }
        }
    }
}

@Composable
private fun TrackRow(label: String, selected: Boolean, accent: Color, isFirst: Boolean = false, onClick: () -> Unit) {
    val isTv = isTvDevice(LocalContext.current)
    val focusRequester = remember { FocusRequester() }
    if (isFirst && isTv) {
        LaunchedEffect(Unit) { focusRequester.requestFocus() }
    }
    Row(
        Modifier
            .fillMaxWidth()
            .focusRequester(focusRequester)
            .let { if (isTv) it.tvFocusRing(accent, shape = RoundedCornerShape(8.dp)) else it }
            .clip(RoundedCornerShape(8.dp))
            .background(if (selected) accent.copy(alpha = 0.25f) else Color.Transparent)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick,
            )
            .padding(vertical = 10.dp, horizontal = 8.dp),
    ) {
        Text(label, color = if (selected) accent else Color.White, fontSize = 14.sp)
    }
}
