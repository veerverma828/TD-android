import { useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
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
  const launchedRef = useRef(false);

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
    onClosed: (e) => {
      if (resolvedContentId) savePosition(e.finalPositionSeconds, e.finalDurationSeconds, true);
      ScreenOrientation.unlockAsync();
      goBack();
    },
    onRequestNext: () => {
      if (settings.autoPlayNextEpisode && nextEpisode.hasNext) {
        nextEpisode.playNext();
      } else {
        ScreenOrientation.unlockAsync();
        goBack();
      }
    },
  });

  useTraktScrobble(resolvedContentId, playback);

  useEffect(() => {
    if (!url || launchedRef.current || !resumeResolved) return;
    launchedRef.current = true;
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
  }, [url, resumeResolved]);

  useEffect(() => {
    if (!resolvedContentId || !settings.rememberPosition) return;
    savePosition(playback.currentTime, playback.duration);
  }, [playback.currentTime, playback.duration, resolvedContentId, settings.rememberPosition, savePosition]);

  if (!url) {
    return (
      <View style={[styles.container, styles.emptyState]}>
        <StatusBar hidden={false} />
        <ThemedText style={styles.emptyText}>No stream URL was provided.</ThemedText>
        <Pressable style={styles.backButton} onPress={goBack}>
          <IconSymbol name="chevron.left" color="#fff" size={20} />
          <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
        </Pressable>
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
