import { ScrollView, View, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { SettingsSubHeader } from '@/components/settings/SettingsSubHeader';
import { settingsStyles } from '@/components/settings/settingsStyles';
import { PaletteName } from '@/constants/theme';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useSettings, DiscoverLayout, EpisodeLayout } from '@/contexts/SettingsContext';
import { FocusablePressable } from '@/components/tv/FocusablePressable';
import { useRestoreFocus } from '@/hooks/tv/useRestoreFocus';

const THEME_OPTIONS: { name: PaletteName; label: string; description: string }[] = [
  { name: 'marquee', label: 'Midnight Marquee', description: 'Ink blue, amber accent' },
  { name: 'classic', label: 'Classic', description: 'Black, red accent' },
  { name: 'onyx', label: 'Onyx', description: 'Pure black and white, monochrome' },
  { name: 'azure', label: 'Azure', description: 'Deep navy, sky blue accent' },
  { name: 'violet', label: 'Violet', description: 'Deep plum, violet accent' },
  { name: 'emerald', label: 'Emerald', description: 'Deep forest, emerald accent' },
  { name: 'gold', label: 'Gold', description: 'Warm charcoal, gold accent' },
];

const DISCOVER_LAYOUT_OPTIONS: { name: DiscoverLayout; label: string; description: string }[] = [
  { name: 'railSwitch', label: 'Rail Switch', description: 'Genre chips above a poster grid' },
  { name: 'genreWall', label: 'Genre Wall', description: 'Genres as a block tile grid' },
  { name: 'indexAccordion', label: 'Index Accordion', description: 'Genre list that expands inline' },
];

const EPISODE_LAYOUT_OPTIONS: { name: EpisodeLayout; label: string; description: string }[] = [
  { name: 'verticalRail', label: 'Vertical Rail', description: 'Season pills above a full-width episode list' },
  { name: 'numberedGrid', label: 'Numbered Grid', description: 'Dense grid of episode numbers, jump anywhere fast' },
  { name: 'cardCarousel', label: 'Card Carousel', description: 'Large artwork cards you scroll horizontally' },
  { name: 'accordionStack', label: 'Accordion Stack', description: 'Seasons stack and expand in place' },
  { name: 'splitRail', label: 'Split Rail', description: 'Season sidebar and episode list side by side' },
];

export default function AppearanceSettingsScreen() {
  const { colors, themeName, setThemeName } = useAppTheme();
  const { showRating, setShowRating, discoverLayout, setDiscoverLayout, episodeLayout, setEpisodeLayout } = useSettings();
  const { hasPreferredFocus, registerFocusable } = useRestoreFocus('settings-appearance');

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
          {THEME_OPTIONS.map((option, index) => (
            <FocusablePressable
              key={option.name}
              style={[settingsStyles.row, { borderColor: colors.backgroundSelected }]}
              onPress={() => setThemeName(option.name)}
              onFocus={() => registerFocusable(`theme:${option.name}`)}
              hasTVPreferredFocus={hasPreferredFocus(`theme:${option.name}`, index === 0)}
              focusRingBorderRadius={8}
              focusRingScale={false}
              accessibilityRole="button"
              accessibilityState={{ selected: themeName === option.name }}
              accessibilityLabel={`${option.label}. ${option.description}`}
            >
              <View>
                <ThemedText style={settingsStyles.rowLabel}>{option.label}</ThemedText>
                <ThemedText style={[settingsStyles.rowSubtext, { color: colors.textSecondary }]}>{option.description}</ThemedText>
              </View>
              {themeName === option.name && (
                <ThemedText style={{ color: colors.accent, fontWeight: '700', fontSize: 16 }}>✓</ThemedText>
              )}
            </FocusablePressable>
          ))}

          <ThemedText style={[settingsStyles.sectionTitle, settingsStyles.sectionSpacing, { color: colors.accent }]}>Discover Layout</ThemedText>
          {DISCOVER_LAYOUT_OPTIONS.map((option) => (
            <FocusablePressable
              key={option.name}
              style={[settingsStyles.row, { borderColor: colors.backgroundSelected }]}
              onPress={() => setDiscoverLayout(option.name)}
              onFocus={() => registerFocusable(`discover:${option.name}`)}
              hasTVPreferredFocus={hasPreferredFocus(`discover:${option.name}`, false)}
              focusRingBorderRadius={8}
              focusRingScale={false}
              accessibilityRole="button"
              accessibilityState={{ selected: discoverLayout === option.name }}
              accessibilityLabel={`${option.label}. ${option.description}`}
            >
              <View>
                <ThemedText style={settingsStyles.rowLabel}>{option.label}</ThemedText>
                <ThemedText style={[settingsStyles.rowSubtext, { color: colors.textSecondary }]}>{option.description}</ThemedText>
              </View>
              {discoverLayout === option.name && (
                <ThemedText style={{ color: colors.accent, fontWeight: '700', fontSize: 16 }}>✓</ThemedText>
              )}
            </FocusablePressable>
          ))}

          <ThemedText style={[settingsStyles.sectionTitle, settingsStyles.sectionSpacing, { color: colors.accent }]}>Episode Layout</ThemedText>
          {EPISODE_LAYOUT_OPTIONS.map((option) => (
            <FocusablePressable
              key={option.name}
              style={[settingsStyles.row, { borderColor: colors.backgroundSelected }]}
              onPress={() => setEpisodeLayout(option.name)}
              onFocus={() => registerFocusable(`episode:${option.name}`)}
              hasTVPreferredFocus={hasPreferredFocus(`episode:${option.name}`, false)}
              focusRingBorderRadius={8}
              focusRingScale={false}
              accessibilityRole="button"
              accessibilityState={{ selected: episodeLayout === option.name }}
              accessibilityLabel={`${option.label}. ${option.description}`}
            >
              <View>
                <ThemedText style={settingsStyles.rowLabel}>{option.label}</ThemedText>
                <ThemedText style={[settingsStyles.rowSubtext, { color: colors.textSecondary }]}>{option.description}</ThemedText>
              </View>
              {episodeLayout === option.name && (
                <ThemedText style={{ color: colors.accent, fontWeight: '700', fontSize: 16 }}>✓</ThemedText>
              )}
            </FocusablePressable>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
