import { getSecureItem } from './storageService';
import { getP2PFiles, startP2PStream } from './p2pStreamService';

export type DebridProvider = 'real-debrid' | 'torbox' | 'p2p';

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
// Torbox's createtorrent/mylist endpoints are measurably slower under load than Real-Debrid's;
// giving them the same 15s budget as a plain GET caused most of the false-positive timeouts.
const SLOW_FETCH_TIMEOUT_MS = 30000;
const RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1000;
// Key verification is interactive - the user is staring at a spinner - so it gets a
// tighter budget than the background torrent calls. 3x15s left them waiting ~48s
// before seeing an error on a network that was never going to answer.
const VERIFY_TIMEOUT_MS = 10000;
const VERIFY_ATTEMPTS = 2;
// Android's own captive-portal check endpoint: 204, empty body, and about as close to
// never-blocked as a control URL gets. Used only to tell "this device has no internet"
// apart from "this device has internet but can't reach the debrid provider."
const CONNECTIVITY_PROBE_URL = 'https://connectivitycheck.gstatic.com/generate_204';
const CONNECTIVITY_PROBE_TIMEOUT_MS = 5000;

type NetworkFailureKind = 'timeout' | 'unreachable';

interface DebridNetworkError extends Error {
  networkFailureKind: NetworkFailureKind;
}

// Tagged plain Error rather than an Error subclass: `instanceof` on subclassed built-ins
// is unreliable once Hermes/TS downleveling gets involved, a tag property never is.
function networkError(kind: NetworkFailureKind, message: string): DebridNetworkError {
  const error = new Error(message) as DebridNetworkError;
  error.networkFailureKind = kind;
  return error;
}

function isNetworkError(error: any): error is DebridNetworkError {
  return !!error?.networkFailureKind;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error: any) {
    const message = error?.message || '';
    if (error?.name === 'AbortError' || /abort|cancel/i.test(message)) {
      throw networkError('timeout', 'Request timed out. Check your connection and try again.');
    }
    // React Native collapses DNS failures, refused connections and blocked hosts into a
    // bare TypeError('Network request failed'), so this is the only signal we get that the
    // host was never reached at all - as opposed to reached and slow.
    if (error?.name === 'TypeError' || /network request failed|failed to fetch/i.test(message)) {
      throw networkError('unreachable', 'Could not reach the server. Your network may be blocking it.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// Best-effort: a false here means "probe failed too," which is exactly what we want to
// treat as offline. Never throws - callers use it purely to pick an error message.
async function hasInternetAccess(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONNECTIVITY_PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(CONNECTIVITY_PROBE_URL, { signal: controller.signal });
    return res.status === 204 || res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

// A timeout against one host tells the user nothing actionable on its own. Probing a
// control URL turns it into a diagnosis: no internet at all, or this provider specifically
// unreachable while everything else works (ISP/router DNS filtering, or provider outage).
async function describeNetworkFailure(error: DebridNetworkError, label: string): Promise<string> {
  if (!(await hasInternetAccess())) {
    return 'No internet connection. Check your Wi-Fi or mobile data and try again.';
  }
  if (error.networkFailureKind === 'timeout') {
    return `${label} did not respond in time, though the rest of your connection works. ${label} may be down, or your network may be blocking it — try mobile data or a VPN.`;
  }
  return `Can't reach ${label}, though the rest of your connection works. Your network or DNS is likely blocking it — try mobile data, a VPN, or set Private DNS to dns.google.`;
}

// 429/5xx are the provider's problem, not the key's - the key may well be fine, so these
// count as "no verdict" rather than a rejection.
function httpFailureReason(status: number): VerifyFailureReason {
  return status === 401 || status === 403 ? 'invalid' : 'network';
}

function describeHttpFailure(status: number, label: string): string {
  if (status === 401 || status === 403) {
    return `Invalid ${label} API key. Copy it again from your ${label} account settings.`;
  }
  if (status === 429) {
    return `${label} is rate-limiting this key. Wait a minute and try again.`;
  }
  if (status >= 500) {
    return `${label} is having server trouble (HTTP ${status}). Not your key — try again shortly.`;
  }
  return `${label} rejected the request (HTTP ${status}).`;
}

// Retries transient failures (timeouts, network drops, 429/5xx) with exponential backoff + jitter.
// Does NOT retry 4xx (bad key, bad request) - those fail fast so the user gets a real answer.
async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  { timeoutMs = FETCH_TIMEOUT_MS, attempts = RETRY_ATTEMPTS }: { timeoutMs?: number; attempts?: number } = {}
): Promise<Response> {
  let lastError: any;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetchWithTimeout(url, init, timeoutMs);
      const isRetryableStatus = res.status === 429 || res.status >= 500;
      if (isRetryableStatus && i < attempts - 1) {
        const retryAfterHeader = Number(res.headers.get('Retry-After'));
        const delay = retryAfterHeader > 0 ? retryAfterHeader * 1000 : RETRY_BASE_DELAY_MS * Math.pow(2, i) + Math.random() * 300;
        await sleep(delay);
        continue;
      }
      return res;
    } catch (error) {
      lastError = error;
      // A host that can't be resolved or connected to at all won't start working within a
      // few seconds of backoff - retrying just multiplies the wait before the user gets
      // told what's actually wrong. Timeouts still retry: those do recover.
      if (isNetworkError(error) && error.networkFailureKind === 'unreachable') {
        break;
      }
      if (i < attempts - 1) {
        await sleep(RETRY_BASE_DELAY_MS * Math.pow(2, i) + Math.random() * 300);
        continue;
      }
    }
  }
  throw lastError;
}

async function pollUntil<T>(
  attempt: (i: number) => Promise<T | null>,
  attempts = POLL_ATTEMPTS,
  onAttempt?: (i: number, attempts: number) => void,
): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    onAttempt?.(i, attempts);
    const result = await attempt(i);
    if (result !== null) return result;
    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, POLL_BASE_DELAY_MS * Math.pow(1.5, i)));
    }
  }
  throw new Error('Torrent is taking too long to become ready. It may be uncached — try again shortly.');
}

