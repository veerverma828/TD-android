import { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { PosterCard } from '@/components/PosterCard';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { fetchCatalog, MetaItem } from '@/services/cinemeta';
import { GENRES } from '@/constants/genres';
import { padToColumns } from '@/utils/gridHelpers';
import { normalizeImageUrl } from '@/utils/imageUrl';
import { FocusablePressable } from '@/components/tv/FocusablePressable';
import { useRestoreFocus } from '@/hooks/tv/useRestoreFocus';
import { useIsTV } from '@/contexts/DeviceModeContext';
import { Fonts } from '@/constants/theme';

type MediaType = 'movie' | 'series';

export function DiscoverRailSwitch() {
  const { colors } = useAppTheme();
  const { showRating } = useSettings();
  const router = useRouter();
  const isTV = useIsTV();
  const columns = isTV ? 5 : 2;

  const [type, setType] = useState<MediaType>('movie');
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [items, setItems] = useState<MetaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasPreferredFocus, registerFocusable } = useRestoreFocus(`discover-${type}-${activeGenre ?? ''}`);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    fetchCatalog(type, 'top', activeGenre ?? undefined)
      .then((data) => { if (!ignore) setItems(data); })
      .catch(() => { if (!ignore) setItems([]); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [type, activeGenre]);

  return (
    <View style={[styles.container, isTV && tvStyles.container]}>
      <ThemedText type="title" style={[styles.title, isTV && tvStyles.title]}>Discover</ThemedText>

      <View style={[styles.switch, isTV && tvStyles.switch, { backgroundColor: colors.backgroundElement }]}>
        <View
          style={[
            styles.switchThumb,
            isTV && tvStyles.switchThumb,
            { backgroundColor: colors.accent, left: type === 'movie' ? 6 : '50%' },
          ]}
        />
        <FocusablePressable
          style={styles.switchOption}
          onPress={() => setType('movie')}
          focusRingBorderRadius={18}
          focusRingScale={false}
          accessibilityRole="button"
          accessibilityState={{ selected: type === 'movie' }}
          accessibilityLabel="Movies"
        >
          <ThemedText style={[styles.switchText, { color: type === 'movie' ? colors.textOnAccent : colors.textSecondary }]}>Movies</ThemedText>
        </FocusablePressable>
        <FocusablePressable
          style={styles.switchOption}
          onPress={() => setType('series')}
          focusRingBorderRadius={18}
          focusRingScale={false}
          accessibilityRole="button"
          accessibilityState={{ selected: type === 'series' }}
          accessibilityLabel="Series"
        >
          <ThemedText style={[styles.switchText, { color: type === 'series' ? colors.textOnAccent : colors.textSecondary }]}>Series</ThemedText>
        </FocusablePressable>
      </View>

      <FlatList
        style={[styles.genreList, isTV && tvStyles.genreList]}
        data={padToColumns(
          [
            { id: '__all__', name: 'All' },
            ...GENRES.map((g) => ({ id: g, name: g })),
          ],
          1
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(g) => g!.id}
        contentContainerStyle={styles.genreRow}
        renderItem={({ item: g }) => {
          if (!g) return null;
          const isAll = g.id === '__all__';
          const isOn = isAll ? activeGenre === null : activeGenre === g.id;
          return (
            <FocusablePressable
              style={[
                styles.chip,
                isTV && tvStyles.chip,
                { borderColor: colors.backgroundSelected, backgroundColor: isOn ? colors.accent : 'transparent' },
              ]}
              onPress={() => setActiveGenre(isAll ? null : g.id)}
              focusRingBorderRadius={16}
              accessibilityRole="button"
              accessibilityState={{ selected: isOn }}
              accessibilityLabel={g.name}
            >
              <ThemedText numberOfLines={1} style={{ color: isOn ? colors.textOnAccent : colors.text, fontWeight: '600', fontSize: isTV ? 14 : 12, lineHeight: isTV ? 17 : 15 }}>{g.name}</ThemedText>
            </FocusablePressable>
          );
        }}
      />

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          key={columns}
          style={{ flex: 1 }}
          data={padToColumns(items, columns)}
          keyExtractor={(item, index) => item?.id ?? `filler-${index}`}
          numColumns={columns}
          contentContainerStyle={[styles.grid, isTV && tvStyles.grid]}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={!isTV}
          renderItem={({ item, index }) => {
            if (!item) return <View style={[styles.poster, { width: `${100 / columns - 2}%` }]} />;
            const restoreKey = `${item.type}:${item.id}`;
            return (
              <PosterCard
                title={item.name}
                subtitle={item.releaseInfo}
                imageUrl={item.poster || ''}
                rating={showRating ? item.imdbRating : undefined}
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
                style={{ ...styles.poster, width: `${100 / columns - 2}%` }}
                focusRingScale={false}
                hasTVPreferredFocus={hasPreferredFocus(restoreKey, index === 0)}
                onFocus={() => registerFocusable(restoreKey)}
              />
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  title: { fontSize: 24, marginBottom: 16 },
  // padding must exceed the ring's fixed -3 margin bleed, or the ring's outer
  // edge lands exactly on this pill's own rounded-corner boundary with zero
  // clearance - Android clips content to a borderRadius+backgroundColor pill
  // like this even without explicit overflow:hidden, cutting the ring off.
  switch: {
    flexDirection: 'row',
    borderRadius: 22,
    padding: 6,
    height: 38,
    marginBottom: 16,
  },
  switchThumb: {
    position: 'absolute',
    top: 6,
    width: '50%',
    height: 26,
    borderRadius: 15,
  },
  switchOption: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  switchText: { fontSize: 12.5, lineHeight: 16, fontWeight: '700' },
  // Explicit height matters here: every chip's own height comes only from padding
  // (no fixed width/height), and this is the only horizontal FlatList in the app
  // whose items are auto-sized rather than fixed-width - without a height on the
  // list itself, that auto-sized chain never resolves and the row renders empty.
  genreList: { height: 40, flexGrow: 0, marginBottom: 16 },
  // paddingLeft gives the first chip's focus ring room to draw its left edge -
  // flush against the FlatList's own scroll-clip boundary (x:0), the ring would
  // otherwise get cut off there (same as the episode season pills).
  genreRow: { gap: 8, paddingVertical: 6, paddingLeft: 4, paddingRight: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  // paddingTop gives the first row's focus ring room against the grid's own
  // vertical scroll-clip boundary (y:0); paddingLeft/Right do the same for the
  // first/last column - space-between otherwise packs posters flush against the
  // FlatList's own content edges (outside container's paddingHorizontal, which
  // insets the FlatList itself, not the clipped scroll region inside it), so
  // the leftmost poster's ring got cut off there, same reason as genreRow above.
  // The buffer has to be bigger than genreRow's: the ring's focusRingScale grows
  // it by ~4% of the FOCUSED ITEM'S OWN size (not a fixed pixel amount) - a small
  // chip barely notices, but a ~160-180px-wide poster needs ~6-7px of scale bleed
  // on top of the ring's fixed 3px margin, hence 10 (mobile) / 16 (TV, wider still).
  grid: { paddingTop: 4, paddingBottom: 40, paddingLeft: 10, paddingRight: 10 },
  gridRow: { justifyContent: 'space-between', marginBottom: 12 },
  poster: { width: '48%', marginRight: 0 },
});

// TV-only style overrides, applied on top of `styles` with `isTV && tvStyles.x`.
// Kept in their own StyleSheet so TV layout tweaks never touch mobile values above.
const tvStyles = StyleSheet.create({
  container: { paddingHorizontal: 32 },
  title: { fontFamily: Fonts.serif, fontSize: 40, marginBottom: 24 },
  switch: { height: 44 },
  switchThumb: { height: 32 },
  chip: { paddingHorizontal: 18, paddingVertical: 9 },
  genreList: { height: 46 },
  grid: { paddingLeft: 16, paddingRight: 16 },
});
