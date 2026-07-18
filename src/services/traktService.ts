import { getSecureItem, saveSecureItem, deleteSecureItem } from '@/services/storageService';
import { buildContentId, parseContentId } from '@/utils/contentId';
import {
  TRAKT_CLIENT_ID,
  TRAKT_CLIENT_SECRET,
  TRAKT_API_BASE,
  TRAKT_API_VERSION,
  TRAKT_REDIRECT_URI,
} from '@/constants/trakt';

const ACCESS_TOKEN_KEY = 'trakt_access_token';
const REFRESH_TOKEN_KEY = 'trakt_refresh_token';
const EXPIRES_AT_KEY = 'trakt_expires_at';

const FETCH_TIMEOUT_MS = 15000;
const REFRESH_WINDOW_MS = 5 * 60 * 1000;
const DEFAULT_POLL_INTERVAL_SECONDS = 5;
const DEFAULT_POLL_EXPIRES_SECONDS = 600;

export interface DeviceAuthStart {
  deviceCode: string;
  userCode: string;
  verificationUrl: string;
  expiresIn: number;
  interval: number;
}

export interface TraktPlaybackEntry {
  traktId: number;
  contentId: string;
  progressPct: number;
  pausedAt: string;
}

export interface TraktHistoryMovieEntry {
  contentId: string;
  watchedAt: string;
}

export interface TraktHistoryEpisodeEntry {
  showId: string; // imdb id of the parent show
  season: number;
  episode: number;
  watchedAt: string;
}

export type DeviceAuthResult = 'success' | 'expired' | 'denied';

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

export function isTraktConfigured(): boolean {
  return (
    !!TRAKT_CLIENT_ID &&
    !!TRAKT_CLIENT_SECRET &&
    !TRAKT_CLIENT_ID.startsWith('TODO_') &&
    !TRAKT_CLIENT_SECRET.startsWith('TODO_')
  );
}

async function saveTokens(data: { access_token: string; refresh_token: string; expires_in: number; created_at: number }) {
  const expiresAt = (data.created_at + data.expires_in) * 1000;
  await Promise.all([
    saveSecureItem(ACCESS_TOKEN_KEY, data.access_token),
    saveSecureItem(REFRESH_TOKEN_KEY, data.refresh_token),
    saveSecureItem(EXPIRES_AT_KEY, String(expiresAt)),
  ]);
}

export async function isConnected(): Promise<boolean> {
  return !!(await getSecureItem(ACCESS_TOKEN_KEY));
}

// Lets TraktContext know when the service layer disconnects on its own (e.g.
// a request() call finds the refresh token dead) — without this, the UI kept
// showing "Connected" forever after a silent, un-recoverable session expiry.
type DisconnectListener = () => void;
const disconnectListeners = new Set<DisconnectListener>();

export function onDisconnected(listener: DisconnectListener): () => void {
  disconnectListeners.add(listener);
  return () => disconnectListeners.delete(listener);
}

export async function disconnect(): Promise<void> {
  const accessToken = await getSecureItem(ACCESS_TOKEN_KEY);
  await Promise.all([
    deleteSecureItem(ACCESS_TOKEN_KEY),
    deleteSecureItem(REFRESH_TOKEN_KEY),
    deleteSecureItem(EXPIRES_AT_KEY),
  ]);
  if (accessToken && isTraktConfigured()) {
    try {
      await fetchWithTimeout(`${TRAKT_API_BASE}/oauth/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: accessToken,
          client_id: TRAKT_CLIENT_ID,
          client_secret: TRAKT_CLIENT_SECRET,
        }),
      });
    } catch {
      // best-effort only — local tokens are already cleared
    }
  }
  disconnectListeners.forEach((listener) => listener());
}

export async function startDeviceAuth(): Promise<DeviceAuthStart> {
  if (!isTraktConfigured()) {
    throw new Error('Trakt is not configured yet.');
  }
  const res = await fetchWithTimeout(`${TRAKT_API_BASE}/oauth/device/code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: TRAKT_CLIENT_ID }),
  });
  if (!res.ok) {
    throw new Error('Failed to start Trakt device authorization.');
  }
  const data = await res.json();
  return {
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUrl: data.verification_url,
    expiresIn: data.expires_in,
    interval: data.interval,
  };
}

export interface CancellablePoll {
  cancel: () => void;
}

