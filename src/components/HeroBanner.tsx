import { Image } from 'expo-image';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  Pressable,
  FlatList,
  Dimensions,
  Easing,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from './IconSymbol';
import { ThemedText } from './themed-text';
import { ThemeColor } from '@/constants/theme';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useIsTV } from '@/contexts/DeviceModeContext';
import { DARK_IMAGE_PLACEHOLDER } from '@/constants/placeholder';
import { FocusablePressable } from './tv/FocusablePressable';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AUTO_PLAY_INTERVAL = 6000;

export interface HeroItem {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  tags: string[];
  isInMyList?: boolean;
}

interface HeroBannerProps {
  items: HeroItem[];
  onPlayPress?: (item: HeroItem) => void;
  onListPress?: (item: HeroItem) => void;
  hasTVPreferredFocus?: boolean;
  onPlayFocus?: () => void;
}

const HeroSlide = memo(function HeroSlide({ item, colors }: { item: HeroItem; colors: Record<ThemeColor, string> }) {
  const [failed, setFailed] = useState(false);

  return (
    <View style={styles.slide}>
      {item.imageUrl && !failed ? (
        <Image
          key={item.id}
          source={{ uri: item.imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={100}
          priority="high"
          cachePolicy="memory-disk"
          recyclingKey={item.imageUrl}
          placeholder={DARK_IMAGE_PLACEHOLDER}
          placeholderContentFit="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <View style={[styles.image, styles.imageFallback, { backgroundColor: colors.backgroundElement }]}>
          <IconSymbol name="photo" color={colors.textSecondary} size={40} />
        </View>
      )}
      <LinearGradient
        colors={['rgba(11,13,18,0.4)', 'transparent']}
        locations={[0, 0.35]}
        style={styles.topGradient}
      />
      <LinearGradient
        colors={['transparent', 'rgba(11,13,18,0.2)', 'rgba(11,13,18,0.6)', colors.background]}
        locations={[0, 0.45, 0.7, 1]}
        style={styles.gradient}
      />
    </View>
  );
});

const ProgressBubble = memo(function ProgressBubble({
  isActive,
  pulse,
  accentColor,
}: {
  isActive: boolean;
  pulse: Animated.Value;
  accentColor: string;
}) {
  const scaleX = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <Animated.View
      style={[
        styles.bubble,
        isActive
          ? {
              backgroundColor: accentColor,
              width: 20,
              borderRadius: 4,
              opacity: 1,
              transform: [{ scaleX }],
            }
          : { backgroundColor: 'rgba(255,255,255,0.4)', width: 6, borderRadius: 3, opacity: 0.7 },
      ]}
    />
  );
});

export function HeroBanner({ items, onPlayPress, onListPress, hasTVPreferredFocus = true, onPlayFocus }: HeroBannerProps) {
  const { colors } = useAppTheme();
  const isTV = useIsTV();
  const listRef = useRef<FlatList<HeroItem>>(null);
  const indexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const pulse = useRef(new Animated.Value(0)).current;
  const pulseAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goToIndex = useCallback((index: number) => {
    if (!items || items.length === 0) return;
    const safeIndex = Math.max(0, Math.min(index, items.length - 1));
    indexRef.current = safeIndex;
    setActiveIndex(safeIndex);
    try {
      listRef.current?.scrollToIndex({ index: safeIndex, animated: true });
    } catch {
      // Prevent crash if layout is not ready
    }
  }, [items]);

  const startProgress = useCallback(() => {
    pulse.setValue(0);
    // useNativeDriver here crashes Fabric: every AUTO_PLAY_INTERVAL tick, the
    // dot that becomes active swaps from a static style to this native-driven
    // `transform` in the same commit as its other (JS-driven) style props
    // change — SurfaceMountingManager.overridePropsReadableMap's assertion
    // fails on the mixed native-override + JS prop update, killing the app.
    pulseAnimRef.current = Animated.timing(pulse, {
      toValue: 1,
      duration: AUTO_PLAY_INTERVAL,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    pulseAnimRef.current.start();
  }, [pulse]);

  const pauseAutoplay = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    pulseAnimRef.current?.stop();
  }, []);

  const resumeAutoplay = useCallback(() => {
    if (!items || items.length <= 1) return;
    pauseAutoplay();
    startProgress();
    timerRef.current = setInterval(() => {
      const next = (indexRef.current + 1) % items.length;
      goToIndex(next);
    }, AUTO_PLAY_INTERVAL);
  }, [items, pauseAutoplay, startProgress, goToIndex]);

  useEffect(() => {
    indexRef.current = 0;
    setActiveIndex(0);
    resumeAutoplay();
    return pauseAutoplay;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const handleScrollBeginDrag = useCallback(() => {
    pauseAutoplay();
  }, [pauseAutoplay]);

  const handleMomentumScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!items || items.length === 0) return;
    const index = Math.max(0, Math.min(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH), items.length - 1));
    indexRef.current = index;
    setActiveIndex(index);
    resumeAutoplay();
  }, [items, resumeAutoplay]);

  if (!items || items.length === 0) return null;
  const current = items[activeIndex] || items[0];

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        decelerationRate="fast"
        bounces={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={handleScrollBeginDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollToIndexFailed={(info) => {
          try {
            listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
          } catch {
            // Safe fallback
          }
        }}
        getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
        renderItem={({ item }) => <HeroSlide item={item} colors={colors} />}
        initialNumToRender={items.length}
        windowSize={items.length}
      />

      <View style={[styles.content, isTV && { paddingLeft: 32 }]} pointerEvents="box-none">
        <View style={styles.titleRow}>
          <ThemedText style={styles.title} type="title" numberOfLines={2}>
            {current.title}
          </ThemedText>
        </View>

        <ThemedText style={styles.subtitle} type="default" numberOfLines={2}>
          {current.subtitle}
        </ThemedText>

        <View style={styles.actions}>
          <FocusablePressable
            onPress={() => onPlayPress?.(current)}
            onFocus={isTV ? () => { pauseAutoplay(); onPlayFocus?.(); } : undefined}
            onBlur={isTV ? resumeAutoplay : undefined}
            hasTVPreferredFocus={hasTVPreferredFocus}
            focusRingBorderRadius={3}
            accessibilityRole="button"
            accessibilityLabel="Play"
            style={({ pressed }) => [
              styles.button,
              styles.primaryButton,
              { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 },
            ]}>
            <IconSymbol name="play.fill" color={colors.textOnAccent} size={13} />
            <ThemedText style={[styles.primaryButtonText, { color: colors.textOnAccent }]}>Play</ThemedText>
          </FocusablePressable>

          <FocusablePressable
            onPress={() => onListPress?.(current)}
            onFocus={isTV ? pauseAutoplay : undefined}
            onBlur={isTV ? resumeAutoplay : undefined}
            focusRingBorderRadius={3}
            accessibilityRole="button"
            accessibilityLabel={current.isInMyList ? 'Remove from My List' : 'Add to My List'}
            style={({ pressed }) => [
              styles.button,
              styles.secondaryButton,
              { backgroundColor: colors.backgroundElement, opacity: pressed ? 0.8 : 1 },
            ]}>
            <IconSymbol name={current.isInMyList ? 'checkmark' : 'plus'} color={colors.text} size={13} />
            <ThemedText style={styles.secondaryButtonText}>{current.isInMyList ? 'In List' : 'My List'}</ThemedText>
          </FocusablePressable>
        </View>
      </View>

      {items.length > 1 && (
        <View style={styles.progressRow} pointerEvents="none">
          {items.map((_, index) => (
            <ProgressBubble key={index} isActive={index === activeIndex} pulse={pulse} accentColor={colors.accent} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 380,
    position: 'relative',
    marginBottom: 20,
  },
  slide: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    ...StyleSheet.absoluteFill as any,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '72%',
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  titleRow: {
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'left',
    letterSpacing: 0.1,
    lineHeight: 24,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    textAlign: 'left',
    marginBottom: 12,
    marginTop: 6,
    opacity: 0.8,
    fontSize: 12,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 3,
    gap: 6,
  },
  primaryButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  secondaryButtonText: {
    fontWeight: '600',
    fontSize: 12,
  },
  progressRow: {
    position: 'absolute',
    bottom: 10,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bubble: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
});
