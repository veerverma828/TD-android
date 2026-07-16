import { useCallback, useEffect, useRef } from 'react';

import { useSettings } from '@/contexts/SettingsContext';
import { useTrakt } from '@/contexts/TraktContext';
import { getEffectiveSource } from '@/utils/continueWatchingSource';
import { scrobbleStart, scrobblePause, scrobbleStop } from '@/services/traktService';

const PAUSE_DEBOUNCE_MS = 2000;

interface PlaybackSnapshot {
  paused: boolean;
  currentTime: number;
  duration: number;
}

export function useTraktScrobble(contentId: string | null, playback: PlaybackSnapshot) {
  const { continueWatchingSource } = useSettings();
  const { connected } = useTrakt();
  const active = getEffectiveSource(continueWatchingSource, connected) === 'trakt' && !!contentId;

  const startedRef = useRef(false);
  const lastPauseFireRef = useRef(0);
  const wasPausedRef = useRef(playback.paused);
  const playbackRef = useRef(playback);
  const contentIdRef = useRef(contentId);

  useEffect(() => {
    playbackRef.current = playback;
    contentIdRef.current = contentId;
  });

  const progressPct = useCallback(() => {
    const { currentTime, duration } = playbackRef.current;
    return duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  }, []);

  useEffect(() => {
    startedRef.current = false;
    wasPausedRef.current = true;
  }, [contentId]);

  useEffect(() => {
    if (!active) return;

    if (!playback.paused && !startedRef.current) {
      startedRef.current = true;
      scrobbleStart(contentId as string, progressPct());
    }

    if (playback.paused && !wasPausedRef.current) {
      const now = Date.now();
      if (now - lastPauseFireRef.current > PAUSE_DEBOUNCE_MS) {
        lastPauseFireRef.current = now;
        scrobblePause(contentId as string, progressPct());
      }
    }

    wasPausedRef.current = playback.paused;
  }, [active, playback.paused, contentId, progressPct]);

  const stop = useCallback(() => {
    if (!active || !contentIdRef.current) return;
    scrobbleStop(contentIdRef.current, progressPct());
  }, [active, progressPct]);

  useEffect(() => {
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId]);

  return { stop };
}
