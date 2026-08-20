import { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/contexts/ThemeContext';
import { fetchCatalog } from '@/services/cinemeta';
import { GENRES } from '@/constants/genres';
import { DARK_IMAGE_PLACEHOLDER } from '@/constants/placeholder';
import { normalizeImageUrl } from '@/utils/imageUrl';
import { FocusablePressable } from '@/components/tv/FocusablePressable';
import { useIsTV } from '@/contexts/DeviceModeContext';
import { Fonts } from '@/constants/theme';

type MediaType = 'movie' | 'series';

const TALL_GENRES = new Set(['Action', 'Horror']);

export function DiscoverGenreWall() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const isTV = useIsTV();
  const columns = isTV ? 4 : 2;
  const [type, setType] = useState<MediaType>('movie');
  const [covers, setCovers] = useState<Record<string, string>>({});

  useEffect(() => {
    let ignore = false;
    Promise.all(
      GENRES.map(async (genre) => {
        try {
          const data = await fetchCatalog(type, 'top', genre);
          // These render into small (84-176dp) tiles, GENRES.length of them at once -
          // without downsizing this was pulling full-res (up to ~3MB) Cinemeta/TMDB
          // originals for a wall of thumbnails, all in parallel.
          const cover = data[0]?.poster || data[0]?.background;
          return [genre, normalizeImageUrl(cover, 'thumbnail')] as const;
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
    <ScrollView style={[styles.container, isTV && tvStyles.container]} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <ThemedText type="title" style={[styles.title, isTV && tvStyles.title]}>Discover</ThemedText>
        <View style={[styles.toggle, { backgroundColor: colors.backgroundElement }]}>
          <FocusablePressable
            style={[styles.toggleBtn, type === 'movie' && { backgroundColor: colors.accent }]}
            onPress={() => setType('movie')}
            focusRingBorderRadius={6}
            accessibilityRole="button"
            accessibilityState={{ selected: type === 'movie' }}
            accessibilityLabel="Movies"
          >
            <ThemedText style={{ fontSize: 11, fontWeight: '800', color: type === 'movie' ? colors.textOnAccent : colors.textSecondary }}>M</ThemedText>
          </FocusablePressable>
          <FocusablePressable
            style={[styles.toggleBtn, type === 'series' && { backgroundColor: colors.accent }]}
            onPress={() => setType('series')}
            focusRingBorderRadius={6}
            accessibilityRole="button"
            accessibilityState={{ selected: type === 'series' }}
            accessibilityLabel="Series"
          >
            <ThemedText style={{ fontSize: 11, fontWeight: '800', color: type === 'series' ? colors.textOnAccent : colors.textSecondary }}>S</ThemedText>
          </FocusablePressable>
        </View>
      </View>

      <View style={[styles.wall, isTV && tvStyles.wall]}>
        {GENRES.map((genre) => {
          const cover = covers[genre];
          const isTall = TALL_GENRES.has(genre);
          return (
            <FocusablePressable
              key={`${type}-${genre}`}
              onPress={() => goToGenre(genre)}
              focusRingBorderRadius={6}
              focusRingScale={false}
              accessibilityRole="button"
              accessibilityLabel={genre}
              style={({ pressed }) => [
                styles.tile,
                { width: `${100 / columns - 2}%` },
                isTV && tvStyles.tile,
                isTall && (isTV ? tvStyles.tileTall : styles.tileTall),
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
            </FocusablePressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  // paddingTop gives the header row's focus ring room against the ScrollView's
  // own vertical scroll-clip boundary (y:0) - otherwise its top edge gets cut off.
  scrollContent: { paddingTop: 4 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 24 },
  // padding must exceed the ring's fixed -3 margin bleed (see DiscoverRailSwitch's
  // switch pill for the full explanation) or it gets clipped at this pill's edge.
  toggle: { flexDirection: 'row', gap: 2, borderRadius: 8, padding: 6 },
  toggleBtn: {
    width: 28, height: 28, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  // paddingHorizontal gives the leftmost/rightmost tile's focus ring room against
  // the ScrollView's clipped viewport edge, same reason as the poster grid in
  // DiscoverRailSwitch - tiles otherwise pack flush against it with no buffer.
  // focusRingScale bleed is ~4% of the focused tile's own size, not a fixed
  // pixel amount, so wider tiles need more room - see tvStyles.wall below.
  wall: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 40,
    paddingHorizontal: 8,
  },
  tile: {
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

// TV-only style overrides, applied on top of `styles` with `isTV && tvStyles.x`.
// Kept in their own StyleSheet so TV layout tweaks never touch mobile values above.
const tvStyles = StyleSheet.create({
  container: { paddingHorizontal: 32 },
  title: { fontFamily: Fonts.serif, fontSize: 40 },
  wall: { paddingHorizontal: 16 },
  tile: { height: 140 },
  tileTall: { height: 292 },
});
