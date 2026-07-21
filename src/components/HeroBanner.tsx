import { Image } from 'expo-image';
import { memo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from './IconSymbol';
import { ThemedText } from './themed-text';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useIsTV } from '@/contexts/DeviceModeContext';
import { DARK_IMAGE_PLACEHOLDER } from '@/constants/placeholder';
import { FocusablePressable } from './tv/FocusablePressable';

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
  onPlayPress?: (item: HeroItem) => void;
  onListPress?: (item: HeroItem) => void;
  hasTVPreferredFocus?: boolean;
  onPlayFocus?: () => void;
}

export function HeroBanner({
  item,
  items,
  onPlayPress,
  onListPress,
  hasTVPreferredFocus = true,
  onPlayFocus,
}: HeroBannerProps) {
  const { colors } = useAppTheme();
  const isTV = useIsTV();
  const [failed, setFailed] = useState(false);

  const hero = item || items?.[0];
  if (!hero) return null;

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

      <View style={[styles.content, isTV && tvStyles.content]} pointerEvents="box-none">
        <View style={styles.titleRow}>
          <ThemedText style={styles.title} type="title" numberOfLines={2}>
            {hero.title}
          </ThemedText>
        </View>

        <ThemedText style={styles.subtitle} type="default" numberOfLines={2}>
          {hero.subtitle}
        </ThemedText>

        <View style={styles.actions}>
          <FocusablePressable
            onPress={() => onPlayPress?.(hero)}
            onFocus={isTV ? onPlayFocus : undefined}
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
            onPress={() => onListPress?.(hero)}
            focusRingBorderRadius={3}
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
        </View>
      </View>
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
});

// TV-only style overrides, applied on top of `styles` with `isTV && tvStyles.x`.
// Kept in their own StyleSheet so TV layout tweaks never touch mobile values above.
const tvStyles = StyleSheet.create({
  content: {
    paddingLeft: 32,
  },
});

