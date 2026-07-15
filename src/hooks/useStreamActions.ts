import { useState } from 'react';
import { Linking, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { getActiveDebridProvider, getDebridKey, getFiles, generateLink, DebridProvider, DebridFile } from '@/services/debridService';

export function useStreamActions() {
  const router = useRouter();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [fileSelection, setFileSelection] = useState<{ files: DebridFile[], torrentId: string | number, provider: DebridProvider, apiKey: string } | null>(null);

  const resolveAndPlay = async (torrentId: string | number, fileId: string | number, provider: DebridProvider, apiKey: string) => {
    setResolvingId(torrentId.toString());
    try {
      const downloadUrl = await generateLink(torrentId, fileId, provider, apiKey);
      router.push({ pathname: '/player', params: { url: downloadUrl } });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to generate download link');
    } finally {
      setResolvingId(null);
      setFileSelection(null);
    }
  };

  const play = async (magnetOrUrl: string) => {
    if (magnetOrUrl.startsWith('http')) {
      // Direct HTTP play (e.g., from some community addons)
      router.push({ pathname: '/player', params: { url: magnetOrUrl } });
      return;
    }

    const provider = await getActiveDebridProvider();
    if (!provider) {
      Alert.alert(
        'No Debrid Configured', 
        'Please add your Real-Debrid or TorBox API key in Settings to stream.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => router.push('/settings') }
        ]
      );
      return;
    }

    const apiKey = await getDebridKey(provider);
    if (!apiKey) {
      Alert.alert(
        'API Key Missing', 
        `Please add your ${provider} API key in Settings.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => router.push('/settings') }
        ]
      );
      return;
    }

    setResolvingId(magnetOrUrl);
    try {
      const result = await getFiles(magnetOrUrl, provider, apiKey);
      if (result.files.length === 1) {
        await resolveAndPlay(result.torrentId, result.files[0].id, provider, apiKey);
      } else if (result.files.length > 1) {
        setFileSelection({ files: result.files, torrentId: result.torrentId, provider, apiKey });
        setResolvingId(null);
      } else {
        Alert.alert('Error', 'No playable files found in this stream.');
        setResolvingId(null);
      }
    } catch (e: any) {
      Alert.alert('Error resolving stream', e.message);
      setResolvingId(null);
    }
  };

  const playExternal = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        // Just try opening anyway, on Android this usually prompts the app chooser
        await Linking.openURL(url).catch(() => {
          Alert.alert("Error", "No external player found that can open this stream.");
        });
      }
    } catch {
      Alert.alert("Error", "Could not open external player.");
    }
  };

  const copyUrl = async (url: string) => {
    await Clipboard.setStringAsync(url);
    Alert.alert("Success", "Link copied to clipboard!");
  };

  const download = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert("Error", "Could not initiate download.");
    }
  };

  return {
    play,
    playExternal,
    copyUrl,
    download,
    resolvingId,
    fileSelection,
    setFileSelection,
    resolveAndPlay
  };
}
