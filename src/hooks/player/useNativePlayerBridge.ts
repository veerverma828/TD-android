import { useCallback, useEffect, useRef, useState } from 'react';
import { requireNativeModule, EventEmitter } from 'expo-modules-core';

const NativePlayer = requireNativeModule('NativePlayer');
const playerEmitter = new EventEmitter(NativePlayer);

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

export function useNativePlayerBridge(callbacks: NativePlayerBridgeCallbacks) {
  const [playback, setPlayback] = useState({ paused: true, currentTime: 0, duration: 0 });
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    const subs = [
      playerEmitter.addListener('nativePlayerProgress', (e: ProgressEvent) => {
        setPlayback({ paused: e.paused, currentTime: e.currentTime, duration: e.duration });
      }),
      playerEmitter.addListener('nativePlayerClosed', (e: ClosedEvent) => {
        callbacksRef.current.onClosed(e);
      }),
      playerEmitter.addListener('nativePlayerError', (e: ErrorEvent) => {
        callbacksRef.current.onError?.(e);
      }),
      playerEmitter.addListener('nativePlayerRequestNext', () => {
        callbacksRef.current.onRequestNext?.();
      }),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);

  const launch = useCallback(async (config: NativePlayerLaunchConfig) => {
    try {
      await NativePlayer.launch(JSON.stringify(config));
    } catch (e) {
      console.error("Failed to launch native player:", e);
    }
  }, []);

  return { playback, launch };
}
