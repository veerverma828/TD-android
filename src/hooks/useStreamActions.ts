import { useRef, useState } from 'react';
import { Linking, Alert, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as IntentLauncher from 'expo-intent-launcher';
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
  // Set right before resolution starts; consulted once the final playable URL is
  // known (which may be several awaits and a file-selection round-trip later) so
  // "play externally"/"download" isn't lost while the debrid link is still being generated.
  const pendingModeRef = useRef<'internal' | 'external' | 'download'>('internal');

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

  const openInExternalPlayer = async (url: string) => {
    try {
      if (Platform.OS === 'android') {
        // ACTION_VIEW with an explicit video mime type so Android's chooser
        // surfaces installed video players (VLC, MX Player, ...) instead of
        // falling back to the browser, which Linking.openURL alone would do.
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: url,
          flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
          type: 'video/*',
        });
      } else {
        await Linking.openURL(url);
      }
    } catch {
      Alert.alert('Error', 'No external player found that can open this stream.');
    }
  };

  const openDownloadInBrowser = async (url: string) => {
    try {
      // Hand the resolved debrid link straight to the OS/browser (Chrome) so it
      // drives the download itself via its own download manager/notification —
      // no in-app file handling needed.
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'No app found that can open this download link.');
    }
  };

  const handleResolvedUrl = async (url: string) => {
    if (pendingModeRef.current === 'external') {
      await openInExternalPlayer(url);
    } else if (pendingModeRef.current === 'download') {
      await openDownloadInBrowser(url);
    } else {
      navigateToPlayer(url);
    }
  };

  const resolveAndPlay = async (torrentId: string | number, fileId: string | number, provider: DebridProvider, apiKey: string, sourceKey?: string) => {
    setResolvingId(sourceKey ?? torrentId.toString());
    try {
      const downloadUrl = await generateLink(torrentId, fileId, provider, apiKey);
      await handleResolvedUrl(downloadUrl);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to generate download link');
    } finally {
      setResolvingId(null);
      setFileSelection(null);
    }
  };

  const startPlayback = async (magnetOrUrl: string, mode: 'internal' | 'external' | 'download') => {
    pendingModeRef.current = mode;

    if (magnetOrUrl.startsWith('http')) {
      // Direct HTTP play (e.g., from some community addons)
      if (!hasAllowedScheme(magnetOrUrl)) {
        Alert.alert('Error', 'Unsupported stream link.');
        return;
      }
      handleResolvedUrl(magnetOrUrl);
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

  const play = (magnetOrUrl: string) => startPlayback(magnetOrUrl, 'internal');
  const playExternal = (magnetOrUrl: string) => startPlayback(magnetOrUrl, 'external');
  // Torrent/magnet sources have no direct bytes to fetch — this resolves them
  // through the attached debrid provider first, same as play(), then opens the
  // resulting HTTP link so the browser downloads it. A raw magnet handed to
  // Linking.openURL previously did nothing useful (no debrid resolution).
  const download = (magnetOrUrl: string) => startPlayback(magnetOrUrl, 'download');

  const copyUrl = async (url: string) => {
    await Clipboard.setStringAsync(url);
    Alert.alert("Success", "Link copied to clipboard!");
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
