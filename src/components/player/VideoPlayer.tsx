import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import Video, {
  SelectedTrackType,
  VideoRef,
  OnAudioTracksData,
  OnTextTracksData,
  OnVideoErrorData,
} from 'react-native-video';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useAppTheme } from '@/contexts/ThemeContext';
import { usePlayerSettings } from '@/contexts/PlayerSettingsContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useTrakt } from '@/contexts/TraktContext';
import { useIsTV } from '@/contexts/DeviceModeContext';
import { getEffectiveSource } from '@/utils/continueWatchingSource';
import { getTraktProgressPct } from '@/services/traktService';
import { usePlaybackState } from '@/hooks/player/usePlaybackState';
import { usePlaybackPosition } from '@/hooks/player/usePlaybackPosition';
import { useTraktScrobble } from '@/hooks/player/useTraktScrobble';
import { useControlsVisibility } from '@/hooks/player/useControlsVisibility';
import { useOrientation } from '@/hooks/player/useOrientation';
import { useKeepAwake } from '@/hooks/player/useKeepAwake';
import { usePictureInPicture } from '@/hooks/player/usePictureInPicture';
import { useBrightnessGesture } from '@/hooks/player/useBrightnessGesture';
import { useVolumeGesture } from '@/hooks/player/useVolumeGesture';
import { useSubtitles } from '@/hooks/player/useSubtitles';
import { useNextEpisode } from '@/hooks/player/useNextEpisode';
import { BUFFER_PRESETS } from '@/utils/bufferPresets';
import { toNativeResizeMode, ZOOM_SCALE } from '@/utils/resizeMode';

import { PlayerControls } from './PlayerControls';
import { GestureLayer } from './GestureLayer';
import { LoadingOverlay } from './LoadingOverlay';
import { ErrorOverlay } from './ErrorOverlay';
import { ResumeDialog } from './ResumeDialog';
import { LockOverlay } from './LockOverlay';
import { SubtitleOverlay } from './SubtitleOverlay';
import { TrackSelectionModal, SelectableTrack } from './TrackSelectionModal';
import { SubtitleSourceSheet } from './SubtitleSourceSheet';
import { SubtitleAppearanceSheet } from './SubtitleAppearanceSheet';
import { SettingsSheet } from './SettingsSheet';

interface VideoPlayerProps {
  streamUrl: string;
  title?: string;
  poster?: string;
  contentId?: string | null;
  onClose: () => void;
}