export function pollDeviceToken(
  deviceCode: string,
  intervalSeconds: number = DEFAULT_POLL_INTERVAL_SECONDS,
  expiresInSeconds: number = DEFAULT_POLL_EXPIRES_SECONDS
): { promise: Promise<DeviceAuthResult>; cancel: () => void } {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let waitSeconds = intervalSeconds;
  const startedAt = Date.now();

  const cancel = () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
  };

  const promise = new Promise<DeviceAuthResult>((resolve) => {
    const tick = async () => {
      if (cancelled) return;
      if (Date.now() - startedAt >= expiresInSeconds * 1000) {
        resolve('expired');
        return;
      }

      try {
        const res = await fetchWithTimeout(`${TRAKT_API_BASE}/oauth/device/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: deviceCode,
            client_id: TRAKT_CLIENT_ID,
            client_secret: TRAKT_CLIENT_SECRET,
          }),
        });

        if (res.status === 200) {
          const data = await res.json();
          await saveTokens({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in,
            created_at: data.created_at ?? Math.floor(Date.now() / 1000),
          });
          resolve('success');
          return;
        }

        if (res.status === 400) {
          const data = await res.json().catch(() => ({}));
          if (data.error === 'slow_down') {
            waitSeconds += 1;
          } else if (data.error === 'expired_token') {
            resolve('expired');
            return;
          } else if (data.error === 'access_denied') {
            resolve('denied');
            return;
          }
          // authorization_pending or unknown 400 — keep polling
        } else if (res.status === 410) {
          resolve('expired');
          return;
        } else if (res.status === 403) {
          resolve('denied');
          return;
        }
        // any other status — treat as transient, keep polling
      } catch {
        // network error — treat as transient, keep polling
      }

      if (cancelled) return;
      timer = setTimeout(tick, waitSeconds * 1000);
    };

    timer = setTimeout(tick, waitSeconds * 1000);
  });

  return { promise, cancel };
}

// Parallel in-flight requests can all hit an expired token at once; share one
// refresh call between them instead of issuing redundant token exchanges.
let refreshInFlight: Promise<boolean> | null = null;

export function refreshToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = doRefreshToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function doRefreshToken(): Promise<boolean> {
  if (!isTraktConfigured()) return false;
  const refresh = await getSecureItem(REFRESH_TOKEN_KEY);
  if (!refresh) return false;

  try {
    const res = await fetchWithTimeout(`${TRAKT_API_BASE}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refresh_token: refresh,
        client_id: TRAKT_CLIENT_ID,
        client_secret: TRAKT_CLIENT_SECRET,
        redirect_uri: TRAKT_REDIRECT_URI,
        grant_type: 'refresh_token',
      }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    await saveTokens({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      created_at: data.created_at ?? Math.floor(Date.now() / 1000),
    });
    return true;
  } catch {
    return false;
  }
}

export async function ensureValidToken(): Promise<string | null> {
  const accessToken = await getSecureItem(ACCESS_TOKEN_KEY);
  if (!accessToken) return null;

  const expiresAtRaw = await getSecureItem(EXPIRES_AT_KEY);
  const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : 0;

  if (!expiresAt || Date.now() > expiresAt - REFRESH_WINDOW_MS) {
    const refreshed = await refreshToken();
    if (!refreshed) return null;
    return getSecureItem(ACCESS_TOKEN_KEY);
  }

  return accessToken;
}

async function request<T>(path: string, init: RequestInit = {}, isRetry = false): Promise<T> {
  const token = await ensureValidToken();
  if (!token) {
    throw new Error('Not connected to Trakt.');
  }

  const res = await fetchWithTimeout(`${TRAKT_API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'trakt-api-version': TRAKT_API_VERSION,
      'trakt-api-key': TRAKT_CLIENT_ID,
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });

  if (res.status === 401 && !isRetry) {
    const refreshed = await refreshToken();
    if (refreshed) {
      return request<T>(path, init, true);
    }
    await disconnect();
    throw new Error('Trakt session expired. Please reconnect.');
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    if (__DEV__) console.log('[TRAKT-DEBUG-ERR]', path, 'status=', res.status, 'body=', errBody);
    throw new Error(`Trakt request failed (${res.status}).`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  return text ? JSON.parse(text) : (undefined as T);
}

export async function getUserProfile(): Promise<{ username: string } | null> {
  try {
    const data = await request<any>('/users/me');
    return { username: data?.username || data?.ids?.slug || 'Trakt user' };
  } catch {
    return null;
  }
}

function mapPlaybackEntry(item: any): TraktPlaybackEntry | null {
  if (item.type === 'movie' && item.movie?.ids?.imdb) {
    return {
      traktId: item.id,
      contentId: buildContentId('movie', item.movie.ids.imdb),
      progressPct: item.progress ?? 0,
      pausedAt: item.paused_at,
    };
  }
  if (item.type === 'episode' && item.show?.ids?.imdb && item.episode?.season != null && item.episode?.number != null) {
    return {
      traktId: item.id,
      contentId: buildContentId('series', item.show.ids.imdb, item.episode.season, item.episode.number),
      progressPct: item.progress ?? 0,
      pausedAt: item.paused_at,
    };
  }
  return null;
}

export async function getPlaybackProgress(limit = 50): Promise<TraktPlaybackEntry[]> {
  const data = await request<any[]>(`/sync/playback?limit=${limit}`);
  return (data || [])
    .map(mapPlaybackEntry)
    .filter((entry): entry is TraktPlaybackEntry => entry !== null);
}

// History dedupe: Trakt returns newest-first, so the first occurrence per
// movie/show is already the most recently watched one.
export async function getHistoryMovies(limit = 50): Promise<TraktHistoryMovieEntry[]> {
  const data = await request<any[]>(`/sync/history/movies?limit=${limit}`);
  const seen = new Set<string>();
  const out: TraktHistoryMovieEntry[] = [];
  for (const item of data || []) {
    const imdb = item.movie?.ids?.imdb;
    if (!imdb || seen.has(imdb)) continue;
    seen.add(imdb);
    out.push({ contentId: buildContentId('movie', imdb), watchedAt: item.watched_at });
  }
  return out;
}

export async function getHistoryEpisodes(limit = 50): Promise<TraktHistoryEpisodeEntry[]> {
  const data = await request<any[]>(`/sync/history/episodes?limit=${limit}`);
  const seen = new Set<string>();
  const out: TraktHistoryEpisodeEntry[] = [];
  for (const item of data || []) {
    const imdb = item.show?.ids?.imdb;
    const season = item.episode?.season;
    const episode = item.episode?.number;
    if (!imdb || season == null || episode == null || seen.has(imdb)) continue;
    seen.add(imdb);
    out.push({ showId: imdb, season, episode, watchedAt: item.watched_at });
  }
  return out;
}

export async function getTraktProgressPct(contentId: string): Promise<number | null> {
  try {
    const entries = await getPlaybackProgress();
    const match = entries.find((e) => e.contentId === contentId);
    return match ? match.progressPct : null;
  } catch {
    return null;
  }
}

export async function removePlaybackItem(traktPlaybackId: number): Promise<void> {
  await request(`/sync/playback/${traktPlaybackId}`, { method: 'DELETE' });
}

function buildScrobbleBody(contentId: string, progress: number): Record<string, any> | null {
  const parsed = parseContentId(contentId);
  if (!parsed) return null;
  if (parsed.season != null && parsed.episode != null) {
    return {
      progress,
      show: { ids: { imdb: parsed.id } },
      episode: { season: parsed.season, number: parsed.episode },
    };
  }
  return {
    progress,
    movie: { ids: { imdb: parsed.id } },
  };
}

async function scrobble(action: 'start' | 'pause' | 'stop', contentId: string, progressPct: number): Promise<void> {
  try {
    const body = buildScrobbleBody(contentId, Math.min(100, Math.max(0, progressPct)));
    if (!body) return;
    if (__DEV__) console.log('[TRAKT-DEBUG-BODY]', action, JSON.stringify(body));
    await request(`/scrobble/${action}`, { method: 'POST', body: JSON.stringify(body) });
  } catch (err) {
    console.warn(`Trakt scrobble/${action} failed:`, err);
  }
}

export const scrobbleStart = (contentId: string, progressPct: number) => scrobble('start', contentId, progressPct);
export const scrobblePause = (contentId: string, progressPct: number) => scrobble('pause', contentId, progressPct);
export const scrobbleStop = (contentId: string, progressPct: number) => scrobble('stop', contentId, progressPct);

function buildHistoryBody(contentId: string): Record<string, any> | null {
  const parsed = parseContentId(contentId);
  if (!parsed) return null;
  if (parsed.season != null && parsed.episode != null) {
    return {
      shows: [
        {
          ids: { imdb: parsed.id },
          seasons: [{ number: parsed.season, episodes: [{ number: parsed.episode }] }],
        },
      ],
    };
  }
  return { movies: [{ ids: { imdb: parsed.id } }] };
}

export async function addToHistory(contentId: string): Promise<void> {
  const body = buildHistoryBody(contentId);
  if (!body) return;
  await request('/sync/history', { method: 'POST', body: JSON.stringify(body) });
}

export async function removeFromHistory(contentId: string): Promise<void> {
  const body = buildHistoryBody(contentId);
  if (!body) return;
  await request('/sync/history/remove', { method: 'POST', body: JSON.stringify(body) });
}
