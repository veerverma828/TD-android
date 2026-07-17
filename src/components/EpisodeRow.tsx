import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from './themed-text';
import { IconSymbol } from './IconSymbol';
import { useAppTheme } from '@/contexts/ThemeContext';
import { DARK_IMAGE_PLACEHOLDER } from '@/constants/placeholder';
import { FocusablePressable } from './tv/FocusablePressable';

interface EpisodeRowProps {
  episodeNumber: number;
  title: string;
  duration: string;
  imageUrl: string;
  overview?: string;
  rating?: string;
  onPress?: () => void;
}

export const EpisodeRow = memo(function EpisodeRow({ episodeNumber, title, duration, imageUrl, overview, rating, onPress }: EpisodeRowProps) {
  const { colors } = useAppTheme();

  return (
    <FocusablePressable
      onPress={onPress}
      focusRingBorderRadius={8}
      accessibilityRole="button"
      accessibilityLabel={`Episode ${episodeNumber}. ${title}`}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: pressed ? colors.backgroundElement : 'transparent' },
      ]}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          placeholder={DARK_IMAGE_PLACEHOLDER}
          placeholderContentFit="cover"
        />
        <View style={styles.playIconOverlay}>
          <IconSymbol name="play.circle.fill" color="#ffffff" size={28} />
        </View>
      </View>
      
      <View style={styles.infoContainer}>
        <ThemedText style={styles.title} numberOfLines={1}>
          {episodeNumber}. {title}
        </ThemedText>
        <View style={styles.metaRow}>
          <ThemedText style={[styles.duration, { color: colors.textSecondary }]}>
            {duration}
          </ThemedText>
          {rating && parseFloat(rating) > 0 ? (
            <View style={styles.ratingPill}>
              <IconSymbol name="star.fill" color="#f5c518" size={11} />
              <ThemedText style={styles.ratingText}>{rating}</ThemedText>
            </View>
          ) : null}
        </View>
        {overview ? (
          <ThemedText style={[styles.overview, { color: colors.textSecondary }]} numberOfLines={2}>
            {overview}
          </ThemedText>
        ) : null}
      </View>
    </FocusablePressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  imageContainer: {
    width: 120,
    height: 68,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
    marginRight: 16,
  },
  image: {
    flex: 1,
  },
  playIconOverlay: {
    ...StyleSheet.absoluteFill as any,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  duration: {
    fontSize: 13,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    color: '#f5c518',
    fontWeight: '600',
  },
  overview: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
});
