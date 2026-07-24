# Consumed via consumerProguardFiles (see build.gradle) - applies whenever the main
# app builds with minifyEnabled (currently off by default, see android.enableMinifyInReleaseBuilds
# in android/app/build.gradle, but these rules cost nothing while minify is off and
# prevent release-only crashes the moment someone turns it on).

# expo-modules-core discovers Module subclasses (PlayerModule, etc.) by reflection at
# runtime, not by a compile-time reference R8 can see - without this it strips or
# renames them and the module silently fails to register.
-keep class * extends expo.modules.kotlin.modules.Module { *; }
-keep class com.tdandroid.app.player.** { *; }

# media3's DefaultRenderersFactory probes for the FFmpeg extension renderer by fully
# qualified class name via reflection (see PlayerActivity.kt buildPlayer() comment on
# EXTENSION_RENDERER_MODE_PREFER) - stripped/renamed classes here fail silently back to
# platform decoders instead of throwing, which is exactly the audio-drop bug that
# renderer was added to fix in the first place.
-keep class org.jellyfin.media3.ffmpegdecoder.** { *; }
-keep class androidx.media3.decoder.ffmpeg.** { *; }
