import { View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol, IconSymbolName } from '@/components/IconSymbol';
import { useAppTheme } from '@/contexts/ThemeContext';
import { FocusablePressable } from '@/components/tv/FocusablePressable';
import { settingsStyles } from './settingsStyles';

export function CategoryRow({
  icon,
  label,
  subtitle,
  onPress,
  hasTVPreferredFocus,
}: {
  icon: IconSymbolName;
  label: string;
  subtitle: string;
  onPress: () => void;
  hasTVPreferredFocus?: boolean;
}) {
  const { colors } = useAppTheme();

  return (
    <FocusablePressable
      style={[settingsStyles.categoryRow, { borderColor: colors.backgroundSelected }]}
      onPress={onPress}
      hasTVPreferredFocus={hasTVPreferredFocus}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${subtitle}`}
    >
      {({ pressed }) => (
        <>
          <View style={{ opacity: pressed ? 0.7 : 1, flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={[settingsStyles.categoryIcon, { backgroundColor: colors.backgroundElement }]}>
              <IconSymbol name={icon} color={colors.accent} size={20} />
            </View>
            <View style={settingsStyles.categoryTextGroup}>
              <ThemedText style={settingsStyles.categoryLabel}>{label}</ThemedText>
              <ThemedText style={[settingsStyles.categorySubtext, { color: colors.textSecondary }]}>{subtitle}</ThemedText>
            </View>
            <ThemedText style={[settingsStyles.chevron, { color: colors.textSecondary }]}>›</ThemedText>
          </View>
        </>
      )}
    </FocusablePressable>
  );
}
