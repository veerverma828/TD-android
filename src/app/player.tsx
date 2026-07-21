import { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/IconSymbol';
import { useScreenBackHandler } from '@/hooks/tv/useTVBackHandler';
import { useAppTheme } from '@/contexts/ThemeContext';
import { usePlayerSettings } from '@/contexts/PlayerSettingsContext';
import { useTraktScrobble } from '@/hooks/player/useTraktScrobble';
import { usePlaybackPosition } from '@/hooks/player/usePlaybackPosition';
import { useNextEpisode } from '@/hooks/player/useNextEpisode';
import { useNativePlayerBridge } from '@/hooks/player/useNativePlayerBridge';
import { FocusablePressable } from '@/components/tv/FocusablePressable';

export default function PlayerScreen() {
  const { url, title, poster, contentId } = useLocalSearchParams<{
    url: string;
    title?: string;
    poster?: string;
    contentId?: string;
  }>();
  const router = useRouter();
  const { colors } = useAppTheme();
  const { settings } = usePlayerSettings();
  const resolvedContentId = contentId ?? null;

  const { resumeFrom, resolved: resumeResolved, savePosition } = usePlaybackPosition(resolvedContentId);
  const nextEpisode = useNextEpisode(resolvedContentId);
  const lastLaunchedKeyRef = useRef<string | null>(null);
  const launchKey = `${url}_${resolvedContentId ?? ''}`;
  const pipNavigatedRef = useRef(false);

  // The player screen can be reached via router.replace() (e.g. auto-advancing to
  // the next episode), which leaves nothing to go "back" to — guard against that
  // instead of letting router.back() no-op with a GO_BACK navigator warning.
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  useScreenBackHandler(() => {
    goBack();
  });

  const { playback, launch } = useNativePlayerBridge({
    onClosed: async (e) => {
      if (resolvedContentId) savePosition(e.finalPositionSeconds, e.finalDurationSeconds, true);
      // Awaited (not fire-and-forget): MainActivity is landscape-locked while
      // PlayerActivity (sensorLandscape) is on top, so closing it triggers a
      // device rotation back to portrait at the same time this unlock does. Firing
      // goBack() before the unlock settles races two orientation/config-change
      // transactions on MainActivity's window at once, which can leave its
      // SurfaceControl committed at 0x0 (bugmark: `dumpsys window` shows
      // MainActivity surface=[0,0][0,0] while isVisible=true — plain black until
      // something forces another relayout, e.g. rotating the device).
      await ScreenOrientation.unlockAsync();
      // Already navigated off this placeholder when PiP started — a second goBack()
      // here would pop one screen too many.
      if (!pipNavigatedRef.current) goBack();
    },
    onRequestNext: async () => {
      if (settings.autoPlayNextEpisode && nextEpisode.hasNext) {
        nextEpisode.playNext();
      } else {
        await ScreenOrientation.unlockAsync();
        if (!pipNavigatedRef.current) goBack();
      }
    },
    onPipModeChanged: (e) => {
      // This screen is a deliberate blank placeholder (see comment below) meant to sit
      // behind the fullscreen native PlayerActivity. PiP shrinks that Activity down to a
      // floating window, exposing the placeholder as plain black behind it — navigate back
      // to a real screen so there's something to actually see around the floating video.
      if (e.isInPictureInPicture && !pipNavigatedRef.current) {
        pipNavigatedRef.current = true;
        goBack();
      }
    },
  });

  useTraktScrobble(resolvedContentId, playback);

  useEffect(() => {
    if (!url || !resumeResolved || lastLaunchedKeyRef.current === launchKey) return;
    lastLaunchedKeyRef.current = launchKey;
    launch({
      streamUrl: url,
      title,
      contentId: resolvedContentId,
      resumePositionSeconds: settings.resumeAutomatically ? resumeFrom ?? 0 : 0,
      hasNextEpisode: nextEpisode.hasNext,
      theme: colors,
      settings: settings as unknown as Record<string, unknown>,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, resolvedContentId, resumeResolved, launchKey]);

  useEffect(() => {
    if (!resolvedContentId || !settings.rememberPosition) return;
    savePosition(playback.currentTime, playback.duration);
  }, [playback.currentTime, playback.duration, resolvedContentId, settings.rememberPosition, savePosition]);

  if (!url) {
    return (
      <View style={[styles.container, styles.emptyState]}>
        <StatusBar hidden={false} />
        <ThemedText style={styles.emptyText}>No stream URL was provided.</ThemedText>
        <FocusablePressable style={styles.backButton} onPress={goBack} hasTVPreferredFocus focusRingBorderRadius={6} accessibilityRole="button" accessibilityLabel="Go back">
          <IconSymbol name="chevron.left" color="#fff" size={20} />
          <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
        </FocusablePressable>
      </View>
    );
  }

  // The native PlayerActivity renders on top of this screen once launched —
  // this view is only ever briefly visible during the handoff.
  return (
    <View style={styles.container}>
      <StatusBar hidden />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 24,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
