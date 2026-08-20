import { Platform } from 'react-native';
import { requireNativeModule, EventEmitter } from 'expo-modules-core';
import { DebridFile, DebridFilesResult } from './debridService';

// Native-only module (Kotlin/libtorrent4j) - no web/iOS impl exists. Load lazily
// so importing this file on web doesn't throw at bundle-eval time; unsupported
// platforms get a proxy that fails calls with a clear P2PStreamError instead.
const unsupportedTorrentStream = new Proxy(
  {},
  {
    get() {
      return () => {
        throw new P2PStreamError('P2P streaming is not supported on this platform.', 'INTERNAL');
      };
    },
  },
);

const TorrentStream =
  Platform.OS === 'android' ? requireNativeModule('TorrentStream') : unsupportedTorrentStream;

// Real BitTorrent streaming - no debrid account, no API key. Resolves a magnet
// straight off the DHT/peer swarm via the native TorrentStream module (libtorrent4j)
// and hands back a local http://127.0.0.1 URL that the existing player can play
// exactly like a debrid-resolved link, just fed by peers instead of a debrid CDN.

export type P2PFailureCode =
  | 'OFFLINE'
  | 'P2P_BLOCKED'
  | 'DEAD_TORRENT'
  | 'NO_METADATA'
  | 'STALLED'
  | 'CANCELLED'
  | 'INVALID_MAGNET'
  | 'INTERNAL';

interface TorrentProgressEvent {
  phase: 'dht' | 'metadata' | 'buffering' | 'retry';
  message: string;
  peers: number;
  seeds: number;
  dhtNodes: number;
  progress: number;
  downloadRate: number;
}

// Explicit event map — without it EventEmitter's generic defaults to
// Record<never, never> and addListener() fails to typecheck.
type TorrentStreamEventsMap = {
  torrentProgress: (event: TorrentProgressEvent) => void;
};

const torrentEmitter = new EventEmitter<TorrentStreamEventsMap>(
  Platform.OS === 'android' ? (TorrentStream as any) : ({} as any),
);

export class P2PStreamError extends Error {
  code: P2PFailureCode;
  diagnostics?: string;

  constructor(message: string, code: P2PFailureCode, diagnostics?: string) {
    super(message);
    this.name = 'P2PStreamError';
    this.code = code;
    this.diagnostics = diagnostics;
  }
}

function formatBytesPerSecond(rate: number): string {
  if (!rate || rate <= 0) return '';
  if (rate >= 1024 * 1024) return ` · ${(rate / (1024 * 1024)).toFixed(1)} MB/s`;
  return ` · ${Math.round(rate / 1024)} KB/s`;
}

function describe(event: TorrentProgressEvent): string {
  if (event.phase === 'buffering' && event.progress > 0) {
    return `Buffering ${Math.round(event.progress * 100)}%${formatBytesPerSecond(event.downloadRate)}`;
  }
  return event.message;
}

// The native side rejects with code `ERR_TORRENT_<CODE>` and a message that has the
// machine-readable diagnostics appended in brackets. Split those back apart: the
// prose goes to the user, the diagnostics go to the log where they're actually
// useful for working out whether a failure was the network or the torrent.
function toP2PError(error: any): P2PStreamError {
  const rawCode: string = error?.code ?? '';
  const code = (rawCode.startsWith('ERR_TORRENT_') ? rawCode.slice('ERR_TORRENT_'.length) : 'INTERNAL') as P2PFailureCode;
  const rawMessage: string = error?.message ?? 'Torrent streaming failed.';

  const diagnosticsMatch = rawMessage.match(/\s*\[([^\]]*)\]\s*$/);
  const diagnostics = diagnosticsMatch?.[1];
  const message = diagnosticsMatch ? rawMessage.slice(0, diagnosticsMatch.index).trim() : rawMessage;

  if (diagnostics) console.warn(`[p2p] ${code}: ${diagnostics}`);
  return new P2PStreamError(message, code, diagnostics);
}

// Subscribes to native progress for the duration of one call. The subscription is
// per-call rather than global so a listener can't outlive the operation it belongs
// to and start narrating a later, unrelated stream.
async function withProgress<T>(onStatus: ((stage: string) => void) | undefined, run: () => Promise<T>): Promise<T> {
  const subscription = onStatus
    ? torrentEmitter.addListener('torrentProgress', (event) => onStatus(describe(event)))
    : null;
  try {
    return await run();
  } catch (error) {
    throw toP2PError(error);
  } finally {
    subscription?.remove();
  }
}

export async function getP2PFiles(magnet: string, onStatus?: (stage: string) => void): Promise<DebridFilesResult> {
  onStatus?.('Connecting to the BitTorrent network...');
  return withProgress(onStatus, async () => {
    const result = (await TorrentStream.getFiles(magnet)) as { torrentId: string; name: string; files: DebridFile[] };
    return {
      torrentId: result.torrentId,
      files: [...result.files].sort((a, b) => b.size - a.size),
    };
  });
}

export async function startP2PStream(
  torrentId: string,
  fileId: string | number,
  onStatus?: (stage: string) => void,
): Promise<string> {
  onStatus?.('Starting P2P stream...');
  return withProgress(onStatus, async () => (await TorrentStream.startStream(torrentId, Number(fileId))) as string);
}

// Aborts an in-flight resolve/buffer while leaving the session (and its warmed-up
// DHT routing table) intact, so retrying is fast.
export async function cancelP2PStream(): Promise<void> {
  try {
    await TorrentStream.cancel();
  } catch {
    // Best-effort: cancelling a request that already finished isn't an error.
  }
}

export async function stopP2PStream(): Promise<void> {
  await TorrentStream.stop();
}

export async function getP2PDiagnostics(): Promise<string> {
  try {
    return (await TorrentStream.diagnostics()) as string;
  } catch {
    return 'unavailable';
  }
}
