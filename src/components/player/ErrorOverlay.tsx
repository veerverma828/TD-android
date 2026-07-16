import { Pressable, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/IconSymbol';
import { ThemedText } from '@/components/themed-text';

interface ErrorOverlayProps {
  message: string;
  accentColor: string;
  onRetry: () => void;
  onBack: () => void;
}

export function ErrorOverlay({ message, accentColor, onRetry, onBack }: ErrorOverlayProps) {
  return (
    <View style={styles.container}>
      <IconSymbol name="slash.circle" size={48} color="#ef4444" />
      <ThemedText style={styles.title}>Playback Error</ThemedText>
      <ThemedText style={styles.message}>{message}</ThemedText>
      <View style={styles.actions}>
        <Pressable style={[styles.button, { backgroundColor: accentColor }]} onPress={onRetry}>
          <IconSymbol name="arrow.down.circle" size={16} color="#fff" />
          <ThemedText style={styles.buttonText}>Retry</ThemedText>
        </Pressable>
        <Pressable style={[styles.button, styles.backButton]} onPress={onBack}>
          <IconSymbol name="chevron.left" size={16} color="#fff" />
          <ThemedText style={styles.buttonText}>Go Back</ThemedText>
        </Pressable>
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
