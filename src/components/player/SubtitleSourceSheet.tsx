import { useState } from 'react';
import { Modal, StyleSheet, View, Pressable, TextInput, useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/IconSymbol';
import { useAppTheme } from '@/contexts/ThemeContext';
import { FocusablePressable } from '@/components/tv/FocusablePressable';
import { useTVBackHandler } from '@/hooks/tv/useTVBackHandler';

interface SubtitleSourceSheetProps {
  visible: boolean;
  onClose: () => void;
  onLoad: (url: string) => void;
}

export function SubtitleSourceSheet({ visible, onClose, onLoad }: SubtitleSourceSheetProps) {
  const scheme = useColorScheme();
  const { colors } = useAppTheme();
  const [url, setUrl] = useState('');

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
              <ThemedText style={styles.title}>Load Subtitle File</ThemedText>
              <FocusablePressable onPress={onClose} focusRingBorderRadius={16} accessibilityRole="button" accessibilityLabel="Close">
                <IconSymbol name="xmark.circle.fill" size={26} color={colors.textSecondary} />
              </FocusablePressable>
            </View>
            <ThemedText style={[styles.hint, { color: colors.textSecondary }]}>
              Paste a direct .srt or .vtt link
            </ThemedText>
            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder="https://example.com/subtitle.srt"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { color: colors.text, borderColor: colors.backgroundSelected }]}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <FocusablePressable
              style={[styles.button, { backgroundColor: colors.accent, opacity: url.trim() ? 1 : 0.5 }]}
              disabled={!url.trim()}
              onPress={() => {
                onLoad(url.trim());
                setUrl('');
                onClose();
              }}
              focusRingBorderRadius={8}
              accessibilityRole="button"
              accessibilityLabel="Load"
            >
              <ThemedText style={[styles.buttonText, { color: colors.textOnAccent }]}>Load</ThemedText>
            </FocusablePressable>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  hint: {
    fontSize: 12.5,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    marginBottom: 14,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
