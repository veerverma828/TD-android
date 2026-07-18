import AsyncStorage from '@react-native-async-storage/async-storage';

import * as traktService from '@/services/traktService';

const WATCHED_KEY = 'watched_content_ids';

async function readAll(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(WATCHED_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

async function writeAll(ids: Set<string>): Promise<void> {
  await AsyncStorage.setItem(WATCHED_KEY, JSON.stringify(Array.from(ids)));
}

export async function getWatchedSet(): Promise<Set<string>> {
  return readAll();
}

export async function isWatched(contentId: string): Promise<boolean> {
  const ids = await readAll();
  return ids.has(contentId);
}

// Always persists locally so watched marks survive without Trakt; syncing to
// Trakt is best-effort on top since the user may not be connected or may be offline.
export async function setWatched(contentId: string, watched: boolean): Promise<void> {
  const ids = await readAll();
  if (watched) ids.add(contentId);
  else ids.delete(contentId);
  await writeAll(ids);

  try {
    const connected = await traktService.isConnected();
    if (!connected) return;
    if (watched) await traktService.addToHistory(contentId);
    else await traktService.removeFromHistory(contentId);
  } catch {
    // local mark already saved — Trakt sync can lag/fail without blocking the UI
  }
}

// Pulls Trakt's watch history down into the local set once after connecting,
// so marks made on another device show up here without needing a live request per row.
export async function syncFromTrakt(): Promise<void> {
  const connected = await traktService.isConnected();
  if (!connected) return;

  try {
    const [movies, episodes] = await Promise.all([
      traktService.getHistoryMovies(200),
      traktService.getHistoryEpisodes(200),
    ]);
    const ids = await readAll();
    for (const m of movies) ids.add(m.contentId);
    for (const e of episodes) ids.add(`series:${e.showId}:${e.season}:${e.episode}`);
    await writeAll(ids);
  } catch {
    // best-effort
  }
}
