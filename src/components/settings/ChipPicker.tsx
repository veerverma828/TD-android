import { View, Pressable } from 'react-native';
import { ThemedText } from '@/components/themed-text';
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
  return (
    <View style={settingsStyles.chipRow}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            style={[settingsStyles.chip, { borderColor: border }, active && { backgroundColor: accent, borderColor: accent }]}
            onPress={() => onSelect(option.value)}
          >
            <ThemedText style={{ color: active ? '#fff' : text, fontSize: 12.5, fontWeight: '600' }}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}
