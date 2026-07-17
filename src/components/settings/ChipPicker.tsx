import { View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { FocusablePressable } from '@/components/tv/FocusablePressable';
import { useAppTheme } from '@/contexts/ThemeContext';
import { settingsStyles } from './settingsStyles';

export function ChipPicker<T extends string | number>({
  options,
  value,
  onSelect,
  accent,
  border,
  text,
}: {
  options: { value: T; label: string }[];
  value: T;
  onSelect: (v: T) => void;
  accent: string;
  border: string;
  text: string;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={settingsStyles.chipRow}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <FocusablePressable
            key={String(option.value)}
            style={[settingsStyles.chip, { borderColor: border }, active && { backgroundColor: accent, borderColor: accent }]}
            onPress={() => onSelect(option.value)}
            focusRingBorderRadius={16}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
          >
            <ThemedText style={{ color: active ? colors.textOnAccent : text, fontSize: 12.5, fontWeight: '600' }}>
              {option.label}
            </ThemedText>
          </FocusablePressable>
        );
      })}
    </View>
  );
}
