import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/IconSymbol';
import { useAppTheme } from '@/contexts/ThemeContext';
import { settingsStyles } from './settingsStyles';

export function SettingsSubHeader({ title }: { title: string }) {
  const router = useRouter();
  const { colors } = useAppTheme();

  return (
    <View style={settingsStyles.subHeader}>
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [settingsStyles.backButton, { opacity: pressed ? 0.6 : 1 }]}
      >
        <IconSymbol name="chevron.left" color={colors.text} size={24} />
      </Pressable>
      <ThemedText type="title" style={{ fontSize: 22 }}>{title}</ThemedText>
    </View>
  );
}
