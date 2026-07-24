import { requireNativeModule } from 'expo-modules-core';
import { DebridFile, DebridFilesResult } from './debridService';

const TorrentStream = requireNativeModule('TorrentStream');

// Real BitTorrent streaming - no debrid account, no API key. Resolves a magnet
// straight off the DHT/peer swarm via the native TorrentStream module (libtorrent4j)
// and hands back a local http://127.0.0.1 URL that the existing player can play
// exactly like a debrid-resolved link, just fed by peers instead of a debrid CDN.

export async function getP2PFiles(magnet: string, onStatus?: (stage: string) => void): Promise<DebridFilesResult> {
  onStatus?.('Finding torrent on the network...');
  const result = await TorrentStream.getFiles(magnet) as { torrentId: string; files: DebridFile[] };
  return {
    torrentId: result.torrentId,
    files: [...result.files].sort((a, b) => b.size - a.size),
  };
}

export async function startP2PStream(torrentId: string, fileId: string | number, onStatus?: (stage: string) => void): Promise<string> {
  onStatus?.('Starting P2P stream...');
  return await TorrentStream.startStream(torrentId, Number(fileId)) as string;
}

export async function stopP2PStream(): Promise<void> {
  await TorrentStream.stop();
}
