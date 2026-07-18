import { StyleSheet, View, TextInput, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/IconSymbol';
import { PosterCard } from '@/components/PosterCard';
import { PosterActionsSheet } from '@/components/PosterActionsSheet';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useMyList } from '@/contexts/MyListContext';
import { useSettings } from '@/contexts/SettingsContext';
import { padToColumns } from '@/utils/gridHelpers';
import { MetaItem } from '@/services/cinemeta';

export default function LibraryScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { list, loaded, toggle } = useMyList();
  const { showRating } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<MetaItem | null>(null);

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) => item.name.toLowerCase().includes(q));
  }, [list, searchQuery]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={[styles.header, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
          <ThemedText type="title" style={styles.headerTitle}>Library</ThemedText>
          <Pressable onPress={() => router.push('/calendar')} hitSlop={12} accessibilityRole="button" accessibilityLabel="Calendar">
            <IconSymbol name="calendar" color={colors.text} size={24} />
          </Pressable>
        </View>

        <View style={styles.searchContainer}>
          <View style={[styles.searchInputWrapper, { backgroundColor: colors.backgroundElement }]}>
            <IconSymbol name="magnifyingglass" color={colors.textSecondary} size={20} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search your library..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              selectionColor={colors.accent}
            />
          </View>
        </View>

        {!loaded ? null : filteredList.length === 0 ? (
          <View style={styles.centerContainer}>
            <IconSymbol name="bookmark.fill" color={colors.textSecondary} size={40} />
            <ThemedText style={{ color: colors.textSecondary, marginTop: 12 }}>
              {list.length === 0 ? 'Your list is empty. Add titles from any details page.' : 'No matches found.'}
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={padToColumns(filteredList, 3)}
            keyExtractor={(item, index) => (item ? `${item.type}:${item.id}` : `filler-${index}`)}
            numColumns={3}
            contentContainerStyle={styles.listContent}
            columnWrapperStyle={styles.columnWrapper}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) =>
              item ? (
                <PosterCard
                  title={item.name}
                  subtitle={item.releaseInfo}
                  imageUrl={item.poster || ''}
                  rating={showRating ? item.imdbRating : undefined}
                  onPress={() => router.push({ pathname: '/details', params: { id: item.id, type: item.type } })}
                  onLongPress={() => setSelectedItem(item)}
                  style={styles.posterCard}
                />
              ) : (
                <View style={styles.posterCard} />
              )
            }
          />
        )}
      </SafeAreaView>

      <PosterActionsSheet
        visible={!!selectedItem}
        title={selectedItem?.name}
        onClose={() => setSelectedItem(null)}
        actions={
          selectedItem
            ? [
                {
                  label: 'View Details',
                  icon: 'info.circle',
                  onPress: () =>
                    router.push({ pathname: '/details', params: { id: selectedItem.id, type: selectedItem.type } }),
                },
                {
                  label: 'Remove from Library',
                  icon: 'trash.fill',
                  destructive: true,
                  onPress: () => toggle(selectedItem),
                },
              ]
            : []
        }
      />
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
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
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
    width: '31%',
    marginRight: 0,
  },
});
