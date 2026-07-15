import { Image } from 'expo-image';
import { StyleSheet, View, Pressable, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from './IconSymbol';
import { ThemedText } from './themed-text';
import { Colors } from '@/constants/theme';

interface HeroBannerProps {
  title: string;
  subtitle: string;
  imageUrl: string;
  tags: string[];
  onPlayPress?: () => void;
  onListPress?: () => void;
}

export function HeroBanner({ title, subtitle, imageUrl, tags, onPlayPress, onListPress }: HeroBannerProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: imageUrl }}
        style={styles.image}
        contentFit="cover"
        transition={300}
        priority="high"
      />
      <LinearGradient
        colors={['transparent', 'rgba(8,8,8,0.2)', colors.background]}
        locations={[0, 0.5, 1]}
        style={styles.gradient}
      />
      <View style={styles.content}>
        {/* Title + genre badges on same row, left-aligned */}
        <View style={styles.titleRow}>
          <ThemedText style={styles.title} type="title" numberOfLines={2}>
            {title}
          </ThemedText>
          <View style={styles.tagsContainer}>
            {tags.map((tag, index) => (
              <View key={index} style={[styles.tag, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}>
                <ThemedText style={styles.tagText}>{tag}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        <ThemedText style={styles.subtitle} type="default" numberOfLines={2}>
          {subtitle}
        </ThemedText>

        <View style={styles.actions}>
          <Pressable
            onPress={onPlayPress}
            style={({ pressed }) => [
              styles.button,
              styles.primaryButton,
              { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 },
            ]}>
            <IconSymbol name="play.fill" color="#fff" size={16} />
            <ThemedText style={styles.primaryButtonText}>Play</ThemedText>
          </Pressable>

          <Pressable
            onPress={onListPress}
            style={({ pressed }) => [
              styles.button,
              styles.secondaryButton,
              { backgroundColor: colors.backgroundElement, opacity: pressed ? 0.8 : 1 },
            ]}>
            <IconSymbol name="plus" color={colors.text} size={16} />
            <ThemedText style={styles.secondaryButtonText}>My List</ThemedText>
          </Pressable>
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
    marginBottom: 24,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    ...StyleSheet.absoluteFill as any,
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'left',
    flexShrink: 1,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'flex-end',
    marginBottom: 2,
    flexShrink: 1,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 16,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '500',
  },
  subtitle: {
    textAlign: 'left',
    marginBottom: 16,
    opacity: 0.8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 28,
    // Pill shape
    borderRadius: 999,
    gap: 8,
  },
  primaryButton: {},
  secondaryButton: {},
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  secondaryButtonText: {
    fontWeight: '600',
    fontSize: 15,
  },
});
