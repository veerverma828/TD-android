import { StyleSheet, View, ScrollView, Switch, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useState, useEffect } from 'react';
import { TextInput, Pressable, Alert, ActivityIndicator } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { ListItem } from '@/components/ListItem';
import { Colors } from '@/constants/theme';
import { getSecureItem, saveSecureItem } from '@/services/storageService';
import { verifyDebridKey, DebridProvider } from '@/services/debridService';

export default function SettingsScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  
  const [autoplayNext, setAutoplayNext] = useState(true);

  // Debrid State
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
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        
        <View style={styles.header}>
          <ThemedText type="title" style={styles.headerTitle}>Settings</ThemedText>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Debrid Integration */}
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: colors.accent }]}>DEBRID INTEGRATION</ThemedText>
            <View style={[styles.card, { backgroundColor: colors.backgroundElement, padding: 16 }]}>
              
              <View style={styles.providerRow}>
                <Pressable 
                  style={[styles.providerBtn, debridProvider === 'real-debrid' && { backgroundColor: colors.accent }]}
                  onPress={() => handleProviderChange('real-debrid')}
                >
                  <ThemedText style={{ color: debridProvider === 'real-debrid' ? '#fff' : colors.text, fontWeight: '600' }}>Real-Debrid</ThemedText>
                </Pressable>
                <Pressable 
                  style={[styles.providerBtn, debridProvider === 'torbox' && { backgroundColor: colors.accent }]}
                  onPress={() => handleProviderChange('torbox')}
                >
                  <ThemedText style={{ color: debridProvider === 'torbox' ? '#fff' : colors.text, fontWeight: '600' }}>TorBox</ThemedText>
                </Pressable>
              </View>

              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.backgroundSelected, backgroundColor: colors.background }]}
                placeholder={`${debridProvider === 'real-debrid' ? 'Real-Debrid' : 'TorBox'} API Key`}
                placeholderTextColor={colors.textSecondary}
                value={debridKey}
                onChangeText={setDebridKey}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Pressable 
                style={[styles.saveBtn, { backgroundColor: colors.accent, opacity: verifying ? 0.7 : 1 }]}
                onPress={handleSaveDebrid}
                disabled={verifying}
              >
                {verifying ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <ThemedText style={styles.saveBtnText}>Verify & Save</ThemedText>
                )}
              </Pressable>
            </View>
          </View>

          {/* Playback Settings */}
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: colors.accent }]}>PLAYBACK & DOWNLOADS</ThemedText>
            <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <ThemedText style={styles.toggleTitle}>Autoplay Next Episode</ThemedText>
                </View>
                <Switch 
                  value={autoplayNext} 
                  onValueChange={setAutoplayNext}
                  trackColor={{ false: colors.backgroundSelected, true: colors.accent }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>
          </View>

          {/* App Info */}
          <View style={styles.section}>
            <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <ListItem title="Clear Cache" icon="play.fill" subtitle="Free up 1.2 GB" />
              <View style={[styles.divider, { backgroundColor: colors.backgroundSelected }]} />
              <ListItem title="Torrent Debrid" icon="play.fill" subtitle="Version 2.4.0 (Build 89)" />
            </View>
          </View>

          <View style={{ height: 40 }} />

        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 60,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    gap: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    paddingLeft: 4,
    letterSpacing: 1,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    marginLeft: 56, // aligns with text in ListItem (16 padding + 24 icon + 16 margin)
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  providerRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  providerBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
