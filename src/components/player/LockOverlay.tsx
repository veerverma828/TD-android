import { StyleSheet } from 'react-native';

import { IconSymbol } from '@/components/IconSymbol';
import { FocusablePressable } from '@/components/tv/FocusablePressable';

interface LockOverlayProps {
  onUnlock: () => void;
}

export function LockOverlay({ onUnlock }: LockOverlayProps) {
  return (
    <FocusablePressable
      style={styles.container}
      onPress={onUnlock}
      hitSlop={20}
      hasTVPreferredFocus
      focusRingBorderRadius={22}
      accessibilityRole="button"
      accessibilityLabel="Unlock controls"
    >
      <IconSymbol name="lock.fill" size={22} color="#fff" />
    </FocusablePressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    top: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
