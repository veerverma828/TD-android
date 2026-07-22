import { Image } from 'expo-image';
import { Ref, memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  FlatList,
  Dimensions,
  Easing,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from './IconSymbol';
import { ThemedText } from './themed-text';
import { ThemeColor, Fonts } from '@/constants/theme';
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
  item?: HeroItem | null;
  items?: HeroItem[];
  eyebrow?: string;
  onPlayPress?: (item: HeroItem) => void;
  onListPress?: (item: HeroItem) => void;
  onInfoPress?: (item: HeroItem) => void;
  hasTVPreferredFocus?: boolean;
  onPlayFocus?: () => void;
  playButtonRef?: Ref<View>;
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

function HeroActions({
  hero,
  isTV,
  colors,
  playButtonRef,
  hasTVPreferredFocus,
  onPlayPress,
  onPlayFocus,
  onListPress,
  onInfoPress,
  onFocusPause,
  onBlurResume,
}: {
  hero: HeroItem;
  isTV: boolean;
  colors: Record<ThemeColor, string>;
  playButtonRef?: Ref<View>;
  hasTVPreferredFocus?: boolean;
  onPlayPress?: (item: HeroItem) => void;
  onPlayFocus?: () => void;
  onListPress?: (item: HeroItem) => void;
  onInfoPress?: (item: HeroItem) => void;
  onFocusPause?: () => void;
  onBlurResume?: () => void;
}) {
  return (
    <View style={styles.actions}>
      <FocusablePressable
        ref={playButtonRef}
        onPress={() => onPlayPress?.(hero)}
        onFocus={isTV ? () => { onFocusPause?.(); onPlayFocus?.(); } : undefined}
        onBlur={isTV ? onBlurResume : undefined}
        hasTVPreferredFocus={hasTVPreferredFocus}
        focusRingBorderRadius={22}
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
        onPress={() => onListPress?.(hero)}
        onFocus={isTV ? onFocusPause : undefined}
        onBlur={isTV ? onBlurResume : undefined}
        focusRingBorderRadius={22}
        accessibilityRole="button"
        accessibilityLabel={hero.isInMyList ? 'Remove from My List' : 'Add to My List'}
        style={({ pressed }) => [
          styles.button,
          styles.secondaryButton,
          { backgroundColor: colors.backgroundElement, opacity: pressed ? 0.8 : 1 },
        ]}>
        <IconSymbol name={hero.isInMyList ? 'checkmark' : 'plus'} color={colors.text} size={13} />
        <ThemedText style={styles.secondaryButtonText}>{hero.isInMyList ? 'In List' : 'My List'}</ThemedText>
      </FocusablePressable>

      {onInfoPress && (
        <FocusablePressable
          onPress={() => onInfoPress(hero)}
          onFocus={isTV ? onFocusPause : undefined}
          onBlur={isTV ? onBlurResume : undefined}
          focusRingBorderRadius={22}
          accessibilityRole="button"
          accessibilityLabel="Info"
          style={({ pressed }) => [
            styles.button,
            styles.secondaryButton,
            { backgroundColor: colors.backgroundElement, opacity: pressed ? 0.8 : 1 },
          ]}>
          <IconSymbol name="info.circle" color={colors.text} size={13} />
          <ThemedText style={styles.secondaryButtonText}>Info</ThemedText>
        </FocusablePressable>
      )}
    </View>
  );
}

// TV: single static hero, focus-driven (no autoplay/swipe — conflicts with remote focus navigation).
function TVHeroBanner({
  hero,
  eyebrow,
  colors,
  playButtonRef,
  hasTVPreferredFocus,
  onPlayPress,
  onPlayFocus,
  onListPress,
  onInfoPress,
}: {
  hero: HeroItem;
  eyebrow?: string;
  colors: Record<ThemeColor, string>;
  playButtonRef?: Ref<View>;
  hasTVPreferredFocus?: boolean;
  onPlayPress?: (item: HeroItem) => void;
  onPlayFocus?: () => void;
  onListPress?: (item: HeroItem) => void;
  onInfoPress?: (item: HeroItem) => void;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <View style={styles.container}>
      {hero.imageUrl && !failed ? (
        <Image
          key={hero.id}
          source={{ uri: hero.imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={100}
          priority="high"
          cachePolicy="memory-disk"
          recyclingKey={hero.imageUrl}
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

      <View style={[styles.content, tvStyles.content]} pointerEvents="box-none">
        {eyebrow && (
          <ThemedText style={[tvStyles.eyebrow, { color: colors.accent }]} numberOfLines={1}>
            {eyebrow}
          </ThemedText>
        )}
        <View style={styles.titleRow}>
          <ThemedText style={[styles.title, tvStyles.title]} type="title" numberOfLines={2}>
            {hero.title}
          </ThemedText>
        </View>

        <ThemedText style={styles.subtitle} type="default" numberOfLines={2}>
          {hero.subtitle}
        </ThemedText>

        <HeroActions
          hero={hero}
          isTV
          colors={colors}
          playButtonRef={playButtonRef}
          hasTVPreferredFocus={hasTVPreferredFocus}
          onPlayPress={onPlayPress}
          onPlayFocus={onPlayFocus}
          onListPress={onListPress}
          onInfoPress={onInfoPress}
        />
      </View>
    </View>
  );
}

// Phone: swipeable, autoplaying carousel across `items`.
function PhoneHeroBanner({
  items,
  colors,
  onPlayPress,
  onListPress,
  onInfoPress,
}: {
  items: HeroItem[];
  colors: Record<ThemeColor, string>;
  onPlayPress?: (item: HeroItem) => void;
  onListPress?: (item: HeroItem) => void;
  onInfoPress?: (item: HeroItem) => void;
}) {
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

      <View style={styles.content} pointerEvents="box-none">
        <View style={styles.titleRow}>
          <ThemedText style={styles.title} type="title" numberOfLines={2}>
            {current.title}
          </ThemedText>
        </View>

        <ThemedText style={styles.subtitle} type="default" numberOfLines={2}>
          {current.subtitle}
        </ThemedText>

        <HeroActions
          hero={current}
          isTV={false}
          colors={colors}
          onPlayPress={onPlayPress}
          onListPress={onListPress}
          onInfoPress={onInfoPress}
          onFocusPause={pauseAutoplay}
          onBlurResume={resumeAutoplay}
        />
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

export function HeroBanner({
  item,
  items,
  eyebrow,
  onPlayPress,
  onListPress,
  onInfoPress,
  hasTVPreferredFocus = true,
  onPlayFocus,
  playButtonRef,
}: HeroBannerProps) {
  const { colors } = useAppTheme();
  const isTV = useIsTV();

  if (isTV) {
    const hero = item || items?.[0];
    if (!hero) return null;
    return (
      <TVHeroBanner
        hero={hero}
        eyebrow={eyebrow}
        colors={colors}
        playButtonRef={playButtonRef}
        hasTVPreferredFocus={hasTVPreferredFocus}
        onPlayPress={onPlayPress}
        onPlayFocus={onPlayFocus}
        onListPress={onListPress}
        onInfoPress={onInfoPress}
      />
    );
  }

  const carouselItems = items && items.length > 0 ? items : item ? [item] : [];
  return (
    <PhoneHeroBanner
      items={carouselItems}
      colors={colors}
      onPlayPress={onPlayPress}
      onListPress={onListPress}
      onInfoPress={onInfoPress}
    />
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
    borderRadius: 22,
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

// TV-only style overrides, applied on top of `styles` with `isTV && tvStyles.x`.
// Kept in their own StyleSheet so TV layout tweaks never touch mobile values above.
const tvStyles = StyleSheet.create({
  content: {
    paddingLeft: 32,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 32,
    lineHeight: 36,
  },
});
