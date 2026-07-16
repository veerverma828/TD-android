import { Pressable, StyleSheet } from 'react-native';

import { IconSymbol } from '@/components/IconSymbol';

interface LockOverlayProps {
  onUnlock: () => void;
}

export function LockOverlay({ onUnlock }: LockOverlayProps) {
  return (
    <Pressable style={styles.container} onPress={onUnlock} hitSlop={20}>
      <IconSymbol name="lock.fill" size={22} color="#fff" />
    </Pressable>
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
