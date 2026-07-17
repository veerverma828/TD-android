import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { EpisodeRow } from '@/components/EpisodeRow';
import { FocusablePressable } from '@/components/tv/FocusablePressable';
import { useAppTheme } from '@/contexts/ThemeContext';
import { EpisodeSelectorProps, seasonLabel } from './types';

export function EpisodeSelectorAccordion({ seasons, selectedSeason, onSelectSeason, allVideos, posterFallback, onPlayEpisode }: EpisodeSelectorProps) {
  const { colors } = useAppTheme();
  const [expanded, setExpanded] = useState<number | null>(selectedSeason);

  const toggle = (season: number) => {
    const next = expanded === season ? null : season;
    setExpanded(next);
    if (next !== null) onSelectSeason(next);
  };

  return (
    <View>
      {seasons.map((s) => {
        const isOpen = expanded === s;
        const episodes = allVideos.filter((v) => v.season === s);
        return (
          <View key={s} style={[styles.item, { borderBottomColor: colors.backgroundSelected }]}>
            <FocusablePressable
              style={styles.head}
              onPress={() => toggle(s)}
              focusRingBorderRadius={8}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              accessibilityLabel={seasonLabel(s)}
            >
              <ThemedText style={[styles.seasonName, { color: colors.text }]}>{seasonLabel(s)}</ThemedText>
              <ThemedText style={{ color: colors.accent, fontSize: 13 }}>{isOpen ? '︿' : '﹀'}</ThemedText>
            </FocusablePressable>

            {isOpen && (
              <View style={styles.body}>
                {episodes.map((ep) => (
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
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { borderBottomWidth: 1, paddingVertical: 14 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seasonName: { fontSize: 17, fontWeight: '700' },
  body: { marginTop: 10 },
});
