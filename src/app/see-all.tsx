import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/IconSymbol';
import { PosterCard } from '@/components/PosterCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAppTheme } from '@/contexts/ThemeContext';
import { fetchCatalog, MetaItem } from '@/services/cinemeta';
import { useSettings } from '@/contexts/SettingsContext';
import { padToColumns } from '@/utils/gridHelpers';
import { useScreenBackHandler } from '@/hooks/tv/useTVBackHandler';
import { useIsTV } from '@/contexts/DeviceModeContext';
import { useRestoreFocus } from '@/hooks/tv/useRestoreFocus';
import { FocusablePressable } from '@/components/tv/FocusablePressable';

export default function SeeAllScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { showRating } = useSettings();
  const isTV = useIsTV();

  useScreenBackHandler(() => {
    router.back();
  });

  const { type, category, title, genre } = useLocalSearchParams<{ type: string; category: string; title: string; genre?: string }>();
  const { hasPreferredFocus, registerFocusable } = useRestoreFocus(`see-all-${type}-${category}-${genre ?? ''}`);

  const [items, setItems] = useState<MetaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!type || !category) return;
      try {
        const data = await fetchCatalog(type, category, genre);
        setItems(data);
        const visibleUrls = data.slice(0, 12).map((item) => item.poster).filter(Boolean) as string[];
        if (visibleUrls.length) Image.prefetch(visibleUrls, 'memory-disk');
      } catch (err) {
        console.error("Failed to fetch catalog:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [type, category, genre]);

  const handleNavigateToDetails = (id: string, itemType: string) => {
    router.push({ pathname: '/details', params: { id, type: itemType } });
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <FocusablePressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              { opacity: pressed ? 0.7 : 1 }
            ]}
            hitSlop={16}
            focusRingBorderRadius={16}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <IconSymbol name="chevron.left" color={colors.text} size={24} />
          </FocusablePressable>
          <ThemedText type="title" style={styles.headerTitle}>{title || 'All Items'}</ThemedText>
          <View style={{ width: 24 }} />
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.centerContainer}>
            <ThemedText style={{ color: colors.textSecondary }}>No items found.</ThemedText>
          </View>
        ) : (
          <FlatList
            data={padToColumns(items, 3)}
            keyExtractor={(item, index) => item?.id ?? `filler-${index}`}
            numColumns={3}
            contentContainerStyle={[styles.listContent, isTV && { paddingLeft: 32 }]}
            columnWrapperStyle={styles.columnWrapper}
            showsVerticalScrollIndicator={false}
            initialNumToRender={12}
            maxToRenderPerBatch={9}
            updateCellsBatchingPeriod={50}
            windowSize={7}
            removeClippedSubviews={!isTV}
            renderItem={({ item, index }) => {
              if (!item) return <View style={styles.posterCard} />;
              const restoreKey = `${item.type}:${item.id}`;
              return (
                <PosterCard
                  title={item.name}
                  subtitle={item.releaseInfo}
                  imageUrl={item.poster || ''}
                  rating={showRating ? item.imdbRating : undefined}
                  onPress={() => handleNavigateToDetails(item.id, item.type)}
                  style={styles.posterCard}
                  hasTVPreferredFocus={hasPreferredFocus(restoreKey, index === 0)}
                  onFocus={() => registerFocusable(restoreKey)}
                />
              );
            }}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  posterCard: {
    width: '31%', // roughly 1/3 with space between
    marginRight: 0, // Override Carousel margin
  },
});
