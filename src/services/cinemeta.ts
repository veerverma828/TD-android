import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatTorrentio, TorrentioStream } from '../utils/streamHelpers';

export const CINEMETA_BASE = "https://v3-cinemeta.strem.io";
const CACHE_TTL = 5 * 60 * 1000;
const CATALOG_STORAGE_TTL = 15 * 60 * 1000;

export interface MetaItem {
  id: string;
  type: string;
  name: string;
  poster?: string;
  background?: string;
  description?: string;
  releaseInfo?: string;
  imdbRating?: string;
  runtime?: string;
  genres?: string[];
  director?: string[];
  cast?: string[];
}

export interface Video {
  id: string;
  title: string;
  released: string;
  season: number;
  episode: number;
  thumbnail?: string;
  overview?: string;
}

export interface DetailedMetaItem extends MetaItem {
  videos?: Video[];
}

// In-memory cache for fast subsequent reads within session
const responseCache = new Map<string, { data: any; timestamp: number }>();

async function readCatalogStorage(key: string) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;

    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CATALOG_STORAGE_TTL) return null;

    return data;
  } catch {
    return null;
  }
}

async function writeCatalogStorage(key: string, data: any) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // silent fail
  }
}

export interface FetchOptions {
  ttl?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  retries?: number;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, options: FetchOptions = {}): Promise<any> {
  const { ttl = CACHE_TTL, timeoutMs = 15000, signal, retries = 0 } = options;
  const now = Date.now();
  const cached = responseCache.get(url);

  if (cached && now - cached.timestamp < ttl) {
    return cached.data;
  }

  let attempt = 0;
  while (attempt <= retries) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const onAbort = () => {
      controller.abort();
    };
    if (signal) {
      if (typeof signal.addEventListener === 'function') {
        signal.addEventListener('abort', onAbort);
      } else {
        signal.onabort = onAbort;
      }
      if (signal.aborted) onAbort();
    }

    try {
      const res = await fetch(url, { signal: controller.signal as any });
      clearTimeout(timeout);
      
      if (signal) {
        if (typeof signal.removeEventListener === 'function') {
          signal.removeEventListener('abort', onAbort);
        } else {
          signal.onabort = null;
        }
      }

      if (!res.ok) {
        throw new Error(`ServerError: ${res.status}`);
      }

      const data = await res.json();
      responseCache.set(url, { data, timestamp: now });
      return data;
    } catch (error: any) {
      clearTimeout(timeout);
      
      if (signal) {
        if (typeof signal.removeEventListener === 'function') {
          signal.removeEventListener('abort', onAbort);
        } else {
          signal.onabort = null;
        }
      }

      if (error?.name === 'AbortError') {
        if (signal?.aborted) {
          throw new Error('AbortError');
        } else {
          throw new Error('TimeoutError');
        }
      }

      const isTransient = error?.message && (error.message.includes('Network') || error.message.includes('ServerError'));
      if (attempt < retries && isTransient) {
        attempt++;
        await delay(1000 * Math.pow(2, attempt - 1));
        continue;
      }

      throw error;
    }
  }
}

const encodePathPart = (value: string | number) => encodeURIComponent(String(value).trim());

export async function fetchDefaultMovies(): Promise<MetaItem[]> {
  const storageKey = "cinemeta:movies:top";
  const cached = await readCatalogStorage(storageKey);
  if (cached) return cached;

  const data = await fetchWithRetry(`${CINEMETA_BASE}/catalog/movie/top.json`);
  const metas = data.metas || [];
  await writeCatalogStorage(storageKey, metas);
  return metas;
}

export async function fetchDefaultSeries(): Promise<MetaItem[]> {
  const storageKey = "cinemeta:series:top";
  const cached = await readCatalogStorage(storageKey);
  if (cached) return cached;

  const data = await fetchWithRetry(`${CINEMETA_BASE}/catalog/series/top.json`);
  const metas = data.metas || [];
  await writeCatalogStorage(storageKey, metas);
  return metas;
}

export async function searchMovies(query: string): Promise<MetaItem[]> {
  if (!query.trim()) return [];
  const encodedQuery = encodePathPart(query);
  const data = await fetchWithRetry(`${CINEMETA_BASE}/catalog/movie/top/search=${encodedQuery}.json`);
  return data.metas || [];
}

export async function searchSeries(query: string): Promise<MetaItem[]> {
  if (!query.trim()) return [];
  const encodedQuery = encodePathPart(query);
  const data = await fetchWithRetry(`${CINEMETA_BASE}/catalog/series/top/search=${encodedQuery}.json`);
  return data.metas || [];
}

export async function fetchCatalog(type: string, category: string): Promise<MetaItem[]> {
  const data = await fetchWithRetry(`${CINEMETA_BASE}/catalog/${encodePathPart(type)}/${encodePathPart(category)}.json`);
  return data.metas || [];
}

export async function fetchMeta(type: string, id: string, options?: FetchOptions): Promise<DetailedMetaItem | null> {
  try {
    const data = await fetchWithRetry(
      `${CINEMETA_BASE}/meta/${encodePathPart(type)}/${encodePathPart(id)}.json`,
      options
    );
    return data.meta || null;
  } catch (err: any) {
    if (err.message !== 'AbortError') console.error("Failed to fetch meta:", err);
    return null;
  }
}

async function fetchAddonStreams(url: string, options?: FetchOptions): Promise<TorrentioStream[]> {
  const data = await fetchWithRetry(url, { 
    ttl: 60 * 1000, 
    timeoutMs: 20000,
    retries: 2, 
    ...options 
  });
  return formatTorrentio(data);
}

export async function fetchMovieStreams(id: string, addonApis: string[] = ["https://torrentio.strem.fun/manifest.json"], options?: FetchOptions): Promise<TorrentioStream[]> {
  const fetchPromises = addonApis.map((api) => {
    const baseUrl = api.replace(/\/manifest\.json$/, "");
    return fetchAddonStreams(`${baseUrl}/stream/movie/${encodePathPart(id)}.json`, options).catch(err => {
      if (err.message !== 'AbortError') console.error(err);
      throw err;
    });
  });
  const dataArray = await Promise.all(fetchPromises);
  return dataArray.flat();
}

export async function fetchEpisodeStreams(id: string, season: number, episode: number, addonApis: string[] = ["https://torrentio.strem.fun/manifest.json"], options?: FetchOptions): Promise<TorrentioStream[]> {
  const fetchPromises = addonApis.map((api) => {
    const baseUrl = api.replace(/\/manifest\.json$/, "");
    return fetchAddonStreams(
      `${baseUrl}/stream/series/${encodePathPart(id)}:${encodePathPart(season)}:${encodePathPart(episode)}.json`,
      options
    ).catch(err => {
      if (err.message !== 'AbortError') console.error(err);
      throw err;
    });
  });
  const dataArray = await Promise.all(fetchPromises);
  return dataArray.flat();
}
