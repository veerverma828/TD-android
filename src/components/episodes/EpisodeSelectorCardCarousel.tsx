import { useRef } from 'react';
import { FlatList, ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/IconSymbol';
import { FocusablePressable } from '@/components/tv/FocusablePressable';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useIsTV } from '@/contexts/DeviceModeContext';
import { DARK_IMAGE_PLACEHOLDER } from '@/constants/placeholder';
import { Video } from '@/services/cinemeta';
import { EpisodeSelectorProps, seasonLabel } from './types';

const CARD_WIDTH = 168;
const CARD_GAP = 10;

export function EpisodeSelectorCardCarousel({ seasons, selectedSeason, onSelectSeason, allVideos, posterFallback, onPlayEpisode, watchedEpisodeKeys, onToggleWatched }: EpisodeSelectorProps) {
  const { colors } = useAppTheme();
  const isTV = useIsTV();
  const listRef = useRef<FlatList<Video>>(null);
  const visibleEpisodes = allVideos.filter((v) => v.season === selectedSeason);

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.seasonScroll}>
        {seasons.map((s) => (
          <FocusablePressable
            key={s}
            style={[styles.seasonPill, { backgroundColor: s === selectedSeason ? colors.accent : colors.backgroundElement }]}
            onPress={() => onSelectSeason(s)}
            focusRingBorderRadius={16}
            accessibilityRole="button"
            accessibilityState={{ selected: s === selectedSeason }}
            accessibilityLabel={seasonLabel(s)}
          >
            <ThemedText style={[styles.seasonText, { color: s === selectedSeason ? colors.textOnAccent : colors.text }]}>
              {seasonLabel(s)}
            </ThemedText>
          </FocusablePressable>
        ))}
      </ScrollView>

      <FlatList
        ref={listRef}
        data={visibleEpisodes}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(ep) => ep.id}
        contentContainerStyle={styles.cardRow}
        getItemLayout={(_, index) => ({ length: CARD_WIDTH + CARD_GAP, offset: (CARD_WIDTH + CARD_GAP) * index, index })}
        renderItem={({ item: ep, index }) => (
          <FocusablePressable
            style={styles.card}
            onPress={() => onPlayEpisode(ep.season, ep.episode)}
            focusRingBorderRadius={10}
            accessibilityRole="button"
            accessibilityLabel={ep.title ? `Episode ${ep.episode}, ${ep.title}` : `Episode ${ep.episode}`}
            onFocus={isTV ? () => listRef.current?.scrollToIndex({ index, viewPosition: 0.5, animated: true }) : undefined}
          >
            <View style={[styles.thumbWrap, { backgroundColor: colors.backgroundElement }]}>
              <Image
                source={{ uri: ep.thumbnail || posterFallback || '' }}
                style={styles.thumb}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
                placeholder={DARK_IMAGE_PLACEHOLDER}
                placeholderContentFit="cover"
              />
              <View style={styles.numberBadge}>
                <ThemedText style={styles.numberBadgeText}>{ep.episode}</ThemedText>
              </View>
              <View style={styles.playIconOverlay}>
                <IconSymbol name="play.circle.fill" color="#ffffff" size={26} />
              </View>
              {onToggleWatched && (
                <Pressable
                  onPress={() => onToggleWatched(ep.season, ep.episode)}
                  hitSlop={8}
                  style={[styles.watchedBadge, { backgroundColor: watchedEpisodeKeys?.has(`${ep.season}:${ep.episode}`) ? colors.accent : 'rgba(0,0,0,0.55)' }]}
                  accessibilityRole="button"
                  accessibilityLabel={watchedEpisodeKeys?.has(`${ep.season}:${ep.episode}`) ? 'Mark as unwatched' : 'Mark as watched'}
                >
                  <IconSymbol name="checkmark" color="#fff" size={11} />
                </Pressable>
              )}
            </View>
            <ThemedText style={styles.cardTitle} numberOfLines={1}>{ep.title || `Episode ${ep.episode}`}</ThemedText>
            <ThemedText style={[styles.cardDuration, { color: colors.textSecondary }]}>
              {ep.released ? new Date(ep.released).toLocaleDateString() : ''}
            </ThemedText>
          </FocusablePressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  seasonScroll: { gap: 8, paddingBottom: 4 },
  seasonPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  seasonText: { fontSize: 14, fontWeight: '600' },
  cardRow: { gap: CARD_GAP, paddingTop: 16, paddingBottom: 4 },
  card: { width: CARD_WIDTH },
  thumbWrap: { width: CARD_WIDTH, height: 94, borderRadius: 8, overflow: 'hidden', position: 'relative' },
  thumb: { flex: 1 },
  numberBadge: {
    position: 'absolute', top: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2,
  },
  numberBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  watchedBadge: {
    position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
  },
  playIconOverlay: { ...(StyleSheet.absoluteFill as object), justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.15)' },
  cardTitle: { fontSize: 13, fontWeight: '600', marginTop: 6 },
  cardDuration: { fontSize: 11, marginTop: 2 },
});
