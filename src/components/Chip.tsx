import { StyleSheet, Pressable, ViewStyle } from 'react-native';
import { ThemedText } from './themed-text';
import { useAppTheme } from '@/contexts/ThemeContext';

interface ChipProps {
  label: string;
  isActive?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Chip({ label, isActive, onPress, style }: ChipProps) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
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
          { color: isActive ? '#ffffff' : colors.text },
        ]}>
        {label}
      </ThemedText>
    </Pressable>
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
