package com.tdandroid.app.player

import android.util.Log

/**
 * Single structured-logging surface for the whole player module.
 * One Logcat tag, one line per event as `key=value` pairs — greppable
 * (`adb logcat -s NativePlayer`) instead of scattered free-text Log.i calls.
 */
object PlaybackLogger {
    private const val TAG = "NativePlayer"

    fun event(name: String, vararg pairs: Pair<String, Any?>) {
        Log.i(TAG, format(name, pairs))
    }

    fun warn(name: String, vararg pairs: Pair<String, Any?>) {
        Log.w(TAG, format(name, pairs))
    }

    fun error(name: String, throwable: Throwable? = null, vararg pairs: Pair<String, Any?>) {
        Log.e(TAG, format(name, pairs), throwable)
    }

    private fun format(name: String, pairs: Array<out Pair<String, Any?>>): String {
        if (pairs.isEmpty()) return name
        val body = pairs.joinToString(" ") { (k, v) -> "$k=${v ?: "null"}" }
        return "$name $body"
    }
}
