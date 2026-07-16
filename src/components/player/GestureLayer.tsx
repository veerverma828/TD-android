import { useCallback, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { useAutoHideOverlay } from '@/hooks/player/useAutoHideOverlay';
import { BrightnessIndicator } from './overlays/BrightnessIndicator';
import { VolumeIndicator } from './overlays/VolumeIndicator';
import { SeekIndicator } from './overlays/SeekIndicator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VERTICAL_SENSITIVITY_BASE = 1 / 200; // full swing over ~200px
const HORIZONTAL_SECONDS_PER_PX = 0.2; // seek acceleration base

interface GestureLayerProps {
  accentColor: string;
  brightnessEnabled: boolean;
  volumeEnabled: boolean;
  horizontalSeekEnabled: boolean;
  doubleTapEnabled: boolean;
  sensitivity: number;
  seekDurationSeconds: number;
  duration: number;
  brightness: number;
  onBrightnessChange: (value: number) => void;
  volume: number;
  onVolumeChange: (value: number) => void;
  onSeekCommit: (deltaSeconds: number) => void;
  onDoubleTapSeek: (deltaSeconds: number) => void;
  onSingleTap: () => void;
}

export function GestureLayer({
  accentColor,
  brightnessEnabled,
  volumeEnabled,
  horizontalSeekEnabled,
  doubleTapEnabled,
  sensitivity,
  seekDurationSeconds,
  duration,
  brightness,
  onBrightnessChange,
  volume,
  onVolumeChange,
  onSeekCommit,
  onDoubleTapSeek,
  onSingleTap,
}: GestureLayerProps) {
  // Each overlay owns a single always-mounted opacity value (see useAutoHideOverlay) —
  // no conditional mount/unmount, so rapid re-triggers retarget the same in-flight
  // animation instead of restarting a fresh enter/exit each time.
  const brightnessOverlay = useAutoHideOverlay();
  const volumeOverlay = useAutoHideOverlay();
  const seekOverlay = useAutoHideOverlay();
  const doubleTapOverlay = useAutoHideOverlay(500);

  const [seekPreview, setSeekPreview] = useState<{ delta: number; side: 'left' | 'right' }>({
    delta: 0,
    side: 'right',
  });
  const [doubleTapFlash, setDoubleTapFlash] = useState<{ delta: number; side: 'left' | 'right' }>({
    delta: 0,
    side: 'right',
  });

  const startBrightness = useRef(0);
  const startVolume = useRef(0);
  const seekDelta = useRef(0);
  const verticalSide = useRef<'brightness' | 'volume'>('brightness');

  const beginVertical = useCallback(
    (x: number) => {
      startBrightness.current = brightness;
      startVolume.current = volume;
      if (x < SCREEN_WIDTH / 2) {
        verticalSide.current = 'brightness';
        brightnessOverlay.show();
      } else {
        verticalSide.current = 'volume';
        volumeOverlay.show();
      }
    },
    [brightness, volume, brightnessOverlay, volumeOverlay]
  );

  const updateVertical = useCallback(
    (x: number, translationY: number) => {
      const delta = -translationY * VERTICAL_SENSITIVITY_BASE * sensitivity;
      if (x < SCREEN_WIDTH / 2) {
        onBrightnessChange(startBrightness.current + delta);
      } else {
        onVolumeChange(startVolume.current + delta);
      }
    },
    [sensitivity, onBrightnessChange, onVolumeChange]
  );

  // Runs on end, cancel, AND fail — guarantees the overlay always schedules its
  // hide even if Gesture.Race cancels this gesture in favor of another.
  const finalizeVertical = useCallback(() => {
    if (verticalSide.current === 'brightness') brightnessOverlay.scheduleHide();
    else volumeOverlay.scheduleHide();
  }, [brightnessOverlay, volumeOverlay]);

  const beginHorizontal = useCallback(() => {
    seekDelta.current = 0;
    seekOverlay.show();
  }, [seekOverlay]);

  const updateHorizontal = useCallback(
    (translationX: number) => {
      const delta = translationX * HORIZONTAL_SECONDS_PER_PX * sensitivity;
      seekDelta.current = delta;
      setSeekPreview({ delta, side: delta >= 0 ? 'right' : 'left' });
    },
    [sensitivity]
  );

  const commitHorizontal = useCallback(() => {
    if (seekDelta.current !== 0) {
      onSeekCommit(seekDelta.current);
    }
  }, [onSeekCommit]);

  const finalizeHorizontal = useCallback(() => {
    seekOverlay.scheduleHide();
  }, [seekOverlay]);

  const doubleTap = useCallback(
    (x: number) => {
      const side: 'left' | 'right' = x < SCREEN_WIDTH / 2 ? 'left' : 'right';
      const delta = side === 'left' ? -seekDurationSeconds : seekDurationSeconds;
      onDoubleTapSeek(delta);
      setDoubleTapFlash({ delta, side });
      doubleTapOverlay.show();
      doubleTapOverlay.scheduleHide();
    },
    [seekDurationSeconds, onDoubleTapSeek, doubleTapOverlay]
  );

  const verticalPan = Gesture.Pan()
    .enabled(brightnessEnabled || volumeEnabled)
    .activeOffsetY([-8, 8])
    .failOffsetX([-12, 12])
    .onStart((e) => {
      runOnJS(beginVertical)(e.x);
    })
    .onUpdate((e) => {
      runOnJS(updateVertical)(e.x, e.translationY);
    })
    .onFinalize(() => {
      runOnJS(finalizeVertical)();
    });

  const horizontalPan = Gesture.Pan()
    .enabled(horizontalSeekEnabled && duration > 0)
    .activeOffsetX([-10, 10])
    .failOffsetY([-12, 12])
    .onStart(() => {
      runOnJS(beginHorizontal)();
    })
    .onUpdate((e) => {
      runOnJS(updateHorizontal)(e.translationX);
    })
    .onEnd(() => {
      runOnJS(commitHorizontal)();
    })
    .onFinalize(() => {
      runOnJS(finalizeHorizontal)();
    });

  const doubleTapGesture = Gesture.Tap()
    .enabled(doubleTapEnabled)
    .numberOfTaps(2)
    .onEnd((e) => {
      runOnJS(doubleTap)(e.x);
    });

  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      runOnJS(onSingleTap)();
    });

  const composed = Gesture.Race(
    verticalPan,
    horizontalPan,
    Gesture.Exclusive(doubleTapGesture, singleTapGesture)
  );

  return (
    <GestureDetector gesture={composed}>
      <View style={StyleSheet.absoluteFill}>
        <BrightnessIndicator value={brightness} opacity={brightnessOverlay.opacity} />
        <VolumeIndicator value={volume} accentColor={accentColor} opacity={volumeOverlay.opacity} />
        <SeekIndicator deltaSeconds={seekPreview.delta} side={seekPreview.side} opacity={seekOverlay.opacity} />
        <SeekIndicator deltaSeconds={doubleTapFlash.delta} side={doubleTapFlash.side} opacity={doubleTapOverlay.opacity} />
      </View>
    </GestureDetector>
  );
}
