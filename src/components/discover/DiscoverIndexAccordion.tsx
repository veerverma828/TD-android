import { useState } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/contexts/ThemeContext';
import { fetchCatalog, MetaItem } from '@/services/cinemeta';
import { GENRES } from '@/constants/genres';
import { DARK_IMAGE_PLACEHOLDER } from '@/constants/placeholder';
import { normalizeImageUrl } from '@/utils/imageUrl';
import { FocusablePressable } from '@/components/tv/FocusablePressable';
import { useIsTV } from '@/contexts/DeviceModeContext';
import { Fonts } from '@/constants/theme';

type MediaType = 'movie' | 'series';

export function DiscoverIndexAccordion() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const isTV = useIsTV();

  const [type, setType] = useState<MediaType>('movie');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loadingGenre, setLoadingGenre] = useState<string | null>(null);
  const [preview, setPreview] = useState<Record<string, MetaItem[]>>({});

  const changeType = (next: MediaType) => {
    setType(next);
    setExpanded(null);
    setPreview({});
  };

  const toggleGenre = async (genre: string) => {
    if (expanded === genre) {
      setExpanded(null);
      return;
    }
    setExpanded(genre);
    const cacheKey = `${type}:${genre}`;
    if (!preview[cacheKey]) {
      setLoadingGenre(genre);
      try {
        const data = await fetchCatalog(type, 'top', genre);
        setPreview((prev) => ({ ...prev, [cacheKey]: data.slice(0, 6) }));
      } catch {
        setPreview((prev) => ({ ...prev, [cacheKey]: [] }));
      } finally {
        setLoadingGenre(null);
      }
    }
  };

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
        <View style={styles.toggle}>
          <FocusablePressable onPress={() => changeType('movie')} focusRingBorderRadius={4} accessibilityRole="button" accessibilityState={{ selected: type === 'movie' }} accessibilityLabel="Movies">
            <ThemedText style={[styles.toggleText, { color: type === 'movie' ? colors.text : colors.textSecondary, borderBottomColor: type === 'movie' ? colors.accent : 'transparent' }]}>
              Movies
            </ThemedText>
          </FocusablePressable>
          <FocusablePressable onPress={() => changeType('series')} focusRingBorderRadius={4} accessibilityRole="button" accessibilityState={{ selected: type === 'series' }} accessibilityLabel="Series">
            <ThemedText style={[styles.toggleText, { color: type === 'series' ? colors.text : colors.textSecondary, borderBottomColor: type === 'series' ? colors.accent : 'transparent' }]}>
              Series
            </ThemedText>
          </FocusablePressable>
        </View>
      </View>

      <View style={styles.index}>
        {GENRES.map((genre, i) => {
          const isOpen = expanded === genre;
          const cacheKey = `${type}:${genre}`;
          const items = preview[cacheKey];
          return (
            <View key={genre} style={[styles.row, isTV && tvStyles.row, { borderColor: colors.backgroundSelected }]}>
              <FocusablePressable style={styles.rowHead} onPress={() => toggleGenre(genre)} focusRingBorderRadius={4} accessibilityRole="button" accessibilityState={{ expanded: isOpen }} accessibilityLabel={genre}>
                <ThemedText style={[styles.num, isTV && tvStyles.num, { color: isOpen ? colors.accent : colors.textSecondary }]}>
                  {String(i + 1).padStart(2, '0')}
                </ThemedText>
                <ThemedText style={[styles.name, isTV && tvStyles.name, { color: isOpen ? colors.text : colors.textSecondary }]}>{genre}</ThemedText>
                <ThemedText style={{ color: colors.accent, fontSize: isTV ? 16 : 12 }}>{isOpen ? '︿' : '﹀'}</ThemedText>
              </FocusablePressable>

              {isOpen && (
                <View style={styles.previewWrap}>
                  {loadingGenre === genre ? (
                    <ActivityIndicator color={colors.accent} style={{ marginVertical: 12 }} />
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 6, paddingLeft: 4 }}>
                      {(items || []).map((item) => (
                        <FocusablePressable
                          key={item.id}
                          onPress={() => router.push({
                            pathname: '/details',
                            params: {
                              id: item.id,
                              type: item.type,
                              title: item.name,
                              ...(item.poster ? { poster: normalizeImageUrl(item.poster) } : {}),
                              ...((item.background || item.poster) ? { background: normalizeImageUrl(item.background || item.poster, 'backdrop') } : {}),
                            },
                          })}
                          style={{ width: isTV ? 130 : 78 }}
                          focusRingBorderRadius={4}
                          accessibilityRole="button"
                          accessibilityLabel={item.name}
                        >
                          <Image
                            source={{ uri: normalizeImageUrl(item.poster, 'thumbnail') }}
                            style={[styles.previewImage, isTV && tvStyles.previewImage]}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            transition={200}
                            placeholder={DARK_IMAGE_PLACEHOLDER}
                            placeholderContentFit="cover"
                          />
                        </FocusablePressable>
                      ))}
                      <FocusablePressable onPress={() => goToGenre(genre)} style={[styles.seeAll, isTV && tvStyles.seeAll]} focusRingBorderRadius={4} accessibilityRole="button" accessibilityLabel={`See all ${genre}`}>
                        <ThemedText style={{ color: colors.accent, fontSize: isTV ? 14 : 11, fontWeight: '700', textAlign: 'center' }}>See{'\n'}all ›</ThemedText>
                      </FocusablePressable>
                    </ScrollView>
                  )}
                </View>
              )}
            </View>
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
  title: { fontSize: 22 },
  toggle: { flexDirection: 'row', gap: 14 },
  toggleText: {
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: '700',
    paddingBottom: 3,
    borderBottomWidth: 2,
  },
  index: { paddingBottom: 40 },
  row: {
    borderBottomWidth: 1,
    paddingVertical: 16,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  num: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
    flex: 1,
  },
  previewWrap: { marginTop: 14 },
  previewImage: {
    width: 78,
    height: 112,
    borderRadius: 4,
  },
  seeAll: {
    width: 60,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// TV-only style overrides, applied on top of `styles` with `isTV && tvStyles.x`.
// Kept in their own StyleSheet so TV layout tweaks never touch mobile values above.
const tvStyles = StyleSheet.create({
  container: { paddingHorizontal: 32 },
  title: { fontFamily: Fonts.serif, fontSize: 40 },
  row: { paddingVertical: 20 },
  num: { fontSize: 14 },
  name: { fontSize: 26 },
  previewImage: { width: 130, height: 186 },
  seeAll: { width: 90, height: 186 },
});
