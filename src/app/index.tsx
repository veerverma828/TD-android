import { StyleSheet, ScrollView, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { ThemedView } from '@/components/themed-view';
import { HeroBanner, HeroItem } from '@/components/HeroBanner';
import { Carousel } from '@/components/Carousel';
import { ContinueWatchingRow } from '@/components/ContinueWatchingRow';
import { PosterActionsSheet } from '@/components/PosterActionsSheet';
import { useAppTheme } from '@/contexts/ThemeContext';
import { fetchDefaultMovies, fetchDefaultSeries, fetchCatalog, MetaItem } from '@/services/cinemeta';
import { useSettings } from '@/contexts/SettingsContext';
import { useMyList } from '@/contexts/MyListContext';
import { useContinueWatching, ContinueWatchingItem } from '@/hooks/useContinueWatching';

const CURRENT_YEAR = String(new Date().getFullYear());

interface RowConfig {
  key: string;
  title: string;
  type: string;
  category: string;
  genre?: string;
}

const EXTRA_ROWS: RowConfig[] = [
  { key: 'topRatedMovies', title: 'Top Rated Movies', type: 'movie', category: 'imdbRating' },
  { key: 'topRatedSeries', title: 'Top Rated Series', type: 'series', category: 'imdbRating' },
  { key: 'newReleases', title: 'New Releases', type: 'movie', category: 'year', genre: CURRENT_YEAR },
  { key: 'anime', title: 'Anime', type: 'series', category: 'top', genre: 'Anime' },
  { key: 'realityTv', title: 'Reality TV', type: 'series', category: 'top', genre: 'Reality-TV' },
  { key: 'action', title: 'Action', type: 'movie', category: 'top', genre: 'Action' },
  { key: 'comedy', title: 'Comedy', type: 'movie', category: 'top', genre: 'Comedy' },
  { key: 'horror', title: 'Horror', type: 'movie', category: 'top', genre: 'Horror' },
  { key: 'scifi', title: 'Sci-Fi', type: 'movie', category: 'top', genre: 'Sci-Fi' },
];

export default function HomeScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { showRating } = useSettings();
  const { list: myList, toggle: toggleMyList, isInList } = useMyList();
  const { items: continueWatchingItems, removeItem: removeContinueWatchingItem } = useContinueWatching();
  const [selectedContinueWatchingItem, setSelectedContinueWatchingItem] = useState<ContinueWatchingItem | null>(null);

  const [movies, setMovies] = useState<MetaItem[]>([]);
  const [series, setSeries] = useState<MetaItem[]>([]);
  const [extraRows, setExtraRows] = useState<Record<string, MetaItem[]>>({});
  const [heroSourceItems, setHeroSourceItems] = useState<MetaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MetaItem | null>(null);

  useEffect(() => {
    let cancelled = false;

    const pickRandom = (list: MetaItem[]) => {
      if (list.length === 0) return undefined;
      const pool = list.slice(0, Math.min(5, list.length));
      return pool[Math.floor(Math.random() * pool.length)];
    };

    const prefetchPosters = (items: MetaItem[]) => {
      const urls = items.map((item) => item.poster).filter(Boolean) as string[];
      if (urls.length) Image.prefetch(urls, 'memory-disk');
    };

    async function loadPriorityRow() {
      try {
        const [fetchedMovies, fetchedSeries] = await Promise.all([
          fetchDefaultMovies(),
          fetchDefaultSeries(),
        ]);
        if (cancelled) return;
        setMovies(fetchedMovies);
        setSeries(fetchedSeries);
        prefetchPosters(fetchedMovies);
        prefetchPosters(fetchedSeries);
        setHeroSourceItems([pickRandom(fetchedMovies), pickRandom(fetchedSeries)].filter(Boolean) as MetaItem[]);
      } catch (err) {
        console.error("Failed to fetch cinemeta:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    function loadExtraRows() {
      EXTRA_ROWS.forEach((row) => {
        fetchCatalog(row.type, row.category, row.genre)
          .then((data) => {
            if (cancelled) return;
            setExtraRows((prev) => ({ ...prev, [row.key]: data }));
            prefetchPosters(data.slice(0, 8));
            const candidate = pickRandom(data);
            if (candidate) {
              setHeroSourceItems((prev) =>
                prev.some((item) => item.id === candidate.id) ? prev : [...prev, candidate]
              );
            }
          })
          .catch((err) => {
            console.error(`Failed to fetch ${row.key}:`, err);
          });
      });
    }

    loadPriorityRow();
    loadExtraRows();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleNavigateToDetails = (id: string, type: string) => {
    router.push({ pathname: '/details', params: { id, type } });
  };

  const mapToCarousel = (items: MetaItem[]) => {
    return items.map(item => ({
      id: item.id,
      title: item.name,
      subtitle: item.releaseInfo,
      imageUrl: item.poster || '',
      rating: showRating ? item.imdbRating : undefined,
      type: item.type,
    }));
  };

  const allMeta: MetaItem[] = [movies, series, ...EXTRA_ROWS.map((row) => extraRows[row.key] || [])].flat();

  const heroItems: HeroItem[] = heroSourceItems.map((item) => ({
    id: item.id,
    title: item.name,
    subtitle: item.description?.substring(0, 80) + '...' || 'A journey beyond the edge of the known universe.',
    imageUrl: item.background || item.poster || 'https://images.unsplash.com/photo-1534809027769-b00d750a6bac?auto=format&fit=crop&q=80&w=600',
    tags: item.genres?.slice(0, 3) || ['Movie'],
    isInMyList: isInList(item.id, item.type),
  }));

  const heroItemById = (id: string) => allMeta.find((m) => m.id === id);

  const handleLongPressItem = (id: string) => {
    const meta = allMeta.find((m) => m.id === id);
    if (meta) setSelectedItem(meta);
  };

  return (
    <ThemedView style={styles.container}>
      {/* Top Bar Overlay */}
      <SafeAreaView edges={['top']} style={styles.topBarContainer}>
        <View style={styles.topBar}>
          <View style={styles.logoContainer}>
              <Image 
                source={require('../../assets/images/title-logo-600.png')} 
                style={{ width: 140, height: 28 }} 
                contentFit="contain" 
              />
            </View>
        </View>
      </SafeAreaView>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        {loading ? (
          <View style={{ height: 400, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        ) : (
          <>
            {heroItems.length > 0 && (
              <HeroBanner
                items={heroItems}
                onPlayPress={(item) => {
                  const meta = heroItemById(item.id);
                  if (meta) handleNavigateToDetails(meta.id, meta.type);
                }}
                onListPress={(item) => {
                  const meta = heroItemById(item.id);
                  if (meta) toggleMyList(meta);
                }}
              />
            )}

            {continueWatchingItems.length > 0 && (
              <ContinueWatchingRow
                items={continueWatchingItems}
                onPressItem={(item) => {
                  const params: Record<string, string> = { id: item.id, type: item.type, autoplay: '1' };
                  if (item.season != null && item.episode != null) {
                    params.autoplaySeason = String(item.season);
                    params.autoplayEpisode = String(item.episode);
                  }
                  router.push({ pathname: '/details', params });
                }}
                onLongPressItem={(item) => setSelectedContinueWatchingItem(item)}
              />
            )}

            <Carousel
              title="Top Movies"
              data={mapToCarousel(movies)}
              onPressItem={(item) => handleNavigateToDetails(item.id, (item as any).type)}
              onLongPressItem={(item) => handleLongPressItem(item.id)}
              onPressSeeAll={() => router.push({ pathname: '/see-all', params: { type: 'movie', category: 'top', title: 'Top Movies' } })}
            />

            <Carousel
              title="Top Series"
              data={mapToCarousel(series)}
              onPressItem={(item) => handleNavigateToDetails(item.id, (item as any).type)}
              onLongPressItem={(item) => handleLongPressItem(item.id)}
              onPressSeeAll={() => router.push({ pathname: '/see-all', params: { type: 'series', category: 'top', title: 'Top Series' } })}
            />

            {myList.length > 0 && (
              <Carousel
                title="My List"
                data={mapToCarousel(myList)}
                onPressItem={(item) => handleNavigateToDetails(item.id, (item as any).type)}
                onLongPressItem={(item) => handleLongPressItem(item.id)}
              />
            )}

            {EXTRA_ROWS.map((row) => {
              const data = extraRows[row.key];
              if (!data || data.length === 0) return null;
              return (
                <Carousel
                  key={row.key}
                  title={row.title}
                  data={mapToCarousel(data)}
                  onPressItem={(item) => handleNavigateToDetails(item.id, (item as any).type)}
                  onLongPressItem={(item) => handleLongPressItem(item.id)}
                  onPressSeeAll={() => router.push({
                    pathname: '/see-all',
                    params: { type: row.type, category: row.category, title: row.title, ...(row.genre ? { genre: row.genre } : {}) },
                  })}
                />
              );
            })}
          </>
        )}
        
        {/* Bottom padding for tab bar */}
        <View style={{ height: 40 }} />
      </ScrollView>

      <PosterActionsSheet
        visible={!!selectedItem}
        title={selectedItem?.name}
        onClose={() => setSelectedItem(null)}
        actions={
          selectedItem
            ? [
                {
                  label: 'View Details',
                  icon: 'info.circle',
                  onPress: () => handleNavigateToDetails(selectedItem.id, selectedItem.type),
                },
                isInList(selectedItem.id, selectedItem.type)
                  ? {
                      label: 'Remove from Library',
                      icon: 'trash.fill',
                      destructive: true,
                      onPress: () => toggleMyList(selectedItem),
                    }
                  : {
                      label: 'Add to Library',
                      icon: 'plus',
                      onPress: () => toggleMyList(selectedItem),
                    },
              ]
            : []
        }
      />

      <PosterActionsSheet
        visible={!!selectedContinueWatchingItem}
        title={selectedContinueWatchingItem?.title}
        onClose={() => setSelectedContinueWatchingItem(null)}
        actions={
          selectedContinueWatchingItem
            ? [
                {
                  label: 'Remove from Continue Watching',
                  icon: 'trash.fill',
                  destructive: true,
                  onPress: () => removeContinueWatchingItem(selectedContinueWatchingItem),
                },
              ]
            : []
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 20,
  },
});
