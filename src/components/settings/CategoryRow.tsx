import { View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol, IconSymbolName } from '@/components/IconSymbol';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useIsTV } from '@/contexts/DeviceModeContext';
import { FocusablePressable } from '@/components/tv/FocusablePressable';
import { settingsStyles } from './settingsStyles';

export function CategoryRow({
  icon,
  label,
  subtitle,
  onPress,
  onFocus,
  hasTVPreferredFocus,
  isLast,
}: {
  icon: IconSymbolName;
  label: string;
  subtitle: string;
  onPress: () => void;
  onFocus?: () => void;
  hasTVPreferredFocus?: boolean;
  isLast?: boolean;
}) {
  const { colors } = useAppTheme();
  const isTV = useIsTV();

  return (
    <FocusablePressable
      onPress={onPress}
      onFocus={onFocus}
      hasTVPreferredFocus={hasTVPreferredFocus}
      focusRingScale={false}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${subtitle}`}
    >
      {({ pressed, focused }) => (
        <View
          style={[
            settingsStyles.categoryRow,
            isTV && { backgroundColor: focused ? colors.backgroundSelected : 'transparent', borderRadius: 10 },
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <View style={[settingsStyles.categoryIcon, { backgroundColor: colors.backgroundElement }]}>
            <IconSymbol name={icon} color={colors.accent} size={20} />
          </View>
          <View style={settingsStyles.categoryTextGroup}>
            <ThemedText style={settingsStyles.categoryLabel}>{label}</ThemedText>
            <ThemedText style={[settingsStyles.categorySubtext, { color: colors.textSecondary }]}>{subtitle}</ThemedText>
          </View>
          <ThemedText style={[settingsStyles.chevron, { color: colors.textSecondary }]}>›</ThemedText>
          {!isTV && !isLast && (
            <View style={[settingsStyles.categoryRowDivider, { backgroundColor: colors.backgroundSelected }]} />
          )}
        </View>
      )}
    </FocusablePressable>
  );
}
