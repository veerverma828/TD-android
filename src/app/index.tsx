import { StyleSheet, ScrollView, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { HeroBanner } from '@/components/HeroBanner';
import { Carousel } from '@/components/Carousel';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { fetchDefaultMovies, fetchDefaultSeries, MetaItem } from '@/services/cinemeta';

export default function HomeScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const router = useRouter();

  const [movies, setMovies] = useState<MetaItem[]>([]);
  const [series, setSeries] = useState<MetaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [fetchedMovies, fetchedSeries] = await Promise.all([
          fetchDefaultMovies(),
          fetchDefaultSeries()
        ]);
        setMovies(fetchedMovies);
        setSeries(fetchedSeries);
      } catch (err) {
        console.error("Failed to fetch cinemeta:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleNavigateToDetails = (id: string, type: string) => {
    router.push({ pathname: '/details', params: { id, type } });
  };

  const mapToCarousel = (items: MetaItem[]) => {
    return items.map(item => ({
      id: item.id,
      title: item.name,
      subtitle: item.releaseInfo,
      imageUrl: item.poster || '',
      type: item.type,
    }));
  };

  const heroItem = movies.length > 0 ? movies[0] : null;

  return (
    <ThemedView style={styles.container}>
      {/* Top Bar Overlay */}
      <SafeAreaView edges={['top']} style={styles.topBarContainer}>
        <View style={styles.topBar}>
          <View style={styles.logoContainer}>
              <Image 
                source={require('../../assets/images/title-logo-600.png')} 
                style={{ width: 140, height: 28 }} 
                contentFit="contain" 
              />
            </View>
        </View>
      </SafeAreaView>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        {loading ? (
          <View style={{ height: 400, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        ) : (
          <>
            {heroItem && (
              <HeroBanner
                title={heroItem.name}
                subtitle={heroItem.description?.substring(0, 80) + '...' || 'A journey beyond the edge of the known universe.'}
                imageUrl={heroItem.background || heroItem.poster || 'https://images.unsplash.com/photo-1534809027769-b00d750a6bac?auto=format&fit=crop&q=80&w=600'}
                tags={heroItem.genres?.slice(0, 3) || ['Movie']}
                onPlayPress={() => handleNavigateToDetails(heroItem.id, heroItem.type)}
              />
            )}

            <Carousel
              title="Top Movies"
              data={mapToCarousel(movies)}
              onPressItem={(item) => handleNavigateToDetails(item.id, (item as any).type)}
              onPressSeeAll={() => router.push({ pathname: '/see-all', params: { type: 'movie', category: 'top', title: 'Top Movies' } })}
            />

            <Carousel
              title="Top Series"
              data={mapToCarousel(series)}
              onPressItem={(item) => handleNavigateToDetails(item.id, (item as any).type)}
              onPressSeeAll={() => router.push({ pathname: '/see-all', params: { type: 'series', category: 'top', title: 'Top Series' } })}
            />
          </>
        )}
        
        {/* Bottom padding for tab bar */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 20,
  },
});
