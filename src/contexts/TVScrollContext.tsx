import { createContext, useCallback, useContext, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, View } from 'react-native';

interface TVScrollContextValue {
  requestScrollIntoView: (node: View | null) => void;
}

export const TVScrollContext = createContext<TVScrollContextValue | null>(null);

export function useTVScroll() {
  return useContext(TVScrollContext);
}

interface MeasurableNode {
  measure: (cb: (x: number, y: number, w: number, h: number, pageX: number, pageY: number) => void) => void;
}

interface UseTVAutoScrollOptions {
  topMargin?: number;
  bottomMargin?: number;
  debounceMs?: number;
}

// Debounced so rapid D-pad repeats don't stack overlapping native measure()
// round-trips and scrollTo animations — only the last-focused item, once
// focus settles, triggers a single scroll.
export function useTVAutoScroll(
  scrollRef: React.RefObject<ScrollView | null>,
  options?: UseTVAutoScrollOptions
) {
  const scrollYRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingNodeRef = useRef<View | null>(null);
  const topMargin = options?.topMargin ?? 32;
  const bottomMargin = options?.bottomMargin ?? 32;
  const debounceMs = options?.debounceMs ?? 100;

  const performScroll = (node: View) => {
    const scrollNode = scrollRef.current as unknown as MeasurableNode | null;
    const measurableNode = node as unknown as MeasurableNode;
    if (!scrollNode || typeof measurableNode.measure !== 'function') return;

    measurableNode.measure((_x, _y, _w, itemHeight, itemPageX, itemPageY) => {
      if (itemPageX === undefined || pendingNodeRef.current !== node) return;
      scrollNode.measure((_sx, _sy, _sw, viewportHeight, _spx, scrollPageY) => {
        if (pendingNodeRef.current !== node) return;
        const relativeTop = itemPageY - scrollPageY;
        const relativeBottom = relativeTop + itemHeight;

        let delta = 0;
        if (relativeTop < topMargin) {
          delta = relativeTop - topMargin;
        } else if (relativeBottom > viewportHeight - bottomMargin) {
          delta = relativeBottom - (viewportHeight - bottomMargin);
        }
        if (delta !== 0) {
          (scrollRef.current as unknown as ScrollView | null)?.scrollTo({
            y: Math.max(0, scrollYRef.current + delta),
            animated: true,
          });
        }
      });
    });
  };

  const requestScrollIntoView = useCallback((node: View | null) => {
    if (!node) return;
    pendingNodeRef.current = node;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => performScroll(node), debounceMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounceMs]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollYRef.current = e.nativeEvent.contentOffset.y;
  }, []);

  return { requestScrollIntoView, onScroll };
}
