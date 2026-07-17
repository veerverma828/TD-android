import { Modal, StyleSheet, View, Pressable, ScrollView, Switch, useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/IconSymbol';
import { useAppTheme } from '@/contexts/ThemeContext';
import type { PlayerSettings, ResizeModePref, BufferPreference, DefaultOrientation } from '@/contexts/PlayerSettingsContext';
import { FocusablePressable } from '@/components/tv/FocusablePressable';
import { useTVBackHandler } from '@/hooks/tv/useTVBackHandler';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const RESIZE_MODES: { value: ResizeModePref; label: string }[] = [
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

interface SettingsSheetProps {
  visible: boolean;
  onClose: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  settings: PlayerSettings;
  updateSettings: (patch: Partial<PlayerSettings>) => void;
}

export function SettingsSheet({
  visible,
  onClose,
  speed,
  onSpeedChange,
  settings,
  updateSettings,
}: SettingsSheetProps) {
  const scheme = useColorScheme();
  const { colors } = useAppTheme();

  useTVBackHandler(() => {
    if (!visible) return false;
    onClose();
  }, visible);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <BlurView intensity={40} tint={scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        </Pressable>

        <SafeAreaView edges={['bottom']} style={styles.safeArea}>
          <View style={[styles.card, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
              <ThemedText style={styles.title}>Playback Settings</ThemedText>
              <FocusablePressable onPress={onClose} focusRingBorderRadius={16} accessibilityRole="button" accessibilityLabel="Close">
                <IconSymbol name="xmark.circle.fill" size={26} color={colors.textSecondary} />
              </FocusablePressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary }]}>Speed</ThemedText>
              <View style={styles.chipRow}>
                {SPEEDS.map((s) => (
                  <FocusablePressable
                    key={s}
                    onPress={() => onSpeedChange(s)}
                    focusRingBorderRadius={16}
                    accessibilityRole="button"
                    accessibilityState={{ selected: speed === s }}
                    accessibilityLabel={`${s}x speed`}
                    style={[
                      styles.chip,
                      { borderColor: colors.backgroundSelected },
                      speed === s && { backgroundColor: colors.accent, borderColor: colors.accent },
                    ]}
                  >
                    <ThemedText style={{ color: speed === s ? colors.textOnAccent : colors.text, fontSize: 13, fontWeight: '600' }}>
                      {s}x
                    </ThemedText>
                  </FocusablePressable>
                ))}
              </View>

              <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 18 }]}>
                Resize Mode
              </ThemedText>
              <View style={styles.chipRow}>
                {RESIZE_MODES.map((mode) => (
                  <FocusablePressable
                    key={mode.value}
                    onPress={() => updateSettings({ resizeMode: mode.value })}
                    focusRingBorderRadius={16}
                    accessibilityRole="button"
                    accessibilityState={{ selected: settings.resizeMode === mode.value }}
                    accessibilityLabel={mode.label}
                    style={[
                      styles.chip,
                      { borderColor: colors.backgroundSelected },
                      settings.resizeMode === mode.value && { backgroundColor: colors.accent, borderColor: colors.accent },
                    ]}
                  >
                    <ThemedText
                      style={{ color: settings.resizeMode === mode.value ? colors.textOnAccent : colors.text, fontSize: 13, fontWeight: '600' }}
                    >
                      {mode.label}
                    </ThemedText>
                  </FocusablePressable>
                ))}
              </View>

              <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 18 }]}>
                Buffering
              </ThemedText>
              <View style={styles.chipRow}>
                {BUFFER_OPTIONS.map((option) => (
                  <FocusablePressable
                    key={option.value}
                    onPress={() => updateSettings({ bufferPreference: option.value })}
                    focusRingBorderRadius={16}
                    accessibilityRole="button"
                    accessibilityState={{ selected: settings.bufferPreference === option.value }}
                    accessibilityLabel={option.label}
                    style={[
                      styles.chip,
                      { borderColor: colors.backgroundSelected },
                      settings.bufferPreference === option.value && { backgroundColor: colors.accent, borderColor: colors.accent },
                    ]}
                  >
                    <ThemedText
                      style={{ color: settings.bufferPreference === option.value ? colors.textOnAccent : colors.text, fontSize: 13, fontWeight: '600' }}
                    >
                      {option.label}
                    </ThemedText>
                  </FocusablePressable>
                ))}
              </View>

              <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 18 }]}>
                Seek Duration
              </ThemedText>
              <View style={styles.chipRow}>
                {SEEK_DURATION_OPTIONS.map((s) => (
                  <FocusablePressable
                    key={s}
                    onPress={() => updateSettings({ seekDurationSeconds: s })}
                    focusRingBorderRadius={16}
                    accessibilityRole="button"
                    accessibilityState={{ selected: settings.seekDurationSeconds === s }}
                    accessibilityLabel={`${s} seconds`}
                    style={[
                      styles.chip,
                      { borderColor: colors.backgroundSelected },
                      settings.seekDurationSeconds === s && { backgroundColor: colors.accent, borderColor: colors.accent },
                    ]}
                  >
                    <ThemedText
                      style={{ color: settings.seekDurationSeconds === s ? colors.textOnAccent : colors.text, fontSize: 13, fontWeight: '600' }}
                    >
                      {s}s
                    </ThemedText>
                  </FocusablePressable>
                ))}
              </View>

              <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 18 }]}>
                Auto-Hide Controls
              </ThemedText>
              <View style={styles.chipRow}>
                {AUTO_HIDE_OPTIONS.map((ms) => (
                  <FocusablePressable
                    key={ms}
                    onPress={() => updateSettings({ autoHideMs: ms })}
                    focusRingBorderRadius={16}
                    accessibilityRole="button"
                    accessibilityState={{ selected: settings.autoHideMs === ms }}
                    accessibilityLabel={`${ms / 1000} seconds`}
                    style={[
                      styles.chip,
                      { borderColor: colors.backgroundSelected },
                      settings.autoHideMs === ms && { backgroundColor: colors.accent, borderColor: colors.accent },
                    ]}
                  >
                    <ThemedText
                      style={{ color: settings.autoHideMs === ms ? colors.textOnAccent : colors.text, fontSize: 13, fontWeight: '600' }}
                    >
                      {ms / 1000}s
                    </ThemedText>
                  </FocusablePressable>
                ))}
              </View>

              <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 18 }]}>
                Default Orientation
              </ThemedText>
              <View style={styles.chipRow}>
                {ORIENTATION_OPTIONS.map((option) => (
                  <FocusablePressable
                    key={option.value}
                    onPress={() => updateSettings({ defaultOrientation: option.value })}
                    focusRingBorderRadius={16}
                    accessibilityRole="button"
                    accessibilityState={{ selected: settings.defaultOrientation === option.value }}
                    accessibilityLabel={option.label}
                    style={[
                      styles.chip,
                      { borderColor: colors.backgroundSelected },
                      settings.defaultOrientation === option.value && { backgroundColor: colors.accent, borderColor: colors.accent },
                    ]}
                  >
                    <ThemedText
                      style={{ color: settings.defaultOrientation === option.value ? colors.textOnAccent : colors.text, fontSize: 13, fontWeight: '600' }}
                    >
                      {option.label}
                    </ThemedText>
                  </FocusablePressable>
                ))}
              </View>

              <View style={[styles.switchRow, { borderColor: colors.backgroundSelected }]}>
                <ThemedText style={styles.switchLabel}>Auto Picture-in-Picture</ThemedText>
                <Switch
                  value={settings.autoPiP}
                  onValueChange={(v) => updateSettings({ autoPiP: v })}
                  trackColor={{ false: colors.backgroundSelected, true: colors.accent }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={[styles.switchRow, { borderColor: colors.backgroundSelected }]}>
                <ThemedText style={styles.switchLabel}>Keep Screen Awake</ThemedText>
                <Switch
                  value={settings.keepScreenAwake}
                  onValueChange={(v) => updateSettings({ keepScreenAwake: v })}
                  trackColor={{ false: colors.backgroundSelected, true: colors.accent }}
                  thumbColor="#ffffff"
                />
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    width: '100%',
    justifyContent: 'flex-end',
    flex: 1,
    maxHeight: '85%',
  },
  card: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    flexShrink: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 18,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
