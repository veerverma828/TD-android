import { useCallback, useEffect, useRef } from 'react';
import { Easing, cancelAnimation, useSharedValue, withTiming } from 'react-native-reanimated';

/**
 * Single source of truth for a gesture-driven overlay indicator's visibility.
 *
 * Always-mounted opacity value (never conditional-render mount/unmount, so rapid
 * re-triggers retarget the same in-flight animation instead of restarting a fresh
 * enter/exit each time). `show()` cancels any pending hide and any in-flight fade-out
 * before animating in, so it's safe to call repeatedly from onBegin. `scheduleHide()`
 * must be called from onFinalize (not onEnd) so a hide is always scheduled even when
 * the gesture is cancelled rather than completed — the source of "stuck" overlays.
 */
export function useAutoHideOverlay(hideDelayMs = 700, fadeInMs = 120, fadeOutMs = 280) {
  const opacity = useSharedValue(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const show = useCallback(() => {
    clearHideTimer();
    cancelAnimation(opacity);
    opacity.value = withTiming(1, { duration: fadeInMs, easing: Easing.out(Easing.quad) });
  }, [clearHideTimer, opacity, fadeInMs]);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    hideTimer.current = setTimeout(() => {
      hideTimer.current = null;
      cancelAnimation(opacity);
      opacity.value = withTiming(0, { duration: fadeOutMs, easing: Easing.in(Easing.quad) });
    }, hideDelayMs);
  }, [clearHideTimer, opacity, hideDelayMs, fadeOutMs]);

  const hideNow = useCallback(() => {
    clearHideTimer();
    cancelAnimation(opacity);
    opacity.value = withTiming(0, { duration: fadeOutMs, easing: Easing.in(Easing.quad) });
  }, [clearHideTimer, opacity, fadeOutMs]);

  useEffect(() => clearHideTimer, [clearHideTimer]);

  return { opacity, show, scheduleHide, hideNow };
}
