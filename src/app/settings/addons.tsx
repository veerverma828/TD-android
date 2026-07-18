import { ScrollView, View, TextInput, Pressable, Alert, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/IconSymbol';
import { SettingsSubHeader } from '@/components/settings/SettingsSubHeader';
import { settingsStyles } from '@/components/settings/settingsStyles';
import { useAppTheme } from '@/contexts/ThemeContext';
import { FocusablePressable } from '@/components/tv/FocusablePressable';
import { getAddons, addAddon, removeAddon, setAddonEnabled, StreamAddon } from '@/services/addonService';

export default function AddonsSettingsScreen() {
  const { colors } = useAppTheme();
  const [addons, setAddons] = useState<StreamAddon[]>([]);
  const [url, setUrl] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setAddons(await getAddons());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd() {
    if (!url.trim()) {
      Alert.alert('Error', 'Paste an addon manifest URL first.');
      return;
    }
    setAdding(true);
    try {
      const result = await addAddon(url.trim());
      if (result.success) {
        setUrl('');
        await load();
      } else {
        Alert.alert('Error', result.message || 'Failed to add addon.');
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleToggle(addon: StreamAddon) {
    await setAddonEnabled(addon.id, !addon.enabled);
    await load();
  }

  function handleRemove(addon: StreamAddon) {
    Alert.alert('Remove addon', `Remove "${addon.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeAddon(addon.id);
          await load();
        },
      },
    ]);
  }

  return (
    <ThemedView style={settingsStyles.container}>
      <SafeAreaView edges={['top']} style={settingsStyles.safeArea}>
        <SettingsSubHeader title="Addons" />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={settingsStyles.scrollContent}>
          <ThemedText style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19, paddingHorizontal: 16, marginBottom: 18 }}>
            Add a Stremio-compatible addon manifest URL to pull streams from it. No addons added means no streams will show.
          </ThemedText>

          <View style={[settingsStyles.card, { backgroundColor: colors.backgroundElement }]}>
            <ThemedText style={[settingsStyles.rowLabel, { marginBottom: 10 }]}>Addon Manifest URL</ThemedText>
            <TextInput
              style={[settingsStyles.cardInput, { color: colors.text, borderColor: colors.backgroundSelected, backgroundColor: colors.background }]}
              placeholder="https://torrentio.strem.fun/manifest.json"
              placeholderTextColor={colors.textSecondary}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              style={[settingsStyles.primaryButton, { backgroundColor: colors.accent, opacity: adding ? 0.7 : 1 }]}
              onPress={handleAdd}
              disabled={adding}
            >
              {adding ? (
                <ActivityIndicator color={colors.textOnAccent} size="small" />
              ) : (
                <ThemedText style={{ color: colors.textOnAccent, fontWeight: '700', fontSize: 14.5 }}>Validate & Add</ThemedText>
              )}
            </Pressable>
          </View>

          <ThemedText style={[settingsStyles.sectionTitle, { color: colors.textSecondary, marginTop: 8 }]}>
            Installed Addons
          </ThemedText>

          {addons.length === 0 ? (
            <View style={[settingsStyles.emptyCard, { backgroundColor: colors.backgroundElement }]}>
              <IconSymbol name="tv" color={colors.textSecondary} size={32} />
              <ThemedText style={{ color: colors.textSecondary, marginTop: 10, textAlign: 'center', paddingHorizontal: 24 }}>
                No addons added. Streams won't show until you add one.
              </ThemedText>
            </View>
          ) : (
            addons.map((addon) => (
              <View
                key={addon.id}
                style={[settingsStyles.addonCard, { backgroundColor: colors.backgroundElement }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}>
                    <View style={[settingsStyles.addonIcon, { backgroundColor: colors.backgroundSelected, marginRight: 12 }]}>
                      <IconSymbol name="tv" color={colors.accent} size={20} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={{ fontWeight: '600', fontSize: 14.5 }}>{addon.name}</ThemedText>
                      <ThemedText style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                        {addon.manifestUrl}
                      </ThemedText>
                    </View>
                  </View>
                  <Switch
                    value={addon.enabled}
                    onValueChange={() => handleToggle(addon)}
                    trackColor={{ true: colors.accent, false: colors.backgroundSelected }}
                  />
                </View>
                <View style={{ height: 1, backgroundColor: colors.backgroundSelected, marginVertical: 10 }} />
                <FocusablePressable
                  style={{ alignSelf: 'flex-start' }}
                  onPress={() => handleRemove(addon)}
                  focusRingBorderRadius={6}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${addon.name}`}
                >
                  <ThemedText style={{ color: '#ef4444', fontSize: 13, fontWeight: '600' }}>Remove</ThemedText>
                </FocusablePressable>
              </View>
            ))
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
