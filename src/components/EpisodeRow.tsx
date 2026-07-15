import { StyleSheet, View, Pressable, useColorScheme } from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from './themed-text';
import { IconSymbol } from './IconSymbol';
import { Colors } from '@/constants/theme';

interface EpisodeRowProps {
  episodeNumber: number;
  title: string;
  duration: string;
  imageUrl: string;
  onPress?: () => void;
}

export function EpisodeRow({ episodeNumber, title, duration, imageUrl, onPress }: EpisodeRowProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <Pressable
      onPress={onPress}
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
        />
        <View style={styles.playIconOverlay}>
          <IconSymbol name="play.circle.fill" color="#ffffff" size={28} />
        </View>
      </View>
      
      <View style={styles.infoContainer}>
        <ThemedText style={styles.title} numberOfLines={1}>
          {episodeNumber}. {title}
        </ThemedText>
        <ThemedText style={[styles.duration, { color: colors.textSecondary }]}>
          {duration}
        </ThemedText>
      </View>
      
      <View style={styles.downloadIcon}>
        <IconSymbol name="arrow.down.circle.fill" color={colors.textSecondary} size={24} />
      </View>
    </Pressable>
  );
}

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
  downloadIcon: {
    marginLeft: 12,
    padding: 4,
  },
});
