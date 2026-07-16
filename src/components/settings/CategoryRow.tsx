import { Pressable, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol, IconSymbolName } from '@/components/IconSymbol';
import { useAppTheme } from '@/contexts/ThemeContext';
import { settingsStyles } from './settingsStyles';

export function CategoryRow({
  icon,
  label,
  subtitle,
  onPress,
}: {
  icon: IconSymbolName;
  label: string;
  subtitle: string;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        settingsStyles.categoryRow,
        { borderColor: colors.backgroundSelected, opacity: pressed ? 0.7 : 1 },
      ]}
      onPress={onPress}
    >
      <View style={[settingsStyles.categoryIcon, { backgroundColor: colors.backgroundElement }]}>
        <IconSymbol name={icon} color={colors.accent} size={20} />
      </View>
      <View style={settingsStyles.categoryTextGroup}>
        <ThemedText style={settingsStyles.categoryLabel}>{label}</ThemedText>
        <ThemedText style={[settingsStyles.categorySubtext, { color: colors.textSecondary }]}>{subtitle}</ThemedText>
      </View>
      <ThemedText style={[settingsStyles.chevron, { color: colors.textSecondary }]}>›</ThemedText>
    </Pressable>
  );
}
