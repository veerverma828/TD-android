import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { IconSymbol, IconSymbolName } from '@/components/IconSymbol';
import { ThemedText } from '@/components/themed-text';

interface VolumeIndicatorProps {
  value: number;
  accentColor: string;
  opacity: SharedValue<number>;
}

function iconFor(value: number): IconSymbolName {
  if (value <= 0) return 'speaker.slash.fill';
  if (value < 0.5) return 'speaker.wave.1.fill';
  return 'speaker.wave.3.fill';
}

export function VolumeIndicator({ value, accentColor, opacity }: VolumeIndicatorProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: 0.92 + opacity.value * 0.08 }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.container, styles.right, animatedStyle]}>
      <IconSymbol name={iconFor(value)} size={20} color="#fff" />
      <View style={styles.track}>
        <View style={[styles.fill, { height: `${value * 100}%`, backgroundColor: accentColor }]} />
      </View>
      <ThemedText style={styles.label}>{Math.round(value * 100)}%</ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 40,
    top: '35%',
    height: '30%',
    width: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  right: {},
  track: {
    flex: 1,
    width: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    borderRadius: 2,
  },
  label: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});
