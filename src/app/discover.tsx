import { StyleSheet, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/IconSymbol';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { DiscoverRailSwitch } from '@/components/discover/DiscoverRailSwitch';
import { DiscoverGenreWall } from '@/components/discover/DiscoverGenreWall';
import { DiscoverIndexAccordion } from '@/components/discover/DiscoverIndexAccordion';

export default function DiscoverScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { discoverLayout } = useSettings();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.backRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={16}
            style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.7 : 1 }]}
          >
            <IconSymbol name="chevron.left" color={colors.text} size={24} />
          </Pressable>
        </View>

        {discoverLayout === 'genreWall' && <DiscoverGenreWall />}
        {discoverLayout === 'indexAccordion' && <DiscoverIndexAccordion />}
        {discoverLayout === 'railSwitch' && <DiscoverRailSwitch />}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  backRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backButton: {
    width: 32,
  },
});
