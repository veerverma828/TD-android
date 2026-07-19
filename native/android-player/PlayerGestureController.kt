package com.tdandroid.app.player

import android.content.Context
import android.view.GestureDetector
import android.view.MotionEvent
import kotlin.math.abs

data class GestureSettings(
    val gesturesEnabled: Boolean,
    val brightnessEnabled: Boolean,
    val volumeEnabled: Boolean,
    val horizontalSeekEnabled: Boolean,
    val doubleTapSeekEnabled: Boolean,
    val sensitivity: Float,
)

interface PlayerGestureCallbacks {
    fun onSingleTap()
    fun onDoubleTapSeek(forward: Boolean)
    fun onBrightnessDelta(delta: Float)
    fun onVolumeDelta(delta: Float)
    fun onSeekDrag(deltaSeconds: Double)
    fun onSeekCommit(deltaSeconds: Double)
}

private const val VERTICAL_SENSITIVITY_BASE = 1f / 200f
private const val HORIZONTAL_SECONDS_PER_PX = 0.2

class PlayerGestureController(
    context: Context,
    private val settings: GestureSettings,
    private val callbacks: PlayerGestureCallbacks,
    private val screenWidthPx: Int,
) {
    private enum class Mode { NONE, VERTICAL, HORIZONTAL }

    private var mode = Mode.NONE
    private var downX = 0f
    private var downY = 0f
    private var isRightSide = false
    private var seekDeltaSeconds = 0.0

    private val gestureDetector = GestureDetector(
        context,
        object : GestureDetector.SimpleOnGestureListener() {
            override fun onSingleTapConfirmed(e: MotionEvent): Boolean {
                callbacks.onSingleTap()
                return true
            }

            override fun onDoubleTap(e: MotionEvent): Boolean {
                if (settings.doubleTapSeekEnabled) {
                    callbacks.onDoubleTapSeek(e.x > screenWidthPx / 2f)
                }
                return true
            }
        },
    )

    /** Always returns true — this is a raw MotionEvent sink fed from Compose's pointerInput scrim, not a View.onTouch chain. */
    fun onTouch(event: MotionEvent): Boolean {
        gestureDetector.onTouchEvent(event)
        if (!settings.gesturesEnabled) return true

        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                downX = event.x
                downY = event.y
                isRightSide = event.x > screenWidthPx / 2f
                mode = Mode.NONE
                seekDeltaSeconds = 0.0
            }

            MotionEvent.ACTION_MOVE -> {
                val dx = event.x - downX
                val dy = event.y - downY

                if (mode == Mode.NONE) {
                    if (abs(dy) > 8 && abs(dy) > abs(dx)) {
                        mode = Mode.VERTICAL
                    } else if (settings.horizontalSeekEnabled && abs(dx) > 10 && abs(dx) > abs(dy)) {
                        mode = Mode.HORIZONTAL
                    }
                }

                when (mode) {
                    Mode.VERTICAL -> {
                        val delta = -dy * VERTICAL_SENSITIVITY_BASE * settings.sensitivity
                        downY = event.y
                        if (isRightSide && settings.volumeEnabled) {
                            callbacks.onVolumeDelta(delta)
                        } else if (!isRightSide && settings.brightnessEnabled) {
                            callbacks.onBrightnessDelta(delta)
                        }
                    }

                    Mode.HORIZONTAL -> {
                        seekDeltaSeconds = dx * HORIZONTAL_SECONDS_PER_PX
                        callbacks.onSeekDrag(seekDeltaSeconds)
                    }

                    Mode.NONE -> Unit
                }
            }

            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                if (mode == Mode.HORIZONTAL && seekDeltaSeconds != 0.0) {
                    callbacks.onSeekCommit(seekDeltaSeconds)
                }
                mode = Mode.NONE
                seekDeltaSeconds = 0.0
            }
        }
        return true
    }
}
