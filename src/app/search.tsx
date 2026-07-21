import { StyleSheet, View, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/IconSymbol';
import { Chip } from '@/components/Chip';
import { ListItem } from '@/components/ListItem';
import { useAppTheme } from '@/contexts/ThemeContext';
import { searchMovies, searchSeries, fetchCatalog, MetaItem } from '@/services/cinemeta';
import { GENRES } from '@/constants/genres';
import { FocusablePressable } from '@/components/tv/FocusablePressable';
import { useScreenInitialFocus } from '@/hooks/tv/useScreenInitialFocus';

export default function SearchScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const searchInputRef = useScreenInitialFocus<TextInput>();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  
  const [results, setResults] = useState<MetaItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [genreResults, setGenreResults] = useState<MetaItem[]>([]);
  const [genreLoading, setGenreLoading] = useState(false);

  useEffect(() => {
    if (!activeGenre) {
      setGenreResults([]);
      return;
    }
    let ignore = false;
    setGenreLoading(true);
    Promise.all([
      fetchCatalog('movie', 'top', activeGenre).catch(() => []),
      fetchCatalog('series', 'top', activeGenre).catch(() => []),
    ])
      .then(([movies, series]) => {
        if (ignore) return;
        setGenreResults([...movies, ...series]);
      })
      .finally(() => {
        if (!ignore) setGenreLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [activeGenre]);

  useEffect(() => {
    let ignore = false;

    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 2) {
        setLoading(true);
        try {
          const [movies, series] = await Promise.all([
            searchMovies(searchQuery),
            searchSeries(searchQuery)
          ]);
          
          if (!ignore) {
            setResults([...movies, ...series].slice(0, 15));
          }
        } catch (err) {
          if (!ignore) {
            console.error("Search failed", err);
          }
        } finally {
          if (!ignore) {
            setLoading(false);
          }
        }
      } else {
        setResults([]);
      }
    }, 300);

    return () => {
      ignore = true;
      clearTimeout(delayDebounceFn);
    };
  }, [searchQuery]);

  const handleNavigateToDetails = (id: string, type: string, title?: string, poster?: string, background?: string) => {
    if (id && type) {
      router.push({
        pathname: '/details',
        params: {
          id,
          type,
          ...(title ? { title } : {}),
          ...(poster ? { poster } : {}),
          ...(background ? { background } : {}),
        },
      });
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        
        <View style={styles.header}>
          <ThemedText type="title" style={styles.headerTitle}>Search</ThemedText>
        </View>

        <View style={styles.searchContainer}>
          <View style={[styles.searchInputWrapper, { backgroundColor: colors.backgroundElement }]}>
            <IconSymbol name="magnifyingglass" color={colors.textSecondary} size={20} />
            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Movies, Series, Actors..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              selectionColor={colors.accent}
            />
          </View>
          <FocusablePressable
            onPress={() => router.push('/discover')}
            hitSlop={10}
            focusRingBorderRadius={26}
            accessibilityRole="button"
            accessibilityLabel="Browse discover"
            style={({ pressed }) => [
              styles.discoverButton,
              { backgroundColor: colors.backgroundElement, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <IconSymbol name="compass" color={colors.text} size={20} />
          </FocusablePressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {searchQuery.length > 2 ? (
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Search Results</ThemedText>
              {loading ? (
                <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
              ) : results.length > 0 ? (
                results.map((item) => (
                  <ListItem
                    key={item.id}
                    title={item.name}
                    subtitle={item.releaseInfo}
                    icon="play.fill"
                    imageUrl={item.poster}
                    onPress={() => handleNavigateToDetails(item.id, item.type, item.name, item.poster, item.background)}
                  />
                ))
              ) : (
                <ThemedText style={{ color: colors.textSecondary, marginTop: 16 }}>No results found.</ThemedText>
              )}
            </View>
          ) : (
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Browse Genres</ThemedText>
              <View style={styles.chipGrid}>
                {GENRES.map((genre) => (
                  <Chip
                    key={genre}
                    label={genre}
                    isActive={activeGenre === genre}
                    onPress={() => {
                      setActiveGenre(genre === activeGenre ? null : genre);
                    }}
                  />
                ))}
              </View>

              {activeGenre && (
                genreLoading ? (
                  <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
                ) : genreResults.length > 0 ? (
                  genreResults.map((item) => (
                    <ListItem
                      key={`${item.type}:${item.id}`}
                      title={item.name}
                      subtitle={item.releaseInfo}
                      icon="play.fill"
                      imageUrl={item.poster}
                      onPress={() => handleNavigateToDetails(item.id, item.type, item.name, item.poster, item.background)}
                    />
                  ))
                ) : (
                  <ThemedText style={{ color: colors.textSecondary, marginTop: 16 }}>No results found.</ThemedText>
                )
              )}
            </View>
          )}

        </ScrollView>
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
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 24,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 26,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  discoverButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
