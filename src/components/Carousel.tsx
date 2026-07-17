import { useRef } from 'react';
import { FlatList, StyleSheet, View, Pressable } from 'react-native';
import { ThemedText } from './themed-text';
import { PosterCard } from './PosterCard';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useIsTV } from '@/contexts/DeviceModeContext';

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
}

export function Carousel({ title, data, onPressItem, onLongPressItem, onPressSeeAll, getProgressColor }: CarouselProps) {
  const { colors } = useAppTheme();
  const isTV = useIsTV();
  const listRef = useRef<FlatList<CarouselItem>>(null);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        {onPressSeeAll && (
          <Pressable onPress={onPressSeeAll} hitSlop={12}>
            <ThemedText type="small" style={[styles.seeAll, { color: colors.accent }]}>
              See All
            </ThemedText>
          </Pressable>
        )}
      </View>
      <FlatList
        ref={listRef}
        data={data}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item) => item.id}
        nestedScrollEnabled
        decelerationRate={0.99}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews
        getItemLayout={(_, index) => ({ length: CARD_WIDTH, offset: CARD_WIDTH * index, index })}
        renderItem={({ item, index }) => (
          <PosterCard
            title={item.title}
            subtitle={item.subtitle}
            imageUrl={item.imageUrl}
            progress={item.progress}
            progressColor={getProgressColor?.(item)}
            rating={item.rating}
            onPress={() => onPressItem?.(item)}
            onLongPress={() => onLongPressItem?.(item)}
            onFocus={isTV ? () => listRef.current?.scrollToIndex({ index, viewPosition: 0.5, animated: true }) : undefined}
          />
        )}
      />
    </View>
  );
}

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
  },
});
