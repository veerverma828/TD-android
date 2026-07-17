import { StyleSheet, ViewStyle } from 'react-native';
import { ThemedText } from './themed-text';
import { useAppTheme } from '@/contexts/ThemeContext';
import { FocusablePressable } from './tv/FocusablePressable';

interface ChipProps {
  label: string;
  isActive?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Chip({ label, isActive, onPress, style }: ChipProps) {
  const { colors } = useAppTheme();

  return (
    <FocusablePressable
      onPress={onPress}
      focusRingBorderRadius={20}
      accessibilityRole="button"
      accessibilityState={{ selected: !!isActive }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: isActive ? colors.accent : colors.backgroundElement,
          borderColor: isActive ? colors.accent : colors.backgroundSelected,
          opacity: pressed ? 0.8 : 1,
        },
        style,
      ]}>
      <ThemedText
        style={[
          styles.label,
          { color: isActive ? colors.textOnAccent : colors.text },
        ]}>
        {label}
      </ThemedText>
    </FocusablePressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
});
