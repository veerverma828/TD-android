import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { Directory, File, Paths } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';

const GITHUB_REPO = (Constants.expoConfig?.extra?.githubRepo as string | undefined) ?? 'veerverma828/TD-android';
const CURRENT_BUILD = Number(Constants.expoConfig?.extra?.buildNumber ?? 0);

export interface UpdateInfo {
  available: boolean;
  currentBuild: number;
  latestBuild: number;
  releaseName: string;
  releaseNotes: string;
  releaseUrl: string;
  apkUrl: string;
  apkSizeBytes: number;
}

// CI only stamps extra.buildNumber right before `expo prebuild` (see build-apk.yml);
// a dev/local build never goes through that step, so CURRENT_BUILD stays 0 there.
// Also covers Metro's own dev flag as a belt-and-suspenders check.
export function isDevBuild(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ ? true : CURRENT_BUILD === 0;
}

// CI (.github/workflows/build-apk.yml) tags each release "build-<run_number>"
// and stamps app.json's extra.buildNumber to the same number before building —
// comparing the two tells us if a newer release exists.
export async function checkForUpdate(): Promise<UpdateInfo> {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status}`);
  }
  const json = await res.json();
  const tag: string = json.tag_name ?? '';
  const match = tag.match(/(\d+)\s*$/);
  const latestBuild = match ? parseInt(match[1], 10) : 0;
  const asset = (json.assets ?? []).find((a: { name?: string }) => a.name?.toLowerCase().endsWith('.apk'));

  return {
    available: latestBuild > CURRENT_BUILD && !!asset,
    currentBuild: CURRENT_BUILD,
    latestBuild,
    releaseName: json.name ?? tag,
    releaseNotes: json.body ?? '',
    releaseUrl: json.html_url ?? '',
    apkUrl: asset?.browser_download_url ?? '',
    apkSizeBytes: asset?.size ?? 0,
  };
}

export async function downloadAndInstallUpdate(apkUrl: string, onProgress?: (fraction: number) => void): Promise<void> {
  if (Platform.OS !== 'android') {
    throw new Error('In-app updates are only supported on Android');
  }

  const dir = new Directory(Paths.cache, 'updates');
  try {
    dir.create();
  } catch {
    // already exists
  }

  const task = File.createDownloadTask(apkUrl, dir, {
    onProgress: ({ bytesWritten, totalBytes }) => {
      if (totalBytes > 0) onProgress?.(bytesWritten / totalBytes);
    },
  });

  const file = await task.downloadAsync();
  if (!file) {
    throw new Error('Download failed');
  }

  // Hands off to Android's package installer via a content:// URI (FileProvider-backed
  // by expo-file-system) — the system itself prompts for the "install unknown apps"
  // permission on first use if not already granted, no extra code needed here.
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: file.contentUri,
    flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
    type: 'application/vnd.android.package-archive',
  });
}
