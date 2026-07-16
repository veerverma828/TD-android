import { useCallback, useEffect, useRef, useState } from 'react';
import {
  readPositions,
  writePositions,
  RESUME_THRESHOLD_SECONDS,
  NEAR_END_FRACTION,
} from '@/services/playbackPositionStore';

const SAVE_INTERVAL_MS = 5000;

export function usePlaybackPosition(contentId: string | null) {
  const [resumeFrom, setResumeFrom] = useState<number | null>(null);
  const [resolved, setResolved] = useState(false);
  const lastSavedRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setResolved(false);
    setResumeFrom(null);
    if (!contentId) {
      setResolved(true);
      return;
    }
    readPositions().then((map) => {
      if (cancelled) return;
      const stored = map[contentId];
      if (stored && stored.position > RESUME_THRESHOLD_SECONDS && stored.position < stored.duration * NEAR_END_FRACTION) {
        setResumeFrom(stored.position);
      }
      setResolved(true);
    });
    return () => {
      cancelled = true;
    };
  }, [contentId]);

  const savePosition = useCallback(
    (position: number, duration: number, force = false) => {
      if (!contentId || duration <= 0) return;
      const now = Date.now();
      if (!force && now - lastSavedRef.current < SAVE_INTERVAL_MS) return;
      lastSavedRef.current = now;
      readPositions().then((map) => {
        map[contentId] = { position, duration, updatedAt: now };
        writePositions(map);
      });
    },
    [contentId]
  );

  const clearPosition = useCallback(() => {
    if (!contentId) return;
    readPositions().then((map) => {
      delete map[contentId];
      writePositions(map);
    });
  }, [contentId]);

  return { resumeFrom, resolved, savePosition, clearPosition };
}
