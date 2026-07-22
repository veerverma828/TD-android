import AsyncStorage from '@react-native-async-storage/async-storage';

const ADDONS_KEY = 'stream_addons';
// Guards the one-time default-addon seed below — set the first time this
// device's addon list is ever read, so removing the seeded addon later
// (a deliberate user action) doesn't get silently undone on next launch.
const SEEDED_KEY = 'stream_addons_seeded_v1';

const TORRENTIO_MANIFEST_URL = 'https://torrentio.strem.fun/manifest.json';

export interface StreamAddon {
  id: string;
  url: string;
  manifestUrl: string;
  name: string;
  version: string | null;
  enabled: boolean;
}

function toManifestUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/manifest.json') ? trimmed : `${trimmed}/manifest.json`;
}

export function toStreamBaseUrl(manifestUrl: string): string {
  return manifestUrl.replace(/\/manifest\.json$/, '');
}

async function readAll(): Promise<StreamAddon[]> {
  try {
    const raw = await AsyncStorage.getItem(ADDONS_KEY);
    if (!raw) {
      const alreadySeeded = await AsyncStorage.getItem(SEEDED_KEY);
      if (!alreadySeeded) {
        const seeded: StreamAddon[] = [
          {
            id: 'torrentio-default',
            url: TORRENTIO_MANIFEST_URL,
            manifestUrl: TORRENTIO_MANIFEST_URL,
            name: 'Torrentio',
            version: null,
            enabled: true,
          },
        ];
        await AsyncStorage.setItem(ADDONS_KEY, JSON.stringify(seeded));
        await AsyncStorage.setItem(SEEDED_KEY, '1');
        return seeded;
      }
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(addons: StreamAddon[]): Promise<void> {
  await AsyncStorage.setItem(ADDONS_KEY, JSON.stringify(addons));
}

export async function getAddons(): Promise<StreamAddon[]> {
  return readAll();
}

export async function getEnabledAddons(): Promise<StreamAddon[]> {
  const addons = await readAll();
  return addons.filter((a) => a.enabled);
}

export interface ValidateAddonResult {
  success: boolean;
  name?: string;
  version?: string;
  message?: string;
}

// Stremio addon manifests advertise capabilities via `resources` — reject
// anything that can't actually serve streams instead of silently adding a
// dead source that will just return zero results forever.
export async function validateAddonUrl(rawUrl: string): Promise<ValidateAddonResult> {
  const manifestUrl = toManifestUrl(rawUrl);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(manifestUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      return { success: false, message: `Addon returned ${res.status}.` };
    }
    const manifest = await res.json();
    const resources: any[] = manifest.resources || [];
    const supportsStream = resources.some((r) => r === 'stream' || r?.name === 'stream');
    if (!supportsStream) {
      return { success: false, message: 'Addon does not provide streams.' };
    }
    return { success: true, name: manifest.name || manifestUrl, version: manifest.version || null };
  } catch (err: any) {
    const isAbort = err?.name === 'AbortError' || /abort/i.test(err?.message || '');
    return { success: false, message: isAbort ? 'Request timed out.' : 'Could not reach addon.' };
  }
}

export async function addAddon(rawUrl: string): Promise<{ success: boolean; message?: string }> {
  const manifestUrl = toManifestUrl(rawUrl);
  const addons = await readAll();
  if (addons.some((a) => a.manifestUrl === manifestUrl)) {
    return { success: false, message: 'Addon already added.' };
  }

  const result = await validateAddonUrl(rawUrl);
  if (!result.success) {
    return { success: false, message: result.message };
  }

  const addon: StreamAddon = {
    id: `${Date.now()}`,
    url: rawUrl.trim(),
    manifestUrl,
    name: result.name || manifestUrl,
    version: result.version || null,
    enabled: true,
  };
  await writeAll([...addons, addon]);
  return { success: true };
}

export async function removeAddon(id: string): Promise<void> {
  const addons = await readAll();
  await writeAll(addons.filter((a) => a.id !== id));
}

export async function setAddonEnabled(id: string, enabled: boolean): Promise<void> {
  const addons = await readAll();
  await writeAll(addons.map((a) => (a.id === id ? { ...a, enabled } : a)));
}
