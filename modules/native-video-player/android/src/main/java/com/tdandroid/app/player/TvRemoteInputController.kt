package com.tdandroid.app.player

import android.os.Handler
import android.os.Looper
import android.view.KeyEvent

/**
 * Semantic callbacks for the TV remote — mirrors [PlayerGestureCallbacks]'s role for touch:
 * this class never touches Compose/UI state directly, only calls out through here.
 */
interface TvRemoteCallbacks {
    fun isControlsVisible(): Boolean
    fun isLocked(): Boolean
    fun showControlsForNavigation()
    fun onInteraction()
    fun onPlayPauseToggle()
    fun onFastForwardHoldStart()
    fun onFastForwardHoldEnd()
}

private const val CENTER_LONG_PRESS_MS = 500L

/**
 * Single centralized entry point for all TV remote key handling, fed from
 * [PlayerActivity.dispatchKeyEvent] (the one true interception point before
 * Compose's own key/focus dispatch ever sees the event).
 *
 * Deliberately does NOT reimplement Compose's default directional focus traversal
 * or click-on-focused-element behavior — both already work correctly once a
 * focusable exists. This only covers what that default can't: revealing the
 * overlay (and seeding focus) on the first DPAD press while hidden, and OK's
 * hold-to-2x-speed gesture, which has no Compose-native equivalent.
 */
class TvRemoteInputController(private val callbacks: TvRemoteCallbacks) {

    private val handler = Handler(Looper.getMainLooper())
    private var longPressRunnable: Runnable? = null
    private var longPressTriggered = false

    /** Returns true if the event was fully handled (caller must NOT call super.dispatchKeyEvent). */
    fun dispatchKeyEvent(event: KeyEvent): Boolean = when (event.keyCode) {
        KeyEvent.KEYCODE_DPAD_UP, KeyEvent.KEYCODE_DPAD_DOWN,
        KeyEvent.KEYCODE_DPAD_LEFT, KeyEvent.KEYCODE_DPAD_RIGHT,
        -> handleDirection(event)

        KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER, KeyEvent.KEYCODE_NUMPAD_ENTER,
        -> handleCenter(event)

        else -> false
    }

    private fun handleDirection(event: KeyEvent): Boolean {
        if (event.action != KeyEvent.ACTION_DOWN) return false
        if (callbacks.isLocked()) return false

        if (!callbacks.isControlsVisible()) {
            callbacks.showControlsForNavigation()
            callbacks.onInteraction()
            // Consumed: this press only reveals the overlay (focus seeded by the
            // existing lastFocused-restore effect) — it must not also be
            // interpreted as a focus-move over nothing.
            return true
        }

        // Controls (or a menu) already visible — let Compose's own focus traversal
        // handle the move (including the seek bar's own Left/Right override, and
        // navigation inside an open track-selection menu). Still counts as activity.
        callbacks.onInteraction()
        return false
    }

    private fun handleCenter(event: KeyEvent): Boolean {
        if (callbacks.isLocked()) return false

        return when (event.action) {
            KeyEvent.ACTION_DOWN -> {
                if (event.repeatCount == 0) {
                    longPressTriggered = false
                    val runnable = Runnable {
                        longPressTriggered = true
                        callbacks.onFastForwardHoldStart()
                    }
                    longPressRunnable = runnable
                    handler.postDelayed(runnable, CENTER_LONG_PRESS_MS)
                }
                false // percolate the down-press to Compose too; harmless
            }

            KeyEvent.ACTION_UP -> {
                longPressRunnable?.let { handler.removeCallbacks(it) }
                longPressRunnable = null
                if (longPressTriggered) {
                    longPressTriggered = false
                    callbacks.onFastForwardHoldEnd()
                    true // swallow the release — must not ALSO click the focused control
                } else if (!callbacks.isControlsVisible()) {
                    // Nothing is focusable while hidden — toggle directly, never reveal the overlay.
                    callbacks.onPlayPauseToggle()
                    callbacks.onInteraction()
                    true
                } else {
                    false // let Compose invoke the focused control's own onClick
                }
            }

            else -> false
        }
    }
}
