import { useEffect, useState } from 'react';
import { findActiveCue, parseSubtitles, SubtitleCue } from '@/utils/subtitleParser';

export function useSubtitles(subtitleUrl: string | null) {
  const [cues, setCues] = useState<SubtitleCue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!subtitleUrl) {
      setCues([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(subtitleUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load subtitles (${res.status})`);
        return res.text();
      })
      .then((text) => {
        if (cancelled) return;
        setCues(parseSubtitles(text));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Failed to load subtitles');
        setCues([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [subtitleUrl]);

  const getCueAt = (time: number) => findActiveCue(cues, time);

  return { cues, loading, error, getCueAt };
}
