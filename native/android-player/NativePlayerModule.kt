package com.tdandroid.app.player

import android.content.Intent
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONArray
import org.json.JSONObject

class NativePlayerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    init {
        instance = this
    }

    override fun getName() = "NativePlayer"

    @ReactMethod
    fun launch(config: ReadableMap, promise: Promise) {
        try {
            val json = config.toJsonObject()
            val activity = reactContext.currentActivity
            val intent = Intent(reactContext, PlayerActivity::class.java).apply {
                putExtra(PlayerActivity.EXTRA_CONFIG_JSON, json.toString())
                // currentActivity is null very early in app startup — fall back to a
                // new-task launch from the application context in that edge case only.
                if (activity == null) addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            (activity ?: reactContext).startActivity(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("LAUNCH_FAILED", e.message, e)
        }
    }

    private fun emitEvent(name: String, params: WritableMap?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(name, params)
    }

    companion object {
        private var instance: NativePlayerModule? = null

        fun emit(eventName: String, params: WritableMap?) {
            instance?.emitEvent(eventName, params)
        }
    }
}

private fun ReadableMap.toJsonObject(): JSONObject {
    val json = JSONObject()
    val iterator = keySetIterator()
    while (iterator.hasNextKey()) {
        val key = iterator.nextKey()
        when (getType(key)) {
            ReadableType.Null -> json.put(key, JSONObject.NULL)
            ReadableType.Boolean -> json.put(key, getBoolean(key))
            ReadableType.Number -> json.put(key, getDouble(key))
            ReadableType.String -> json.put(key, getString(key))
            ReadableType.Map -> json.put(key, getMap(key)?.toJsonObject())
            ReadableType.Array -> json.put(key, getArray(key)?.toJsonArray())
        }
    }
    return json
}

private fun ReadableArray.toJsonArray(): JSONArray {
    val json = JSONArray()
    for (i in 0 until size()) {
        when (getType(i)) {
            ReadableType.Null -> json.put(JSONObject.NULL)
            ReadableType.Boolean -> json.put(getBoolean(i))
            ReadableType.Number -> json.put(getDouble(i))
            ReadableType.String -> json.put(getString(i))
            ReadableType.Map -> json.put(getMap(i)?.toJsonObject())
            ReadableType.Array -> json.put(getArray(i)?.toJsonArray())
        }
    }
    return json
}
