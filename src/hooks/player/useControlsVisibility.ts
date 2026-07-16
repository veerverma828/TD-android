import { useCallback, useEffect, useRef, useState } from 'react';

export function useControlsVisibility(autoHideMs: number, locked: boolean) {
  const [visible, setVisible] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const show = useCallback(() => {
    setVisible(true);
    clear();
    if (!locked) {
      timeoutRef.current = setTimeout(() => setVisible(false), autoHideMs);
    }
  }, [autoHideMs, clear, locked]);

  const hide = useCallback(() => {
    clear();
    setVisible(false);
  }, [clear]);

  const toggle = useCallback(() => {
    if (visible) hide();
    else show();
  }, [visible, hide, show]);

  useEffect(() => {
    show();
    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (locked) clear();
  }, [locked, clear]);

  return { visible, show, hide, toggle };
}
