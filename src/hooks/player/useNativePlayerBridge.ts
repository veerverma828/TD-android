import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter, NativeModules } from 'react-native';

const { NativePlayer } = NativeModules;

export interface NativePlayerLaunchConfig {
  streamUrl: string;
  title?: string;
  contentId?: string | null;
  resumePositionSeconds?: number;
  hasNextEpisode: boolean;
  subtitleUrl?: string | null;
  subtitleLanguage?: string | null;
  theme: Record<string, string>;
  settings: Record<string, unknown>;
}

interface ProgressEvent {
  contentId: string | null;
  currentTime: number;
  duration: number;
  paused: boolean;
}

interface ClosedEvent {
  contentId: string | null;
  finalPositionSeconds: number;
  finalDurationSeconds: number;
}

interface ErrorEvent {
  contentId: string | null;
  message: string;
  code?: string;
}

interface NativePlayerBridgeCallbacks {
  onClosed: (event: ClosedEvent) => void;
  onError?: (event: ErrorEvent) => void;
  onRequestNext?: () => void;
}

/**
 * Wraps the native `NativePlayer` module + its DeviceEventEmitter events.
 * Exposes {paused, currentTime, duration} in the exact shape useTraktScrobble
 * and usePlaybackPosition already expect — only the event source changes from
 * <Video onProgress> to native progress ticks, the hooks themselves are untouched.
 */
export function useNativePlayerBridge(callbacks: NativePlayerBridgeCallbacks) {
  const [playback, setPlayback] = useState({ paused: true, currentTime: 0, duration: 0 });
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    const subs = [
      DeviceEventEmitter.addListener('nativePlayerProgress', (e: ProgressEvent) => {
        setPlayback({ paused: e.paused, currentTime: e.currentTime, duration: e.duration });
      }),
      DeviceEventEmitter.addListener('nativePlayerClosed', (e: ClosedEvent) => {
        callbacksRef.current.onClosed(e);
      }),
      DeviceEventEmitter.addListener('nativePlayerError', (e: ErrorEvent) => {
        callbacksRef.current.onError?.(e);
      }),
      DeviceEventEmitter.addListener('nativePlayerRequestNext', () => {
        callbacksRef.current.onRequestNext?.();
      }),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);

  const launch = useCallback((config: NativePlayerLaunchConfig) => {
    NativePlayer.launch(config);
  }, []);

  return { playback, launch };
}
