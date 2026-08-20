import AsyncStorage from '@react-native-async-storage/async-storage';

const ADDONS_KEY = 'stream_addons';
// Guards the one-time default-addon seed below — set the first time this
// device's addon list is ever read, so removing the seeded addon later
// (a deliberate user action) doesn't get silently undone on next launch.
const SEEDED_KEY = 'stream_addons_seeded_v1';

const TORRENTIO_MANIFEST_URL = 'https://torrentio.strem.fun/manifest.json';

// 'direct-api': plain addon, its magnet/infoHash streams get resolved by the user's own
// debrid key (see debridService.ts). 'addon-managed': addon already has a debrid service
// configured externally and returns ready-to-play links — the app never sees a key for these.
export type StreamAddonMode = 'direct-api' | 'addon-managed';
const DEFAULT_ADDON_MODE: StreamAddonMode = 'direct-api';

export interface StreamAddon {
  id: string;
  url: string;
  manifestUrl: string;
  name: string;
  version: string | null;
  enabled: boolean;
  mode: StreamAddonMode;
}

function toManifestUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/manifest.json') ? trimmed : `${trimmed}/manifest.json`;
}

// A malicious "addon" URL is otherwise indistinguishable from a real one until
// fetched — this app has fetched it (and every stream/manifest request derived from
// it, see cinemeta.ts) with no scheme or host restriction at all. Blocks the obvious
// cases: non-http(s) schemes, and literal loopback/private/link-local IPs or
// "localhost" naming an address on the device's own LAN. Doesn't (can't, from pure
// JS with no DNS-resolution access) catch DNS-rebinding to those same ranges via a
// public hostname - this is a floor, not a complete SSRF defense.
const BLOCKED_HOSTS = new Set(['localhost', '0.0.0.0', '[::1]', '::1']);

function isPrivateIPv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a === 127) return true; // loopback
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 169 && b === 254) return true; // link-local
  return false;
}

export function isSafeAddonUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTS.has(host)) return false;
    if (isPrivateIPv4(host)) return false;
    return true;
  } catch {
    return false;
  }
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
            mode: DEFAULT_ADDON_MODE,
          },
        ];
        await AsyncStorage.setItem(ADDONS_KEY, JSON.stringify(seeded));
        await AsyncStorage.setItem(SEEDED_KEY, '1');
        return seeded;
      }
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Addons saved before `mode` existed have none on disk — treat them as
    // 'direct-api' (the only mode that existed then) so existing installs keep
    // working unchanged instead of vanishing from both mode's addon lists.
    return parsed.map((a: any) => ({ ...a, mode: a.mode === 'addon-managed' ? 'addon-managed' : DEFAULT_ADDON_MODE }));
  } catch {
    return [];
  }
}

async function writeAll(addons: StreamAddon[]): Promise<void> {
  await AsyncStorage.setItem(ADDONS_KEY, JSON.stringify(addons));
}

export async function getAddons(mode?: StreamAddonMode): Promise<StreamAddon[]> {
  const addons = await readAll();
  return mode ? addons.filter((a) => a.mode === mode) : addons;
}

export async function getEnabledAddons(mode?: StreamAddonMode): Promise<StreamAddon[]> {
  const addons = await readAll();
  return addons.filter((a) => a.enabled && (!mode || a.mode === mode));
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
  if (!isSafeAddonUrl(manifestUrl)) {
    return { success: false, message: 'That address is not allowed.' };
  }
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

export async function addAddon(rawUrl: string, mode: StreamAddonMode = DEFAULT_ADDON_MODE): Promise<{ success: boolean; message?: string }> {
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
    mode,
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
