import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Switch } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { SettingsSubHeader } from '@/components/settings/SettingsSubHeader';
import { ChipPicker } from '@/components/settings/ChipPicker';
import { settingsStyles } from '@/components/settings/settingsStyles';
import { useAppTheme } from '@/contexts/ThemeContext';
import { usePlayerSettings, ResizeModePref, BufferPreference, DefaultOrientation } from '@/contexts/PlayerSettingsContext';

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const RESIZE_OPTIONS: { value: ResizeModePref; label: string }[] = [
  { value: 'fit', label: 'Fit' },
  { value: 'fill', label: 'Fill' },
  { value: 'crop', label: 'Crop / Zoom' },
  { value: 'stretch', label: 'Stretch' },
];
const BUFFER_OPTIONS: { value: BufferPreference; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'high', label: 'High' },
];
const SEEK_DURATION_OPTIONS = [5, 10, 15, 30];
const AUTO_HIDE_OPTIONS = [2000, 3000, 4000, 6000];
const ORIENTATION_OPTIONS: { value: DefaultOrientation; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'landscape', label: 'Landscape' },
  { value: 'portrait', label: 'Portrait' },
];

export default function PlaybackSettingsScreen() {
  const { colors } = useAppTheme();
  const { settings: playerSettings, updateSettings: updatePlayerSettings } = usePlayerSettings();

  return (
    <ThemedView style={settingsStyles.container}>
      <SafeAreaView edges={['top']} style={settingsStyles.safeArea}>
        <SettingsSubHeader title="Playback" />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={settingsStyles.scrollContent}>

          <View style={[settingsStyles.row, settingsStyles.rowStack, { borderColor: colors.backgroundSelected }]}>
            <ThemedText style={[settingsStyles.rowLabel, { marginBottom: 10 }]}>Default Speed</ThemedText>
            <ChipPicker
              options={SPEED_OPTIONS.map((s) => ({ value: s, label: `${s}x` }))}
              value={playerSettings.defaultSpeed}
              onSelect={(v) => updatePlayerSettings({ defaultSpeed: v })}
              accent={colors.accent}
              border={colors.backgroundSelected}
              text={colors.text}
            />
          </View>

          <View style={[settingsStyles.row, settingsStyles.rowStack, { borderColor: colors.backgroundSelected }]}>
            <ThemedText style={[settingsStyles.rowLabel, { marginBottom: 10 }]}>Resize Mode</ThemedText>
            <ChipPicker
              options={RESIZE_OPTIONS}
              value={playerSettings.resizeMode}
              onSelect={(v) => updatePlayerSettings({ resizeMode: v })}
              accent={colors.accent}
              border={colors.backgroundSelected}
              text={colors.text}
            />
          </View>

          <View style={[settingsStyles.row, settingsStyles.rowStack, { borderColor: colors.backgroundSelected }]}>
            <ThemedText style={[settingsStyles.rowLabel, { marginBottom: 10 }]}>Buffering</ThemedText>
            <ChipPicker
              options={BUFFER_OPTIONS}
              value={playerSettings.bufferPreference}
              onSelect={(v) => updatePlayerSettings({ bufferPreference: v })}
              accent={colors.accent}
              border={colors.backgroundSelected}
              text={colors.text}
            />
          </View>

          <View style={[settingsStyles.row, settingsStyles.rowStack, { borderColor: colors.backgroundSelected }]}>
            <ThemedText style={[settingsStyles.rowLabel, { marginBottom: 10 }]}>Seek Duration</ThemedText>
            <ChipPicker
              options={SEEK_DURATION_OPTIONS.map((s) => ({ value: s, label: `${s}s` }))}
              value={playerSettings.seekDurationSeconds}
              onSelect={(v) => updatePlayerSettings({ seekDurationSeconds: v })}
              accent={colors.accent}
              border={colors.backgroundSelected}
              text={colors.text}
            />
          </View>

          <View style={[settingsStyles.row, settingsStyles.rowStack, { borderColor: colors.backgroundSelected }]}>
            <ThemedText style={[settingsStyles.rowLabel, { marginBottom: 10 }]}>Auto-Hide Controls</ThemedText>
            <ChipPicker
              options={AUTO_HIDE_OPTIONS.map((ms) => ({ value: ms, label: `${ms / 1000}s` }))}
              value={playerSettings.autoHideMs}
              onSelect={(v) => updatePlayerSettings({ autoHideMs: v })}
              accent={colors.accent}
              border={colors.backgroundSelected}
              text={colors.text}
            />
          </View>

          <View style={[settingsStyles.row, settingsStyles.rowStack, { borderColor: colors.backgroundSelected }]}>
            <ThemedText style={[settingsStyles.rowLabel, { marginBottom: 10 }]}>Default Orientation</ThemedText>
            <ChipPicker
              options={ORIENTATION_OPTIONS}
              value={playerSettings.defaultOrientation}
              onSelect={(v) => updatePlayerSettings({ defaultOrientation: v })}
              accent={colors.accent}
              border={colors.backgroundSelected}
              text={colors.text}
            />
          </View>

          <View style={[settingsStyles.row, { borderColor: colors.backgroundSelected }]}>
            <ThemedText style={settingsStyles.rowLabel}>Auto Picture-in-Picture</ThemedText>
            <Switch
              value={playerSettings.autoPiP}
              onValueChange={(v) => updatePlayerSettings({ autoPiP: v })}
              trackColor={{ false: colors.backgroundSelected, true: colors.accent }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={[settingsStyles.row, { borderColor: colors.backgroundSelected }]}>
            <ThemedText style={settingsStyles.rowLabel}>Keep Screen Awake</ThemedText>
            <Switch
              value={playerSettings.keepScreenAwake}
              onValueChange={(v) => updatePlayerSettings({ keepScreenAwake: v })}
              trackColor={{ false: colors.backgroundSelected, true: colors.accent }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
