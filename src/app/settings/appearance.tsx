import { ScrollView, View, Pressable, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { SettingsSubHeader } from '@/components/settings/SettingsSubHeader';
import { settingsStyles } from '@/components/settings/settingsStyles';
import { PaletteName } from '@/constants/theme';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useSettings, DiscoverLayout } from '@/contexts/SettingsContext';

const THEME_OPTIONS: { name: PaletteName; label: string; description: string }[] = [
  { name: 'marquee', label: 'Midnight Marquee', description: 'Ink blue, amber accent' },
  { name: 'classic', label: 'Classic', description: 'Black, red accent' },
];

const DISCOVER_LAYOUT_OPTIONS: { name: DiscoverLayout; label: string; description: string }[] = [
  { name: 'railSwitch', label: 'Rail Switch', description: 'Genre chips above a poster grid' },
  { name: 'genreWall', label: 'Genre Wall', description: 'Genres as a block tile grid' },
  { name: 'indexAccordion', label: 'Index Accordion', description: 'Genre list that expands inline' },
];

export default function AppearanceSettingsScreen() {
  const { colors, themeName, setThemeName } = useAppTheme();
  const { showRating, setShowRating, discoverLayout, setDiscoverLayout } = useSettings();

  return (
    <ThemedView style={settingsStyles.container}>
      <SafeAreaView edges={['top']} style={settingsStyles.safeArea}>
        <SettingsSubHeader title="Appearance" />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={settingsStyles.scrollContent}>

          <View style={[settingsStyles.row, { borderColor: colors.backgroundSelected }]}>
            <ThemedText style={settingsStyles.rowLabel}>Show IMDb Rating</ThemedText>
            <Switch
              value={showRating}
              onValueChange={setShowRating}
              trackColor={{ false: colors.backgroundSelected, true: colors.accent }}
              thumbColor="#ffffff"
            />
          </View>

          <ThemedText style={[settingsStyles.sectionTitle, settingsStyles.sectionSpacing, { color: colors.accent }]}>Theme</ThemedText>
          {THEME_OPTIONS.map((option) => (
            <Pressable
              key={option.name}
              style={[settingsStyles.row, { borderColor: colors.backgroundSelected }]}
              onPress={() => setThemeName(option.name)}
            >
              <View>
                <ThemedText style={settingsStyles.rowLabel}>{option.label}</ThemedText>
                <ThemedText style={[settingsStyles.rowSubtext, { color: colors.textSecondary }]}>{option.description}</ThemedText>
              </View>
              {themeName === option.name && (
                <ThemedText style={{ color: colors.accent, fontWeight: '700', fontSize: 16 }}>✓</ThemedText>
              )}
            </Pressable>
          ))}

          <ThemedText style={[settingsStyles.sectionTitle, settingsStyles.sectionSpacing, { color: colors.accent }]}>Discover Layout</ThemedText>
          {DISCOVER_LAYOUT_OPTIONS.map((option) => (
            <Pressable
              key={option.name}
              style={[settingsStyles.row, { borderColor: colors.backgroundSelected }]}
              onPress={() => setDiscoverLayout(option.name)}
            >
              <View>
                <ThemedText style={settingsStyles.rowLabel}>{option.label}</ThemedText>
                <ThemedText style={[settingsStyles.rowSubtext, { color: colors.textSecondary }]}>{option.description}</ThemedText>
              </View>
              {discoverLayout === option.name && (
                <ThemedText style={{ color: colors.accent, fontWeight: '700', fontSize: 16 }}>✓</ThemedText>
              )}
            </Pressable>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
