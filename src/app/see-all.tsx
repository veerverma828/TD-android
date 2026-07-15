import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/IconSymbol';
import { PosterCard } from '@/components/PosterCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { fetchCatalog, MetaItem } from '@/services/cinemeta';

export default function SeeAllScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const router = useRouter();

  const { type, category, title } = useLocalSearchParams<{ type: string; category: string; title: string }>();

  const [items, setItems] = useState<MetaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!type || !category) return;
      try {
        const data = await fetchCatalog(type, category);
        setItems(data);
      } catch (err) {
        console.error("Failed to fetch catalog:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [type, category]);

  const handleNavigateToDetails = (id: string, itemType: string) => {
    router.push({ pathname: '/details', params: { id, type: itemType } });
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              { opacity: pressed ? 0.7 : 1 }
            ]}
            hitSlop={16}
          >
            <IconSymbol name="chevron.left" color={colors.text} size={24} />
          </Pressable>
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
            data={items}
            keyExtractor={(item) => item.id}
            numColumns={3}
            contentContainerStyle={styles.listContent}
            columnWrapperStyle={styles.columnWrapper}
            showsVerticalScrollIndicator={false}
            initialNumToRender={12}
            maxToRenderPerBatch={12}
            windowSize={5}
            renderItem={({ item }) => (
              <PosterCard
                title={item.name}
                subtitle={item.releaseInfo}
                imageUrl={item.poster || ''}
                onPress={() => handleNavigateToDetails(item.id, item.type)}
                style={styles.posterCard}
              />
            )}
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
