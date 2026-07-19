import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { SettingsSubHeader } from '@/components/settings/SettingsSubHeader';
import { settingsStyles } from '@/components/settings/settingsStyles';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useDeviceMode, DeviceModePreference } from '@/contexts/DeviceModeContext';
import { FocusablePressable } from '@/components/tv/FocusablePressable';
import { useRestoreFocus } from '@/hooks/tv/useRestoreFocus';

const MODE_OPTIONS: { name: DeviceModePreference; label: string; description: string }[] = [
  { name: 'auto', label: 'Automatic (Recommended)', description: 'Detects phone, tablet, or TV and applies the right layout' },
  { name: 'mobile', label: 'Mobile Mode', description: 'Touch-optimized layout, even on TV hardware' },
  { name: 'tv', label: 'TV Mode', description: 'D-pad navigation and 10-ft layout, even on phones/tablets' },
];

export default function DisplayModeSettingsScreen() {
  const { colors } = useAppTheme();
  const { preference, setPreference, isPhysicalTV } = useDeviceMode();
  const { hasPreferredFocus, registerFocusable } = useRestoreFocus('settings-display-mode');

  return (
    <ThemedView style={settingsStyles.container}>
      <SafeAreaView edges={['top']} style={settingsStyles.safeArea}>
        <SettingsSubHeader title="Display Mode" />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={settingsStyles.scrollContent}>
          <ThemedText style={[settingsStyles.sectionNote, { color: colors.textSecondary }]}>
            {isPhysicalTV
              ? 'This device was detected as a TV.'
              : 'This device was detected as a phone or tablet.'}
          </ThemedText>

          {MODE_OPTIONS.map((option, index) => (
            <FocusablePressable
              key={option.name}
              style={[settingsStyles.row, { borderColor: colors.backgroundSelected }]}
              onPress={() => setPreference(option.name)}
              onFocus={() => registerFocusable(option.name)}
              hasTVPreferredFocus={hasPreferredFocus(option.name, index === 0)}
              focusRingBorderRadius={8}
              focusRingScale={false}
              accessibilityRole="button"
              accessibilityState={{ selected: preference === option.name }}
              accessibilityLabel={`${option.label}. ${option.description}`}
            >
              <View>
                <ThemedText style={settingsStyles.rowLabel}>{option.label}</ThemedText>
                <ThemedText style={[settingsStyles.rowSubtext, { color: colors.textSecondary }]}>{option.description}</ThemedText>
              </View>
              {preference === option.name && (
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
