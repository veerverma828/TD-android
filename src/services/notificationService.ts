import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import { fetchMeta, MetaItem, Video } from '@/services/cinemeta';

const ENABLED_KEY = 'notifications_enabled';
const SEEN_PREFIX = 'notifications_seen_episodes:';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function isNotificationsEnabled(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(ENABLED_KEY);
  return raw === 'true';
}

export async function setNotificationsEnabled(enabled: boolean): Promise<boolean> {
  if (enabled) {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      await AsyncStorage.setItem(ENABLED_KEY, 'false');
      return false;
    }
  }
  await AsyncStorage.setItem(ENABLED_KEY, String(enabled));
  return enabled;
}

function episodeKey(v: Video): string {
  return `${v.season}:${v.episode}`;
}

async function getSeenEpisodes(showId: string): Promise<Set<string> | null> {
  const raw = await AsyncStorage.getItem(`${SEEN_PREFIX}${showId}`);
  if (!raw) return null;
  try {
    return new Set(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function saveSeenEpisodes(showId: string, keys: string[]): Promise<void> {
  await AsyncStorage.setItem(`${SEEN_PREFIX}${showId}`, JSON.stringify(keys));
}

// Diffs each followed show's aired episodes against what was seen last check.
// A show checked for the first time only seeds its seen-set (no notification) —
// otherwise every pre-existing episode in a freshly added show would fire at once.
export async function checkForNewEpisodes(followedSeries: MetaItem[]): Promise<void> {
  const enabled = await isNotificationsEnabled();
  if (!enabled) return;

  const now = Date.now();
  for (const show of followedSeries) {
    try {
      const meta = await fetchMeta('series', show.id);
      const videos = meta?.videos;
      if (!videos || videos.length === 0) continue;

      const aired = videos.filter((v) => v.released && new Date(v.released).getTime() <= now);
      const airedKeys = aired.map(episodeKey);
      const seen = await getSeenEpisodes(show.id);

      if (seen === null) {
        await saveSeenEpisodes(show.id, airedKeys);
        continue;
      }

      const newlyAired = aired.filter((v) => !seen.has(episodeKey(v)));
      if (newlyAired.length > 0) {
        for (const ep of newlyAired.slice(0, 3)) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `New episode: ${show.name}`,
              body: `S${ep.season}:E${ep.episode}${ep.title ? ` — ${ep.title}` : ''} is now available.`,
              data: { showId: show.id, season: ep.season, episode: ep.episode },
            },
            trigger: null,
          });
        }
        await saveSeenEpisodes(show.id, airedKeys);
      }
    } catch {
      // best-effort — skip this show this pass, retry on next check
    }
  }
}
