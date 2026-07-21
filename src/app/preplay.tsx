import { useEffect, useRef, useState } from 'react';
import { Animated, View, StyleSheet, Easing } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';

import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/contexts/ThemeContext';
import { usePlayerSettings } from '@/contexts/PlayerSettingsContext';
import { DARK_IMAGE_PLACEHOLDER } from '@/constants/placeholder';

const HOLD_MS = 1100;

function Spinner({ color, size = 26 }: { color: string; size?: number }) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(rotation, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })
    );
    anim.start();
    return () => anim.stop();
  }, [rotation]);

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const style = { transform: [{ rotate }] };

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2.5,
          borderColor: 'rgba(255,255,255,0.25)',
          borderTopColor: color,
        },
        style,
      ]}
    />
  );
}

export default function PreplayScreen() {
  const params = useLocalSearchParams<{
    url: string;
    title?: string;
    poster?: string;
    backdrop?: string;
    contentId?: string;
  }>();
  const router = useRouter();
  const { colors } = useAppTheme();
  const { settings, loaded } = usePlayerSettings();
  const navigation = useNavigation();
  const [isFocused, setIsFocused] = useState(navigation.isFocused());

  useEffect(() => {
    const unsubFocus = navigation.addListener('focus', () => setIsFocused(true));
    const unsubBlur = navigation.addListener('blur', () => setIsFocused(false));
    return () => {
      unsubFocus();
      unsubBlur();
    };
  }, [navigation]);

  useEffect(() => {
    // allow auto-rotation
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => {
      if (isFocused) router.replace({ pathname: '/player', params });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, HOLD_MS);
    return () => clearTimeout(timer);
  }, [loaded, isFocused]);

  const artwork = params.backdrop || params.poster;
  const title = params.title || 'Preparing playback';
  const variant = settings.preplayVariant;

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {artwork ? (
        <Image
          source={{ uri: artwork }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={250}
          priority="high"
          cachePolicy="memory-disk"
          placeholder={DARK_IMAGE_PLACEHOLDER}
          placeholderContentFit="cover"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
      )}

      {variant === 'fullBleed' && (
        <>
          <LinearGradient
            colors={['rgba(6,7,10,0.15)', 'transparent', 'rgba(6,7,10,0.95)']}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.bottomContent}>
            <ThemedText style={styles.title} numberOfLines={2}>{title}</ThemedText>
            <View style={styles.row}>
              <Spinner color={colors.accent} size={16} />
              <ThemedText style={styles.subtext}>Preparing playback…</ThemedText>
            </View>
          </View>
        </>
      )}

      {variant === 'split' && (
        <>
          <LinearGradient
            colors={['rgba(5,4,3,0.96)', 'rgba(5,4,3,0.55)', 'transparent']}
            locations={[0, 0.4, 0.65]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.splitPanel}>
            <ThemedText style={styles.eyebrow}>NOW PREPARING</ThemedText>
            <ThemedText style={styles.title} numberOfLines={2}>{title}</ThemedText>
            <View style={styles.row}>
              <Spinner color={colors.accent} size={16} />
              <ThemedText style={styles.subtext}>Fetching download link…</ThemedText>
            </View>
          </View>
        </>
      )}

      {variant === 'centered' && (
        <>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(4,6,5,0.55)' }]} />
          <View style={styles.centeredContent}>
            <ThemedText style={[styles.title, styles.centerText]} numberOfLines={2}>{title}</ThemedText>
            <View style={styles.row}>
              <Spinner color={colors.accent} size={20} />
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  bottomContent: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 24,
    gap: 10,
  },
  splitPanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '52%',
    justifyContent: 'center',
    paddingLeft: 28,
    gap: 10,
  },
  centeredContent: {
    ...(StyleSheet.absoluteFill as object),
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 32,
  },
  centerText: {
    textAlign: 'center',
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    letterSpacing: 0.8,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
});
