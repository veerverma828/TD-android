import { ContinueWatchingSource } from '@/contexts/SettingsContext';

export function getEffectiveSource(
  preference: ContinueWatchingSource,
  traktConnected: boolean
): ContinueWatchingSource {
  return preference === 'trakt' && traktConnected ? 'trakt' : 'local';
}
