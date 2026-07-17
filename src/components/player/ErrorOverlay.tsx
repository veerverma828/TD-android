import { StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/IconSymbol';
import { ThemedText } from '@/components/themed-text';
import { FocusablePressable } from '@/components/tv/FocusablePressable';
import { useAppTheme } from '@/contexts/ThemeContext';

interface ErrorOverlayProps {
  message: string;
  accentColor: string;
  onRetry: () => void;
  onBack: () => void;
}

export function ErrorOverlay({ message, accentColor, onRetry, onBack }: ErrorOverlayProps) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.container}>
      <IconSymbol name="slash.circle" size={48} color="#ef4444" />
      <ThemedText style={styles.title}>Playback Error</ThemedText>
      <ThemedText style={styles.message}>{message}</ThemedText>
      <View style={styles.actions}>
        <FocusablePressable style={[styles.button, { backgroundColor: accentColor }]} onPress={onRetry} hasTVPreferredFocus focusRingBorderRadius={8} accessibilityRole="button" accessibilityLabel="Retry">
          <IconSymbol name="arrow.down.circle" size={16} color={colors.textOnAccent} />
          <ThemedText style={[styles.buttonText, { color: colors.textOnAccent }]}>Retry</ThemedText>
        </FocusablePressable>
        <FocusablePressable style={[styles.button, styles.backButton]} onPress={onBack} focusRingBorderRadius={8} accessibilityRole="button" accessibilityLabel="Go back">
          <IconSymbol name="chevron.left" size={16} color="#fff" />
          <ThemedText style={styles.buttonText}>Go Back</ThemedText>
        </FocusablePressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  message: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
