import { getSecureItem } from './storageService';

export type DebridProvider = 'real-debrid' | 'torbox';

export interface DebridFile {
  id: string | number;
  name: string;
  size: number;
}

export interface DebridFilesResult {
  torrentId: string | number;
  files: DebridFile[];
}

const POLL_ATTEMPTS = 6;
const POLL_BASE_DELAY_MS = 1500;
const FETCH_TIMEOUT_MS = 15000;

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error: any) {
    const isAbort = error?.name === 'AbortError' || /abort|cancel/i.test(error?.message || '');
    if (isAbort) {
      throw new Error('Request timed out. Check your connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function pollUntil<T>(attempt: (i: number) => Promise<T | null>, attempts = POLL_ATTEMPTS): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    const result = await attempt(i);
    if (result !== null) return result;
    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, POLL_BASE_DELAY_MS * Math.pow(1.5, i)));
    }
  }
  throw new Error('Torrent is taking too long to become ready. It may be uncached — try again shortly.');
}

export async function getActiveDebridProvider(): Promise<DebridProvider | null> {
  const provider = await getSecureItem('debrid_active_provider');
  if (provider === 'real-debrid' || provider === 'torbox') {
    return provider as DebridProvider;
  }
  return null;
}

export async function getDebridKey(provider: DebridProvider): Promise<string | null> {
  return await getSecureItem(`debrid_key_${provider}`);
}

export async function verifyDebridKey(service: DebridProvider, apiKey: string): Promise<{ success: boolean; username?: string; premium?: boolean; message?: string }> {
  try {
    if (service === 'real-debrid') {
      const res = await fetchWithTimeout("https://api.real-debrid.com/rest/1.0/user", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) throw new Error('Invalid key');
      const data = await res.json();
      return { success: true, username: data.username, premium: !!data.premium };
    }
    if (service === 'torbox') {
      const res = await fetchWithTimeout("https://api.torbox.app/v1/api/user/me", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) throw new Error('Invalid key');
      const data = await res.json();
      if (data.success === false) {
        return { success: false, message: "Invalid Torbox API key" };
      }
      return { success: true, username: data.data?.email };
    }
    return { success: false, message: "Unsupported service" };
  } catch (error: any) {
    return { success: false, message: error?.message || "Invalid API key" };
  }
}

export async function getFiles(magnet: string, service: DebridProvider, apiKey: string): Promise<DebridFilesResult> {
  if (service === 'real-debrid') {
    const addRes = await fetchWithTimeout("https://api.real-debrid.com/rest/1.0/torrents/addMagnet", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `magnet=${encodeURIComponent(magnet)}`,
    });

    if (!addRes.ok) {
      throw new Error("Failed to add magnet to Real-Debrid");
    }
    const addData = await addRes.json();
    const torrentId = addData.id;

    return pollUntil<DebridFilesResult>(async () => {
      const infoRes = await fetchWithTimeout(`https://api.real-debrid.com/rest/1.0/torrents/info/${torrentId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const infoData = await infoRes.json();

      if (infoData.status === "waiting_files_selection" || (infoData.files && infoData.files.length > 0)) {
        return {
          torrentId,
          files: infoData.files.map((f: any) => ({
            id: f.id,
            name: f.path,
            size: f.bytes,
          })).sort((a: any, b: any) => b.size - a.size),
        };
      }
      return null;
    });
  }

  if (service === 'torbox') {
    const addRes = await fetchWithTimeout("https://api.torbox.app/v1/api/torrents/createtorrent", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `magnet=${encodeURIComponent(magnet)}`,
    });
    const addData = await addRes.json();
    if (!addData.success) {
      throw new Error("Failed to add magnet to Torbox");
    }
    const torrentId = addData.data.torrent_id;

    return pollUntil<DebridFilesResult>(async () => {
      const listRes = await fetchWithTimeout("https://api.torbox.app/v1/api/torrents/mylist", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const listData = await listRes.json();
      const torrent = listData.data?.find((t: any) => t.id === torrentId);

      if (torrent && torrent.files && torrent.files.length > 0) {
        return {
          torrentId,
          files: torrent.files.map((f: any) => ({
            id: f.id,
            name: f.name,
            size: f.size,
          })).sort((a: any, b: any) => b.size - a.size),
        };
      }
      return null;
    });
  }

  throw new Error("Unsupported service");
}

export async function generateLink(torrentId: string | number, fileId: string | number, service: DebridProvider, apiKey: string): Promise<string> {
  if (service === 'real-debrid') {
    const selectRes = await fetchWithTimeout(`https://api.real-debrid.com/rest/1.0/torrents/selectFiles/${torrentId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `files=${fileId}`,
    });

    if (!selectRes.ok && selectRes.status !== 204) {
      throw new Error("Failed to select file on Real-Debrid");
    }

    return pollUntil<string>(async () => {
      const infoRes = await fetchWithTimeout(`https://api.real-debrid.com/rest/1.0/torrents/info/${torrentId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const infoData = await infoRes.json();

      if (infoData.status === "downloaded" && infoData.links && infoData.links.length > 0) {
        const unrestrictRes = await fetchWithTimeout("https://api.real-debrid.com/rest/1.0/unrestrict/link", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `link=${encodeURIComponent(infoData.links[0])}`,
        });
        const unrestrictData = await unrestrictRes.json();
        return unrestrictData.download;
      }
      return null;
    });
  }

  if (service === 'torbox') {
    return pollUntil<string>(async () => {
      try {
        const res = await fetchWithTimeout(
          `https://api.torbox.app/v1/api/torrents/requestdl?token=${encodeURIComponent(apiKey)}&torrent_id=${torrentId}&file_id=${fileId}`
        );
        const dlData = await res.json();
        if (dlData.success && dlData.data) {
          return dlData.data;
        }
      } catch {
        // Torbox throws while the torrent is still downloading internally; keep polling.
      }
      return null;
    });
  }

  throw new Error("Unsupported service");
}
