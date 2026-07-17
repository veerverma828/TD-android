import { Modal, StyleSheet, View, Pressable, useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/IconSymbol';
import { useAppTheme } from '@/contexts/ThemeContext';
import type { SubtitleAppearance } from '@/contexts/PlayerSettingsContext';
import { FocusablePressable } from '@/components/tv/FocusablePressable';
import { useTVBackHandler } from '@/hooks/tv/useTVBackHandler';

const FONT_SIZE_OPTIONS = [14, 18, 22, 26];
const COLOR_OPTIONS = ['#ffffff', '#ffe066', '#66d9ff', '#7CFC00'];
const OPACITY_OPTIONS = [0, 0.25, 0.5, 0.75];

interface SubtitleAppearanceSheetProps {
  visible: boolean;
  onClose: () => void;
  appearance: SubtitleAppearance;
  onChange: (appearance: SubtitleAppearance) => void;
}

export function SubtitleAppearanceSheet({ visible, onClose, appearance, onChange }: SubtitleAppearanceSheetProps) {
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
              <ThemedText style={styles.title}>Subtitle Appearance</ThemedText>
              <FocusablePressable onPress={onClose} focusRingBorderRadius={16} accessibilityRole="button" accessibilityLabel="Close">
                <IconSymbol name="xmark.circle.fill" size={26} color={colors.textSecondary} />
              </FocusablePressable>
            </View>

            <ThemedText style={[styles.note, { color: colors.textSecondary }]}>
              Applies to externally loaded subtitle files. Embedded subtitle tracks use the device's native renderer.
            </ThemedText>

            <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary }]}>Font Size</ThemedText>
            <View style={styles.chipRow}>
              {FONT_SIZE_OPTIONS.map((size) => (
                <FocusablePressable
                  key={size}
                  onPress={() => onChange({ ...appearance, fontSize: size })}
                  focusRingBorderRadius={16}
                  accessibilityRole="button"
                  accessibilityState={{ selected: appearance.fontSize === size }}
                  accessibilityLabel={String(size)}
                  style={[
                    styles.chip,
                    { borderColor: colors.backgroundSelected },
                    appearance.fontSize === size && { backgroundColor: colors.accent, borderColor: colors.accent },
                  ]}
                >
                  <ThemedText style={{ color: appearance.fontSize === size ? colors.textOnAccent : colors.text, fontSize: 13, fontWeight: '600' }}>
                    {size}
                  </ThemedText>
                </FocusablePressable>
              ))}
            </View>

            <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 18 }]}>Text Color</ThemedText>
            <View style={styles.chipRow}>
              {COLOR_OPTIONS.map((color) => {
                const active = appearance.color === color;
                return (
                  <Pressable
                    key={color}
                    onPress={() => onChange({ ...appearance, color })}
                    style={[
                      styles.swatch,
                      { backgroundColor: color, borderColor: active ? colors.accent : colors.backgroundSelected },
                    ]}
                  />
                );
              })}
            </View>

            <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 18 }]}>Background Opacity</ThemedText>
            <View style={styles.chipRow}>
              {OPACITY_OPTIONS.map((opacity) => (
                <FocusablePressable
                  key={opacity}
                  onPress={() => onChange({ ...appearance, backgroundOpacity: opacity })}
                  focusRingBorderRadius={16}
                  accessibilityRole="button"
                  accessibilityState={{ selected: appearance.backgroundOpacity === opacity }}
                  accessibilityLabel={`${Math.round(opacity * 100)}%`}
                  style={[
                    styles.chip,
                    { borderColor: colors.backgroundSelected },
                    appearance.backgroundOpacity === opacity && { backgroundColor: colors.accent, borderColor: colors.accent },
                  ]}
                >
                  <ThemedText
                    style={{ color: appearance.backgroundOpacity === opacity ? colors.textOnAccent : colors.text, fontSize: 13, fontWeight: '600' }}
                  >
                    {Math.round(opacity * 100)}%
                  </ThemedText>
                </FocusablePressable>
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
    marginBottom: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  note: {
    fontSize: 12,
    marginBottom: 16,
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
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
  },
});
