import { Video } from '@/services/cinemeta';

export interface EpisodeSelectorProps {
  seasons: number[];
  selectedSeason: number | null;
  onSelectSeason: (season: number) => void;
  allVideos: Video[];
  posterFallback?: string;
  onPlayEpisode: (season: number, episode: number) => void;
  watchedEpisodeKeys?: Set<string>;
  onToggleWatched?: (season: number, episode: number) => void;
}

export function seasonLabel(season: number): string {
  return season === 0 ? 'Specials' : `Season ${season}`;
}