// Surfaces which stage of the (potentially slow, uncached-torrent-bound) resolve
// pipeline we're in - without this a caller only knows "still working," not why.
function stalledMessage(i: number, attempts: number, verb: string): string {
  if (i === 0) return `${verb}...`;
  if (i >= Math.ceil(attempts / 2)) return `Still ${verb.toLowerCase()} — torrent may be uncached, hang tight...`;
  return `${verb}, attempt ${i + 1}/${attempts}...`;
}

export async function getActiveDebridProvider(): Promise<DebridProvider | null> {
  const provider = await getSecureItem('debrid_active_provider');
  if (provider === 'real-debrid' || provider === 'torbox' || provider === 'p2p') {
    return provider as DebridProvider;
  }
  return null;
}

export async function getDebridKey(provider: DebridProvider): Promise<string | null> {
  return await getSecureItem(`debrid_key_${provider}`);
}

// 'network' means we never got a verdict on the key - the request never landed. 'invalid'
// means the provider actively rejected it. Callers must keep these apart: only the first
// is safe to offer a "save anyway" escape hatch for.
export type VerifyFailureReason = 'network' | 'invalid' | 'unsupported';

export interface VerifyResult {
  success: boolean;
  username?: string;
  premium?: boolean;
  message?: string;
  reason?: VerifyFailureReason;
}

export async function verifyDebridKey(service: DebridProvider, apiKey: string): Promise<VerifyResult> {
  const label = service === 'torbox' ? 'TorBox' : 'Real-Debrid';
  const options = { timeoutMs: VERIFY_TIMEOUT_MS, attempts: VERIFY_ATTEMPTS };
  try {
    if (service === 'real-debrid') {
      const res = await fetchWithRetry("https://api.real-debrid.com/rest/1.0/user", {
        headers: { Authorization: `Bearer ${apiKey}` },
      }, options);
      if (!res.ok) return { success: false, message: describeHttpFailure(res.status, label), reason: httpFailureReason(res.status) };
      const data = await res.json();
      return { success: true, username: data.username, premium: !!data.premium };
    }
    if (service === 'torbox') {
      const res = await fetchWithRetry("https://api.torbox.app/v1/api/user/me", {
        headers: { Authorization: `Bearer ${apiKey}` },
      }, options);
      if (!res.ok) return { success: false, message: describeHttpFailure(res.status, label), reason: httpFailureReason(res.status) };
      const data = await res.json();
      if (data.success === false) {
        return { success: false, message: `Invalid ${label} API key. Copy it again from your ${label} account settings.`, reason: 'invalid' };
      }
      return { success: true, username: data.data?.email };
    }
    return { success: false, message: "Unsupported service", reason: 'unsupported' };
  } catch (error: any) {
    if (isNetworkError(error)) {
      return { success: false, message: await describeNetworkFailure(error, label), reason: 'network' };
    }
    return { success: false, message: error?.message || `Could not verify your ${label} API key.`, reason: 'network' };
  }
}

