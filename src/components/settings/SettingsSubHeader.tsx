import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/IconSymbol';
import { useAppTheme } from '@/contexts/ThemeContext';
import { FocusablePressable } from '@/components/tv/FocusablePressable';
import { useScreenBackHandler } from '@/hooks/tv/useTVBackHandler';
import { settingsStyles } from './settingsStyles';

export function SettingsSubHeader({ title }: { title: string }) {
  const router = useRouter();
  const { colors } = useAppTheme();

  useScreenBackHandler(() => {
    router.back();
  });

  return (
    <View style={settingsStyles.subHeader}>
      <FocusablePressable
        onPress={() => router.back()}
        style={settingsStyles.backButton}
        focusRingBorderRadius={20}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        {({ pressed }) => (
          <View style={{ opacity: pressed ? 0.6 : 1 }}>
            <IconSymbol name="chevron.left" color={colors.text} size={24} />
          </View>
        )}
      </FocusablePressable>
      <ThemedText type="title" style={{ fontSize: 22 }}>{title}</ThemedText>
    </View>
  );
}
