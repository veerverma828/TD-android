import { ScrollView, View, TextInput, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { SettingsSubHeader } from '@/components/settings/SettingsSubHeader';
import { settingsStyles } from '@/components/settings/settingsStyles';
import { useAppTheme } from '@/contexts/ThemeContext';
import { getSecureItem, saveSecureItem } from '@/services/storageService';
import { verifyDebridKey, DebridProvider } from '@/services/debridService';

export default function DebridSettingsScreen() {
  const { colors } = useAppTheme();

  const [debridProvider, setDebridProvider] = useState<DebridProvider>('real-debrid');
  const [debridKey, setDebridKey] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      const provider = (await getSecureItem('debrid_active_provider')) as DebridProvider || 'real-debrid';
      setDebridProvider(provider);
      const key = await getSecureItem(`debrid_key_${provider}`);
      if (key) setDebridKey(key);
    }
    loadSettings();
  }, []);

  async function handleProviderChange(newProvider: DebridProvider) {
    setDebridProvider(newProvider);
    const key = await getSecureItem(`debrid_key_${newProvider}`);
    setDebridKey(key || '');
  }

  async function handleSaveDebrid() {
    if (!debridKey.trim()) {
      Alert.alert('Error', 'Please enter an API key');
      return;
    }
    setVerifying(true);
    try {
      const result = await verifyDebridKey(debridProvider, debridKey.trim());
      if (result.success) {
        await saveSecureItem(`debrid_key_${debridProvider}`, debridKey.trim());
        await saveSecureItem('debrid_active_provider', debridProvider);
        Alert.alert('Success', `Connected to ${debridProvider} successfully!${result.username ? `\nUser: ${result.username}` : ''}`);
      } else {
        Alert.alert('Error', result.message || 'Invalid API Key');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to verify API key');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <ThemedView style={settingsStyles.container}>
      <SafeAreaView edges={['top']} style={settingsStyles.safeArea}>
        <SettingsSubHeader title="Debrid" />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={settingsStyles.scrollContent}>

          <View style={[settingsStyles.row, settingsStyles.rowStack, { borderColor: colors.backgroundSelected }]}>
            <ThemedText style={[settingsStyles.rowLabel, { marginBottom: 12 }]}>Provider</ThemedText>
            <View style={settingsStyles.providerRow}>
              <Pressable
                style={[settingsStyles.providerBtn, { borderColor: colors.backgroundSelected }, debridProvider === 'real-debrid' && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                onPress={() => handleProviderChange('real-debrid')}
              >
                <ThemedText style={{ color: debridProvider === 'real-debrid' ? '#fff' : colors.text, fontWeight: '600', fontSize: 13 }}>Real-Debrid</ThemedText>
              </Pressable>
              <Pressable
                style={[settingsStyles.providerBtn, { borderColor: colors.backgroundSelected }, debridProvider === 'torbox' && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                onPress={() => handleProviderChange('torbox')}
              >
                <ThemedText style={{ color: debridProvider === 'torbox' ? '#fff' : colors.text, fontWeight: '600', fontSize: 13 }}>TorBox</ThemedText>
              </Pressable>
            </View>
          </View>

          <View style={[settingsStyles.row, settingsStyles.rowStack, { borderColor: colors.backgroundSelected }]}>
            <ThemedText style={[settingsStyles.rowLabel, { marginBottom: 10 }]}>API Key</ThemedText>
            <TextInput
              style={[settingsStyles.input, { color: colors.text, borderColor: colors.backgroundSelected }]}
              placeholder={`${debridProvider === 'real-debrid' ? 'Real-Debrid' : 'TorBox'} API Key`}
              placeholderTextColor={colors.textSecondary}
              value={debridKey}
              onChangeText={setDebridKey}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Pressable
            style={[settingsStyles.row, { borderColor: colors.backgroundSelected }]}
            onPress={handleSaveDebrid}
            disabled={verifying}
          >
            {verifying ? (
              <ActivityIndicator color={colors.accent} size="small" />
            ) : (
              <ThemedText style={{ color: colors.accent, fontWeight: '700', fontSize: 14 }}>Verify & Save</ThemedText>
            )}
          </Pressable>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