export async function checkCachedHashes(hashes: string[], service: DebridProvider, apiKey: string): Promise<Set<string>> {
  const cached = new Set<string>();
  const uniqueHashes = [...new Set(hashes.filter(Boolean).map((h) => h.toLowerCase()))];
  if (uniqueHashes.length === 0) return cached;

  try {
    if (service === 'real-debrid') {
      const res = await fetchWithTimeout(
        `https://api.real-debrid.com/rest/1.0/torrents/instantAvailability/${uniqueHashes.join('/')}`,
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      if (!res.ok) return cached;
      const data = await res.json();
      for (const hash of uniqueHashes) {
        const entry = data[hash] ?? data[hash.toUpperCase()];
        const hosters = entry ? Object.values(entry) : [];
        if (hosters.some((variants: any) => Array.isArray(variants) && variants.length > 0)) {
          cached.add(hash);
        }
      }
      return cached;
    }

    if (service === 'torbox') {
      const res = await fetchWithRetry(
        `https://api.torbox.app/v1/api/torrents/checkcached?hash=${uniqueHashes.join(',')}&format=list`,
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      if (!res.ok) return cached;
      const data = await res.json();
      const list = Array.isArray(data?.data) ? data.data : [];
      for (const entry of list) {
        const hash = (typeof entry === 'string' ? entry : entry?.hash)?.toLowerCase();
        if (hash) cached.add(hash);
      }
      return cached;
    }
  } catch {
    // Best-effort: no fire badges if the check fails.
  }

  return cached;
}

export async function getFiles(magnet: string, service: DebridProvider, apiKey: string, onStatus?: (stage: string) => void): Promise<DebridFilesResult> {
  if (service === 'p2p') {
    return getP2PFiles(magnet, onStatus);
  }

  onStatus?.('Adding torrent...');

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
    }, POLL_ATTEMPTS, (i, attempts) => onStatus?.(stalledMessage(i, attempts, 'Waiting for torrent')));
  }

  if (service === 'torbox') {
    const addRes = await fetchWithRetry("https://api.torbox.app/v1/api/torrents/createtorrent", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `magnet=${encodeURIComponent(magnet)}`,
    }, { timeoutMs: SLOW_FETCH_TIMEOUT_MS });
    const addData = await addRes.json();
    if (!addData.success) {
      throw new Error("Failed to add magnet to Torbox");
    }
    const torrentId = addData.data.torrent_id;

    return pollUntil<DebridFilesResult>(async () => {
      try {
        const listRes = await fetchWithRetry("https://api.torbox.app/v1/api/torrents/mylist", {
          headers: { Authorization: `Bearer ${apiKey}` },
        }, { timeoutMs: SLOW_FETCH_TIMEOUT_MS });
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
      } catch {
        // Transient network/timeout during polling - keep polling instead of failing the whole operation.
      }
      return null;
    }, POLL_ATTEMPTS, (i, attempts) => onStatus?.(stalledMessage(i, attempts, 'Waiting for torrent')));
  }

  throw new Error("Unsupported service");
}

export async function generateLink(torrentId: string | number, fileId: string | number, service: DebridProvider, apiKey: string, onStatus?: (stage: string) => void): Promise<string> {
  if (service === 'p2p') {
    return startP2PStream(torrentId as string, fileId, onStatus);
  }

  onStatus?.('Generating link...');

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
    }, POLL_ATTEMPTS, (i, attempts) => onStatus?.(stalledMessage(i, attempts, 'Generating link')));
  }

  if (service === 'torbox') {
    return pollUntil<string>(async () => {
      try {
        const res = await fetchWithRetry(
          // Authorization header alone is sufficient (and what Torbox needs to record
          // live usage data against this key) - the `token` query param is documented
          // as an alternate auth method for building shareable permalinks, not something
          // this call needs on top of the header. Dropping it stops the API key from
          // sitting in request logs/proxies as plain URL text alongside the header.
          `https://api.torbox.app/v1/api/torrents/requestdl?torrent_id=${torrentId}&file_id=${fileId}`,
          { headers: { Authorization: `Bearer ${apiKey}` } },
          { timeoutMs: SLOW_FETCH_TIMEOUT_MS }
        );
        const dlData = await res.json();
        if (dlData.success && dlData.data) {
          return dlData.data;
        }
      } catch {
        // Torbox throws while the torrent is still downloading internally; keep polling.
      }
      return null;
    }, POLL_ATTEMPTS, (i, attempts) => onStatus?.(stalledMessage(i, attempts, 'Generating link')));
  }

  throw new Error("Unsupported service");
}
