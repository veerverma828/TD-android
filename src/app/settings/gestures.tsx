import { ScrollView, View, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { SettingsSubHeader } from '@/components/settings/SettingsSubHeader';
import { ChipPicker } from '@/components/settings/ChipPicker';
import { settingsStyles } from '@/components/settings/settingsStyles';
import { useAppTheme } from '@/contexts/ThemeContext';
import { usePlayerSettings } from '@/contexts/PlayerSettingsContext';

const SENSITIVITY_OPTIONS = [
  { value: 0.5, label: 'Low' },
  { value: 1, label: 'Normal' },
  { value: 1.5, label: 'High' },
];

export default function GesturesSettingsScreen() {
  const { colors } = useAppTheme();
  const { settings: playerSettings, updateSettings: updatePlayerSettings } = usePlayerSettings();

  return (
    <ThemedView style={settingsStyles.container}>
      <SafeAreaView edges={['top']} style={settingsStyles.safeArea}>
        <SettingsSubHeader title="Gestures" />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={settingsStyles.scrollContent}>

          <View style={[settingsStyles.row, { borderColor: colors.backgroundSelected }]}>
            <ThemedText style={settingsStyles.rowLabel}>Enable Gestures</ThemedText>
            <Switch
              value={playerSettings.gesturesEnabled}
              onValueChange={(v) => updatePlayerSettings({ gesturesEnabled: v })}
              trackColor={{ false: colors.backgroundSelected, true: colors.accent }}
              thumbColor="#ffffff"
            />
          </View>
          <View style={[settingsStyles.row, { borderColor: colors.backgroundSelected }]}>
            <ThemedText style={settingsStyles.rowLabel}>Brightness Swipe</ThemedText>
            <Switch
              value={playerSettings.brightnessGestureEnabled}
              onValueChange={(v) => updatePlayerSettings({ brightnessGestureEnabled: v })}
              trackColor={{ false: colors.backgroundSelected, true: colors.accent }}
              thumbColor="#ffffff"
            />
          </View>
          <View style={[settingsStyles.row, { borderColor: colors.backgroundSelected }]}>
            <ThemedText style={settingsStyles.rowLabel}>Volume Swipe</ThemedText>
            <Switch
              value={playerSettings.volumeGestureEnabled}
              onValueChange={(v) => updatePlayerSettings({ volumeGestureEnabled: v })}
              trackColor={{ false: colors.backgroundSelected, true: colors.accent }}
              thumbColor="#ffffff"
            />
          </View>
          <View style={[settingsStyles.row, { borderColor: colors.backgroundSelected }]}>
            <ThemedText style={settingsStyles.rowLabel}>Swipe to Seek</ThemedText>
            <Switch
              value={playerSettings.horizontalSeekGestureEnabled}
              onValueChange={(v) => updatePlayerSettings({ horizontalSeekGestureEnabled: v })}
              trackColor={{ false: colors.backgroundSelected, true: colors.accent }}
              thumbColor="#ffffff"
            />
          </View>
          <View style={[settingsStyles.row, { borderColor: colors.backgroundSelected }]}>
            <ThemedText style={settingsStyles.rowLabel}>Double-Tap to Seek</ThemedText>
            <Switch
              value={playerSettings.doubleTapSeekEnabled}
              onValueChange={(v) => updatePlayerSettings({ doubleTapSeekEnabled: v })}
              trackColor={{ false: colors.backgroundSelected, true: colors.accent }}
              thumbColor="#ffffff"
            />
          </View>
          <View style={[settingsStyles.row, settingsStyles.rowStack, { borderColor: colors.backgroundSelected }]}>
            <ThemedText style={[settingsStyles.rowLabel, { marginBottom: 10 }]}>Gesture Sensitivity</ThemedText>
            <ChipPicker
              options={SENSITIVITY_OPTIONS}
              value={playerSettings.gestureSensitivity}
              onSelect={(v) => updatePlayerSettings({ gestureSensitivity: v })}
              accent={colors.accent}
              border={colors.backgroundSelected}
              text={colors.text}
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
