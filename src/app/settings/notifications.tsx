import { ScrollView, View, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { SettingsSubHeader } from '@/components/settings/SettingsSubHeader';
import { settingsStyles } from '@/components/settings/settingsStyles';
import { useAppTheme } from '@/contexts/ThemeContext';
import { isNotificationsEnabled, setNotificationsEnabled } from '@/services/notificationService';

export default function NotificationsSettingsScreen() {
  const { colors } = useAppTheme();
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setEnabled(await isNotificationsEnabled());
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggle(value: boolean) {
    const result = await setNotificationsEnabled(value);
    setEnabled(result);
    if (value && !result) {
      Alert.alert('Permission denied', 'Enable notifications for this app in your device settings to use this feature.');
    }
  }

  return (
    <ThemedView style={settingsStyles.container}>
      <SafeAreaView edges={['top']} style={settingsStyles.safeArea}>
        <SettingsSubHeader title="Notifications" />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={settingsStyles.scrollContent}>
          <ThemedText style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 14, paddingHorizontal: 16 }}>
            Get a notification when a new episode airs for a show in your library. Checked each time you open the app.
          </ThemedText>

          <View style={[settingsStyles.row, { borderColor: colors.backgroundSelected, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
            <ThemedText style={settingsStyles.rowLabel}>New episode alerts</ThemedText>
            {loaded && (
              <Switch
                value={enabled}
                onValueChange={handleToggle}
                trackColor={{ true: colors.accent, false: colors.backgroundSelected }}
              />
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
