import { Image } from 'expo-image';
import { memo, useState } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { ThemedText } from './themed-text';
import { IconSymbol } from './IconSymbol';
import { useAppTheme } from '@/contexts/ThemeContext';
import { DARK_IMAGE_PLACEHOLDER } from '@/constants/placeholder';
import { FocusablePressable } from './tv/FocusablePressable';

interface PosterCardProps {
  title: string;
  subtitle?: string;
  imageUrl: string;
  progress?: number; // 0 to 1
  progressColor?: string;
  rating?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: ViewStyle;
  hasTVPreferredFocus?: boolean;
  onFocus?: () => void;
}

export const PosterCard = memo(function PosterCard({ title, subtitle, imageUrl, progress, progressColor, rating, onPress, onLongPress, style, hasTVPreferredFocus, onFocus }: PosterCardProps) {
  const { colors } = useAppTheme();
  const [failed, setFailed] = useState(false);
  const showFallback = !imageUrl || failed;

  return (
    <FocusablePressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      hasTVPreferredFocus={hasTVPreferredFocus}
      onFocus={onFocus}
      focusRingBorderRadius={4}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      style={({ pressed }) => [
        styles.container,
        style,
        { opacity: pressed ? 0.8 : 1 },
      ]}>
      <View style={styles.imageContainer}>
        {showFallback ? (
          <View style={[styles.image, styles.fallback, { backgroundColor: colors.backgroundElement }]}>
            <IconSymbol name="photo" color={colors.textSecondary} size={28} />
          </View>
        ) : (
          <Image
            source={{ uri: imageUrl }}
            style={[styles.image, { backgroundColor: colors.backgroundElement }]}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            placeholder={DARK_IMAGE_PLACEHOLDER}
            placeholderContentFit="cover"
            onError={() => setFailed(true)}
          />
        )}
        {rating && (
          <View style={styles.ratingBadge}>
            <IconSymbol name="star.fill" color="#FFD700" size={10} />
            <ThemedText style={styles.ratingText}>{rating}</ThemedText>
          </View>
        )}
        {progress !== undefined && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressTrack, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progress * 100}%`, backgroundColor: progressColor ?? colors.accent },
                ]}
              />
            </View>
          </View>
        )}
      </View>
      <ThemedText numberOfLines={1} style={styles.title}>
        {title}
      </ThemedText>
      {subtitle && (
        <ThemedText type="small" numberOfLines={1} style={styles.subtitle}>
          {subtitle}
        </ThemedText>
      )}
    </FocusablePressable>
  );
});

const styles = StyleSheet.create({
  container: {
    width: 120,
    marginRight: 12,
    marginVertical: 4,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  image: {
    flex: 1,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  ratingBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  ratingText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  title: {
    fontSize: 12,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
});
