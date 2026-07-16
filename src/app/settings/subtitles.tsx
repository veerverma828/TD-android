import { ScrollView, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { SettingsSubHeader } from '@/components/settings/SettingsSubHeader';
import { ChipPicker } from '@/components/settings/ChipPicker';
import { settingsStyles } from '@/components/settings/settingsStyles';
import { useAppTheme } from '@/contexts/ThemeContext';
import { usePlayerSettings } from '@/contexts/PlayerSettingsContext';

const SUBTITLE_SIZE_OPTIONS = [14, 18, 22, 26];
const SUBTITLE_COLOR_OPTIONS = ['#ffffff', '#ffe066', '#66d9ff', '#7CFC00'];
const SUBTITLE_OPACITY_OPTIONS = [0, 0.25, 0.5, 0.75];

export default function SubtitlesSettingsScreen() {
  const { colors } = useAppTheme();
  const { settings: playerSettings, updateSettings: updatePlayerSettings } = usePlayerSettings();

  return (
    <ThemedView style={settingsStyles.container}>
      <SafeAreaView edges={['top']} style={settingsStyles.safeArea}>
        <SettingsSubHeader title="Subtitles" />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={settingsStyles.scrollContent}>
          <ThemedText style={[settingsStyles.sectionNote, { color: colors.textSecondary, marginTop: 0 }]}>
            Applies to externally loaded subtitle files. Embedded subtitle tracks use the device's native renderer.
          </ThemedText>

          <View style={[settingsStyles.row, settingsStyles.rowStack, { borderColor: colors.backgroundSelected }]}>
            <ThemedText style={[settingsStyles.rowLabel, { marginBottom: 10 }]}>Font Size</ThemedText>
            <ChipPicker
              options={SUBTITLE_SIZE_OPTIONS.map((s) => ({ value: s, label: String(s) }))}
              value={playerSettings.subtitleAppearance.fontSize}
              onSelect={(v) =>
                updatePlayerSettings({ subtitleAppearance: { ...playerSettings.subtitleAppearance, fontSize: v } })
              }
              accent={colors.accent}
              border={colors.backgroundSelected}
              text={colors.text}
            />
          </View>

          <View style={[settingsStyles.row, settingsStyles.rowStack, { borderColor: colors.backgroundSelected }]}>
            <ThemedText style={[settingsStyles.rowLabel, { marginBottom: 10 }]}>Text Color</ThemedText>
            <View style={settingsStyles.chipRow}>
              {SUBTITLE_COLOR_OPTIONS.map((color) => {
                const active = playerSettings.subtitleAppearance.color === color;
                return (
                  <Pressable
                    key={color}
                    onPress={() =>
                      updatePlayerSettings({ subtitleAppearance: { ...playerSettings.subtitleAppearance, color } })
                    }
                    style={[
                      settingsStyles.colorSwatch,
                      { backgroundColor: color, borderColor: active ? colors.accent : colors.backgroundSelected },
                    ]}
                  />
                );
              })}
            </View>
          </View>

          <View style={[settingsStyles.row, settingsStyles.rowStack, { borderColor: colors.backgroundSelected }]}>
            <ThemedText style={[settingsStyles.rowLabel, { marginBottom: 10 }]}>Background Opacity</ThemedText>
            <ChipPicker
              options={SUBTITLE_OPACITY_OPTIONS.map((o) => ({ value: o, label: `${Math.round(o * 100)}%` }))}
              value={playerSettings.subtitleAppearance.backgroundOpacity}
              onSelect={(v) =>
                updatePlayerSettings({
                  subtitleAppearance: { ...playerSettings.subtitleAppearance, backgroundOpacity: v },
                })
              }
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
