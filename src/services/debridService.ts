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
      const res = await fetch("https://api.real-debrid.com/rest/1.0/user", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) throw new Error('Invalid key');
      const data = await res.json();
      return { success: true, username: data.username, premium: !!data.premium };
    }
    if (service === 'torbox') {
      const res = await fetch("https://api.torbox.app/v1/api/user/me", {
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
  } catch (error) {
    return { success: false, message: "Invalid API key" };
  }
}

export async function getFiles(magnet: string, service: DebridProvider, apiKey: string): Promise<DebridFilesResult> {
  if (service === 'real-debrid') {
    const addRes = await fetch("https://api.real-debrid.com/rest/1.0/torrents/addMagnet", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `magnet=${encodeURIComponent(magnet)}`,
    });
    
    if (!addRes.ok) {
      throw new Error("Failed to add magnet to Real-Debrid");
    }
    const addData = await addRes.json();
    const torrentId = addData.id;

    for (let i = 0; i < 4; i++) {
      const infoRes = await fetch(`https://api.real-debrid.com/rest/1.0/torrents/info/${torrentId}`, {
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
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error("Timeout waiting for torrent metadata from Real-Debrid.");
  }

  if (service === 'torbox') {
    const addRes = await fetch("https://api.torbox.app/v1/api/torrents/createtorrent", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `magnet=${encodeURIComponent(magnet)}`,
    });
    const addData = await addRes.json();
    if (!addData.success) {
      throw new Error("Failed to add magnet to Torbox");
    }
    const torrentId = addData.data.torrent_id;

    for (let i = 0; i < 4; i++) {
      const listRes = await fetch("https://api.torbox.app/v1/api/torrents/mylist", {
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
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error("Timeout waiting for torrent metadata from Torbox.");
  }

  throw new Error("Unsupported service");
}

export async function generateLink(torrentId: string | number, fileId: string | number, service: DebridProvider, apiKey: string): Promise<string> {
  if (service === 'real-debrid') {
    const selectRes = await fetch(`https://api.real-debrid.com/rest/1.0/torrents/selectFiles/${torrentId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `files=${fileId}`,
    });

    if (!selectRes.ok && selectRes.status !== 204) {
      throw new Error("Failed to select file on Real-Debrid");
    }

    for (let i = 0; i < 4; i++) {
      const infoRes = await fetch(`https://api.real-debrid.com/rest/1.0/torrents/info/${torrentId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const infoData = await infoRes.json();

      if (infoData.status === "downloaded" && infoData.links && infoData.links.length > 0) {
        const unrestrictRes = await fetch("https://api.real-debrid.com/rest/1.0/unrestrict/link", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `link=${encodeURIComponent(infoData.links[0])}`,
        });
        const unrestrictData = await unrestrictRes.json();
        return unrestrictData.download;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error("Torrent is taking too long to cache/download on Real-Debrid.");
  }

  if (service === 'torbox') {
    for (let i = 0; i < 4; i++) {
      try {
        const dlRes = await fetch(`https://api.torbox.app/v1/api/torrents/requestdl?token=${apiKey}&torrent_id=${torrentId}&file_id=${fileId}`);
        const dlData = await dlRes.json();
        if (dlData.success && dlData.data) {
          return dlData.data;
        }
      } catch (e) {
        // Torbox throws a 400/500 if the torrent is still downloading internally
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error("Torrent is taking too long to cache/download on Torbox.");
  }

  throw new Error("Unsupported service");
}
