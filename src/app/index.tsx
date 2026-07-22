import { StyleSheet, ScrollView, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ThemedView } from '@/components/themed-view';
import { HeroBanner, HeroItem } from '@/components/HeroBanner';
import { Carousel } from '@/components/Carousel';
import { ContinueWatchingRow } from '@/components/ContinueWatchingRow';
import { PosterActionsSheet } from '@/components/PosterActionsSheet';
import { useAppTheme } from '@/contexts/ThemeContext';
import { fetchDefaultMovies, fetchDefaultSeries, fetchCatalog, MetaItem } from '@/services/cinemeta';
import { useSettings } from '@/contexts/SettingsContext';
import { useIsTV } from '@/contexts/DeviceModeContext';
import { TVScrollContext, useTVAutoScroll } from '@/contexts/TVScrollContext';
import { useRestoreFocus } from '@/hooks/tv/useRestoreFocus';
import { usePushedScreenFocus } from '@/hooks/tv/usePushedScreenFocus';
import { useMyList } from '@/contexts/MyListContext';
import { useContinueWatching, ContinueWatchingItem } from '@/hooks/useContinueWatching';
import { checkForNewEpisodes } from '@/services/notificationService';
import { normalizeImageUrl } from '@/utils/imageUrl';

const CURRENT_YEAR = String(new Date().getFullYear());
const HERO_SLIDE_COUNT = 5;

interface RowConfig {
  key: string;
  title: string;
  type: string;
  category: string;
  genre?: string;
}

