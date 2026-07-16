import { useCallback, useEffect, useState } from 'react';

import { useSettings } from '@/contexts/SettingsContext';
import { useTrakt } from '@/contexts/TraktContext';
import { getEffectiveSource } from '@/utils/continueWatchingSource';
import { parseContentId, buildContentId } from '@/utils/contentId';
import { fetchMeta } from '@/services/cinemeta';
import {
  getAllPositions,
  deletePosition,
  RESUME_THRESHOLD_SECONDS,
  NEAR_END_FRACTION,
} from '@/services/playbackPositionStore';
import { getPlaybackProgress, removePlaybackItem, getHistoryEpisodes } from '@/services/traktService';

export interface ContinueWatchingItem {
  contentId: string;
  type: string;
  id: string;
  season?: number;
  episode?: number;
  title: string;
  poster?: string;
  progress: number; // 0..1
  source: 'local' | 'trakt';
  updatedAt: number;
  traktPlaybackId?: number;
  isNext?: boolean; // synthesized "next episode" card — no real progress, just watched history
}

interface RawEntry {
  contentId: string;
  progress: number; // 0..1
  updatedAt: number;
  traktPlaybackId?: number;
  isNext?: boolean;
}

const MAX_ITEMS = 20;

function dedupePerSeries(entries: RawEntry[]): RawEntry[] {
  const bestByKey = new Map<string, RawEntry>();
  for (const entry of entries) {
    const parsed = parseContentId(entry.contentId);
    if (!parsed) continue;
    const key = `${parsed.type}:${parsed.id}`;
    const existing = bestByKey.get(key);
    if (!existing || entry.updatedAt > existing.updatedAt) {
      bestByKey.set(key, entry);
    }
  }
  return Array.from(bestByKey.values());
}

export function useContinueWatching() {
  const { continueWatchingSource } = useSettings();
  const { connected } = useTrakt();
  const source = getEffectiveSource(continueWatchingSource, connected);

  const [items, setItems] = useState<ContinueWatchingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let rawEntries: RawEntry[] = [];

      if (source === 'trakt') {
        const playbackEntries = await getPlaybackProgress();
        const inProgress: RawEntry[] = playbackEntries.map((e) => ({
          contentId: e.contentId,
          progress: e.progressPct / 100,
          updatedAt: new Date(e.pausedAt).getTime() || Date.now(),
          traktPlaybackId: e.traktId,
        }));

        // A freshly-connected account usually has watch HISTORY but nothing
        // currently paused mid-episode — /sync/playback alone would leave the
        // row empty. Pull history and synthesize a "next episode" card for any
        // show that isn't already covered by an in-progress entry above.
        const showsWithProgress = new Set(
          inProgress
            .map((e) => parseContentId(e.contentId))
            .filter((p): p is NonNullable<typeof p> => !!p)
            .map((p) => p.id)
        );

        const historyEpisodes = await getHistoryEpisodes().catch(() => []);
        const nextEpisodeEntries = (
          await Promise.all(
            historyEpisodes
              .filter((h) => !showsWithProgress.has(h.showId))
              .map(async (h): Promise<RawEntry | null> => {
                const meta = await fetchMeta('series', h.showId).catch(() => null);
                if (!meta?.videos) return null;
                const videos = meta.videos.slice().sort((a, b) => a.season - b.season || a.episode - b.episode);
                const currentIndex = videos.findIndex((v) => v.season === h.season && v.episode === h.episode);
                if (currentIndex === -1 || currentIndex === videos.length - 1) return null;
                const next = videos[currentIndex + 1];
                return {
                  contentId: buildContentId('series', h.showId, next.season, next.episode),
                  progress: 0,
                  updatedAt: new Date(h.watchedAt).getTime() || Date.now(),
                  isNext: true,
                };
              })
          )
        ).filter((e): e is RawEntry => e !== null);

        // Completed movies aren't "continue watching" — only in-progress ones
        // (already covered by /sync/playback above) belong in this row.
        rawEntries = [...inProgress, ...nextEpisodeEntries];
      } else {
        const map = await getAllPositions();
        rawEntries = Object.entries(map)
          .filter(([, v]) => v.duration > 0 && v.position > RESUME_THRESHOLD_SECONDS && v.position < v.duration * NEAR_END_FRACTION)
          .map(([contentId, v]) => ({
            contentId,
            progress: v.position / v.duration,
            updatedAt: v.updatedAt,
          }));
      }

      const deduped = dedupePerSeries(rawEntries)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, MAX_ITEMS);

      const resolved = await Promise.all(
        deduped.map(async (entry): Promise<ContinueWatchingItem | null> => {
          const parsed = parseContentId(entry.contentId);
          if (!parsed) return null;
          const meta = await fetchMeta(parsed.type, parsed.id).catch(() => null);
          if (!meta) return null;

          const title =
            parsed.season != null && parsed.episode != null
              ? `${meta.name} — S${parsed.season}:E${parsed.episode}`
              : meta.name;

          return {
            contentId: entry.contentId,
            type: parsed.type,
            id: parsed.id,
            season: parsed.season,
            episode: parsed.episode,
            title,
            poster: meta.poster,
            progress: entry.progress,
            source,
            updatedAt: entry.updatedAt,
            traktPlaybackId: entry.traktPlaybackId,
            isNext: entry.isNext,
          };
        })
      );

      setItems(resolved.filter((i): i is ContinueWatchingItem => i !== null));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [source]);

  useEffect(() => {
    load();
  }, [load]);

  const removeItem = useCallback(
    async (item: ContinueWatchingItem) => {
      setItems((prev) => prev.filter((i) => i.contentId !== item.contentId));
      try {
        if (item.source === 'trakt' && item.traktPlaybackId != null) {
          await removePlaybackItem(item.traktPlaybackId);
        } else {
          await deletePosition(item.contentId);
        }
      } catch {
        // best-effort — UI already reflects the removal optimistically
      }
    },
    []
  );

  return { items, loading, source, refresh: load, removeItem };
}
