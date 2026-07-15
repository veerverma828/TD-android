"use no memo";
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { NavigationBar } from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';

import { VideoPlayer } from '@/components/player/VideoPlayer';

export default function PlayerScreen() {
  const { url, title, poster } = useLocalSearchParams<{ url: string; title: string; poster?: string }>();
  const router = useRouter();

  // "use no memo" at the top opts this entire file out of the React Compiler.
  // This is required because the React Compiler breaks useFocusEffect cleanup
  // semantics — it transforms the useCallback in a way that Expo Router's focus
  // event system can no longer trigger the cleanup correctly.
  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      NavigationBar.setHidden(true);

      return () => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        NavigationBar.setHidden(false);
      };
    }, [])
  );

  if (!url) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <VideoPlayer
        streamUrl={url}
        title={title}
        poster={poster}
        onClose={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