// Deterministic per-seed shuffle — same seed always yields the same order,
// so picks stay stable within a day instead of reshuffling on every re-render.
function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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
  const isTV = useIsTV();
  const scrollViewRef = useRef<ScrollView>(null);
  const { requestScrollIntoView, onScroll: handleTVScroll } = useTVAutoScroll(scrollViewRef, { topMargin: 32, bottomMargin: 32 });
  const tvScrollValue = useMemo(
    () => (isTV ? { requestScrollIntoView } : null),
    [isTV, requestScrollIntoView]
  );
  const { hasPreferredFocus: hasHomeFocus, registerFocusable: registerHomeFocusable } = useRestoreFocus('home');
  const { list: myList, loaded: myListLoaded, toggle: toggleMyList, isInList } = useMyList();
  const { items: continueWatchingItems, removeItem: removeContinueWatchingItem, refresh: refreshContinueWatching } = useContinueWatching();
  const [selectedContinueWatchingItem, setSelectedContinueWatchingItem] = useState<ContinueWatchingItem | null>(null);

  // Home stays mounted in the background while the player is open, so coming
  // back from watching something needs an explicit refetch — otherwise newly
  // synced progress (local or Trakt) never appears until the app restarts.
  useFocusEffect(
    useCallback(() => {
      refreshContinueWatching();
    }, [refreshContinueWatching])
  );

  // Checked once per app foreground/mount — cheap since it no-ops when the
  // user hasn't enabled notifications, and each show is only diffed against
  // its own last-seen episode list rather than re-fetching on every render.
  useEffect(() => {
    if (myListLoaded && myList.length > 0) {
      checkForNewEpisodes(myList.filter((item) => item.type === 'series'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myListLoaded]);

  const [movies, setMovies] = useState<MetaItem[]>([]);
  const [series, setSeries] = useState<MetaItem[]>([]);
  const [extraRows, setExtraRows] = useState<Record<string, MetaItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MetaItem | null>(null);
  // TVTabBar stays mounted alongside Home in the same initial commit, so it
  // can win the native default-focus race against hasTVPreferredFocus below
  // (same race as pushed screens) — grab focus imperatively to close it.
  const heroPlayButtonRef = usePushedScreenFocus<View>([loading]);

  useEffect(() => {
    let cancelled = false;

    const prefetchPosters = (items: MetaItem[]) => {
      const urls = items.map((item) => normalizeImageUrl(item.poster)).filter(Boolean) as string[];
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

  // Hero pick(s): continue-watching lead first (if available), then a fixed-size,
  // artwork-only pool from top movies/series, shuffled with a per-day seed so the
  // lineup feels editorial — stable through the day, not reshuffled on every
  // focus, but still rotates daily instead of being frozen forever.
  // Phone shows the full pool as a swipeable carousel; TV uses only the lead pick.
  const heroSourceItems = useMemo(() => {
    const pool = [...movies, ...series].filter((m) => m.background || m.poster);
    if (pool.length === 0) return [];

    const daySeed = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    const shuffled = seededShuffle(pool, daySeed);

    const inProgressIds = new Set(
      continueWatchingItems.filter((i) => !i.isNext && i.progress > 0).map((i) => i.id)
    );
    const leadItem = pool.find((m) => inProgressIds.has(m.id));

    const rest = leadItem ? shuffled.filter((m) => m.id !== leadItem.id) : shuffled;
    const picks = leadItem ? [leadItem, ...rest] : rest;
    return picks.slice(0, HERO_SLIDE_COUNT);
  }, [movies, series, continueWatchingItems]);

  const heroSourceItem = heroSourceItems[0] || null;

  const handleNavigateToDetails = useCallback((id: string, type: string, title?: string, poster?: string, background?: string) => {
    router.push({
      pathname: '/details',
      params: {
        id,
        type,
        ...(title ? { title } : {}),
        ...(poster ? { poster } : {}),
        ...(background ? { background } : {}),
      },
    });
  }, [router]);

  const mapToCarousel = useCallback((items: MetaItem[]) => {
    return items.map(item => ({
      id: item.id,
      title: item.name,
      subtitle: item.releaseInfo,
      imageUrl: normalizeImageUrl(item.poster),
      // Carried through to details' nav params so its header opens directly
      // on the real backdrop art instead of a stretched poster crop.
      backgroundUrl: normalizeImageUrl(item.background || item.poster, 'backdrop'),
      rating: showRating ? item.imdbRating : undefined,
      type: item.type,
    }));
  }, [showRating]);

  // FlatList treats a new `data` array reference as "everything changed" -
  // without memoizing these, every Carousel remapped movies/series/extraRows
  // to brand-new arrays on every HomeScreen render (e.g. continue-watching
  // polling), which is what triggers RN's "VirtualizedList slow to update"
  // warning and re-renders every visible poster card.
  const moviesData = useMemo(() => mapToCarousel(movies), [movies, mapToCarousel]);
  const seriesData = useMemo(() => mapToCarousel(series), [series, mapToCarousel]);
  const myListData = useMemo(() => mapToCarousel(myList), [myList, mapToCarousel]);
  const extraRowsData = useMemo(() => {
    const result: Record<string, ReturnType<typeof mapToCarousel>> = {};
    for (const row of EXTRA_ROWS) {
      const data = extraRows[row.key];
      if (data && data.length > 0) result[row.key] = mapToCarousel(data);
    }
    return result;
  }, [extraRows, mapToCarousel]);

  const allMeta: MetaItem[] = useMemo(
    () => [movies, series, ...EXTRA_ROWS.map((row) => extraRows[row.key] || [])].flat(),
    [movies, series, extraRows]
  );

  const heroItem: HeroItem | null = heroSourceItem
    ? {
        id: heroSourceItem.id,
        title: heroSourceItem.name,
        subtitle: heroSourceItem.description?.substring(0, 80) + '...' || 'A journey beyond the edge of the known universe.',
        imageUrl: normalizeImageUrl(heroSourceItem.background || heroSourceItem.poster) || 'https://images.unsplash.com/photo-1534809027769-b00d750a6bac?auto=format&fit=crop&q=80&w=600',
        tags: heroSourceItem.genres?.slice(0, 3) || ['Movie'],
        isInMyList: isInList(heroSourceItem.id, heroSourceItem.type),
      }
    : null;

  const heroItems: HeroItem[] = useMemo(
    () =>
      heroSourceItems.map((item) => ({
        id: item.id,
        title: item.name,
        subtitle: item.description?.substring(0, 80) + '...' || 'A journey beyond the edge of the known universe.',
        imageUrl: normalizeImageUrl(item.background || item.poster) || 'https://images.unsplash.com/photo-1534809027769-b00d750a6bac?auto=format&fit=crop&q=80&w=600',
        tags: item.genres?.slice(0, 3) || ['Movie'],
        isInMyList: isInList(item.id, item.type),
      })),
    [heroSourceItems, isInList]
  );

  const heroItemById = (id: string) => allMeta.find((m) => m.id === id);

  const handleLongPressItem = useCallback((id: string) => {
    const meta = allMeta.find((m) => m.id === id);
    if (meta) setSelectedItem(meta);
  }, [allMeta]);

  // Stable identities so Carousel's memo() actually holds - otherwise every
  // row got a brand-new onPressItem/onLongPressItem closure per HomeScreen
  // render, defeating the memo just like the unstable `data` array did.
  const handleCarouselPress = useCallback((item: { id: string; title: string; imageUrl: string }) => {
    handleNavigateToDetails(item.id, (item as any).type, item.title, item.imageUrl, (item as any).backgroundUrl);
  }, [handleNavigateToDetails]);
  const handleCarouselLongPress = useCallback((item: { id: string }) => {
    handleLongPressItem(item.id);
  }, [handleLongPressItem]);
  const handleSeeAllMovies = useCallback(() => {
    router.push({ pathname: '/see-all', params: { type: 'movie', category: 'top', title: 'Top Movies' } });
  }, [router]);
  const handleSeeAllSeries = useCallback(() => {
    router.push({ pathname: '/see-all', params: { type: 'series', category: 'top', title: 'Top Series' } });
  }, [router]);
  const extraRowSeeAllHandlers = useMemo(() => {
    const result: Record<string, () => void> = {};
    for (const row of EXTRA_ROWS) {
      result[row.key] = () => router.push({
        pathname: '/see-all',
        params: { type: row.type, category: row.category, title: row.title, ...(row.genre ? { genre: row.genre } : {}) },
      });
    }
    return result;
  }, [router]);

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

      <TVScrollContext.Provider value={tvScrollValue}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        onScroll={handleTVScroll}
        scrollEventThrottle={16}
      >
        {loading ? (
          <View style={{ height: 400, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        ) : (
          <>
            {heroItem && (
              <HeroBanner
                item={heroItem}
                items={heroItems}
                eyebrow="Featured Original"
                onPlayPress={(item) => {
                  const meta = heroItemById(item.id);
                  if (meta) handleNavigateToDetails(meta.id, meta.type, meta.name, normalizeImageUrl(meta.poster), normalizeImageUrl(meta.background || meta.poster, 'backdrop'));
                }}
                onListPress={(item) => {
                  const meta = heroItemById(item.id);
                  if (meta) toggleMyList(meta);
                }}
                onInfoPress={(item) => {
                  const meta = heroItemById(item.id);
                  if (meta) handleNavigateToDetails(meta.id, meta.type, meta.name, normalizeImageUrl(meta.poster), normalizeImageUrl(meta.background || meta.poster, 'backdrop'));
                }}
                hasTVPreferredFocus={hasHomeFocus('hero-play', true)}
                onPlayFocus={() => registerHomeFocusable('hero-play')}
                playButtonRef={heroPlayButtonRef}
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
                screenKey="home"
              />
            )}

            <Carousel
              title="Top Movies"
              data={moviesData}
              onPressItem={handleCarouselPress}
              onLongPressItem={handleCarouselLongPress}
              onPressSeeAll={handleSeeAllMovies}
              screenKey="home"
            />

            <Carousel
              title="Top Series"
              data={seriesData}
              onPressItem={handleCarouselPress}
              onLongPressItem={handleCarouselLongPress}
              onPressSeeAll={handleSeeAllSeries}
              screenKey="home"
            />

            {myList.length > 0 && (
              <Carousel
                title="My List"
                data={myListData}
                onPressItem={handleCarouselPress}
                onLongPressItem={handleCarouselLongPress}
                screenKey="home"
              />
            )}

            {EXTRA_ROWS.map((row) => {
              const data = extraRowsData[row.key];
              if (!data || data.length === 0) return null;
              return (
                <Carousel
                  key={row.key}
                  title={row.title}
                  data={data}
                  onPressItem={handleCarouselPress}
                  onLongPressItem={handleCarouselLongPress}
                  onPressSeeAll={extraRowSeeAllHandlers[row.key]}
                  screenKey="home"
                />
              );
            })}
          </>
        )}
        
        {/* Bottom padding for tab bar */}
        <View style={{ height: 40 }} />
      </ScrollView>
      </TVScrollContext.Provider>

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
                  onPress: () => handleNavigateToDetails(selectedItem.id, selectedItem.type, selectedItem.name, normalizeImageUrl(selectedItem.poster), normalizeImageUrl(selectedItem.background || selectedItem.poster, 'backdrop')),
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
