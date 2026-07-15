import { FlatList, StyleSheet, View, Pressable } from 'react-native';
import { ThemedText } from './themed-text';
import { PosterCard } from './PosterCard';
import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';

interface CarouselItem {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  progress?: number;
}

interface CarouselProps {
  title: string;
  data: CarouselItem[];
  onPressItem?: (item: CarouselItem) => void;
  onPressSeeAll?: () => void;
}

export function Carousel({ title, data, onPressItem, onPressSeeAll }: CarouselProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

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
        renderItem={({ item }) => (
          <PosterCard
            title={item.title}
            subtitle={item.subtitle}
            imageUrl={item.imageUrl}
            progress={item.progress}
            onPress={() => onPressItem?.(item)}
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
