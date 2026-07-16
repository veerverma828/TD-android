import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { formatTime } from '@/utils/timeFormat';

interface SeekBarProps {
  currentTime: number;
  duration: number;
  accentColor: string;
  onSeekStart?: () => void;
  onSeekEnd: (time: number) => void;
}

export function SeekBar({ currentTime, duration, accentColor, onSeekStart, onSeekEnd }: SeekBarProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [dragTime, setDragTime] = useState<number | null>(null);
  const dragX = useSharedValue(0);

  const displayTime = dragTime ?? currentTime;
  const progress = duration > 0 ? Math.min(1, Math.max(0, displayTime / duration)) : 0;

  const beginDrag = useCallback(
    (x: number) => {
      if (duration <= 0 || trackWidth <= 0) return;
      onSeekStart?.();
      const t = Math.min(1, Math.max(0, x / trackWidth)) * duration;
      setDragTime(t);
    },
    [duration, trackWidth, onSeekStart]
  );

  const updateDrag = useCallback(
    (x: number) => {
      if (duration <= 0 || trackWidth <= 0) return;
      const t = Math.min(1, Math.max(0, x / trackWidth)) * duration;
      setDragTime(t);
    },
    [duration, trackWidth]
  );

  const endDrag = useCallback(
    (x: number) => {
      if (duration <= 0 || trackWidth <= 0) return;
      const t = Math.min(1, Math.max(0, x / trackWidth)) * duration;
      setDragTime(null);
      onSeekEnd(t);
    },
    [duration, trackWidth, onSeekEnd]
  );

  const pan = Gesture.Pan()
    .onBegin((e) => {
      dragX.value = e.x;
      runOnJS(beginDrag)(e.x);
    })
    .onUpdate((e) => {
      dragX.value = e.x;
      runOnJS(updateDrag)(e.x);
    })
    .onEnd((e) => {
      runOnJS(endDrag)(e.x);
    });

  // Pan alone never fires onEnd for a stationary tap (RNGH's Pan requires
  // movement to activate), so a plain tap-to-seek needs its own gesture.
  const tap = Gesture.Tap().onEnd((e) => {
    runOnJS(endDrag)(e.x);
  });

  const gesture = Gesture.Race(pan, tap);

  const thumbStyle = useAnimatedStyle(() => ({
    left: `${progress * 100}%`,
  }));

  return (
    <View style={styles.container}>
      <ThemedText style={styles.time}>{formatTime(displayTime)}</ThemedText>
      <GestureDetector gesture={gesture}>
        <View
          style={styles.hitSlop}
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        >
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: accentColor }]} />
            <Animated.View
              style={[styles.thumb, { backgroundColor: accentColor }, thumbStyle]}
            />
          </View>
        </View>
      </GestureDetector>
      <ThemedText style={styles.time}>{formatTime(duration)}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  time: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    width: 52,
    textAlign: 'center',
  },
  hitSlop: {
    flex: 1,
    height: 32,
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7,
    top: -5,
  },
});
