export type ImageType = 'poster' | 'backdrop' | 'thumbnail';

/**
 * Normalizes image URLs for reliable rendering on mobile/Android.
 * - Converts insecure http:// URLs to https:// for known media CDNs.
 * - Optimizes CDN image dimensions (TMDB, Metahub, etc.) so smaller payloads
 *   (e.g., 40KB w342 poster instead of 3MB original) load instantly.
 */
export function normalizeImageUrl(url?: string | null, type: ImageType = 'poster'): string {
  if (!url) return '';
  let trimmed = url.trim();

  // Enforce HTTPS
  if (trimmed.startsWith('http://')) {
    trimmed = trimmed.replace(/^http:\/\//i, 'https://');
  }

  // TMDB size optimization (w185 for thumbs, w342 for posters, w780 for backdrops)
  if (trimmed.includes('image.tmdb.org/t/p/')) {
    if (type === 'thumbnail') {
      trimmed = trimmed.replace(/\/t\/p\/(original|w1280|w780|w500|w342|w185)\//i, '/t/p/w185/');
    } else if (type === 'poster') {
      trimmed = trimmed.replace(/\/t\/p\/(original|w1280|w780|w500)\//i, '/t/p/w342/');
    } else if (type === 'backdrop') {
      trimmed = trimmed.replace(/\/t\/p\/(original|w1280)\//i, '/t/p/w780/');
    }
  }

  // Metahub size optimization
  if (trimmed.includes('images.metahub.space/poster/')) {
    if (type === 'thumbnail') {
      trimmed = trimmed.replace(/\/poster\/(large|medium)\//i, '/poster/small/');
    } else if (type === 'poster') {
      trimmed = trimmed.replace(/\/poster\/large\//i, '/poster/medium/');
    }
  }

  return trimmed;
}
