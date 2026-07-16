import { Modal, StyleSheet, View, Pressable, useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/IconSymbol';
import { useAppTheme } from '@/contexts/ThemeContext';
import type { ResizeModePref } from '@/contexts/PlayerSettingsContext';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const RESIZE_MODES: { value: ResizeModePref; label: string }[] = [
  { value: 'fit', label: 'Fit' },
  { value: 'fill', label: 'Fill' },
  { value: 'crop', label: 'Crop / Zoom' },
  { value: 'stretch', label: 'Stretch' },
];

interface SettingsSheetProps {
  visible: boolean;
  onClose: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  resizeMode: ResizeModePref;
  onResizeModeChange: (mode: ResizeModePref) => void;
}

export function SettingsSheet({
  visible,
  onClose,
  speed,
  onSpeedChange,
  resizeMode,
  onResizeModeChange,
}: SettingsSheetProps) {
  const scheme = useColorScheme();
  const { colors } = useAppTheme();

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
              <Pressable onPress={onClose}>
                <IconSymbol name="xmark.circle.fill" size={26} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary }]}>Speed</ThemedText>
            <View style={styles.chipRow}>
              {SPEEDS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => onSpeedChange(s)}
                  style={[
                    styles.chip,
                    { borderColor: colors.backgroundSelected },
                    speed === s && { backgroundColor: colors.accent, borderColor: colors.accent },
                  ]}
                >
                  <ThemedText style={{ color: speed === s ? '#fff' : colors.text, fontSize: 13, fontWeight: '600' }}>
                    {s}x
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 18 }]}>
              Resize Mode
            </ThemedText>
            <View style={styles.chipRow}>
              {RESIZE_MODES.map((mode) => (
                <Pressable
                  key={mode.value}
                  onPress={() => onResizeModeChange(mode.value)}
                  style={[
                    styles.chip,
                    { borderColor: colors.backgroundSelected },
                    resizeMode === mode.value && { backgroundColor: colors.accent, borderColor: colors.accent },
                  ]}
                >
                  <ThemedText
                    style={{ color: resizeMode === mode.value ? '#fff' : colors.text, fontSize: 13, fontWeight: '600' }}
                  >
                    {mode.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
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
  },
  card: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
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
});
