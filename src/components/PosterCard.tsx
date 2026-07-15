import { Image } from 'expo-image';
import { StyleSheet, View, Pressable, ViewStyle } from 'react-native';

import { ThemedText } from './themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';

interface PosterCardProps {
  title: string;
  subtitle?: string;
  imageUrl: string;
  progress?: number; // 0 to 1
  onPress?: () => void;
  style?: ViewStyle;
}

export function PosterCard({ title, subtitle, imageUrl, progress, onPress, style }: PosterCardProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        style,
        { opacity: pressed ? 0.8 : 1 },
      ]}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUrl }}
          style={[styles.image, { backgroundColor: colors.backgroundElement }]}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
        {progress !== undefined && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressTrack, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progress * 100}%`, backgroundColor: colors.accent },
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 120,
    marginRight: 12,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 8,
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
  title: {
    fontSize: 12,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
});
