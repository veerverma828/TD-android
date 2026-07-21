package com.tdandroid.app.player

import android.content.Intent
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NativePlayerModule : Module() {

    override fun definition() = ModuleDefinition {
        Name("NativePlayer")

        Events("nativePlayerProgress", "nativePlayerEnded", "nativePlayerError", "nativePlayerRequestNext", "nativePlayerClosed", "nativePlayerPipModeChanged")

        OnCreate {
            instance = this@NativePlayerModule
        }

        OnDestroy {
            instance = null
        }

        AsyncFunction("launch") { configJsonStr: String ->
            val activity = appContext.currentActivity
            val intent = Intent(appContext.reactContext, PlayerActivity::class.java).apply {
                putExtra(PlayerActivity.EXTRA_CONFIG_JSON, configJsonStr)
                if (activity == null) addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            (activity ?: appContext.reactContext)?.startActivity(intent)
        }
    }

    private fun emitEvent(name: String, params: WritableMap?) {
        sendEvent(name, (params?.toHashMap() as? Map<String, Any?>) ?: emptyMap())
    }

    companion object {
        var instance: NativePlayerModule? = null

        fun emit(eventName: String, params: WritableMap?) {
            instance?.emitEvent(eventName, params)
        }
    }
}
