import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { SettingsSubHeader } from '@/components/settings/SettingsSubHeader';
import { settingsStyles } from '@/components/settings/settingsStyles';
import { useAppTheme } from '@/contexts/ThemeContext';

export default function StorageSettingsScreen() {
  const { colors } = useAppTheme();

  return (
    <ThemedView style={settingsStyles.container}>
      <SafeAreaView edges={['top']} style={settingsStyles.safeArea}>
        <SettingsSubHeader title="Storage & about" />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={settingsStyles.scrollContent}>

          <View style={[settingsStyles.row, { borderColor: colors.backgroundSelected }]}>
            <View>
              <ThemedText style={settingsStyles.rowLabel}>Clear Cache</ThemedText>
              <ThemedText style={[settingsStyles.rowSubtext, { color: colors.textSecondary }]}>Free up 1.2 GB</ThemedText>
            </View>
            <ThemedText style={[settingsStyles.chevron, { color: colors.textSecondary }]}>›</ThemedText>
          </View>
          <View style={[settingsStyles.row, { borderColor: colors.backgroundSelected }]}>
            <ThemedText style={settingsStyles.rowLabel}>Version</ThemedText>
            <ThemedText style={[settingsStyles.rowSubtext, { color: colors.textSecondary }]}>2.4.0 (Build 89)</ThemedText>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
