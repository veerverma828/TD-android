import { useEffect, useState } from 'react';
import { StyleSheet, View, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/contexts/ThemeContext';
import { fetchCatalog } from '@/services/cinemeta';
import { GENRES } from '@/constants/genres';
import { DARK_IMAGE_PLACEHOLDER } from '@/constants/placeholder';

type MediaType = 'movie' | 'series';

const TALL_GENRES = new Set(['Action', 'Horror']);

export function DiscoverGenreWall() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const [type, setType] = useState<MediaType>('movie');
  const [covers, setCovers] = useState<Record<string, string>>({});

  useEffect(() => {
    let ignore = false;
    Promise.all(
      GENRES.map(async (genre) => {
        try {
          const data = await fetchCatalog(type, 'top', genre);
          return [genre, data[0]?.poster || data[0]?.background] as const;
        } catch {
          return [genre, undefined] as const;
        }
      })
    ).then((results) => {
      if (ignore) return;
      const next: Record<string, string> = {};
      results.forEach(([genre, uri]) => { if (uri) next[genre] = uri; });
      setCovers(next);
    });
    return () => { ignore = true; };
  }, [type]);

  const goToGenre = (genre: string) => {
    router.push({
      pathname: '/see-all',
      params: { type, category: 'top', genre, title: genre },
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>Discover</ThemedText>
        <View style={[styles.toggle, { backgroundColor: colors.backgroundElement }]}>
          <Pressable
            style={[styles.toggleBtn, type === 'movie' && { backgroundColor: colors.accent }]}
            onPress={() => setType('movie')}
          >
            <ThemedText style={{ fontSize: 11, fontWeight: '800', color: type === 'movie' ? '#fff' : colors.textSecondary }}>M</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, type === 'series' && { backgroundColor: colors.accent }]}
            onPress={() => setType('series')}
          >
            <ThemedText style={{ fontSize: 11, fontWeight: '800', color: type === 'series' ? '#fff' : colors.textSecondary }}>S</ThemedText>
          </Pressable>
        </View>
      </View>

      <View style={styles.wall}>
        {GENRES.map((genre) => {
          const cover = covers[genre];
          return (
            <Pressable
              key={`${type}-${genre}`}
              onPress={() => goToGenre(genre)}
              style={({ pressed }) => [
                styles.tile,
                TALL_GENRES.has(genre) && styles.tileTall,
                { backgroundColor: colors.backgroundElement, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              {cover && (
                <Image
                  source={{ uri: cover }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                  placeholder={DARK_IMAGE_PLACEHOLDER}
                  placeholderContentFit="cover"
                />
              )}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.75)']}
                locations={[0.3, 1]}
                style={StyleSheet.absoluteFill}
              />
              <View style={[styles.tileAccent, { backgroundColor: colors.accent }]} />
              <ThemedText style={styles.tileLabel}>{genre}</ThemedText>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 24 },
  toggle: { flexDirection: 'row', gap: 2, borderRadius: 8, padding: 2 },
  toggleBtn: {
    width: 28, height: 28, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  wall: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 40,
  },
  tile: {
    width: '48%',
    height: 84,
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 12,
  },
  tileTall: {
    height: 176,
  },
  tileAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  tileLabel: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
