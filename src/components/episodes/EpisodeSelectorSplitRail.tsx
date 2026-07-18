import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { EpisodeRow } from '@/components/EpisodeRow';
import { FocusablePressable } from '@/components/tv/FocusablePressable';
import { useAppTheme } from '@/contexts/ThemeContext';
import { EpisodeSelectorProps, seasonLabel } from './types';

export function EpisodeSelectorSplitRail({ seasons, selectedSeason, onSelectSeason, allVideos, posterFallback, onPlayEpisode, watchedEpisodeKeys, onToggleWatched }: EpisodeSelectorProps) {
  const { colors } = useAppTheme();
  const visibleEpisodes = allVideos.filter((v) => v.season === selectedSeason);

  return (
    <View style={styles.split}>
      <View style={[styles.rail, { borderRightColor: colors.backgroundSelected }]}>
        {seasons.map((s) => (
          <FocusablePressable
            key={s}
            style={[styles.railRow, { backgroundColor: s === selectedSeason ? colors.accent : 'transparent' }]}
            onPress={() => onSelectSeason(s)}
            focusRingBorderRadius={8}
            accessibilityRole="button"
            accessibilityState={{ selected: s === selectedSeason }}
            accessibilityLabel={seasonLabel(s)}
          >
            <ThemedText style={[styles.railText, { color: s === selectedSeason ? colors.textOnAccent : colors.textSecondary }]}>
              {s === 0 ? 'SP' : `S${s}`}
            </ThemedText>
          </FocusablePressable>
        ))}
      </View>

      <View style={styles.main}>
        {visibleEpisodes.map((ep) => (
          <EpisodeRow
            key={ep.id}
            episodeNumber={ep.episode}
            title={ep.title || `Episode ${ep.episode}`}
            duration={ep.released ? new Date(ep.released).toLocaleDateString() : ''}
            imageUrl={ep.thumbnail || posterFallback || ''}
            overview={ep.overview}
            rating={ep.rating}
            watched={watchedEpisodeKeys?.has(`${ep.season}:${ep.episode}`)}
            onPress={() => onPlayEpisode(ep.season, ep.episode)}
            onToggleWatched={onToggleWatched ? () => onToggleWatched(ep.season, ep.episode) : undefined}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  split: { flexDirection: 'row', gap: 12 },
  rail: { width: 56, borderRightWidth: 1, gap: 8, paddingRight: 8 },
  railRow: { paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  railText: { fontSize: 12.5, fontWeight: '700' },
  main: { flex: 1, minWidth: 0 },
});
