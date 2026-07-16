import { useCallback, useRef, useState } from 'react';
import type { OnBufferData, OnLoadData, OnProgressData, OnVideoErrorData } from 'react-native-video';

export interface PlaybackState {
  paused: boolean;
  buffering: boolean;
  currentTime: number;
  duration: number;
  error: string | null;
  playbackRate: number;
}

export function usePlaybackState(initialPaused = false, initialRate = 1) {
  const [paused, setPaused] = useState(initialPaused);
  const [buffering, setBuffering] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(initialRate);
  const [retryToken, setRetryToken] = useState(0);

  const seekingRef = useRef(false);

  const togglePlay = useCallback(() => setPaused((p) => !p), []);

  const onLoad = useCallback((e: OnLoadData) => {
    setDuration(e.duration);
    setBuffering(false);
    setError(null);
  }, []);

  const onProgress = useCallback((e: OnProgressData) => {
    if (!seekingRef.current) setCurrentTime(e.currentTime);
  }, []);

  const onBuffer = useCallback((e: OnBufferData) => {
    setBuffering(e.isBuffering);
  }, []);

  const onError = useCallback((e: OnVideoErrorData) => {
    const message =
      e.error?.localizedDescription ||
      e.error?.errorString ||
      e.error?.error ||
      'Playback failed. The stream may be unavailable.';
    setError(message);
    setBuffering(false);
  }, []);

  const onEnd = useCallback(() => {
    setPaused(true);
  }, []);

  const beginSeek = useCallback(() => {
    seekingRef.current = true;
  }, []);

  const endSeek = useCallback((time: number) => {
    seekingRef.current = false;
    setCurrentTime(time);
  }, []);

  const retry = useCallback(() => {
    setError(null);
    setBuffering(true);
    setRetryToken((t) => t + 1);
  }, []);

  return {
    paused,
    setPaused,
    togglePlay,
    buffering,
    currentTime,
    setCurrentTime,
    duration,
    error,
    playbackRate,
    setPlaybackRate,
    retryToken,
    retry,
    beginSeek,
    endSeek,
    handlers: { onLoad, onProgress, onBuffer, onError, onEnd },
  };
}
