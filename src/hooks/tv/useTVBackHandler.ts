import { useCallback, useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useFocusEffect } from 'expo-router';

/** Wires Android hardware/gesture Back to `onBack`. Works identically on TV and mobile. */
export function useTVBackHandler(onBack: () => boolean | void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const handled = onBack();
      return handled !== false;
    });
    return () => sub.remove();
  }, [onBack, enabled]);
}

/** Same as useTVBackHandler, but only active while the owning screen is focused (expo-router). */
export function useScreenBackHandler(onBack: () => boolean | void, enabled = true) {
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        const handled = onBack();
        return handled !== false;
      });
      return () => sub.remove();
    }, [onBack, enabled])
  );
}
