import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { useIsTV } from '@/contexts/DeviceModeContext';

// TVTabBar stays mounted across route pushes, so Android's default-focus
// assignment sometimes lands on the rail instead of a freshly pushed screen's
// hasTVPreferredFocus target (a race, not a reliable handoff). This wins that
// race with an imperative .focus() one tick after mount/deps change, without
// interfering with later focus-restoration (useRestoreFocus) on the same
// screen instance since it only fires when a dep actually changes.
export function usePushedScreenFocus<T extends { focus?: () => void } = View>(deps: unknown[] = []) {
  const isTV = useIsTV();
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!isTV) return;
    const t = setTimeout(() => ref.current?.focus?.(), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTV, ...deps]);

  return ref;
}
