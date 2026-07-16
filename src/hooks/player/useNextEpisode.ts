import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

import { fetchMeta, fetchEpisodeStreams } from '@/services/cinemeta';
import { getActiveDebridProvider, getDebridKey, getFiles, generateLink } from '@/services/debridService';
import { buildContentId, parseContentId } from '@/utils/contentId';

interface NextEpisodeTarget {
  season: number;
  episode: number;
  title: string;
}

export function useNextEpisode(contentId: string | null) {
  const router = useRouter();
  const [next, setNext] = useState<NextEpisodeTarget | null>(null);
  const [loading, setLoading] = useState(false);

  const parsed = contentId ? parseContentId(contentId) : null;
  const isEpisode = !!parsed?.season && !!parsed?.episode;

  useEffect(() => {
    let cancelled = false;
    setNext(null);
    if (!parsed || !isEpisode) return;

    fetchMeta(parsed.type, parsed.id).then((data) => {
      if (cancelled || !data?.videos) return;
      const videos = data.videos
        .slice()
        .sort((a, b) => a.season - b.season || a.episode - b.episode);
      const currentIndex = videos.findIndex((v) => v.season === parsed.season && v.episode === parsed.episode);
      if (currentIndex === -1 || currentIndex === videos.length - 1) return;
      const upcoming = videos[currentIndex + 1];
      setNext({ season: upcoming.season, episode: upcoming.episode, title: upcoming.title });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId]);

  const playNext = useCallback(async () => {
    if (!parsed || !next) return;
    setLoading(true);
    try {
      const provider = await getActiveDebridProvider();
      if (!provider) return;
      const apiKey = await getDebridKey(provider);
      if (!apiKey) return;

      const streams = await fetchEpisodeStreams(parsed.id, next.season, next.episode);
      if (streams.length === 0) return;

      const result = await getFiles(streams[0].magnet, provider, apiKey);
      if (result.files.length === 0) return;
      const downloadUrl = await generateLink(result.torrentId, result.files[0].id, provider, apiKey);

      router.replace({
        pathname: '/player',
        params: {
          url: downloadUrl,
          title: next.title,
          contentId: buildContentId(parsed.type, parsed.id, next.season, next.episode),
        },
      });
    } catch {
      // silent failure — user can navigate back and pick the next episode manually
    } finally {
      setLoading(false);
    }
  }, [parsed, next, router]);

  return { hasNext: !!next, nextTitle: next?.title ?? null, loading, playNext };
}
