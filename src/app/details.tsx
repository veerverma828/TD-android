import { StyleSheet, View, ScrollView, Pressable, useColorScheme, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/IconSymbol';
import { EpisodeRow } from '@/components/EpisodeRow';
import { TorrentModal } from '@/components/TorrentModal';
import { Colors } from '@/constants/theme';
import { fetchMeta, DetailedMetaItem, Video, fetchMovieStreams, fetchEpisodeStreams } from '@/services/cinemeta';
import { TorrentioStream } from '@/utils/streamHelpers';

export default function DetailsScreen() {
  const router = useRouter();
  const { id, type } = useLocalSearchParams<{ id: string; type: string }>();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const insets = useSafeAreaInsets();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [meta, setMeta] = useState<DetailedMetaItem | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Stream state
  const [streams, setStreams] = useState<TorrentioStream[]>([]);
  const [streamsLoading, setStreamsLoading] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Series state
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const seasons = Array.from(new Set(meta?.videos?.map(v => v.season) || [])).sort((a, b) => a - b);
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
      try {
        const data = await fetchMeta(type, id);
        setMeta(data);
        if (type === 'series' && data?.videos && data.videos.length > 0) {
          const firstSeason = Math.min(...data.videos.map(v => v.season));
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

  const handlePlayMovie = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setStreams([]);
    setStreamError(null);
    setModalVisible(true);
    setStreamsLoading(true);
    try {
      const data = await fetchMovieStreams(id, undefined, { signal: abortControllerRef.current.signal });
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
    setModalVisible(true);
    setStreamsLoading(true);
    try {
      const data = await fetchEpisodeStreams(id, season, episode, undefined, { signal: abortControllerRef.current.signal });
      setStreams(data);
      setStreamsLoading(false);
    } catch (err: any) {
      if (err.message === 'AbortError') return;
      setStreamError(err.message === 'TimeoutError' ? 'Request timed out.' : 'Network Error');
      setStreamsLoading(false);
    }
  };

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

  const backgroundImageUrl = meta.background || meta.poster || 'https://images.unsplash.com/photo-1534809027769-b00d750a6bac?auto=format&fit=crop&q=80&w=1200';

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        
        {/* Cinematic Header */}
        <View style={styles.headerContainer}>
          <Image
            source={{ uri: backgroundImageUrl }}
            style={styles.coverImage}
            contentFit="cover"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.6)', 'transparent', colors.background]}
            locations={[0, 0.4, 1]}
            style={styles.gradient}
          />
          
          {/* Back Button */}
          <View style={[styles.backButtonContainer, { top: Math.max(insets.top, 16) }]}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.iconButton,
                { backgroundColor: 'rgba(0,0,0,0.5)', opacity: pressed ? 0.7 : 1 }
              ]}
            >
              <IconSymbol name="house.fill" color="#fff" size={24} /> 
            </Pressable>
          </View>
        </View>

        {/* Content Body */}
        <View style={styles.contentContainer}>
          <ThemedText style={styles.title} type="title">{meta.name}</ThemedText>
          
          <View style={styles.metaRow}>
            {meta.imdbRating && (
              <ThemedText style={[styles.metaText, { color: colors.accent }]}>IMDb {meta.imdbRating}</ThemedText>
            )}
            <ThemedText style={[styles.metaText, { color: colors.textSecondary }]}>{meta.releaseInfo}</ThemedText>
            {meta.runtime && (
              <ThemedText style={[styles.metaText, { color: colors.textSecondary }]}>{meta.runtime}</ThemedText>
            )}
          </View>

          {/* Primary Action */}
          <Pressable
            style={({ pressed }) => [
              styles.playButton,
              { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 }
            ]}
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
            <IconSymbol name="play.fill" color="#fff" size={20} />
            <ThemedText style={styles.playButtonText}>
              {type === 'series' && meta.videos?.length 
                ? (visibleEpisodes[0] ? `Play S${visibleEpisodes[0].season}:E${visibleEpisodes[0].episode}` : 'Play')
                : 'Play'}
            </ThemedText>
          </Pressable>

          {/* Secondary Actions */}
          <View style={styles.actionsRow}>
            <Pressable style={styles.actionItem} onPress={() => setModalVisible(true)}>
              <IconSymbol name="tv" color={colors.textSecondary} size={28} />
              <ThemedText style={[styles.actionText, { color: colors.textSecondary }]}>Streams</ThemedText>
            </Pressable>
            <Pressable style={styles.actionItem}>
              <IconSymbol name="plus" color={colors.textSecondary} size={28} />
              <ThemedText style={[styles.actionText, { color: colors.textSecondary }]}>My List</ThemedText>
            </Pressable>
          </View>

          {/* Synopsis */}
          <ThemedText style={[styles.synopsis, { color: colors.text }]}>
            {meta.description || 'No description available.'}
          </ThemedText>

          {type === 'series' && meta.videos && meta.videos.length > 0 && (
            <View style={styles.episodesSection}>
              <ThemedText style={styles.sectionTitle}>Seasons</ThemedText>
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.seasonScroll}
              >
                {seasons.map((s) => (
                  <Pressable
                    key={s}
                    style={[
                      styles.seasonPill,
                      { backgroundColor: s === selectedSeason ? colors.accent : colors.backgroundElement }
                    ]}
                    onPress={() => setSelectedSeason(s)}
                  >
                    <ThemedText style={[
                      styles.seasonText,
                      { color: s === selectedSeason ? '#fff' : colors.text }
                    ]}>
                      Season {s}
                    </ThemedText>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={{ marginTop: 16 }}>
                {visibleEpisodes.map((ep: Video) => (
                  <EpisodeRow
                    key={ep.id}
                    episodeNumber={ep.episode}
                    title={ep.title || `Episode ${ep.episode}`}
                    duration={ep.released ? new Date(ep.released).toLocaleDateString() : ''}
                    imageUrl={ep.thumbnail || meta.poster || ''}
                    onPress={() => handlePlayEpisode(ep.season, ep.episode)}
                  />
                ))}
              </View>
            </View>
          )}

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
        loading={streamsLoading}
        error={streamError}
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
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    marginTop: -80, // overlap with gradient
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  metaText: {
    fontSize: 14,
    fontWeight: '500',
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
  seasonScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  seasonPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  seasonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
