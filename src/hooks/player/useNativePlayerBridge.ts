import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { requireNativeModule, EventEmitter } from 'expo-modules-core';

// Native-only module - no web/iOS impl exists. Load lazily so importing this
// file on web doesn't throw at bundle-eval time; unsupported platforms get a
// proxy that fails calls instead of crashing on import.
const unsupportedNativePlayer = new Proxy(
  {},
  {
    get() {
      return () => {
        throw new Error('Native player is not supported on this platform.');
      };
    },
  },
);

const NativePlayer =
  Platform.OS === 'android' ? requireNativeModule('NativePlayer') : unsupportedNativePlayer;

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

interface PipModeChangedEvent {
  contentId: string | null;
  isInPictureInPicture: boolean;
}

interface NativePlayerBridgeCallbacks {
  onClosed: (event: ClosedEvent) => void;
  onError?: (event: ErrorEvent) => void;
  onRequestNext?: () => void;
  onPipModeChanged?: (event: PipModeChangedEvent) => void;
}

// Explicit event map — without it EventEmitter's generic defaults to
// Record<never, never> and every addListener() call below fails to typecheck
// (TS2345: argument not assignable to 'never'), even though the untyped emitter
// works fine at runtime.
type NativePlayerEventsMap = {
  nativePlayerProgress: (event: ProgressEvent) => void;
  nativePlayerClosed: (event: ClosedEvent) => void;
  nativePlayerError: (event: ErrorEvent) => void;
  nativePlayerRequestNext: () => void;
  nativePlayerPipModeChanged: (event: PipModeChangedEvent) => void;
};

const playerEmitter = new EventEmitter<NativePlayerEventsMap>(
  Platform.OS === 'android' ? (NativePlayer as any) : ({} as any),
);

export function useNativePlayerBridge(callbacks: NativePlayerBridgeCallbacks) {
  const [playback, setPlayback] = useState({ paused: true, currentTime: 0, duration: 0 });
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  });

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
      playerEmitter.addListener('nativePlayerPipModeChanged', (e: PipModeChangedEvent) => {
        callbacksRef.current.onPipModeChanged?.(e);
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
