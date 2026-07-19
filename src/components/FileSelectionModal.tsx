import { Modal, StyleSheet, View, Pressable, ScrollView, useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from './themed-text';
import { IconSymbol } from './IconSymbol';
import { useAppTheme } from '@/contexts/ThemeContext';
import { DebridFile } from '@/services/debridService';
import { formatBytes } from '@/utils/streamHelpers';
import { FocusablePressable } from './tv/FocusablePressable';
import { useTVBackHandler } from '@/hooks/tv/useTVBackHandler';

interface FileSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  files: DebridFile[];
  onSelectFile: (fileId: string | number) => void;
}

export function FileSelectionModal({ visible, onClose, files, onSelectFile }: FileSelectionModalProps) {
  const scheme = useColorScheme();
  const { colors } = useAppTheme();

  useTVBackHandler(() => {
    if (!visible) return false;
    onClose();
  }, visible);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <BlurView intensity={40} tint={scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        </Pressable>

        <SafeAreaView edges={['bottom']} style={styles.safeArea}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>

            <View style={styles.header}>
              <ThemedText style={styles.title}>Select File</ThemedText>
              <FocusablePressable onPress={onClose} style={styles.closeButton} focusRingBorderRadius={16} accessibilityRole="button" accessibilityLabel="Close">
                <IconSymbol name="xmark.circle.fill" size={28} color={colors.textSecondary} />
              </FocusablePressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {files.map((file, index) => (
                <FocusablePressable
                  key={file.id.toString()}
                  hasTVPreferredFocus={index === 0}
                  focusRingBorderRadius={12}
                  accessibilityRole="button"
                  accessibilityLabel={file.name}
                  style={({ pressed }) => [
                    styles.fileItem,
                    { backgroundColor: colors.backgroundElement, opacity: pressed ? 0.7 : 1 }
                  ]}
                  onPress={() => {
                    onClose();
                    onSelectFile(file.id);
                  }}
                >
                  <View style={styles.fileInfo}>
                    <ThemedText style={styles.fileName} numberOfLines={2}>{file.name}</ThemedText>
                    <ThemedText style={[styles.fileSize, { color: colors.accent }]}>
                      {formatBytes(file.size)}
                    </ThemedText>
                  </View>
                  <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
                </FocusablePressable>
              ))}
              <View style={{ height: 20 }} />
            </ScrollView>

          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  safeArea: {
    maxHeight: '80%',
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    padding: 20,
    gap: 12,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  fileInfo: {
    flex: 1,
    marginRight: 16,
    gap: 4,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  fileSize: {
    fontSize: 13,
    fontWeight: '600',
  },
});
