"use no memo";
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { NavigationBar } from 'expo-navigation-bar';

import type { DefaultOrientation } from '@/contexts/PlayerSettingsContext';
import { useDeviceMode } from '@/contexts/DeviceModeContext';

export function useOrientation(defaultOrientation: DefaultOrientation) {
  const { isPhysicalTV } = useDeviceMode();
  const [locked, setLocked] = useState(defaultOrientation !== 'auto');

  const applyDefault = useCallback(async () => {
    if (isPhysicalTV) return;
    if (defaultOrientation === 'landscape') {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    } else if (defaultOrientation === 'portrait') {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    }
  }, [defaultOrientation, isPhysicalTV]);

  useFocusEffect(
    useCallback(() => {
      if (isPhysicalTV) return;
      applyDefault();
      NavigationBar.setHidden(true);

      return () => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        NavigationBar.setHidden(false);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPhysicalTV])
  );

  const toggleOrientation = useCallback(async () => {
    if (isPhysicalTV) return;
    const current = await ScreenOrientation.getOrientationAsync();
    const isLandscape =
      current === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
      current === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
    await ScreenOrientation.lockAsync(
      isLandscape ? ScreenOrientation.OrientationLock.PORTRAIT_UP : ScreenOrientation.OrientationLock.LANDSCAPE
    );
  }, [isPhysicalTV]);

  const toggleLock = useCallback(async () => {
    if (isPhysicalTV) return;
    if (locked) {
      await ScreenOrientation.unlockAsync();
      setLocked(false);
    } else {
      const current = await ScreenOrientation.getOrientationAsync();
      await ScreenOrientation.lockAsync(
        current === ScreenOrientation.Orientation.PORTRAIT_UP
          ? ScreenOrientation.OrientationLock.PORTRAIT_UP
          : ScreenOrientation.OrientationLock.LANDSCAPE
      );
      setLocked(true);
    }
  }, [locked, isPhysicalTV]);

  return { locked, toggleLock, toggleOrientation };
}
