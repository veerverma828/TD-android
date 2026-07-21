import { useEffect, useRef, useState } from 'react';
import { AppState, Modal, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/themed-text';
import { FocusablePressable } from '@/components/tv/FocusablePressable';
import { IconSymbol } from '@/components/IconSymbol';
import { useAppTheme } from '@/contexts/ThemeContext';
import { checkForUpdate, downloadAndInstallUpdate, isDevBuild, UpdateInfo } from '@/services/updateService';
import { useTVBackHandler } from '@/hooks/tv/useTVBackHandler';

const LAST_CHECK_KEY = 'update:last_auto_check';
const DISMISSED_BUILD_KEY = 'update:dismissed_build';
// Short cooldown, not a "once a day" gate — a TV/set-top box app is rarely force-quit,
// so gating on cold start alone (previously 6h + mount-once) could leave a release
// unseen for the entire life of that session. This just caps GitHub API calls when
// the user is rapidly foregrounding/backgrounding (well under the 60 req/hr unauthenticated limit).
const AUTO_CHECK_INTERVAL_MS = 15 * 60 * 1000;

type InstallState = { status: 'idle' } | { status: 'downloading'; progress: number } | { status: 'error'; message: string };

/**
 * Checks GitHub for a newer build on cold start AND every time the app returns
 * to the foreground (throttled, see AUTO_CHECK_INTERVAL_MS), and slides up a
 * bottom sheet if one's available. "Later" remembers the build it was dismissed
 * for, so it won't nag again until a build newer than that one shows up.
 */
export function UpdatePromptModal() {
  const { colors } = useAppTheme();
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [install, setInstall] = useState<InstallState>({ status: 'idle' });
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (isDevBuild()) return;

    const runCheck = async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const lastCheckRaw = await AsyncStorage.getItem(LAST_CHECK_KEY);
        const lastCheck = lastCheckRaw ? parseInt(lastCheckRaw, 10) : 0;
        if (Date.now() - lastCheck < AUTO_CHECK_INTERVAL_MS) return;

        const result = await checkForUpdate();
        await AsyncStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
        if (!result.available) return;

        const dismissedRaw = await AsyncStorage.getItem(DISMISSED_BUILD_KEY);
        const dismissedBuild = dismissedRaw ? parseInt(dismissedRaw, 10) : 0;
        if (result.latestBuild <= dismissedBuild) return;

        setInfo(result);
      } catch {
        // silent — this is a background check, errors surface only when the user taps "Check for updates" manually
      } finally {
        inFlightRef.current = false;
      }
    };

    runCheck();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') runCheck();
    });
    return () => sub.remove();
  }, []);

  const dismiss = () => {
    if (!info) return;
    AsyncStorage.setItem(DISMISSED_BUILD_KEY, String(info.latestBuild));
    setInfo(null);
  };

  useTVBackHandler(() => {
    if (!info || install.status === 'downloading') return false;
    dismiss();
  }, !!info && install.status !== 'downloading');

  if (!info) return null;

  const install_ = async () => {
    setInstall({ status: 'downloading', progress: 0 });
    try {
      await downloadAndInstallUpdate(info.apkUrl, (fraction) => setInstall({ status: 'downloading', progress: fraction }));
      setInfo(null);
      setInstall({ status: 'idle' });
    } catch (e) {
      setInstall({ status: 'error', message: e instanceof Error ? e.message : 'Update failed' });
    }
  };

  const downloading = install.status === 'downloading';
  const progressPct = downloading ? Math.round(install.progress * 100) : 0;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        {!downloading && <FocusablePressable onPress={dismiss} accessibilityLabel="Dismiss" style={StyleSheet.absoluteFill} />}

        <View style={[styles.sheet, { backgroundColor: colors.backgroundElement }]}>
          <View style={[styles.grabber, { backgroundColor: colors.backgroundSelected }]} />

          <View style={styles.headerRow}>
            <LinearGradient colors={[colors.accent, colors.accent + 'b3']} style={styles.badge}>
              <IconSymbol name="arrow.down.circle.fill" size={22} color={colors.textOnAccent} />
            </LinearGradient>
            <View style={styles.headerText}>
              <ThemedText style={[styles.title, { color: colors.text }]}>
                {downloading ? 'Downloading update' : 'Update available'}
              </ThemedText>
              <ThemedText style={[styles.meta, { color: colors.textSecondary }]}>
                {info.releaseName} · Build {info.latestBuild}
              </ThemedText>
            </View>
          </View>

          {!downloading && !!info.releaseNotes && (
            <ThemedText style={[styles.notes, { color: colors.textSecondary }]} numberOfLines={5}>
              {info.releaseNotes}
            </ThemedText>
          )}

          {downloading && (
            <View style={styles.progressWrap}>
              <View style={[styles.progressTrack, { backgroundColor: colors.backgroundSelected }]}>
                <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: colors.accent }]} />
              </View>
              <ThemedText style={[styles.progressLabel, { color: colors.textSecondary }]}>{progressPct}%</ThemedText>
            </View>
          )}

          {install.status === 'error' && (
            <ThemedText style={[styles.notes, { color: '#ef4444' }]}>{install.message}</ThemedText>
          )}

          <View style={styles.actions}>
            {!downloading && (
              <FocusablePressable onPress={dismiss} accessibilityRole="button" accessibilityLabel="Later" focusRingBorderRadius={10}>
                {({ pressed }) => (
                  <View style={[styles.secondaryButton, { backgroundColor: colors.backgroundSelected, opacity: pressed ? 0.7 : 1 }]}>
                    <ThemedText style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>Later</ThemedText>
                  </View>
                )}
              </FocusablePressable>
            )}
            <FocusablePressable
              onPress={downloading ? undefined : install_}
              disabled={downloading}
              accessibilityRole="button"
              accessibilityLabel={downloading ? 'Downloading' : 'Download and install'}
              focusRingBorderRadius={10}
              hasTVPreferredFocus
              style={styles.primaryFlex}
            >
              {({ pressed }) => (
                <View
                  style={[
                    styles.primaryButton,
                    { backgroundColor: colors.accent, opacity: downloading ? 0.6 : pressed ? 0.85 : 1 },
                  ]}
                >
                  <ThemedText style={{ color: colors.textOnAccent, fontWeight: '700', fontSize: 13.5 }}>
                    {downloading ? 'Installing…' : 'Install update'}
                  </ThemedText>
                </View>
              )}
            </FocusablePressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 26,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  badge: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 15.5,
    fontWeight: '800',
    marginBottom: 2,
  },
  meta: {
    fontSize: 11.5,
  },
  notes: {
    fontSize: 12.5,
    lineHeight: 17,
    marginBottom: 6,
  },
  progressWrap: {
    marginTop: 2,
    marginBottom: 6,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 11,
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  primaryFlex: {
    flex: 1,
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
