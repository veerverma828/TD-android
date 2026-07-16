"use no memo";
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { NavigationBar } from 'expo-navigation-bar';

import type { DefaultOrientation } from '@/contexts/PlayerSettingsContext';

export function useOrientation(defaultOrientation: DefaultOrientation) {
  const [locked, setLocked] = useState(defaultOrientation !== 'auto');

  const applyDefault = useCallback(async () => {
    if (defaultOrientation === 'landscape') {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    } else if (defaultOrientation === 'portrait') {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    }
  }, [defaultOrientation]);

  useFocusEffect(
    useCallback(() => {
      applyDefault();
      NavigationBar.setHidden(true);

      return () => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        NavigationBar.setHidden(false);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const toggleOrientation = useCallback(async () => {
    const current = await ScreenOrientation.getOrientationAsync();
    const isLandscape =
      current === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
      current === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
    await ScreenOrientation.lockAsync(
      isLandscape ? ScreenOrientation.OrientationLock.PORTRAIT_UP : ScreenOrientation.OrientationLock.LANDSCAPE
    );
  }, []);

  const toggleLock = useCallback(async () => {
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
  }, [locked]);

  return { locked, toggleLock, toggleOrientation };
}
