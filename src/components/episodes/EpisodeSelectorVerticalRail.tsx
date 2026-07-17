import { ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { EpisodeRow } from '@/components/EpisodeRow';
import { FocusablePressable } from '@/components/tv/FocusablePressable';
import { useAppTheme } from '@/contexts/ThemeContext';
import { EpisodeSelectorProps, seasonLabel } from './types';

export function EpisodeSelectorVerticalRail({ seasons, selectedSeason, onSelectSeason, allVideos, posterFallback, onPlayEpisode }: EpisodeSelectorProps) {
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

      <View style={{ marginTop: 16 }}>
        {visibleEpisodes.map((ep) => (
          <EpisodeRow
            key={ep.id}
            episodeNumber={ep.episode}
            title={ep.title || `Episode ${ep.episode}`}
            duration={ep.released ? new Date(ep.released).toLocaleDateString() : ''}
            imageUrl={ep.thumbnail || posterFallback || ''}
            overview={ep.overview}
            rating={ep.rating}
            onPress={() => onPlayEpisode(ep.season, ep.episode)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  seasonScroll: { gap: 8, paddingBottom: 4 },
  seasonPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  seasonText: { fontSize: 14, fontWeight: '600' },
});
