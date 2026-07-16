import { useCallback, useEffect, useRef, useState } from 'react';
import { VolumeManager } from 'react-native-volume-manager';

export function useVolumeGesture(enabled: boolean) {
  const [volume, setVolumeState] = useState(0.5);
  const initialized = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    VolumeManager.showNativeVolumeUI({ enabled: false });
    VolumeManager.getVolume().then((res) => {
      setVolumeState(res.volume);
      initialized.current = true;
    });
    const sub = VolumeManager.addVolumeListener((res) => {
      setVolumeState(res.volume);
    });
    return () => {
      sub.remove();
      VolumeManager.showNativeVolumeUI({ enabled: true });
    };
  }, [enabled]);

  const setVolume = useCallback((value: number) => {
    const clamped = Math.min(1, Math.max(0, value));
    setVolumeState(clamped);
    VolumeManager.setVolume(clamped, { showUI: false });
  }, []);

  const adjustBy = useCallback(
    (delta: number) => {
      setVolumeState((prev) => {
        const next = Math.min(1, Math.max(0, prev + delta));
        VolumeManager.setVolume(next, { showUI: false });
        return next;
      });
    },
    []
  );

  return { volume, setVolume, adjustBy };
}
