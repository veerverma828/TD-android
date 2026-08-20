import { StyleSheet, View, ScrollView, FlatList, ActivityIndicator, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/IconSymbol';
import { TorrentModal } from '@/components/TorrentModal';
import { fetchMeta, DetailedMetaItem, fetchMovieStreams, fetchEpisodeStreams, fetchCatalog, MetaItem } from '@/services/cinemeta';
import { PosterCard } from '@/components/PosterCard';
import { TorrentioStream } from '@/utils/streamHelpers';
import { getActiveDebridProvider, getDebridKey, checkCachedHashes } from '@/services/debridService';
import { getEnabledAddons } from '@/services/addonService';
import { getWatchedSet, setWatched, syncFromTrakt } from '@/services/watchedService';
import { useMyList } from '@/contexts/MyListContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { DARK_IMAGE_PLACEHOLDER } from '@/constants/placeholder';
import { normalizeImageUrl } from '@/utils/imageUrl';
import { buildContentId, parseContentId } from '@/utils/contentId';
import { useScreenBackHandler } from '@/hooks/tv/useTVBackHandler';
import { FocusablePressable } from '@/components/tv/FocusablePressable';
import { EPISODE_SELECTORS, EpisodeSelectorCardCarousel } from '@/components/episodes';
import { useIsTV } from '@/contexts/DeviceModeContext';
import { useRestoreFocus } from '@/hooks/tv/useRestoreFocus';
import { usePushedScreenFocus } from '@/hooks/tv/usePushedScreenFocus';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type TabKey = 'episodes' | 'overview' | 'cast' | 'details';

const TAB_LABELS: Record<TabKey, string> = {
  episodes: 'Episodes',
  overview: 'Overview',
  cast: 'Cast',
  details: 'Details',
};

// Mounted with key={uri} by the caller so a new url remounts it fresh -
// keeps `failed` scoped per-image without needing an effect/ref reset.
function CoverImage({ uri, isPosterFallback, backgroundColor, iconColor }: { uri: string; isPosterFallback: boolean; backgroundColor: string; iconColor: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <View style={[styles.coverImage, styles.coverImageFallback, { backgroundColor }]}>
        <IconSymbol name="photo" color={iconColor} size={48} />
      </View>
    );
  }

  // Landscape backdrops fill the header edge-to-edge with a crop - fine, that's
  // what they're composed for. A portrait poster forced through the same 'cover'
  // treatment gets zoomed/cropped into an unrecognizable sliver (titles with no
  // backdrop art fall back to their poster here). 'contain' shows the whole
  // poster, letterboxed against the theme background instead - stretching it
  // ('fill') to kill the letterbox distorts the art, which reads worse than bars.
  return (
    <View style={[styles.coverImage, isPosterFallback && { backgroundColor }]}>
      <Image
        source={{ uri }}
        style={styles.coverImage}
        contentFit={isPosterFallback ? 'contain' : 'cover'}
        contentPosition="top"
        cachePolicy="memory-disk"
        priority="high"
        recyclingKey={uri}
        placeholder={DARK_IMAGE_PLACEHOLDER}
        placeholderContentFit="cover"
        transition={200}
        onError={() => setFailed(true)}
      />
    </View>
  );
}

