import { StyleSheet, Pressable, ViewStyle, useColorScheme } from 'react-native';
import { ThemedText } from './themed-text';
import { Colors } from '@/constants/theme';

interface ChipProps {
  label: string;
  isActive?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Chip({ label, isActive, onPress, style }: ChipProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

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
