import { memo } from 'react';
import { StyleSheet, ViewStyle, View } from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from './themed-text';
import { IconSymbol, IconSymbolName } from './IconSymbol';
import { useAppTheme } from '@/contexts/ThemeContext';
import { DARK_IMAGE_PLACEHOLDER } from '@/constants/placeholder';
import { FocusablePressable } from './tv/FocusablePressable';

interface ListItemProps {
  title: string;
  subtitle?: string;
  icon?: IconSymbolName;
  imageUrl?: string;
  trailingIcon?: IconSymbolName;
  onPress?: () => void;
  style?: ViewStyle;
}

export const ListItem = memo(function ListItem({ title, subtitle, icon, imageUrl, trailingIcon, onPress, style }: ListItemProps) {
  const { colors } = useAppTheme();

  return (
    <FocusablePressable
      onPress={onPress}
      focusRingBorderRadius={8}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: pressed ? colors.backgroundElement : 'transparent',
        },
        style,
      ]}>
      <View style={styles.content}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.thumbnail}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
            placeholder={DARK_IMAGE_PLACEHOLDER}
            placeholderContentFit="cover"
          />
        ) : icon ? (
          <View style={styles.iconContainer}>
            <IconSymbol name={icon} color={colors.textSecondary} size={24} />
          </View>
        ) : null}
        <View style={styles.textContainer}>
          <ThemedText style={styles.title}>{title}</ThemedText>
          {subtitle && (
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              {subtitle}
            </ThemedText>
          )}
        </View>
        {trailingIcon && (
          <View style={styles.trailingIconContainer}>
            <IconSymbol name={trailingIcon} color={colors.textSecondary} size={20} />
          </View>
        )}
      </View>
    </FocusablePressable>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 16,
    width: 24,
    alignItems: 'center',
  },
  thumbnail: {
    width: 48,
    height: 72,
    borderRadius: 4,
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  trailingIconContainer: {
    marginLeft: 16,
    width: 20,
    alignItems: 'center',
  },
});
