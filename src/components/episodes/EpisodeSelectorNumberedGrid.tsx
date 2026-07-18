import { ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { FocusablePressable } from '@/components/tv/FocusablePressable';
import { useAppTheme } from '@/contexts/ThemeContext';
import { EpisodeSelectorProps, seasonLabel } from './types';

export function EpisodeSelectorNumberedGrid({ seasons, selectedSeason, onSelectSeason, allVideos, onPlayEpisode, watchedEpisodeKeys }: EpisodeSelectorProps) {
  const { colors } = useAppTheme();
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

      <View style={styles.grid}>
        {visibleEpisodes.map((ep) => (
          <FocusablePressable
            key={ep.id}
            style={[styles.tile, { backgroundColor: colors.backgroundElement }]}
            onPress={() => onPlayEpisode(ep.season, ep.episode)}
            focusRingBorderRadius={8}
            accessibilityRole="button"
            accessibilityLabel={ep.title ? `Episode ${ep.episode}, ${ep.title}` : `Episode ${ep.episode}`}
          >
            <ThemedText style={[styles.tileNumber, { color: colors.text }]}>{ep.episode}</ThemedText>
            {watchedEpisodeKeys?.has(`${ep.season}:${ep.episode}`) && (
              <View style={[styles.watchedDot, { backgroundColor: colors.accent }]} />
            )}
          </FocusablePressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  seasonScroll: { gap: 8, paddingBottom: 4 },
  seasonPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  seasonText: { fontSize: 14, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  tile: {
    width: '17%',
    aspectRatio: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileNumber: { fontSize: 16, fontWeight: '800' },
  watchedDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
