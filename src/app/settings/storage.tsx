import { useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Application from 'expo-application';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { SettingsSubHeader } from '@/components/settings/SettingsSubHeader';
import { settingsStyles } from '@/components/settings/settingsStyles';
import { useAppTheme } from '@/contexts/ThemeContext';
import { FocusablePressable } from '@/components/tv/FocusablePressable';
import { checkForUpdate, downloadAndInstallUpdate, UpdateInfo } from '@/services/updateService';

type UpdateState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'upToDate' }
  | { status: 'available'; info: UpdateInfo }
  | { status: 'downloading'; progress: number }
  | { status: 'error'; message: string };

export default function StorageSettingsScreen() {
  const { colors } = useAppTheme();
  const [update, setUpdate] = useState<UpdateState>({ status: 'idle' });

  const versionLabel = `${Application.nativeApplicationVersion ?? '1.0.0'} (Build ${Application.nativeBuildVersion ?? '0'})`;

  const handleCheck = async () => {
    setUpdate({ status: 'checking' });
    try {
      const info = await checkForUpdate();
      setUpdate(info.available ? { status: 'available', info } : { status: 'upToDate' });
    } catch (e) {
      setUpdate({ status: 'error', message: e instanceof Error ? e.message : 'Could not check for updates' });
    }
  };

  const handleInstall = async (info: UpdateInfo) => {
    setUpdate({ status: 'downloading', progress: 0 });
    try {
      await downloadAndInstallUpdate(info.apkUrl, (fraction) => {
        setUpdate({ status: 'downloading', progress: fraction });
      });
      setUpdate({ status: 'idle' });
    } catch (e) {
      setUpdate({ status: 'error', message: e instanceof Error ? e.message : 'Update failed' });
    }
  };

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
            <ThemedText style={[settingsStyles.rowSubtext, { color: colors.textSecondary }]}>{versionLabel}</ThemedText>
          </View>

          <ThemedText style={[settingsStyles.sectionTitle, settingsStyles.sectionSpacing, { color: colors.textSecondary }]}>
            Update
          </ThemedText>

          <View style={[settingsStyles.card, { backgroundColor: colors.backgroundElement }]}>
            {update.status === 'idle' && (
              <FocusablePressable
                onPress={handleCheck}
                accessibilityRole="button"
                accessibilityLabel="Check for updates"
                focusRingBorderRadius={10}
              >
                {({ pressed }) => (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', opacity: pressed ? 0.7 : 1 }}>
                    <View>
                      <ThemedText style={settingsStyles.rowLabel}>Check for updates</ThemedText>
                      <ThemedText style={[settingsStyles.rowSubtext, { color: colors.textSecondary }]}>
                        Fetch the latest build from GitHub
                      </ThemedText>
                    </View>
                    <ThemedText style={[settingsStyles.chevron, { color: colors.textSecondary }]}>›</ThemedText>
                  </View>
                )}
              </FocusablePressable>
            )}

            {update.status === 'checking' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ActivityIndicator color={colors.accent} />
                <ThemedText style={{ color: colors.textSecondary, fontSize: 13 }}>Checking for updates…</ThemedText>
              </View>
            )}

            {update.status === 'upToDate' && (
              <View>
                <ThemedText style={settingsStyles.rowLabel}>You're up to date</ThemedText>
                <ThemedText style={[settingsStyles.rowSubtext, { color: colors.textSecondary, marginBottom: 12 }]}>
                  Build {String(Application.nativeBuildVersion ?? '0')} is the latest available
                </ThemedText>
                <FocusablePressable
                  onPress={handleCheck}
                  accessibilityRole="button"
                  accessibilityLabel="Check again"
                  focusRingBorderRadius={10}
                >
                  {({ pressed }) => (
                    <View style={[settingsStyles.primaryButton, { backgroundColor: colors.backgroundSelected, opacity: pressed ? 0.7 : 1 }]}>
                      <ThemedText style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>Check again</ThemedText>
                    </View>
                  )}
                </FocusablePressable>
              </View>
            )}

            {update.status === 'available' && (
              <View>
                <ThemedText style={settingsStyles.rowLabel}>Update available</ThemedText>
                <ThemedText style={[settingsStyles.rowSubtext, { color: colors.textSecondary, marginBottom: 4 }]}>
                  {update.info.releaseName} · Build {update.info.latestBuild} · {formatBytes(update.info.apkSizeBytes)}
                </ThemedText>
                {!!update.info.releaseNotes && (
                  <ThemedText style={[settingsStyles.rowSubtext, { color: colors.textSecondary, marginBottom: 12 }]} numberOfLines={4}>
                    {update.info.releaseNotes}
                  </ThemedText>
                )}
                <FocusablePressable
                  onPress={() => handleInstall(update.info)}
                  accessibilityRole="button"
                  accessibilityLabel="Download and install update"
                  focusRingBorderRadius={10}
                  hasTVPreferredFocus
                >
                  {({ pressed }) => (
                    <View style={[settingsStyles.primaryButton, { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 }]}>
                      <ThemedText style={{ color: colors.textOnAccent, fontWeight: '700', fontSize: 14 }}>
                        Download & Install
                      </ThemedText>
                    </View>
                  )}
                </FocusablePressable>
              </View>
            )}

            {update.status === 'downloading' && (
              <View>
                <ThemedText style={settingsStyles.rowLabel}>Downloading update…</ThemedText>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.backgroundSelected, marginTop: 10, overflow: 'hidden' }}>
                  <View
                    style={{
                      height: '100%',
                      width: `${Math.round(update.progress * 100)}%`,
                      backgroundColor: colors.accent,
                      borderRadius: 3,
                    }}
                  />
                </View>
                <ThemedText style={[settingsStyles.rowSubtext, { color: colors.textSecondary, marginTop: 8 }]}>
                  {Math.round(update.progress * 100)}%
                </ThemedText>
              </View>
            )}

            {update.status === 'error' && (
              <View>
                <ThemedText style={[settingsStyles.rowLabel, { color: '#ef4444' }]}>Update failed</ThemedText>
                <ThemedText style={[settingsStyles.rowSubtext, { color: colors.textSecondary, marginBottom: 12 }]}>
                  {update.message}
                </ThemedText>
                <FocusablePressable
                  onPress={handleCheck}
                  accessibilityRole="button"
                  accessibilityLabel="Retry"
                  focusRingBorderRadius={10}
                >
                  {({ pressed }) => (
                    <View style={[settingsStyles.primaryButton, { backgroundColor: colors.backgroundSelected, opacity: pressed ? 0.7 : 1 }]}>
                      <ThemedText style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>Retry</ThemedText>
                    </View>
                  )}
                </FocusablePressable>
              </View>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}
