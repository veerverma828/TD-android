import { ScrollView, View, Switch, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { SettingsSubHeader } from '@/components/settings/SettingsSubHeader';
import { ChipPicker } from '@/components/settings/ChipPicker';
import { settingsStyles } from '@/components/settings/settingsStyles';
import { useAppTheme } from '@/contexts/ThemeContext';
import { usePlayerSettings } from '@/contexts/PlayerSettingsContext';
import { useSettings, ContinueWatchingSource } from '@/contexts/SettingsContext';
import { useTrakt } from '@/contexts/TraktContext';
import { FocusablePressable } from '@/components/tv/FocusablePressable';

const SOURCE_OPTIONS: { value: ContinueWatchingSource; label: string }[] = [
  { value: 'local', label: 'Local Storage' },
  { value: 'trakt', label: 'Trakt' },
];

export default function ContinueWatchingSettingsScreen() {
  const { colors } = useAppTheme();
  const { settings: playerSettings, updateSettings: updatePlayerSettings } = usePlayerSettings();
  const { continueWatchingSource, setContinueWatchingSource } = useSettings();
  const trakt = useTrakt();

  return (
    <ThemedView style={settingsStyles.container}>
      <SafeAreaView edges={['top']} style={settingsStyles.safeArea}>
        <SettingsSubHeader title="Continue watching" />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={settingsStyles.scrollContent}>

          <ThemedText style={[settingsStyles.sectionTitle, { color: colors.accent }]}>Source</ThemedText>
          <View style={[settingsStyles.row, settingsStyles.rowStack, { borderColor: colors.backgroundSelected }]}>
            <ChipPicker
              options={SOURCE_OPTIONS}
              value={continueWatchingSource}
              onSelect={setContinueWatchingSource}
              accent={colors.accent}
              border={colors.backgroundSelected}
              text={colors.text}
            />
          </View>
          {continueWatchingSource === 'trakt' && !trakt.connected && (
            <ThemedText style={[settingsStyles.sectionNote, { color: colors.textSecondary }]}>
              Trakt selected but not connected — using Local Storage until you connect below.
            </ThemedText>
          )}

          <ThemedText style={[settingsStyles.sectionTitle, settingsStyles.sectionSpacing, { color: colors.accent }]}>Trakt Account</ThemedText>

          {trakt.connected ? (
            <>
              <View style={[settingsStyles.row, { borderColor: colors.backgroundSelected }]}>
                <ThemedText style={settingsStyles.rowLabel}>
                  Connected as {trakt.username || 'Trakt user'}
                </ThemedText>
              </View>
              <FocusablePressable
                style={[settingsStyles.row, { borderColor: colors.backgroundSelected }]}
                onPress={() => trakt.disconnect()}
                hasTVPreferredFocus
                focusRingScale={false}
                accessibilityRole="button"
                accessibilityLabel="Disconnect"
              >
                <ThemedText style={{ color: '#ff5c5c', fontWeight: '700', fontSize: 14 }}>Disconnect</ThemedText>
              </FocusablePressable>
            </>
          ) : trakt.deviceAuth ? (
            <View style={[settingsStyles.row, settingsStyles.rowStack, { borderColor: colors.backgroundSelected }]}>
              <ThemedText style={[settingsStyles.rowLabel, { marginBottom: 8 }]}>Enter this code on Trakt</ThemedText>
              <ThemedText style={{ fontSize: 28, fontWeight: '700', letterSpacing: 4, color: colors.accent, marginBottom: 14 }}>
                {trakt.deviceAuth.userCode}
              </ThemedText>

              <FocusablePressable
                style={[settingsStyles.providerBtn, { borderColor: colors.backgroundSelected, marginBottom: 8 }]}
                onPress={() => Clipboard.setStringAsync(trakt.deviceAuth!.userCode)}
                hasTVPreferredFocus
                focusRingBorderRadius={6}
                accessibilityRole="button"
                accessibilityLabel="Copy code"
              >
                <ThemedText style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>Copy Code</ThemedText>
              </FocusablePressable>

              <FocusablePressable
                style={[settingsStyles.providerBtn, { backgroundColor: colors.accent, borderColor: colors.accent, marginBottom: 14 }]}
                onPress={() => Linking.openURL(trakt.deviceAuth!.verificationUrl)}
                focusRingBorderRadius={6}
                accessibilityRole="button"
                accessibilityLabel="Open Trakt activation page"
              >
                <ThemedText style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Open Trakt Activation Page</ThemedText>
              </FocusablePressable>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <ActivityIndicator color={colors.accent} size="small" />
                <ThemedText style={{ color: colors.textSecondary, fontSize: 13 }}>Waiting for approval…</ThemedText>
              </View>

              <FocusablePressable onPress={() => trakt.cancelAuth()} focusRingBorderRadius={4} accessibilityRole="button" accessibilityLabel="Cancel">
                <ThemedText style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>Cancel</ThemedText>
              </FocusablePressable>
            </View>
          ) : (
            <>
              {(trakt.authStatus === 'expired' || trakt.authStatus === 'denied' || trakt.authStatus === 'error') && trakt.authError && (
                <ThemedText style={[settingsStyles.sectionNote, { color: '#ff5c5c' }]}>{trakt.authError}</ThemedText>
              )}
              <FocusablePressable
                style={[settingsStyles.row, { borderColor: colors.backgroundSelected }]}
                onPress={() => trakt.startAuth()}
                disabled={trakt.connecting}
                hasTVPreferredFocus
                focusRingScale={false}
                accessibilityRole="button"
                accessibilityLabel="Connect Trakt account"
              >
                {trakt.connecting ? (
                  <ActivityIndicator color={colors.accent} size="small" />
                ) : (
                  <ThemedText style={{ color: colors.accent, fontWeight: '700', fontSize: 14 }}>Connect Trakt Account</ThemedText>
                )}
              </FocusablePressable>
            </>
          )}

          <ThemedText style={[settingsStyles.sectionTitle, settingsStyles.sectionSpacing, { color: colors.accent }]}>Behavior</ThemedText>

          <View style={[settingsStyles.row, { borderColor: colors.backgroundSelected }]}>
            <ThemedText style={settingsStyles.rowLabel}>Auto-Play Next Episode</ThemedText>
            <Switch
              value={playerSettings.autoPlayNextEpisode}
              onValueChange={(v) => updatePlayerSettings({ autoPlayNextEpisode: v })}
              trackColor={{ false: colors.backgroundSelected, true: colors.accent }}
              thumbColor="#ffffff"
            />
          </View>
          <View style={[settingsStyles.row, { borderColor: colors.backgroundSelected }]}>
            <ThemedText style={settingsStyles.rowLabel}>Remember Playback Position</ThemedText>
            <Switch
              value={playerSettings.rememberPosition}
              onValueChange={(v) => updatePlayerSettings({ rememberPosition: v })}
              trackColor={{ false: colors.backgroundSelected, true: colors.accent }}
              thumbColor="#ffffff"
            />
          </View>
          <View style={[settingsStyles.row, { borderColor: colors.backgroundSelected }]}>
            <ThemedText style={settingsStyles.rowLabel}>Resume Automatically</ThemedText>
            <Switch
              value={playerSettings.resumeAutomatically}
              onValueChange={(v) => updatePlayerSettings({ resumeAutomatically: v })}
              trackColor={{ false: colors.backgroundSelected, true: colors.accent }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
