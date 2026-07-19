import { useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { FocusablePressable } from '@/components/tv/FocusablePressable';
import { useAppTheme } from '@/contexts/ThemeContext';
import { checkForUpdate, downloadAndInstallUpdate, UpdateInfo } from '@/services/updateService';

const LAST_CHECK_KEY = 'update:last_auto_check';
const DISMISSED_BUILD_KEY = 'update:dismissed_build';
const AUTO_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // don't hit the GitHub API more than once per 6h

type InstallState = { status: 'idle' } | { status: 'downloading'; progress: number } | { status: 'error'; message: string };

/**
 * Silently checks GitHub for a newer build shortly after app launch (throttled,
 * see AUTO_CHECK_INTERVAL_MS) and pops a themed dialog if one's available.
 * "Later" remembers the build it was dismissed for, so it won't nag again until
 * a build newer than that one shows up.
 */
export function UpdatePromptModal() {
  const { colors } = useAppTheme();
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [install, setInstall] = useState<InstallState>({ status: 'idle' });
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    (async () => {
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
      }
    })();
  }, []);

  if (!info) return null;

  const dismiss = () => {
    AsyncStorage.setItem(DISMISSED_BUILD_KEY, String(info.latestBuild));
    setInfo(null);
  };

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

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <ThemedText style={[styles.title, { color: colors.text }]}>Update available</ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
            {info.releaseName} · Build {info.latestBuild}
          </ThemedText>
          {!!info.releaseNotes && (
            <ThemedText style={[styles.notes, { color: colors.textSecondary }]} numberOfLines={5}>
              {info.releaseNotes}
            </ThemedText>
          )}

          {install.status === 'downloading' && (
            <View style={styles.progressWrap}>
              <View style={[styles.progressTrack, { backgroundColor: colors.backgroundSelected }]}>
                <View style={[styles.progressFill, { width: `${Math.round(install.progress * 100)}%`, backgroundColor: colors.accent }]} />
              </View>
              <ThemedText style={[styles.subtitle, { color: colors.textSecondary, marginTop: 6 }]}>
                {Math.round(install.progress * 100)}%
              </ThemedText>
            </View>
          )}

          {install.status === 'error' && (
            <ThemedText style={[styles.notes, { color: '#ef4444' }]}>{install.message}</ThemedText>
          )}

          {install.status !== 'downloading' && (
            <View style={styles.actions}>
              <FocusablePressable onPress={dismiss} accessibilityRole="button" accessibilityLabel="Later" focusRingBorderRadius={8}>
                {({ pressed }) => (
                  <View style={[styles.secondaryButton, { backgroundColor: colors.backgroundSelected, opacity: pressed ? 0.7 : 1 }]}>
                    <ThemedText style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>Later</ThemedText>
                  </View>
                )}
              </FocusablePressable>
              <FocusablePressable
                onPress={install_}
                accessibilityRole="button"
                accessibilityLabel="Download and install"
                focusRingBorderRadius={8}
                hasTVPreferredFocus
              >
                {({ pressed }) => (
                  <View style={[styles.primaryButton, { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 }]}>
                    <ThemedText style={{ color: colors.textOnAccent, fontWeight: '700', fontSize: 14 }}>Install</ThemedText>
                  </View>
                )}
              </FocusablePressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12.5,
    marginBottom: 10,
  },
  notes: {
    fontSize: 12.5,
    lineHeight: 17,
    marginBottom: 16,
  },
  progressWrap: {
    marginTop: 4,
    marginBottom: 8,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  secondaryButton: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  primaryButton: {
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
});
