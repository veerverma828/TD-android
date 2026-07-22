package com.tdandroid.app.player

import androidx.media3.common.C
import androidx.media3.common.Format
import androidx.media3.common.TrackSelectionOverride
import androidx.media3.common.Tracks
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import com.tdandroid.app.player.ui.TrackOption
import java.util.Locale

/**
 * Detects audio/text tracks and generates readable labels. Real-world streams
 * (especially MKV torrent releases) frequently omit language/title metadata —
 * this never assumes it exists and falls back to codec + channel-count hints
 * before finally falling back to a plain index, so the track sheet never shows
 * a blank or purely numeric-looking entry for something that has audio info.
 */
@UnstableApi
object TrackManager {

    fun tracksOfType(tracks: Tracks, type: Int): List<TrackOption> {
        val result = mutableListOf<TrackOption>()
        tracks.groups.forEachIndexed { groupIndex, group ->
            if (group.type != type) return@forEachIndexed
            for (i in 0 until group.length) {
                if (!group.isTrackSupported(i)) continue
                val format = group.getTrackFormat(i)
                result.add(TrackOption(groupIndex, i, label(format, type, i), group.isTrackSelected(i)))
            }
        }
        return result
    }

    private fun label(format: Format, type: Int, indexInGroup: Int): String {
        format.label?.takeIf { it.isNotBlank() }?.let { return it }

        val language = format.language?.takeIf { it.isNotBlank() && it != "und" }
            ?.let { code -> Locale(code).displayLanguage.takeIf { it.isNotBlank() } ?: code.uppercase() }

        return when (type) {
            C.TRACK_TYPE_AUDIO -> {
                val codec = shortCodecName(format.sampleMimeType)
                val channels = channelLabel(format.channelCount)
                buildString {
                    append(language ?: "Audio ${indexInGroup + 1}")
                    val details = listOfNotNull(codec, channels).joinToString(" · ")
                    if (details.isNotEmpty()) append(" ($details)")
                }
            }
            C.TRACK_TYPE_TEXT -> language ?: "Subtitle ${indexInGroup + 1}"
            else -> "Track ${indexInGroup + 1}"
        }
    }

    private fun shortCodecName(mimeType: String?): String? = when (mimeType) {
        "audio/mp4a-latm" -> "AAC"
        "audio/ac3" -> "AC3"
        "audio/eac3" -> "E-AC3"
        "audio/opus" -> "Opus"
        "audio/flac" -> "FLAC"
        "audio/mpeg" -> "MP3"
        "audio/vnd.dts" -> "DTS"
        "audio/true-hd" -> "TrueHD"
        else -> null
    }

    private fun channelLabel(channelCount: Int): String? = when {
        channelCount <= 0 -> null
        channelCount == 1 -> "Mono"
        channelCount == 2 -> "Stereo"
        channelCount == 6 -> "5.1"
        channelCount == 8 -> "7.1"
        else -> "${channelCount}ch"
    }

    fun selectTrack(player: ExoPlayer, type: Int, option: TrackOption) {
        val group = player.currentTracks.groups.getOrNull(option.groupIndex) ?: return
        player.trackSelectionParameters = player.trackSelectionParameters.buildUpon()
            .setOverrideForType(TrackSelectionOverride(group.mediaTrackGroup, option.indexInGroup))
            .setTrackTypeDisabled(type, false)
            .build()
    }

    fun disableTrackType(player: ExoPlayer, type: Int) {
        player.trackSelectionParameters = player.trackSelectionParameters.buildUpon()
            .setTrackTypeDisabled(type, true)
            .build()
    }
}