export default function DetailsScreen() {
  const router = useRouter();
  const { id, type, title: paramTitle, poster: paramPoster, background: paramBackground, autoplay, autoplaySeason, autoplayEpisode } = useLocalSearchParams<{
    id: string;
    type: string;
    title?: string;
    poster?: string;
    background?: string;
    autoplay?: string;
    autoplaySeason?: string;
    autoplayEpisode?: string;
  }>();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const isTV = useIsTV();
  const { hasPreferredFocus: hasDetailsFocus, registerFocusable: registerDetailsFocusable } = useRestoreFocus(`details-${id}`);
  // TVTabBar stays mounted across the push into this screen, so it can win
  // the native default-focus race against hasTVPreferredFocus below. This
  // grabs focus imperatively once per title, closing that race.
  const playButtonRef = usePushedScreenFocus<View>([id, type]);
  const { toggle: toggleMyList, isInList } = useMyList();
  const { episodeLayout, streamingMode } = useSettings();

  const [modalVisible, setModalVisible] = useState(false);

  // Shared by the hardware-back handler below and TorrentModal's own close button -
  // both need to abort the in-flight stream fetch, not just hide the modal. Without
  // this on the back-handler path specifically, backing out of a loading modal left
  // its fetch running to completion in the background with nothing to stop it.
  const closeStreamModal = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setModalVisible(false);
  };

  useScreenBackHandler(() => {
    if (modalVisible) {
      closeStreamModal();
      return true;
    }
    router.back();
  });
  const [meta, setMeta] = useState<DetailedMetaItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  
  // Stream state
  const [streams, setStreams] = useState<TorrentioStream[]>([]);
  const [streamsLoading, setStreamsLoading] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [cachedHashes, setCachedHashes] = useState<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);
  const [activeTitle, setActiveTitle] = useState<string>('');
  const [activeContentId, setActiveContentId] = useState<string>('');
  const autoplayTriggeredRef = useRef(false);

  // "More Like This" (movie, TV only) - no similar-titles API exists, so this
  // approximates via the same genre-catalog lookup used elsewhere on Home,
  // filtered to exclude the current title. Not a real recommendation engine.
  const [similarItems, setSimilarItems] = useState<MetaItem[]>([]);

  // Series state
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>(type === 'series' ? 'episodes' : 'overview');
  // Resets the tab back to the default whenever navigating to a different
  // title (screen instances get reused, so this can't just be init state) —
  // adjusting state during render, not in an effect, per React's own pattern
  // for resetting state on prop change.
  const [tabResetKey, setTabResetKey] = useState(`${type}:${id}`);
  if (tabResetKey !== `${type}:${id}`) {
    setTabResetKey(`${type}:${id}`);
    setActiveTab(type === 'series' ? 'episodes' : 'overview');
    // Same reused-screen-instance problem as activeTab above, but worse: without this,
    // a stream fetch/modal left open (or still in flight) for the previous title leaks
    // into the newly-shown one - the modal can pop back open already populated with
    // the earlier title's torrents before the user ever taps Watch on the new one.
    setModalVisible(false);
    setStreams([]);
    setStreamsLoading(false);
    setStreamError(null);
    setCachedHashes(new Set());
    setActiveTitle('');
    setActiveContentId('');
  }
  const seasons = Array.from(new Set(meta?.videos?.map(v => v.season) || [])).sort((a, b) => {
    if (a === 0) return 1;
    if (b === 0) return -1;
    return a - b;
  });
  const visibleEpisodes = meta?.videos?.filter(v => v.season === selectedSeason) || [];

  useEffect(() => {
    // Deps on [id, type] (not []) so this cleanup also fires when a reused screen
    // instance switches titles, not just on true unmount - otherwise a stream fetch
    // started for the previous title keeps running after the id/type change.
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [id, type]);

  // Guards the one-shot autoplay-from-Continue-Watching effect below. Reset per
  // id/type so a reused screen instance (screen dedup, or a future router.replace
  // navigation) can't skip autoplay for a new title using a stale flag from the
  // previous one.
  useEffect(() => {
    autoplayTriggeredRef.current = false;
  }, [id, type]);

  useEffect(() => {
    let cancelled = false;
    async function loadMeta() {
      if (!id || !type) return;
      setMeta(null);
      setLoading(true);
      try {
        const data = await fetchMeta(type, id);
        if (!cancelled) {
          setMeta(data);
          if (type === 'series' && data?.videos && data.videos.length > 0) {
            const nonSpecialSeasons = data.videos.map(v => v.season).filter(s => s !== 0);
            const firstSeason = nonSpecialSeasons.length > 0 ? Math.min(...nonSpecialSeasons) : 0;
            setSelectedSeason(firstSeason);
          }
        }
      } catch (err: any) {
        if (!cancelled && err?.name !== 'AbortError' && err?.message !== 'AbortError') {
          console.error("Failed to fetch meta:", err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    loadMeta();
    return () => {
      cancelled = true;
    };
  }, [id, type]);

  useEffect(() => {
    (async () => {
      await syncFromTrakt();
      setWatchedIds(await getWatchedSet());
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSimilarItems([]);
    if (!isTV || type === 'series' || !meta?.genres?.length) return;
    fetchCatalog(type, 'top', meta.genres[0])
      .then((data) => {
        if (cancelled) return;
        setSimilarItems(data.filter((item) => item.id !== id).slice(0, 10));
      })
      .catch((err) => console.error('Failed to fetch similar titles:', err));
    return () => {
      cancelled = true;
    };
  }, [isTV, type, id, meta?.genres]);

  const handleToggleMovieWatched = async () => {
    const contentId = buildContentId(type, id);
    const nowWatched = !watchedIds.has(contentId);
    setWatchedIds((prev) => {
      const next = new Set(prev);
      if (nowWatched) next.add(contentId);
      else next.delete(contentId);
      return next;
    });
    await setWatched(contentId, nowWatched);
  };

  const handleToggleEpisodeWatched = async (season: number, episode: number) => {
    const contentId = buildContentId(type, id, season, episode);
    const nowWatched = !watchedIds.has(contentId);
    setWatchedIds((prev) => {
      const next = new Set(prev);
      if (nowWatched) next.add(contentId);
      else next.delete(contentId);
      return next;
    });
    await setWatched(contentId, nowWatched);
  };

  const watchedEpisodeKeys = new Set(
    Array.from(watchedIds)
      .map((cid) => parseContentId(cid))
      .filter((p): p is NonNullable<typeof p> => !!p && p.type === 'series' && p.id === id && p.season != null)
      .map((p) => `${p.season}:${p.episode}`)
  );
  const movieWatched = watchedIds.has(buildContentId(type, id));

  // Resolves the debrid cache badges for a freshly-fetched stream list before
  // it's committed to state, so the fire icons land in the same render as the
  // list itself instead of popping in a beat later. Addon-Managed mode has no
  // in-app debrid key to check cache against, so this is Direct API-only.
  const resolveCachedHashes = async (data: TorrentioStream[]): Promise<Set<string>> => {
    const hashes = data.map((s) => s.infoHash).filter((h): h is string => !!h);
    if (hashes.length === 0) return new Set();
    const provider = await getActiveDebridProvider();
    if (!provider) return new Set();
    const apiKey = await getDebridKey(provider);
    if (!apiKey) return new Set();
    return checkCachedHashes(hashes, provider, apiKey);
  };

  // Shared tail end of both fetch handlers below: Direct API resolves debrid
  // cache badges as before; Addon-Managed has no in-app key to resolve a bare
  // magnet with, so only addon-pre-resolved (isDirect) streams are playable —
  // anything else is dropped rather than left as a dead-end "API Key Missing" tap.
  const applyFetchedStreams = (data: TorrentioStream[], controller: AbortController) => {
    (async () => {
      if (streamingMode === 'addon-managed') {
        const playable = data.filter((s) => s.isDirect);
        if (abortControllerRef.current !== controller) return;
        if (playable.length === 0 && data.length > 0) {
          setStreamError('This addon returned only unresolved sources (no ready-to-play link) — Addon-Managed mode has no debrid key to resolve them. Try again later or switch to Direct API mode.');
          setStreamsLoading(false);
          return;
        }
        setCachedHashes(new Set());
        setStreams(playable);
        setStreamsLoading(false);
        return;
      }
      const cached = await resolveCachedHashes(data);
      if (abortControllerRef.current !== controller) return; // superseded by a newer request
      setCachedHashes(cached);
      setStreams(data);
      setStreamsLoading(false);
    })();
  };

  const noAddonMessage = streamingMode === 'addon-managed'
    ? 'No addon added. Add one in Settings > Managed Addons.'
    : 'No addon added. Add one in Settings > Addons.';

  const handlePlayMovie = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStreams([]);
    setStreamError(null);
    setCachedHashes(new Set());
    setModalVisible(true);
    setStreamsLoading(true);
    setActiveTitle(meta?.name || '');
    setActiveContentId(buildContentId(type, id));
    try {
      const addons = await getEnabledAddons(streamingMode);
      if (addons.length === 0) {
        setStreamError(noAddonMessage);
        setStreamsLoading(false);
        return;
      }
      const data = await fetchMovieStreams(id, addons, { signal: controller.signal });
      if (abortControllerRef.current !== controller) return; // superseded by a newer request
      applyFetchedStreams(data, controller);
    } catch (err: any) {
      if (err.message === 'AbortError' || abortControllerRef.current !== controller) return;
      setStreamError(err.message === 'TimeoutError' ? 'Request timed out.' : 'Network Error');
      setStreamsLoading(false);
    }
  };

  const handlePlayEpisode = async (season: number, episode: number) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStreams([]);
    setStreamError(null);
    setCachedHashes(new Set());
    setModalVisible(true);
    setStreamsLoading(true);
    const episodeMeta = meta?.videos?.find((v) => v.season === season && v.episode === episode);
    setActiveTitle(episodeMeta ? `${meta?.name} — S${season}:E${episode} ${episodeMeta.title}` : meta?.name || '');
    setActiveContentId(buildContentId(type, id, season, episode));
    try {
      const addons = await getEnabledAddons(streamingMode);
      if (addons.length === 0) {
        setStreamError(noAddonMessage);
        setStreamsLoading(false);
        return;
      }
      const data = await fetchEpisodeStreams(id, season, episode, addons, { signal: controller.signal });
      if (abortControllerRef.current !== controller) return; // superseded by a newer request
      applyFetchedStreams(data, controller);
    } catch (err: any) {
      if (err.message === 'AbortError' || abortControllerRef.current !== controller) return;
      setStreamError(err.message === 'TimeoutError' ? 'Request timed out.' : 'Network Error');
      setStreamsLoading(false);
    }
  };

  useEffect(() => {
    if (!meta || autoplayTriggeredRef.current || autoplay !== '1') return;
    autoplayTriggeredRef.current = true;
    // Consume-and-clear: this screen instance gets reused across titles (router.push to
    // the same route merges params rather than replacing them), so a leftover autoplay=1
    // (+ stale season/episode) from a Continue Watching open would otherwise survive into
    // the next, unrelated /details navigation - popping the streams modal uninvited and
    // fetching the wrong season/episode's streams for whatever title you actually tapped.
    router.setParams({ autoplay: undefined, autoplaySeason: undefined, autoplayEpisode: undefined });
    if (autoplaySeason && autoplayEpisode) {
      handlePlayEpisode(Number(autoplaySeason), Number(autoplayEpisode));
    } else {
      handlePlayMovie();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta, autoplay, autoplaySeason, autoplayEpisode]);

  const displayMeta = (meta && meta.id === id)
    ? meta
    : (id ? ({
        id,
        type: type || 'movie',
        name: paramTitle || '',
        poster: paramPoster,
        background: paramBackground || paramPoster,
      } as DetailedMetaItem) : null);

  const fallbackImageUrl = 'https://images.unsplash.com/photo-1534809027769-b00d750a6bac?auto=format&fit=crop&q=80&w=1200';

  const inMyList = displayMeta ? isInList(displayMeta.id, displayMeta.type) : false;

  // Prioritize landscape backdrop images for edge-to-edge landscape cover view
  const coverImageUrl = useMemo(() => {
    if (paramBackground) return normalizeImageUrl(paramBackground, 'backdrop');
    if (displayMeta?.background) return normalizeImageUrl(displayMeta.background, 'backdrop');
    if (paramPoster) return normalizeImageUrl(paramPoster, 'backdrop');
    if (displayMeta?.poster) return normalizeImageUrl(displayMeta.poster, 'backdrop');
    return fallbackImageUrl;
  }, [paramBackground, paramPoster, displayMeta]);
  // True when coverImageUrl above fell through to a portrait poster (no real
  // backdrop art for this title) - drives CoverImage's contain-vs-cover choice.
  const isCoverPosterFallback = !paramBackground && !displayMeta?.background;

  if (loading && !displayMeta) {
    return (
      <ThemedView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </ThemedView>
    );
  }

  if (!displayMeta) {
    return (
      <ThemedView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ThemedText>Error loading details.</ThemedText>
        <FocusablePressable onPress={() => router.back()} style={{ marginTop: 20 }} hasTVPreferredFocus focusRingBorderRadius={4} accessibilityRole="button" accessibilityLabel="Go back">
          <ThemedText style={{ color: colors.accent }}>Go Back</ThemedText>
        </FocusablePressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

        {/* Cinematic Header - capped height on TV (Concept A) so it stops
            swallowing the whole screen; title/meta move to a solid panel
            below instead of overlaying the artwork. */}
        <View style={[styles.headerContainer, isTV && tvStyles.headerContainer, isTV && type === 'series' && tvStyles.headerContainerSeries]}>
          <CoverImage key={coverImageUrl} uri={coverImageUrl} isPosterFallback={isCoverPosterFallback} backgroundColor={colors.backgroundElement} iconColor={colors.textSecondary} />
          {/* Mobile only: darkens toward the bottom so overlaid title/meta stay
              readable, then blends into the page background. TV backdrop is
              shown clean with no shade. */}
          {!isTV && (
            <LinearGradient
              colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.3)', colors.background]}
              locations={[0, 0.35, 0.7, 1]}
              style={styles.gradient}
            />
          )}

          {/* Back Button */}
          <View style={[styles.backButtonContainer, { top: Math.max(insets.top, 16) }, isTV && tvStyles.backButtonContainer]}>
            <FocusablePressable
              onPress={() => router.back()}
              focusRingBorderRadius={20}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={({ pressed }) => [
                styles.iconButton,
                { backgroundColor: 'rgba(0,0,0,0.5)', opacity: pressed ? 0.7 : 1 }
              ]}
            >
              <IconSymbol name="chevron.left" color="#fff" size={24} />
            </FocusablePressable>
          </View>

          {/* Title + meta overlaid on the artwork itself. TV skips the drop
              shadow (backdrop already reads dark at 62% height) and skips the
              description here - it's shown once, in the Overview tab below. */}
          <View style={[styles.headerContent, isTV && tvStyles.headerContent]} pointerEvents="none">
            <ThemedText style={[styles.title, isTV && tvStyles.titleTV]} type="title">{displayMeta.name}</ThemedText>
            <View style={styles.metaRow}>
              {displayMeta.imdbRating && (
                isTV ? (
                  <View style={[tvStyles.ratingPill, { backgroundColor: colors.backgroundElement }]}>
                    <IconSymbol name="star.fill" color={colors.accent} size={12} />
                    <ThemedText style={[styles.metaText, tvStyles.ratingPillText, { color: colors.accent }]}>IMDb {displayMeta.imdbRating}</ThemedText>
                  </View>
                ) : (
                  <ThemedText style={[styles.metaText, styles.metaTextShadow, { color: colors.accent }]}>IMDb {displayMeta.imdbRating}</ThemedText>
                )
              )}
              {displayMeta.releaseInfo && (
                <ThemedText style={[styles.metaText, !isTV && styles.metaTextShadow]}>{displayMeta.releaseInfo}</ThemedText>
              )}
              {displayMeta.runtime && (
                <ThemedText style={[styles.metaText, !isTV && styles.metaTextShadow]}>{displayMeta.runtime}</ThemedText>
              )}
            </View>
          </View>
        </View>

        {/* Content Body */}
        <View style={[styles.contentContainer, isTV && tvStyles.contentContainer]}>

          {/* Actions - single row on TV (Play, My List, Watched together);
              Play gets its own row on mobile, actions stacked below it. */}
          <View style={isTV ? tvStyles.unifiedActionsRow : undefined}>
            <View>
              <FocusablePressable
                ref={playButtonRef}
                style={({ pressed }) => [
                  styles.playButton,
                  isTV && tvStyles.playButton,
                  { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 }
                ]}
                hasTVPreferredFocus={hasDetailsFocus('play-button', true)}
                onFocus={() => registerDetailsFocusable('play-button')}
                focusRingBorderRadius={6}
                accessibilityRole="button"
                accessibilityLabel="Play"
                onPress={() => {
                  if (type === 'series' && displayMeta?.videos?.length) {
                    // Play first episode of selected season
                    const firstEp = visibleEpisodes[0] || displayMeta.videos[0];
                    handlePlayEpisode(firstEp.season, firstEp.episode);
                  } else {
                    handlePlayMovie();
                  }
                }}
              >
                <IconSymbol name="play.fill" color={colors.textOnAccent} size={20} />
                <ThemedText style={[styles.playButtonText, { color: colors.textOnAccent }]}>
                  {type === 'series' && displayMeta?.videos?.length
                    ? (visibleEpisodes[0] ? `Play S${visibleEpisodes[0].season}:E${visibleEpisodes[0].episode}` : 'Play')
                    : 'Play'}
                </ThemedText>
              </FocusablePressable>
            </View>

            <View style={[styles.actionsRow, isTV && tvStyles.actionsRow]}>
              <FocusablePressable style={[styles.actionItem, isTV && tvStyles.actionItem, isTV && { backgroundColor: colors.backgroundElement }]} onPress={() => toggleMyList(displayMeta)} hasTVPreferredFocus={hasDetailsFocus('mylist', false)} onFocus={() => registerDetailsFocusable('mylist')} focusRingBorderRadius={8} accessibilityRole="button" accessibilityLabel={inMyList ? 'Remove from My List' : 'Add to My List'}>
                <IconSymbol name={inMyList ? 'checkmark' : 'plus'} color={colors.textSecondary} size={isTV ? 20 : 28} />
                <ThemedText style={[styles.actionText, isTV && tvStyles.actionTextTV, { color: colors.textSecondary }]}>
                  {inMyList ? 'In List' : 'My List'}
                </ThemedText>
              </FocusablePressable>
              {type === 'movie' && (
                <FocusablePressable style={[styles.actionItem, isTV && [tvStyles.actionItem, tvStyles.actionItemIconOnly], isTV && { backgroundColor: colors.backgroundElement }]} onPress={handleToggleMovieWatched} hasTVPreferredFocus={hasDetailsFocus('watched', false)} onFocus={() => registerDetailsFocusable('watched')} focusRingBorderRadius={8} accessibilityRole="button" accessibilityLabel={movieWatched ? 'Mark as unwatched' : 'Mark as watched'}>
                  <IconSymbol name="checkmark" color={movieWatched ? colors.accent : colors.textSecondary} size={isTV ? 20 : 28} />
                  {!isTV && (
                    <ThemedText style={[styles.actionText, { color: movieWatched ? colors.accent : colors.textSecondary }]}>
                      {movieWatched ? 'Watched' : 'Mark Watched'}
                    </ThemedText>
                  )}
                </FocusablePressable>
              )}
            </View>
          </View>

          {/* Tabs - underlined strip on mobile, pill row on TV. Series drops
              the tab strip on TV entirely (Episodes is the only view shown) -
              that's the vertical space the horizontal episode carousel needed
              to keep the whole details screen on one page without scrolling. */}
          {!(isTV && type === 'series') && (
          <View style={[styles.tabStrip, isTV && tvStyles.tabStrip, !isTV && { borderBottomColor: colors.backgroundSelected }]}>
            {(type === 'series'
              ? (['episodes', 'overview', 'cast'] as const)
              : (['overview', 'cast', 'details'] as const)
            ).map((tab) => {
              const active = activeTab === tab;
              return (
                <FocusablePressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  focusRingBorderRadius={isTV ? 16 : 6}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={TAB_LABELS[tab]}
                  style={[
                    styles.tabItem,
                    isTV && [tvStyles.tabItem, { backgroundColor: active ? colors.accent : colors.backgroundElement }],
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.tabItemText,
                      isTV && tvStyles.tabItemText,
                      { color: isTV ? (active ? colors.textOnAccent : colors.textSecondary) : (active ? colors.text : colors.textSecondary) },
                    ]}
                  >
                    {TAB_LABELS[tab]}
                  </ThemedText>
                  {!isTV && active && <View style={[styles.tabUnderline, { backgroundColor: colors.accent }]} />}
                </FocusablePressable>
              );
            })}
          </View>
          )}

          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator color={colors.accent} size="large" />
            </View>
          ) : (
            <>
              {activeTab === 'episodes' && type === 'series' && displayMeta?.videos && displayMeta.videos.length > 0 && (() => {
                // TV always gets the horizontal card carousel regardless of the
                // mobile layout setting - it's the only one of the five layouts
                // that doesn't grow into a tall vertical list, so it's the only
                // one that keeps the whole details screen on one page.
                const EpisodeSelector = isTV ? EpisodeSelectorCardCarousel : EPISODE_SELECTORS[episodeLayout];
                return (
                  <View style={[styles.tabContent, isTV && tvStyles.tabContent]}>
                    <EpisodeSelector
                      seasons={seasons}
                      selectedSeason={selectedSeason}
                      onSelectSeason={setSelectedSeason}
                      allVideos={displayMeta.videos}
                      posterFallback={displayMeta.poster}
                      onPlayEpisode={handlePlayEpisode}
                      watchedEpisodeKeys={watchedEpisodeKeys}
                      onToggleWatched={handleToggleEpisodeWatched}
                    />
                  </View>
                );
              })()}

              {activeTab === 'overview' && (
                <View style={[styles.tabContent, isTV && tvStyles.tabContent]}>
                  <ThemedText style={[styles.synopsis, { color: colors.text }, isTV && tvStyles.synopsis]}>
                    {displayMeta?.description || 'No description available.'}
                  </ThemedText>
                  {!!displayMeta?.genres?.length && (
                    <View style={styles.chipRow}>
                      {displayMeta.genres.map((genre) => (
                        <View key={genre} style={[styles.chip, { borderColor: colors.backgroundSelected }]}>
                          <ThemedText style={[styles.chipText, { color: colors.textSecondary }]}>{genre}</ThemedText>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {activeTab === 'cast' && (
                <View style={[styles.tabContent, isTV && tvStyles.tabContent]}>
                  {displayMeta?.cast?.length ? (
                    <View style={[styles.castGrid, isTV && tvStyles.castGrid]}>
                      {displayMeta.cast.map((name) => (
                        <View key={name} style={[styles.castItem, isTV && tvStyles.castItem]}>
                          <View style={[styles.castAvatar, isTV && tvStyles.castAvatar, { backgroundColor: colors.backgroundSelected }]}>
                            <ThemedText style={[styles.castInitials, { color: colors.textSecondary }]}>
                              {name.trim().charAt(0).toUpperCase()}
                            </ThemedText>
                          </View>
                          <ThemedText style={[styles.castName, isTV && tvStyles.castName, { color: colors.textSecondary }]} numberOfLines={isTV ? 1 : 2}>
                            {name}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <ThemedText style={{ color: colors.textSecondary }}>No cast information available.</ThemedText>
                  )}
                  {isTV && type !== 'series' && similarItems.length > 0 && (
                    <View style={tvStyles.moreLikeThis}>
                      <ThemedText style={tvStyles.moreLikeThisTitle}>More Like This</ThemedText>
                      <FlatList
                        data={similarItems}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={tvStyles.moreLikeThisRow}
                        renderItem={({ item }) => (
                          <PosterCard
                            title={item.name}
                            imageUrl={item.poster || ''}
                            style={tvStyles.moreLikeThisCard}
                            onPress={() => {
                              router.push({
                                pathname: '/details',
                                params: {
                                  id: item.id,
                                  type: item.type,
                                  title: item.name,
                                  poster: normalizeImageUrl(item.poster),
                                  background: normalizeImageUrl(item.background || item.poster, 'backdrop'),
                                },
                              });
                            }}
                          />
                        )}
                      />
                    </View>
                  )}
                </View>
              )}

              {activeTab === 'details' && type !== 'series' && (
                <View style={[styles.tabContent, isTV && tvStyles.tabContent]}>
                  {!!displayMeta?.director?.length && (
                    <View style={styles.detailRow}>
                      <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>Director</ThemedText>
                      <ThemedText style={[styles.detailValue, { color: colors.text }]}>{displayMeta.director.join(', ')}</ThemedText>
                    </View>
                  )}
                  {!!displayMeta?.genres?.length && (
                    <View style={styles.detailRow}>
                      <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>Genres</ThemedText>
                      <ThemedText style={[styles.detailValue, { color: colors.text }]}>{displayMeta.genres.join(', ')}</ThemedText>
                    </View>
                  )}
                  {!!displayMeta?.runtime && (
                    <View style={styles.detailRow}>
                      <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>Runtime</ThemedText>
                      <ThemedText style={[styles.detailValue, { color: colors.text }]}>{displayMeta.runtime}</ThemedText>
                    </View>
                  )}
                  {!!displayMeta?.releaseInfo && (
                    <View style={styles.detailRow}>
                      <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>Released</ThemedText>
                      <ThemedText style={[styles.detailValue, { color: colors.text }]}>{displayMeta.releaseInfo}</ThemedText>
                    </View>
                  )}
                </View>
              )}
            </>
          )}

        </View>
      </ScrollView>

      {/* Stream Selection Modal */}
      <TorrentModal
        visible={modalVisible}
        onClose={closeStreamModal}
        options={streams}
        cachedHashes={cachedHashes}
        loading={streamsLoading}
        error={streamError}
        contentTitle={activeTitle}
        contentPoster={displayMeta?.poster}
        contentBackdrop={displayMeta?.background}
        contentId={activeContentId}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    width: '100%',
    height: 460,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    ...StyleSheet.absoluteFill as any,
  },
  backButtonContainer: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 12,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
  },
  metaTextShadow: {
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    marginBottom: 24,
  },
  playButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  actionItem: {
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  synopsis: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 32,
  },
  tabStrip: {
    flexDirection: 'row',
    gap: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  tabItem: {
    paddingBottom: 12,
  },
  tabItemText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  tabUnderline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -1,
    height: 2,
    borderRadius: 1,
  },
  tabContent: {
    paddingTop: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  castGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  castItem: {
    width: 76,
    alignItems: 'center',
    gap: 6,
  },
  castAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  castInitials: {
    fontSize: 20,
    fontWeight: '700',
  },
  castName: {
    fontSize: 12,
    textAlign: 'center',
  },
  detailRow: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    lineHeight: 21,
  },
});

// TV-only style overrides, applied on top of `styles` with `isTV && tvStyles.x`.
// Kept in their own StyleSheet so TV layout tweaks never touch mobile values above.
const tvStyles = StyleSheet.create({
  backButtonContainer: {
    left: 32,
  },
  // Tall enough to hold title/meta/description overlaid at the bottom edge
  // (Netflix-style) instead of handing them off to a separate solid panel -
  // that panel used to leave a flat, empty black band between the artwork
  // and the actions row.
  headerContainer: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.62,
  },
  // Series gives back some backdrop height to the episode carousel below -
  // it needs the room, movies don't have anything past the synopsis chips.
  headerContainerSeries: {
    height: SCREEN_HEIGHT * 0.5,
  },
  headerContent: {
    left: 32,
    right: 32,
    bottom: 24,
  },
  titleTV: {
    fontSize: 34,
    marginBottom: 10,
    textShadowColor: 'transparent',
    textShadowRadius: 0,
  },
  contentContainer: {
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 8,
  },
  playButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 0,
  },
  actionsRow: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 12,
    marginBottom: 0,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  // Watched is a compact icon-only toggle (no label) so the row keeps the
  // design's two-prominent-pill visual weight (Play + My List) instead of a
  // third full-width pill the design doesn't show.
  actionItemIconOnly: {
    paddingHorizontal: 12,
  },
  actionTextTV: {
    fontSize: 15,
    fontWeight: '600',
  },
  synopsis: {
    fontSize: 16,
    lineHeight: 22,
    maxWidth: 900,
    marginBottom: 6,
  },
  // Concept A, requested variant: description sits right under the meta row,
  // and Play / My List / Watched are one pill-button row instead of a big
  // Play button with a stacked icon row underneath.
  unifiedActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ratingPillText: {
    fontSize: 13,
  },
  tabStrip: {
    borderBottomWidth: 0,
    gap: 8,
    marginBottom: 6,
  },
  tabItem: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  tabItemText: {
    fontSize: 11,
    lineHeight: 14,
  },
  tabContent: {
    paddingTop: 2,
  },
  castGrid: {
    gap: 12,
  },
  castItem: {
    width: 100,
  },
  castAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  castName: {
    fontSize: 12,
  },
  moreLikeThis: {
    marginTop: 6,
  },
  moreLikeThisTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  moreLikeThisRow: {
    gap: 10,
  },
  moreLikeThisCard: {
    width: 90,
    marginRight: 0,
  },
});
