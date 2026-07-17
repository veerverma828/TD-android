import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { useIsTV } from '@/contexts/DeviceModeContext';

export function useScreenInitialFocus<T extends { focus?: () => void }>() {
  const isTV = useIsTV();
  const ref = useRef<T>(null);

  useFocusEffect(
    useCallback(() => {
      if (!isTV) return;
      ref.current?.focus?.();
    }, [isTV])
  );

  return ref;
}