export function VideoPlayer({ streamUrl, title, contentId, onClose }: VideoPlayerProps) {
  const { colors } = useAppTheme();
  const isTV = useIsTV();
  const { settings, updateSettings } = usePlayerSettings();
  const { continueWatchingSource } = useSettings();
  const { connected: traktConnected } = useTrakt();
  const videoRef = useRef<VideoRef>(null);

  const playback = usePlaybackState(false, settings.defaultSpeed);
  const { resumeFrom, resolved, savePosition, clearPosition } = usePlaybackPosition(contentId ?? null);
  const scrobble = useTraktScrobble(contentId ?? null, {
    paused: playback.paused,
    currentTime: playback.currentTime,
    duration: playback.duration,
  });
  const nextEpisode = useNextEpisode(contentId ?? null);
  const [resumeDialogDismissed, setResumeDialogDismissed] = useState(false);
  const [controlsLocked, setControlsLocked] = useState(false);
  const controls = useControlsVisibility(settings.autoHideMs, controlsLocked);
  const { toggleOrientation } = useOrientation(settings.defaultOrientation);
  useKeepAwake(settings.keepScreenAwake);
  const pip = usePictureInPicture(videoRef);

  // TV has no touchscreen: keep these hooks fully inert there so they don't
  // request brightness permissions or suppress the remote's native volume OSD.
  const brightnessGesture = useBrightnessGesture(!isTV && settings.gesturesEnabled && settings.brightnessGestureEnabled);
  const volumeGesture = useVolumeGesture(!isTV && settings.gesturesEnabled && settings.volumeGestureEnabled);

  const [audioTracks, setAudioTracks] = useState<SelectableTrack[]>([]);
  const [textTracks, setTextTracks] = useState<SelectableTrack[]>([]);
  const [selectedAudioIndex, setSelectedAudioIndex] = useState<number | null>(null);
  const previousAudioIndexRef = useRef<number | null>(null);
  const [selectedTextIndex, setSelectedTextIndex] = useState<number | null>(null);
  const [externalSubtitleUrl, setExternalSubtitleUrl] = useState<string | null>(null);
  const externalSubtitles = useSubtitles(externalSubtitleUrl);

  const [showAudioModal, setShowAudioModal] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [showSubtitleSource, setShowSubtitleSource] = useState(false);
  const [showSubtitleAppearance, setShowSubtitleAppearance] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);

  const hasResumePrompt = resolved && resumeFrom != null && !resumeDialogDismissed && !settings.resumeAutomatically;
  const appliedInitialResume = useRef(false);

  const bufferConfig = useMemo(() => BUFFER_PRESETS[settings.bufferPreference], [settings.bufferPreference]);
  const nativeResizeMode = toNativeResizeMode(settings.resizeMode);
  const isZoomed = settings.resizeMode === 'crop';

  const clampTime = useCallback(
    (t: number) => Math.min(Math.max(0, t), playback.duration || t),
    [playback.duration]
  );

  const seekTo = useCallback(
    (t: number) => {
      const clamped = clampTime(t);
      videoRef.current?.seek(clamped);
      playback.endSeek(clamped);
    },
    [clampTime, playback]
  );

  const skipBy = useCallback(
    (deltaSeconds: number) => {
      seekTo(playback.currentTime + deltaSeconds);
    },
    [playback.currentTime, seekTo]
  );

  const handleProgress = useCallback(
    (e: { currentTime: number; playableDuration: number; seekableDuration: number }) => {
      playback.handlers.onProgress(e);
      if (settings.rememberPosition) {
        savePosition(e.currentTime, playback.duration);
      }
    },
    [playback, settings.rememberPosition, savePosition]
  );

  const pendingSeekAfterRetryRef = useRef<number | null>(null);

  const handleLoad = useCallback(
    (e: Parameters<typeof playback.handlers.onLoad>[0]) => {
      playback.handlers.onLoad(e);
      if (pendingSeekAfterRetryRef.current != null) {
        videoRef.current?.seek(pendingSeekAfterRetryRef.current);
        pendingSeekAfterRetryRef.current = null;
        return;
      }
      if (!appliedInitialResume.current && settings.resumeAutomatically && resumeFrom != null) {
        appliedInitialResume.current = true;
        videoRef.current?.seek(resumeFrom);
      } else if (
        !appliedInitialResume.current &&
        settings.resumeAutomatically &&
        contentId &&
        getEffectiveSource(continueWatchingSource, traktConnected) === 'trakt'
      ) {
        appliedInitialResume.current = true;
        getTraktProgressPct(contentId)
          .then((pct) => {
            if (pct != null && e.duration > 0) {
              videoRef.current?.seek((pct / 100) * e.duration);
            }
          })
          .catch(() => {});
      }
    },
    [playback.handlers, settings.resumeAutomatically, resumeFrom, contentId, continueWatchingSource, traktConnected]
  );

  const handleEnd = useCallback(() => {
    playback.handlers.onEnd();
    clearPosition();
    scrobble.stop();
    if (settings.autoPlayNextEpisode && nextEpisode.hasNext) {
      nextEpisode.playNext();
    }
  }, [playback.handlers, clearPosition, scrobble, settings.autoPlayNextEpisode, nextEpisode]);

  const handleAudioTracks = useCallback((e: OnAudioTracksData) => {
    if (__DEV__) console.log('[VideoPlayer] onAudioTracks count:', e.audioTracks.length, JSON.stringify(e.audioTracks));
    setAudioTracks(e.audioTracks);
    const active = e.audioTracks.find((t) => t.selected);
    if (active) {
      setSelectedAudioIndex(active.index);
      previousAudioIndexRef.current = active.index;
    }
  }, []);

  const handleError = useCallback(
    (e: OnVideoErrorData) => {
      const details = `${e.error?.errorException || ''} ${e.error?.errorString || ''} ${e.error?.error || ''}`;
      const isDecoderInitFailure = /decoderinitializationexception|decoder_init_failed/i.test(details);
      const previousIndex = previousAudioIndexRef.current;

      if (isDecoderInitFailure && previousIndex != null && previousIndex !== selectedAudioIndex) {
        setSelectedAudioIndex(previousIndex);
        pendingSeekAfterRetryRef.current = playback.currentTime;
        playback.retry();
        Alert.alert(
          'Audio Track Unsupported',
          "This audio track isn't supported on your device (likely Dolby/DTS without hardware decoding). Reverted to the previous track."
        );
        return;
      }

      playback.handlers.onError(e);
    },
    [playback, selectedAudioIndex]
  );

  const handleTextTracks = useCallback((e: OnTextTracksData) => {
    setTextTracks(e.textTracks);
    const active = e.textTracks.find((t) => t.selected);
    if (active) setSelectedTextIndex(active.index);
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <View
        style={[
          styles.videoWrapper,
          isZoomed && { transform: [{ scale: ZOOM_SCALE }] },
        ]}
      >
        <Video
          key={`${streamUrl}-${playback.retryToken}`}
          ref={videoRef}
          source={{ uri: streamUrl, bufferConfig }}
          style={styles.video}
          resizeMode={nativeResizeMode}
          paused={playback.paused || hasResumePrompt}
          rate={playback.playbackRate}
          progressUpdateInterval={250}
          reportBandwidth
          enterPictureInPictureOnLeave={settings.autoPiP}
          selectedAudioTrack={
            selectedAudioIndex != null ? { type: SelectedTrackType.INDEX, value: selectedAudioIndex } : undefined
          }
          selectedTextTrack={
            selectedTextIndex != null ? { type: SelectedTrackType.INDEX, value: selectedTextIndex } : { type: SelectedTrackType.DISABLED }
          }
          subtitleStyle={{
            fontSize: settings.subtitleAppearance.fontSize,
            opacity: 1,
          }}
          onLoad={handleLoad}
          onProgress={handleProgress}
          onBuffer={playback.handlers.onBuffer}
          onError={handleError}
          onEnd={handleEnd}
          onAudioTracks={handleAudioTracks}
          onTextTracks={handleTextTracks}
          onPictureInPictureStatusChanged={pip.onPictureInPictureStatusChanged}
        />
      </View>

      {externalSubtitleUrl && (
        <SubtitleOverlay
          cues={externalSubtitles.cues}
          currentTime={playback.currentTime}
          appearance={settings.subtitleAppearance}
          bottomOffset={controls.visible ? 110 : 40}
        />
      )}

      {playback.buffering && !playback.error && <LoadingOverlay accentColor={colors.accent} />}

      {playback.error ? (
        <ErrorOverlay message={playback.error} accentColor={colors.accent} onRetry={playback.retry} onBack={onClose} />
      ) : (
        <>
          {/* No touchscreen on TV hardware — brightness/volume swipe and double-tap
              seek have no D-pad equivalent, so this whole gesture layer is mobile-only. */}
          {!isTV && (
            <GestureLayer
              accentColor={colors.accent}
              brightnessEnabled={settings.gesturesEnabled && settings.brightnessGestureEnabled && !controlsLocked}
              volumeEnabled={settings.gesturesEnabled && settings.volumeGestureEnabled && !controlsLocked}
              horizontalSeekEnabled={settings.gesturesEnabled && settings.horizontalSeekGestureEnabled && !controlsLocked}
              doubleTapEnabled={settings.gesturesEnabled && settings.doubleTapSeekEnabled && !controlsLocked}
              sensitivity={settings.gestureSensitivity}
              seekDurationSeconds={settings.seekDurationSeconds}
              duration={playback.duration}
              brightness={brightnessGesture.brightness}
              onBrightnessChange={brightnessGesture.setBrightness}
              volume={volumeGesture.volume}
              onVolumeChange={volumeGesture.setVolume}
              onSeekCommit={skipBy}
              onDoubleTapSeek={skipBy}
              onSingleTap={controlsLocked ? () => {} : controls.toggle}
            />
          )}

          {/* With GestureLayer gone and PlayerControls unmounted after auto-hide,
              a TV remote would have nothing focusable left — this invisible
              full-screen catcher takes focus and re-opens the controls on select. */}
          {isTV && !controlsLocked && !controls.visible && (
            <Pressable
              style={StyleSheet.absoluteFill}
              focusable
              hasTVPreferredFocus
              accessibilityRole="button"
              accessibilityLabel="Show playback controls"
              onPress={controls.show}
            />
          )}

          {controlsLocked ? (
            <LockOverlay onUnlock={() => setControlsLocked(false)} />
          ) : (
            controls.visible && (
              <PlayerControls
                title={title || 'Unknown Title'}
                paused={playback.paused}
                buffering={playback.buffering}
                currentTime={playback.currentTime}
                duration={playback.duration}
                accentColor={colors.accent}
                onTogglePlay={playback.togglePlay}
                onSeekStart={playback.beginSeek}
                onSeekEnd={seekTo}
                onSkip={skipBy}
                onBack={onClose}
                onShowAudioTracks={() => setShowAudioModal(true)}
                onShowSubtitles={() => setShowTextModal(true)}
                onShowSettings={() => setShowSettingsSheet(true)}
                onEnterPiP={pip.enterPiP}
                onLock={() => setControlsLocked(true)}
                onActivity={isTV ? controls.show : undefined}
              />
            )
          )}
        </>
      )}

      {hasResumePrompt && resumeFrom != null && (
        <ResumeDialog
          resumeFrom={resumeFrom}
          accentColor={colors.accent}
          onResume={() => {
            setResumeDialogDismissed(true);
            videoRef.current?.seek(resumeFrom);
          }}
          onStartOver={() => {
            setResumeDialogDismissed(true);
            clearPosition();
          }}
        />
      )}

      <TrackSelectionModal
        visible={showAudioModal}
        heading="Audio Track"
        tracks={audioTracks}
        emptyLabel="No additional audio tracks found."
        activeIndex={selectedAudioIndex}
        onSelect={(index) => {
          previousAudioIndexRef.current = selectedAudioIndex;
          setSelectedAudioIndex(index);
          setShowAudioModal(false);
        }}
        onClose={() => setShowAudioModal(false)}
      />

      <TrackSelectionModal
        visible={showTextModal}
        heading="Subtitles"
        tracks={textTracks}
        emptyLabel="No embedded subtitle tracks found."
        activeIndex={externalSubtitleUrl ? null : selectedTextIndex}
        onSelect={(index) => {
          setExternalSubtitleUrl(null);
          setSelectedTextIndex(index);
          setShowTextModal(false);
        }}
        onClose={() => setShowTextModal(false)}
        extraOptions={[
          {
            label: externalSubtitleUrl ? 'Change subtitle file…' : 'Load subtitle file…',
            onPress: () => {
              setShowTextModal(false);
              setShowSubtitleSource(true);
            },
          },
          {
            label: 'Appearance…',
            onPress: () => {
              setShowTextModal(false);
              setShowSubtitleAppearance(true);
            },
          },
        ]}
      />

      <SubtitleSourceSheet
        visible={showSubtitleSource}
        onClose={() => setShowSubtitleSource(false)}
        onLoad={(url) => {
          setSelectedTextIndex(null);
          setExternalSubtitleUrl(url);
        }}
      />

      <SubtitleAppearanceSheet
        visible={showSubtitleAppearance}
        onClose={() => setShowSubtitleAppearance(false)}
        appearance={settings.subtitleAppearance}
        onChange={(subtitleAppearance) => updateSettings({ subtitleAppearance })}
      />

      <SettingsSheet
        visible={showSettingsSheet}
        onClose={() => setShowSettingsSheet(false)}
        speed={playback.playbackRate}
        onSpeedChange={(speed) => {
          playback.setPlaybackRate(speed);
          updateSettings({ defaultSpeed: speed });
        }}
        settings={settings}
        updateSettings={updateSettings}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  videoWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  video: {
    flex: 1,
  },
});
