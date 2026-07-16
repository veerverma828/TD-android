import { useEffect } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

const TAG = 'video-player';

export function useKeepAwake(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    activateKeepAwakeAsync(TAG);
    return () => {
      deactivateKeepAwake(TAG);
    };
  }, [enabled]);
}
