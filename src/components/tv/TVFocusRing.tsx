import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';

export function useFocusRingStyle(focused: boolean, scale: boolean = true) {
  const { colors } = useAppTheme();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: focused ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [focused, progress]);

  return {
    borderColor: colors.accent,
    borderWidth: 3,
    opacity: progress,
    transform: scale
      ? [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }]
      : [],
  };
}
