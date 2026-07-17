import { useEffect } from 'react';
import { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useAppTheme } from '@/contexts/ThemeContext';

export function useFocusRingStyle(focused: boolean) {
  const { colors } = useAppTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(focused ? 1 : 0, { duration: 150 });
  }, [focused, progress]);

  const style = useAnimatedStyle(() => ({
    borderColor: colors.accent,
    borderWidth: 3,
    opacity: progress.value,
    transform: [{ scale: 1 + progress.value * 0.04 }],
  }));

  return style;
}
