import { ScrollView, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { SettingsSubHeader } from '@/components/settings/SettingsSubHeader';
import { settingsStyles } from '@/components/settings/settingsStyles';
import { useAppTheme } from '@/contexts/ThemeContext';
import { usePlayerSettings, PreplayVariant } from '@/contexts/PlayerSettingsContext';

const PREPLAY_VARIANT_OPTIONS: { name: PreplayVariant; label: string; description: string }[] = [
  { name: 'fullBleed', label: 'Full-bleed backdrop', description: 'Cinematic art, title and status pinned bottom' },
  { name: 'split', label: 'Split panel', description: 'Title and progress on a gradient side panel' },
  { name: 'centered', label: 'Centered minimal', description: 'Dimmed art, centered title and loader' },
];

export default function PreplaySettingsScreen() {
  const { colors } = useAppTheme();
  const { settings: playerSettings, updateSettings: updatePlayerSettings } = usePlayerSettings();

  return (
    <ThemedView style={settingsStyles.container}>
      <SafeAreaView edges={['top']} style={settingsStyles.safeArea}>
        <SettingsSubHeader title="Pre-play screen" />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={settingsStyles.scrollContent}>
          <ThemedText style={[settingsStyles.sectionNote, { color: colors.textSecondary, marginTop: 0 }]}>
            Shown in landscape right after picking a stream, before playback starts.
          </ThemedText>

          {PREPLAY_VARIANT_OPTIONS.map((option) => (
            <Pressable
              key={option.name}
              style={[settingsStyles.row, { borderColor: colors.backgroundSelected }]}
              onPress={() => updatePlayerSettings({ preplayVariant: option.name })}
            >
              <View>
                <ThemedText style={settingsStyles.rowLabel}>{option.label}</ThemedText>
                <ThemedText style={[settingsStyles.rowSubtext, { color: colors.textSecondary }]}>{option.description}</ThemedText>
              </View>
              {playerSettings.preplayVariant === option.name && (
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
