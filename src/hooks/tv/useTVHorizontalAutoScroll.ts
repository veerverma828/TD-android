import { useCallback } from 'react';
import { FlatList } from 'react-native';

// Centers the focused item in a horizontal FlatList when D-pad focus moves to
// it. Counterpart to TVScrollContext's useTVAutoScroll, which only handles
// vertical ScrollViews — FlatList.scrollToIndex needs its own list ref instead
// of a measure()-based approach since horizontal rows are virtualized.
export function useTVHorizontalAutoScroll<T>(listRef: React.RefObject<FlatList<T> | null>) {
  const scrollToIndex = useCallback(
    (index: number) => {
      listRef.current?.scrollToIndex({ index, viewPosition: 0.5, animated: true });
    },
    [listRef]
  );

  return { scrollToIndex };
}
