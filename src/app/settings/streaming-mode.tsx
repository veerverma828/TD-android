import { ScrollView, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/IconSymbol';
import { SettingsSubHeader } from '@/components/settings/SettingsSubHeader';
import { settingsStyles } from '@/components/settings/settingsStyles';
import { useAppTheme } from '@/contexts/ThemeContext';
import { FocusablePressable } from '@/components/tv/FocusablePressable';
import { useSettings, StreamingMode } from '@/contexts/SettingsContext';
import { useRestoreFocus } from '@/hooks/tv/useRestoreFocus';

const MODES: { key: StreamingMode; title: string; description: string; settingsRoute: string; settingsLabel: string }[] = [
  {
    key: 'direct-api',
    title: 'Direct API',
    description: "Add your own Real-Debrid or TorBox API key, plus torrent-provider addons. The app resolves each addon's magnets into playable links using your key.",
    settingsRoute: '/settings/debrid',
    settingsLabel: 'Debrid & Addons',
  },
  {
    key: 'addon-managed',
    title: 'Addon-Managed',
    description: "Stremio-style. Paste the URL of an addon that's already configured with a debrid service on its own site — the app plays whatever it returns directly. No API key stored here.",
    settingsRoute: '/settings/managed-addons',
    settingsLabel: 'Managed Addons',
  },
];

export default function StreamingModeSettingsScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { streamingMode, setStreamingMode } = useSettings();
  const { hasPreferredFocus, registerFocusable } = useRestoreFocus('settings-streaming-mode');

  return (
    <ThemedView style={settingsStyles.container}>
      <SafeAreaView edges={['top']} style={settingsStyles.safeArea}>
        <SettingsSubHeader title="Streaming Mode" />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={settingsStyles.scrollContent}>
          <ThemedText style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19, paddingHorizontal: 16, marginBottom: 18 }}>
            Choose how the app turns a torrent source into a playable stream. Switching modes does not erase the addons or debrid key saved under either mode — you can switch back anytime.
          </ThemedText>

          {MODES.map((mode) => {
            const active = streamingMode === mode.key;
            return (
              <View
                key={mode.key}
                style={[
                  styles.card,
                  { backgroundColor: colors.backgroundElement, borderColor: active ? colors.accent : 'transparent' },
                ]}
              >
                <FocusablePressable
                  onPress={() => setStreamingMode(mode.key)}
                  onFocus={() => registerFocusable(mode.key)}
                  hasTVPreferredFocus={hasPreferredFocus(mode.key, mode.key === 'direct-api')}
                  focusRingBorderRadius={10}
                  focusRingScale={false}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={mode.title}
                >
                  <View style={styles.cardHeader}>
                    <ThemedText style={styles.cardTitle}>{mode.title}</ThemedText>
                    <View style={[styles.radio, { borderColor: active ? colors.accent : colors.backgroundSelected }]}>
                      {active && <View style={[styles.radioDot, { backgroundColor: colors.accent }]} />}
                    </View>
                  </View>
                  <ThemedText style={[styles.cardDescription, { color: colors.textSecondary }]}>
                    {mode.description}
                  </ThemedText>
                </FocusablePressable>
                {active && (
                  <FocusablePressable
                    style={styles.manageLink}
                    onPress={() => router.push(mode.settingsRoute as any)}
                    onFocus={() => registerFocusable(`${mode.key}-manage`)}
                    focusRingBorderRadius={6}
                    accessibilityRole="button"
                    accessibilityLabel={`Manage ${mode.settingsLabel}`}
                  >
                    <ThemedText style={{ color: colors.accent, fontWeight: '700', fontSize: 13 }}>
                      Manage {mode.settingsLabel}
                    </ThemedText>
                    <IconSymbol name="chevron.right" color={colors.accent} size={14} />
                  </FocusablePressable>
                )}
              </View>
            );
          })}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 14,
    borderWidth: 2,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 19,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  manageLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 14,
    alignSelf: 'flex-start',
  },
});
