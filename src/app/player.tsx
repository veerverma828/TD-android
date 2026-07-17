import { View, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { VideoPlayer } from '@/components/player/VideoPlayer';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/IconSymbol';
import { useScreenBackHandler } from '@/hooks/tv/useTVBackHandler';

export default function PlayerScreen() {
  const { url, title, poster, contentId } = useLocalSearchParams<{
    url: string;
    title?: string;
    poster?: string;
    contentId?: string;
  }>();
  const router = useRouter();

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

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <VideoPlayer
        key={contentId || url}
        streamUrl={url}
        title={title}
        poster={poster}
        contentId={contentId ?? null}
        onClose={goBack}
      />
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
