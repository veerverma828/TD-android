import { StyleSheet, View, FlatList, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/IconSymbol';
import { FocusablePressable } from '@/components/tv/FocusablePressable';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useMyList } from '@/contexts/MyListContext';
import { fetchMeta, Video } from '@/services/cinemeta';
import { DARK_IMAGE_PLACEHOLDER } from '@/constants/placeholder';
import { useScreenBackHandler } from '@/hooks/tv/useTVBackHandler';
import { useRestoreFocus } from '@/hooks/tv/useRestoreFocus';

interface CalendarEntry {
  showId: string;
  showName: string;
  poster?: string;
  season: number;
  episode: number;
  title: string;
  released: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function formatDateHeading(date: Date): string {
  const today = new Date();
  const diffDays = Math.round((date.getTime() - new Date(today.toDateString()).getTime()) / DAY_MS);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CalendarScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { list, loaded } = useMyList();
  const [entries, setEntries] = useState<CalendarEntry[] | null>(null);
  const { hasPreferredFocus, registerFocusable } = useRestoreFocus('calendar');

  useScreenBackHandler(() => {
    router.back();
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const shows = list.filter((item) => item.type === 'series');
      const results = await Promise.all(
        shows.map(async (show) => {
          const meta = await fetchMeta('series', show.id);
          if (!meta?.videos) return [];
          const cutoff = Date.now() - 14 * DAY_MS;
          return meta.videos
            .filter((v: Video) => v.released && new Date(v.released).getTime() >= cutoff)
            .map((v: Video) => ({
              showId: show.id,
              showName: show.name,
              poster: show.poster,
              season: v.season,
              episode: v.episode,
              title: v.title,
              released: v.released,
            }));
        })
      );
      if (cancelled) return;
      const flat = results.flat().sort((a, b) => new Date(a.released).getTime() - new Date(b.released).getTime());
      setEntries(flat);
    }
    if (loaded) load();
    return () => {
      cancelled = true;
    };
  }, [list, loaded]);

  const sections = useMemo(() => {
    if (!entries) return [];
    const byDate = new Map<string, CalendarEntry[]>();
    for (const entry of entries) {
      const key = new Date(entry.released).toDateString();
      const arr = byDate.get(key) || [];
      arr.push(entry);
      byDate.set(key, arr);
    }
    return Array.from(byDate.entries()).map(([dateKey, items]) => ({ dateKey, date: new Date(dateKey), items }));
  }, [entries]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <FocusablePressable onPress={() => router.back()} focusRingBorderRadius={20} accessibilityRole="button" accessibilityLabel="Go back" style={styles.backBtn}>
            <IconSymbol name="chevron.left" color={colors.text} size={24} />
          </FocusablePressable>
          <ThemedText type="title" style={styles.headerTitle}>Calendar</ThemedText>
        </View>

        {entries === null ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        ) : sections.length === 0 ? (
          <View style={styles.centerContainer}>
            <IconSymbol name="calendar" color={colors.textSecondary} size={40} />
            <ThemedText style={{ color: colors.textSecondary, marginTop: 12, textAlign: 'center', paddingHorizontal: 32 }}>
              No recent or upcoming episodes for shows in your library.
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={sections}
            keyExtractor={(section) => section.dateKey}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: section, index: sectionIndex }) => (
              <View style={styles.section}>
                <ThemedText style={[styles.sectionHeading, { color: colors.accent }]}>
                  {formatDateHeading(section.date)}
                </ThemedText>
                {section.items.map((entry, entryIndex) => {
                  const restoreKey = `${entry.showId}-${entry.season}-${entry.episode}`;
                  return (
                  <FocusablePressable
                    key={restoreKey}
                    style={[styles.row, { borderColor: colors.backgroundSelected }]}
                    onPress={() => router.push({ pathname: '/details', params: { id: entry.showId, type: 'series' } })}
                    hasTVPreferredFocus={hasPreferredFocus(restoreKey, sectionIndex === 0 && entryIndex === 0)}
                    onFocus={() => registerFocusable(restoreKey)}
                    focusRingScale={false}
                  >
                    <Image
                      source={{ uri: entry.poster }}
                      style={styles.poster}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      placeholder={DARK_IMAGE_PLACEHOLDER}
                    />
                    <View style={styles.rowInfo}>
                      <ThemedText style={styles.showName} numberOfLines={1}>{entry.showName}</ThemedText>
                      <ThemedText style={{ color: colors.textSecondary, fontSize: 13 }} numberOfLines={1}>
                        S{entry.season}:E{entry.episode} {entry.title ? `— ${entry.title}` : ''}
                      </ThemedText>
                    </View>
                  </FocusablePressable>
                  );
                })}
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 24 },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 12,
  },
  poster: {
    width: 44,
    height: 62,
    borderRadius: 6,
  },
  rowInfo: {
    flex: 1,
  },
  showName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
});
