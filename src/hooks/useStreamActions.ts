import { useRef, useState } from 'react';
import { Linking, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { getActiveDebridProvider, getDebridKey, getFiles, generateLink, DebridProvider, DebridFile } from '@/services/debridService';

const ALLOWED_SCHEMES = ['http:', 'https:', 'magnet:'];

function hasAllowedScheme(url: string): boolean {
  if (url.startsWith('magnet:')) return true;
  try {
    return ALLOWED_SCHEMES.includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

export interface PlaybackMeta {
  title?: string;
  poster?: string;
  backdrop?: string;
  contentId?: string;
}

export function useStreamActions(meta: PlaybackMeta = {}) {
  const router = useRouter();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [fileSelection, setFileSelection] = useState<{ files: DebridFile[], torrentId: string | number, provider: DebridProvider, apiKey: string, sourceKey: string } | null>(null);
  const requestTokenRef = useRef(0);

  const navigateToPlayer = (url: string) => {
    router.push({
      pathname: '/preplay',
      params: {
        url,
        ...(meta.title ? { title: meta.title } : {}),
        ...(meta.poster ? { poster: meta.poster } : {}),
        ...(meta.backdrop ? { backdrop: meta.backdrop } : {}),
        ...(meta.contentId ? { contentId: meta.contentId } : {}),
      },
    });
  };

  const resolveAndPlay = async (torrentId: string | number, fileId: string | number, provider: DebridProvider, apiKey: string, sourceKey?: string) => {
    setResolvingId(sourceKey ?? torrentId.toString());
    try {
      const downloadUrl = await generateLink(torrentId, fileId, provider, apiKey);
      navigateToPlayer(downloadUrl);
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
      if (!hasAllowedScheme(magnetOrUrl)) {
        Alert.alert('Error', 'Unsupported stream link.');
        return;
      }
      navigateToPlayer(magnetOrUrl);
      return;
    }

    const provider = await getActiveDebridProvider();
    if (!provider) {
      Alert.alert(
        'No Debrid Configured',
        'Please add your Real-Debrid or TorBox API key in Settings to stream.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => router.push('/settings' as any) }
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
          { text: 'Settings', onPress: () => router.push('/settings' as any) }
        ]
      );
      return;
    }

    const token = ++requestTokenRef.current;
    setResolvingId(magnetOrUrl);
    try {
      const result = await getFiles(magnetOrUrl, provider, apiKey);
      if (requestTokenRef.current !== token) return; // a newer play() superseded this one
      if (result.files.length === 1) {
        await resolveAndPlay(result.torrentId, result.files[0].id, provider, apiKey, magnetOrUrl);
      } else if (result.files.length > 1) {
        setFileSelection({ files: result.files, torrentId: result.torrentId, provider, apiKey, sourceKey: magnetOrUrl });
        setResolvingId(null);
      } else {
        Alert.alert('Error', 'No playable files found in this stream.');
        setResolvingId(null);
      }
    } catch (e: any) {
      if (requestTokenRef.current !== token) return;
      Alert.alert('Error resolving stream', e.message);
      setResolvingId(null);
    }
  };

  const playExternal = async (url: string) => {
    if (!hasAllowedScheme(url)) {
      Alert.alert("Error", "Unsupported stream link.");
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Error", "No external player found that can open this stream.");
    }
  };

  const copyUrl = async (url: string) => {
    await Clipboard.setStringAsync(url);
    Alert.alert("Success", "Link copied to clipboard!");
  };

  const download = async (url: string) => {
    if (!hasAllowedScheme(url)) {
      Alert.alert("Error", "Unsupported stream link.");
      return;
    }
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
