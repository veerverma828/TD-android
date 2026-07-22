import { memo, useCallback, useRef } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { FocusablePressable } from './tv/FocusablePressable';
import { ThemedText } from './themed-text';
import { PosterCard } from './PosterCard';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useIsTV } from '@/contexts/DeviceModeContext';
import { useRestoreFocus } from '@/hooks/tv/useRestoreFocus';
import { useTVHorizontalAutoScroll } from '@/hooks/tv/useTVHorizontalAutoScroll';

const CARD_WIDTH = 132; // PosterCard width (120) + marginRight (12)

interface CarouselItem {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  progress?: number;
  rating?: string;
}

interface CarouselProps {
  title: string;
  data: CarouselItem[];
  onPressItem?: (item: CarouselItem) => void;
  onLongPressItem?: (item: CarouselItem) => void;
  onPressSeeAll?: () => void;
  getProgressColor?: (item: CarouselItem) => string | undefined;
  // When provided, remembers the last-focused item in this row (keyed by
  // screen + row title + item id) and restores focus to it when the screen
  // remounts (e.g. returning via Back) instead of always resetting.
  screenKey?: string;
}

export const Carousel = memo(function Carousel({ title, data, onPressItem, onLongPressItem, onPressSeeAll, getProgressColor, screenKey }: CarouselProps) {
  const { colors } = useAppTheme();
  const isTV = useIsTV();
  const listRef = useRef<FlatList<CarouselItem>>(null);
  const leftInset = isTV ? 32 : 16;
  const { hasPreferredFocus, registerFocusable } = useRestoreFocus(screenKey ?? '__carousel_unscoped__');
  const { scrollToIndex } = useTVHorizontalAutoScroll(listRef);

  // Stable renderItem reference - without useCallback, every Carousel
  // re-render (e.g. theme change) hands FlatList a new function identity,
  // which forces it to re-render every visible cell even when `data` itself
  // is unchanged.
  const renderItem = useCallback(
    ({ item, index }: { item: CarouselItem; index: number }) => {
      const restoreKey = `${title}:${item.id}`;
      return (
        <PosterCard
          title={item.title}
          subtitle={item.subtitle}
          imageUrl={item.imageUrl}
          progress={item.progress}
          progressColor={getProgressColor?.(item)}
          rating={item.rating}
          onPress={() => onPressItem?.(item)}
          onLongPress={() => onLongPressItem?.(item)}
          hasTVPreferredFocus={screenKey ? hasPreferredFocus(restoreKey, false) : undefined}
          onFocus={isTV ? () => {
            scrollToIndex(index);
            if (screenKey) registerFocusable(restoreKey);
          } : undefined}
        />
      );
    },
    [title, getProgressColor, onPressItem, onLongPressItem, screenKey, hasPreferredFocus, isTV, registerFocusable, scrollToIndex]
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingLeft: leftInset }]}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        {onPressSeeAll && (
          <FocusablePressable onPress={onPressSeeAll} hitSlop={12} focusRingBorderRadius={4} accessibilityRole="button" accessibilityLabel="See All">
            <ThemedText type="small" style={[styles.seeAll, { color: colors.accent }]}>
              See All
            </ThemedText>
          </FocusablePressable>
        )}
      </View>
      <FlatList
        ref={listRef}
        data={data}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingLeft: leftInset }]}
        keyExtractor={(item) => item.id}
        nestedScrollEnabled
        decelerationRate={0.99}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={!isTV}
        getItemLayout={(_, index) => ({ length: CARD_WIDTH, offset: leftInset + CARD_WIDTH * index, index })}
        renderItem={renderItem}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  seeAll: {
    fontWeight: '500',
  },
  listContent: {
    paddingLeft: 16,
    paddingRight: 4, // PosterCard already has 12px marginRight
    paddingVertical: 6,
  },
});
