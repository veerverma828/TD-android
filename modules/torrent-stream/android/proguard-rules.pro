# Consumed via consumerProguardFiles (see build.gradle) - applies whenever the main
# app builds with minifyEnabled (currently off by default, see android.enableMinifyInReleaseBuilds
# in android/app/build.gradle, but these rules cost nothing while minify is off and
# prevent release-only crashes the moment someone turns it on).

# expo-modules-core discovers Module subclasses (TorrentStreamModule) by reflection at
# runtime, not by a compile-time reference R8 can see.
-keep class * extends expo.modules.kotlin.modules.Module { *; }
-keep class com.tdandroid.app.torrent.** { *; }

# libtorrent4j's native (JNI) layer calls back into these Java/Kotlin classes by name
# and method signature - R8 renaming or stripping unreferenced members here breaks the
# JNI bridge with no compile-time error, only a runtime NoSuchMethodError/UnsatisfiedLinkError
# deep inside session/alert callbacks.
-keep class org.libtorrent4j.** { *; }
-keepclassmembers class org.libtorrent4j.** { *; }
