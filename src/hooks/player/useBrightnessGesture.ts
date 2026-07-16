import { useCallback, useEffect, useState } from 'react';
import * as Brightness from 'expo-brightness';

export function useBrightnessGesture(enabled: boolean) {
  const [brightness, setBrightnessState] = useState(0.5);

  useEffect(() => {
    if (!enabled) return;
    Brightness.getBrightnessAsync().then(setBrightnessState).catch(() => {});
  }, [enabled]);

  const setBrightness = useCallback((value: number) => {
    const clamped = Math.min(1, Math.max(0, value));
    setBrightnessState(clamped);
    Brightness.setBrightnessAsync(clamped).catch(() => {});
  }, []);

  const adjustBy = useCallback((delta: number) => {
    setBrightnessState((prev) => {
      const next = Math.min(1, Math.max(0, prev + delta));
      Brightness.setBrightnessAsync(next).catch(() => {});
      return next;
    });
  }, []);

  return { brightness, setBrightness, adjustBy };
}
