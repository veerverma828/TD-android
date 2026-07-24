import { useRef } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/IconSymbol';
import { FocusablePressable } from '@/components/tv/FocusablePressable';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useIsTV } from '@/contexts/DeviceModeContext';
import { useTVHorizontalAutoScroll } from '@/hooks/tv/useTVHorizontalAutoScroll';
import { DARK_IMAGE_PLACEHOLDER } from '@/constants/placeholder';
import { Video } from '@/services/cinemeta';
import { EpisodeSelectorProps, seasonLabel } from './types';

const CARD_WIDTH = 168;
const CARD_GAP = 10;

export function EpisodeSelectorCardCarousel({ seasons, selectedSeason, onSelectSeason, allVideos, posterFallback, onPlayEpisode, watchedEpisodeKeys, onToggleWatched }: EpisodeSelectorProps) {
  const { colors } = useAppTheme();
  const isTV = useIsTV();
  const listRef = useRef<FlatList<Video>>(null);
  const { scrollToIndex } = useTVHorizontalAutoScroll(listRef);
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
            focusRingScale={false}
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
        removeClippedSubviews={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(ep) => ep.id}
        contentContainerStyle={styles.cardRow}
        getItemLayout={(_, index) => ({ length: CARD_WIDTH + CARD_GAP, offset: (CARD_WIDTH + CARD_GAP) * index, index })}
        renderItem={({ item: ep, index }) => (
          <FocusablePressable
            style={styles.card}
            onPress={() => onPlayEpisode(ep.season, ep.episode)}
            focusRingBorderRadius={10}
            focusRingScale={false}
            accessibilityRole="button"
            accessibilityLabel={ep.title ? `Episode ${ep.episode}, ${ep.title}` : `Episode ${ep.episode}`}
            onFocus={isTV ? () => scrollToIndex(index) : undefined}
          >
            <View style={[styles.thumbWrap, { backgroundColor: colors.backgroundElement }]}>
              <Image
                source={{ uri: ep.thumbnail || posterFallback || '' }}
                style={styles.thumb}
                contentFit={isTV ? 'contain' : 'cover'}
                transition={200}
                cachePolicy="memory-disk"
                placeholder={DARK_IMAGE_PLACEHOLDER}
                placeholderContentFit={isTV ? 'contain' : 'cover'}
              />
              <View style={styles.numberBadge}>
                <ThemedText style={styles.numberBadgeText}>{ep.episode}</ThemedText>
              </View>
              <View style={styles.playIconOverlay}>
                <IconSymbol name="play.circle.fill" color="#ffffff" size={26} />
              </View>
              {onToggleWatched && (
                <FocusablePressable
                  onPress={() => onToggleWatched(ep.season, ep.episode)}
                  hitSlop={8}
                  style={[styles.watchedBadge, { backgroundColor: watchedEpisodeKeys?.has(`${ep.season}:${ep.episode}`) ? colors.accent : 'rgba(0,0,0,0.55)' }]}
                  focusRingBorderRadius={10}
                  accessibilityRole="button"
                  accessibilityLabel={watchedEpisodeKeys?.has(`${ep.season}:${ep.episode}`) ? 'Mark as unwatched' : 'Mark as watched'}
                >
                  <IconSymbol name="checkmark" color="#fff" size={11} />
                </FocusablePressable>
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
  seasonScroll: { gap: 6, paddingVertical: 2, paddingLeft: 4 },
  seasonPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14 },
  seasonText: { fontSize: 12.5, fontWeight: '600' },
  // paddingLeft gives the first card's focus ring room to draw its left edge -
  // flush against the FlatList's own horizontal clip boundary (x:0), the ring's
  // left stroke was being clipped by the mandatory horizontal scroll-clipping
  // (vertical bleed on the other 3 sides isn't clipped the same way, which is
  // why only the left edge went missing).
  cardRow: { gap: CARD_GAP, paddingTop: 10, paddingBottom: 2, paddingLeft: 4 },
  card: { width: CARD_WIDTH, alignSelf: 'flex-start' },
  thumbWrap: { width: CARD_WIDTH, height: 80, borderRadius: 8, overflow: 'hidden', position: 'relative' },
  thumb: { flex: 1 },
  numberBadge: {
    position: 'absolute', top: 5, left: 5, backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1,
  },
  numberBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  watchedBadge: {
    position: 'absolute', top: 5, right: 5, width: 16, height: 16, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  playIconOverlay: { ...(StyleSheet.absoluteFill as object), justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.15)' },
  cardTitle: { fontSize: 12.5, fontWeight: '600', marginTop: 4 },
  cardDuration: { fontSize: 10.5, marginTop: 1 },
});
