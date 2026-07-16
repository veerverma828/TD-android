import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { IconSymbol } from '@/components/IconSymbol';
import { ThemedText } from '@/components/themed-text';

interface SeekIndicatorProps {
  deltaSeconds: number;
  side: 'left' | 'right' | 'center';
  opacity: SharedValue<number>;
}

export function SeekIndicator({ deltaSeconds, side, opacity }: SeekIndicatorProps) {
  const forward = deltaSeconds >= 0;
  const positionStyle = side === 'left' ? styles.left : side === 'right' ? styles.right : styles.center;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: 0.92 + opacity.value * 0.08 }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.container, positionStyle, animatedStyle]}>
      <IconSymbol name={forward ? 'goforward' : 'gobackward'} size={26} color="#fff" />
      <ThemedText style={styles.label}>
        {forward ? '+' : ''}
        {Math.round(deltaSeconds)}s
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '42%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: 90,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  left: { left: '18%' },
  right: { right: '18%' },
  center: { alignSelf: 'center', left: undefined, right: undefined },
  label: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
