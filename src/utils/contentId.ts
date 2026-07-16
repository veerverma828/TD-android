export interface ParsedContentId {
  type: string;
  id: string;
  season?: number;
  episode?: number;
}

export function buildContentId(type: string, id: string, season?: number, episode?: number): string {
  return season != null && episode != null ? `${type}:${id}:${season}:${episode}` : `${type}:${id}`;
}

export function parseContentId(contentId: string): ParsedContentId | null {
  const parts = contentId.split(':');
  if (parts.length === 2) {
    return { type: parts[0], id: parts[1] };
  }
  if (parts.length === 4) {
    const season = parseInt(parts[2], 10);
    const episode = parseInt(parts[3], 10);
    if (Number.isNaN(season) || Number.isNaN(episode)) return null;
    return { type: parts[0], id: parts[1], season, episode };
  }
  return null;
}
