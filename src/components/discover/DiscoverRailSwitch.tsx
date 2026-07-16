import { useEffect, useState } from 'react';
import { StyleSheet, View, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { PosterCard } from '@/components/PosterCard';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { fetchCatalog, MetaItem } from '@/services/cinemeta';
import { GENRES } from '@/constants/genres';
import { padToColumns } from '@/utils/gridHelpers';

type MediaType = 'movie' | 'series';

export function DiscoverRailSwitch() {
  const { colors } = useAppTheme();
  const { showRating } = useSettings();
  const router = useRouter();

  const [type, setType] = useState<MediaType>('movie');
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [items, setItems] = useState<MetaItem[]>([]);
  const [loading, setLoading] = useState(true);

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
    <View style={styles.container}>
      <ThemedText type="title" style={styles.title}>Discover</ThemedText>

      <View style={[styles.switch, { backgroundColor: colors.backgroundElement }]}>
        <View
          style={[
            styles.switchThumb,
            { backgroundColor: colors.accent, left: type === 'movie' ? 3 : '50%' },
          ]}
        />
        <Pressable style={styles.switchOption} onPress={() => setType('movie')}>
          <ThemedText style={[styles.switchText, { color: type === 'movie' ? '#fff' : colors.textSecondary }]}>Movies</ThemedText>
        </Pressable>
        <Pressable style={styles.switchOption} onPress={() => setType('series')}>
          <ThemedText style={[styles.switchText, { color: type === 'series' ? '#fff' : colors.textSecondary }]}>Series</ThemedText>
        </Pressable>
      </View>

      <FlatList
        style={styles.genreList}
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
            <Pressable
              style={[
                styles.chip,
                { borderColor: colors.backgroundSelected, backgroundColor: isOn ? colors.accent : 'transparent' },
              ]}
              onPress={() => setActiveGenre(isAll ? null : g.id)}
            >
              <ThemedText style={{ color: isOn ? '#fff' : colors.text, fontWeight: '600', fontSize: 12 }}>{g.name}</ThemedText>
            </Pressable>
          );
        }}
      />

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={padToColumns(items, 2)}
          keyExtractor={(item, index) => item?.id ?? `filler-${index}`}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) =>
            item ? (
              <PosterCard
                title={item.name}
                subtitle={item.releaseInfo}
                imageUrl={item.poster || ''}
                rating={showRating ? item.imdbRating : undefined}
                onPress={() => router.push({ pathname: '/details', params: { id: item.id, type: item.type } })}
                style={styles.poster}
              />
            ) : (
              <View style={styles.poster} />
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  title: { fontSize: 24, marginBottom: 16 },
  switch: {
    flexDirection: 'row',
    borderRadius: 22,
    padding: 3,
    height: 38,
    marginBottom: 16,
  },
  switchThumb: {
    position: 'absolute',
    top: 3,
    width: '50%',
    height: 32,
    borderRadius: 18,
  },
  switchOption: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  switchText: { fontSize: 12.5, lineHeight: 16, fontWeight: '700' },
  genreList: { flexGrow: 0, marginBottom: 16 },
  genreRow: { gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  grid: { paddingBottom: 40 },
  gridRow: { justifyContent: 'space-between', marginBottom: 12 },
  poster: { width: '48%', marginRight: 0 },
});
