import { Modal, StyleSheet, View, Pressable, ScrollView, useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/IconSymbol';
import { useAppTheme } from '@/contexts/ThemeContext';

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
  extraOption?: { label: string; onPress: () => void };
}

export function TrackSelectionModal({
  visible,
  heading,
  tracks,
  emptyLabel,
  activeIndex,
  onSelect,
  onClose,
  extraOption,
}: TrackSelectionModalProps) {
  const scheme = useColorScheme();
  const { colors } = useAppTheme();

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
              <Pressable onPress={onClose} style={styles.closeButton}>
                <IconSymbol name="xmark.circle.fill" size={26} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {extraOption && (
                <Pressable
                  style={[styles.row, { backgroundColor: colors.backgroundElement }]}
                  onPress={extraOption.onPress}
                >
                  <ThemedText style={styles.rowText}>{extraOption.label}</ThemedText>
                </Pressable>
              )}

              {tracks.length === 0 ? (
                <ThemedText style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 12 }}>
                  {emptyLabel}
                </ThemedText>
              ) : (
                tracks.map((track) => {
                  const isSelected = activeIndex === track.index;
                  return (
                    <Pressable
                      key={track.index}
                      style={[styles.row, { backgroundColor: colors.backgroundElement }]}
                      onPress={() => onSelect(track.index)}
                    >
                      <ThemedText style={styles.rowText}>
                        {track.title || track.language || `Track ${track.index + 1}`}
                      </ThemedText>
                      {isSelected && <IconSymbol name="checkmark" size={18} color={colors.accent} />}
                    </Pressable>
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
