import { StyleSheet, View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/IconSymbol';
import { TorrentModal } from '@/components/TorrentModal';
import { fetchMeta, DetailedMetaItem, fetchMovieStreams, fetchEpisodeStreams } from '@/services/cinemeta';
import { TorrentioStream } from '@/utils/streamHelpers';
import { getActiveDebridProvider, getDebridKey, checkCachedHashes } from '@/services/debridService';
import { useMyList } from '@/contexts/MyListContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { DARK_IMAGE_PLACEHOLDER } from '@/constants/placeholder';
import { buildContentId } from '@/utils/contentId';
import { useScreenBackHandler } from '@/hooks/tv/useTVBackHandler';
import { FocusablePressable } from '@/components/tv/FocusablePressable';
import { EPISODE_SELECTORS } from '@/components/episodes';

export default function DetailsScreen() {
  const router = useRouter();
  const { id, type, autoplay, autoplaySeason, autoplayEpisode } = useLocalSearchParams<{
    id: string;
    type: string;
    autoplay?: string;
    autoplaySeason?: string;
    autoplayEpisode?: string;
  }>();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { toggle: toggleMyList, isInList } = useMyList();
  const { episodeLayout } = useSettings();

  const [modalVisible, setModalVisible] = useState(false);

  useScreenBackHandler(() => {
    if (modalVisible) {
      setModalVisible(false);
      return true;
    }
    router.back();
  });
  const [meta, setMeta] = useState<DetailedMetaItem | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Stream state
  const [streams, setStreams] = useState<TorrentioStream[]>([]);
  const [streamsLoading, setStreamsLoading] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [cachedHashes, setCachedHashes] = useState<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);
  const [activeTitle, setActiveTitle] = useState<string>('');
  const [activeContentId, setActiveContentId] = useState<string>('');
  const autoplayTriggeredRef = useRef(false);

  // Series state
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [coverFailed, setCoverFailed] = useState(false);
  const seasons = Array.from(new Set(meta?.videos?.map(v => v.season) || [])).sort((a, b) => {
    if (a === 0) return 1;
    if (b === 0) return -1;
    return a - b;
  });
  const visibleEpisodes = meta?.videos?.filter(v => v.season === selectedSeason) || [];

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    async function loadMeta() {
      if (!id || !type) return;
      setMeta(null);
      setLoading(true);
      setCoverFailed(false);
      try {
        const data = await fetchMeta(type, id);
        setMeta(data);
        if (type === 'series' && data?.videos && data.videos.length > 0) {
          const nonSpecialSeasons = data.videos.map(v => v.season).filter(s => s !== 0);
          const firstSeason = nonSpecialSeasons.length > 0 ? Math.min(...nonSpecialSeasons) : 0;
          setSelectedSeason(firstSeason);
        }
      } catch (err) {
        console.error("Failed to fetch meta:", err);
      } finally {
        setLoading(false);
      }
    }
    loadMeta();
  }, [id, type]);

  // Resolves the debrid cache badges for a freshly-fetched stream list before
  // it's committed to state, so the fire icons land in the same render as the
  // list itself instead of popping in a beat later.
  const resolveCachedHashes = async (data: TorrentioStream[]): Promise<Set<string>> => {
    const hashes = data.map((s) => s.infoHash).filter((h): h is string => !!h);
    if (hashes.length === 0) return new Set();
    const provider = await getActiveDebridProvider();
    if (!provider) return new Set();
    const apiKey = await getDebridKey(provider);
    if (!apiKey) return new Set();
    return checkCachedHashes(hashes, provider, apiKey);
  };

  const handlePlayMovie = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setStreams([]);
    setStreamError(null);
    setCachedHashes(new Set());
    setModalVisible(true);
    setStreamsLoading(true);
    setActiveTitle(meta?.name || '');
    setActiveContentId(buildContentId(type, id));
    try {
      const data = await fetchMovieStreams(id, undefined, { signal: abortControllerRef.current.signal });
      const cached = await resolveCachedHashes(data);
      setCachedHashes(cached);
      setStreams(data);
      setStreamsLoading(false);
    } catch (err: any) {
      if (err.message === 'AbortError') return;
      setStreamError(err.message === 'TimeoutError' ? 'Request timed out.' : 'Network Error');
      setStreamsLoading(false);
    }
  };

  const handlePlayEpisode = async (season: number, episode: number) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setStreams([]);
    setStreamError(null);
    setCachedHashes(new Set());
    setModalVisible(true);
    setStreamsLoading(true);
    const episodeMeta = meta?.videos?.find((v) => v.season === season && v.episode === episode);
    setActiveTitle(episodeMeta ? `${meta?.name} — S${season}:E${episode} ${episodeMeta.title}` : meta?.name || '');
    setActiveContentId(buildContentId(type, id, season, episode));
    try {
      const data = await fetchEpisodeStreams(id, season, episode, undefined, { signal: abortControllerRef.current.signal });
      const cached = await resolveCachedHashes(data);
      setCachedHashes(cached);
      setStreams(data);
      setStreamsLoading(false);
    } catch (err: any) {
      if (err.message === 'AbortError') return;
      setStreamError(err.message === 'TimeoutError' ? 'Request timed out.' : 'Network Error');
      setStreamsLoading(false);
    }
  };

  useEffect(() => {
    if (!meta || autoplayTriggeredRef.current || autoplay !== '1') return;
    autoplayTriggeredRef.current = true;
    if (autoplaySeason && autoplayEpisode) {
      handlePlayEpisode(Number(autoplaySeason), Number(autoplayEpisode));
    } else {
      handlePlayMovie();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta, autoplay, autoplaySeason, autoplayEpisode]);

  if (loading) {
    return (
      <ThemedView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </ThemedView>
    );
  }

  if (!meta) {
    return (
      <ThemedView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ThemedText>Error loading details.</ThemedText>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
          <ThemedText style={{ color: colors.accent }}>Go Back</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const inMyList = isInList(meta.id, meta.type);
  const fallbackImageUrl = 'https://images.unsplash.com/photo-1534809027769-b00d750a6bac?auto=format&fit=crop&q=80&w=1200';
  const backgroundImageUrl = coverFailed
    ? (meta.poster && meta.poster !== meta.background ? meta.poster : fallbackImageUrl)
    : (meta.background || meta.poster || fallbackImageUrl);

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

        {/* Cinematic Header */}
        <View style={styles.headerContainer}>
          <Image
            source={{ uri: backgroundImageUrl }}
            style={styles.coverImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            priority="high"
            placeholder={DARK_IMAGE_PLACEHOLDER}
            placeholderContentFit="cover"
            transition={200}
            onError={() => setCoverFailed(true)}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.3)', colors.background]}
            locations={[0, 0.35, 0.7, 1]}
            style={styles.gradient}
          />

          {/* Back Button */}
          <View style={[styles.backButtonContainer, { top: Math.max(insets.top, 16) }]}>
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
              <IconSymbol name="house.fill" color="#fff" size={24} />
            </FocusablePressable>
          </View>

          {/* Title + meta overlaid on the artwork itself */}
          <View style={styles.headerContent} pointerEvents="none">
            <ThemedText style={styles.title} type="title">{meta.name}</ThemedText>

            <View style={styles.metaRow}>
              {meta.imdbRating && (
                <ThemedText style={[styles.metaText, styles.metaTextShadow, { color: colors.accent }]}>IMDb {meta.imdbRating}</ThemedText>
              )}
              <ThemedText style={[styles.metaText, styles.metaTextShadow]}>{meta.releaseInfo}</ThemedText>
              {meta.runtime && (
                <ThemedText style={[styles.metaText, styles.metaTextShadow]}>{meta.runtime}</ThemedText>
              )}
            </View>
          </View>
        </View>

        {/* Content Body */}
        <View style={styles.contentContainer}>

          {/* Primary Action */}
          <FocusablePressable
            style={({ pressed }) => [
              styles.playButton,
              { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 }
            ]}
            hasTVPreferredFocus
            focusRingBorderRadius={6}
            accessibilityRole="button"
            accessibilityLabel="Play"
            onPress={() => {
              if (type === 'series' && meta.videos?.length) {
                // Play first episode of selected season
                const firstEp = visibleEpisodes[0] || meta.videos[0];
                handlePlayEpisode(firstEp.season, firstEp.episode);
              } else {
                handlePlayMovie();
              }
            }}
          >
            <IconSymbol name="play.fill" color={colors.textOnAccent} size={20} />
            <ThemedText style={[styles.playButtonText, { color: colors.textOnAccent }]}>
              {type === 'series' && meta.videos?.length
                ? (visibleEpisodes[0] ? `Play S${visibleEpisodes[0].season}:E${visibleEpisodes[0].episode}` : 'Play')
                : 'Play'}
            </ThemedText>
          </FocusablePressable>

          {/* Secondary Actions */}
          <View style={styles.actionsRow}>
            <FocusablePressable style={styles.actionItem} onPress={() => setModalVisible(true)} focusRingBorderRadius={8} accessibilityRole="button" accessibilityLabel="Streams">
              <IconSymbol name="tv" color={colors.textSecondary} size={28} />
              <ThemedText style={[styles.actionText, { color: colors.textSecondary }]}>Streams</ThemedText>
            </FocusablePressable>
            <FocusablePressable style={styles.actionItem} onPress={() => toggleMyList(meta)} focusRingBorderRadius={8} accessibilityRole="button" accessibilityLabel={inMyList ? 'Remove from My List' : 'Add to My List'}>
              <IconSymbol name={inMyList ? 'checkmark' : 'plus'} color={colors.textSecondary} size={28} />
              <ThemedText style={[styles.actionText, { color: colors.textSecondary }]}>
                {inMyList ? 'In List' : 'My List'}
              </ThemedText>
            </FocusablePressable>
          </View>

          {/* Synopsis */}
          <ThemedText style={[styles.synopsis, { color: colors.text }]}>
            {meta.description || 'No description available.'}
          </ThemedText>

          {type === 'series' && meta.videos && meta.videos.length > 0 && (() => {
            const EpisodeSelector = EPISODE_SELECTORS[episodeLayout];
            return (
              <View style={styles.episodesSection}>
                <ThemedText style={styles.sectionTitle}>Seasons</ThemedText>
                <EpisodeSelector
                  seasons={seasons}
                  selectedSeason={selectedSeason}
                  onSelectSeason={setSelectedSeason}
                  allVideos={meta.videos}
                  posterFallback={meta.poster}
                  onPlayEpisode={handlePlayEpisode}
                />
              </View>
            );
          })()}

        </View>
      </ScrollView>

      {/* Stream Selection Modal */}
      <TorrentModal
        visible={modalVisible}
        onClose={() => {
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
          setModalVisible(false);
        }}
        options={streams}
        cachedHashes={cachedHashes}
        loading={streamsLoading}
        error={streamError}
        contentTitle={activeTitle}
        contentPoster={meta.poster}
        contentBackdrop={meta.background}
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
    height: 500,
    position: 'relative',
  },
  coverImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
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
  episodesSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
});
