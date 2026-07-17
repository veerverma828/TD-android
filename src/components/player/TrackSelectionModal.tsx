import { Modal, StyleSheet, View, Pressable, ScrollView, useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/IconSymbol';
import { useAppTheme } from '@/contexts/ThemeContext';
import { FocusablePressable } from '@/components/tv/FocusablePressable';
import { useTVBackHandler } from '@/hooks/tv/useTVBackHandler';

export interface SelectableTrack {
  index: number;
  title?: string;
  language?: string;
  selected?: boolean;
}

interface TrackSelectionModalProps {
  visible: boolean;
  heading: string;
  tracks: SelectableTrack[];
  emptyLabel: string;
  activeIndex: number | null;
  onSelect: (index: number) => void;
  onClose: () => void;
  extraOptions?: { label: string; onPress: () => void }[];
}

export function TrackSelectionModal({
  visible,
  heading,
  tracks,
  emptyLabel,
  activeIndex,
  onSelect,
  onClose,
  extraOptions,
}: TrackSelectionModalProps) {
  const scheme = useColorScheme();
  const { colors } = useAppTheme();

  useTVBackHandler(() => {
    if (!visible) return false;
    onClose();
  }, visible);

  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlayRoot]}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <BlurView intensity={40} tint={scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        </Pressable>

        <SafeAreaView edges={['bottom']} style={styles.safeArea}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
              <ThemedText style={styles.title}>{heading}</ThemedText>
              <FocusablePressable onPress={onClose} style={styles.closeButton} focusRingBorderRadius={16} accessibilityRole="button" accessibilityLabel="Close">
                <IconSymbol name="xmark.circle.fill" size={26} color={colors.textSecondary} />
              </FocusablePressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {extraOptions?.map((option) => (
                <FocusablePressable
                  key={option.label}
                  style={[styles.row, { backgroundColor: colors.backgroundElement }]}
                  onPress={option.onPress}
                  focusRingBorderRadius={10}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                >
                  <ThemedText style={styles.rowText}>{option.label}</ThemedText>
                </FocusablePressable>
              ))}

              {tracks.length === 0 ? (
                <ThemedText style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 12 }}>
                  {emptyLabel}
                </ThemedText>
              ) : (
                tracks.map((track) => {
                  const isSelected = activeIndex === track.index;
                  const label = track.title || track.language || `Track ${track.index + 1}`;
                  return (
                    <FocusablePressable
                      key={track.index}
                      style={[styles.row, { backgroundColor: colors.backgroundElement }]}
                      onPress={() => onSelect(track.index)}
                      focusRingBorderRadius={10}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={label}
                    >
                      <ThemedText style={styles.rowText}>{label}</ThemedText>
                      {isSelected && <IconSymbol name="checkmark" size={18} color={colors.accent} />}
                    </FocusablePressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    zIndex: 1000,
    elevation: 1000,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  safeArea: {
    maxHeight: '75%',
    width: '100%',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    flexShrink: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 4,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  rowText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
