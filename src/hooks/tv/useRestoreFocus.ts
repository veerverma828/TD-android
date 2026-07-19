import { useCallback, useRef } from 'react';

// Module-level (not React state) so updates never trigger re-renders — this
// is purely declarative bookkeeping fed into `hasTVPreferredFocus`, never an
// imperative .focus() call. expo-router unmounts/remounts screen content on
// stack navigation, which loses native view-level focus memory; this Map is
// what lets a screen re-declare "focus was last on X" on the next mount.
const lastFocusedByScreen = new Map<string, string>();

/**
 * Lets a screen restore focus to whatever item the user last focused,
 * instead of always landing on a hardcoded default when the screen
 * remounts (e.g. returning via Back). First-ever visit is unaffected —
 * `hasPreferredFocus` falls back to the caller's own `isDefault`.
 */
export function useRestoreFocus(screenKey: string) {
  const screenKeyRef = useRef(screenKey);
  screenKeyRef.current = screenKey;

  const registerFocusable = useCallback((itemKey: string) => {
    lastFocusedByScreen.set(screenKeyRef.current, itemKey);
  }, []);

  const hasPreferredFocus = useCallback((itemKey: string, isDefault: boolean) => {
    const remembered = lastFocusedByScreen.get(screenKeyRef.current);
    return remembered != null ? remembered === itemKey : isDefault;
  }, []);

  return { registerFocusable, hasPreferredFocus };
}
