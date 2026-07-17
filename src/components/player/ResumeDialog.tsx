import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { formatTime } from '@/utils/timeFormat';
import { FocusablePressable } from '@/components/tv/FocusablePressable';
import { useAppTheme } from '@/contexts/ThemeContext';

interface ResumeDialogProps {
  resumeFrom: number;
  accentColor: string;
  onResume: () => void;
  onStartOver: () => void;
}

export function ResumeDialog({ resumeFrom, accentColor, onResume, onStartOver }: ResumeDialogProps) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <ThemedText style={styles.title}>Resume playback?</ThemedText>
        <ThemedText style={styles.subtitle}>You left off at {formatTime(resumeFrom)}</ThemedText>
        <View style={styles.actions}>
          <FocusablePressable style={styles.secondaryButton} onPress={onStartOver} focusRingBorderRadius={8} accessibilityRole="button" accessibilityLabel="Start over">
            <ThemedText style={styles.secondaryText}>Start Over</ThemedText>
          </FocusablePressable>
          <FocusablePressable style={[styles.primaryButton, { backgroundColor: accentColor }]} onPress={onResume} hasTVPreferredFocus focusRingBorderRadius={8} accessibilityRole="button" accessibilityLabel="Resume">
            <ThemedText style={[styles.primaryText, { color: colors.textOnAccent }]}>Resume</ThemedText>
          </FocusablePressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...(StyleSheet.absoluteFill as object),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  card: {
    backgroundColor: '#111111',
    borderRadius: 14,
    padding: 20,
    width: 280,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginBottom: 18,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  secondaryButton: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  secondaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  primaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
