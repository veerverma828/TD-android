// Stremio addons return a `sources` array alongside each stream — tracker
// announce URLs and DHT hints that the indexer knows actually carry this
// specific torrent. The app used to throw all of it away and hand downstream a
// bare `magnet:?xt=urn:btih:<hash>`, which is DHT-only: for anything outside the
// most popular releases that resolves slowly or not at all, and it was the main
// reason P2P playback failed with "couldn't find this torrent on the network".
//
// Trackers help the debrid providers too (they resolve uncached magnets by
// joining the swarm themselves), so this is used for every magnet the app builds,
// not just the P2P path.

// Kept deliberately short: each tracker costs an announce, and a long tail of
// dead ones just delays the live ones. The native engine keeps its own (larger)
// fallback list for the P2P path — this one exists so debrid providers and
// "Copy Magnet" also get something usable.
const DEFAULT_TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.demonii.com:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://exodus.desync.com:6969/announce',
  'udp://explodie.org:6969/announce',
];

// Guards against a hostile or broken addon padding `sources` with thousands of
// entries — the resulting URI gets passed to native code and to debrid HTTP APIs.
const MAX_TRACKERS = 25;

function isProbablyTrackerUrl(value: string): boolean {
  return /^(udp|https?|wss?):\/\//i.test(value);
}

export function extractTrackers(sources: unknown): string[] {
  if (!Array.isArray(sources)) return [];
  const trackers: string[] = [];
  for (const entry of sources) {
    if (typeof entry !== 'string') continue;
    // Documented Stremio form is "tracker:<url>"; some addons omit the prefix and
    // put the bare URL in. "dht:<infohash>" entries carry no new information — the
    // infohash is already the magnet's xt — so they're skipped.
    const value = entry.startsWith('tracker:') ? entry.slice('tracker:'.length) : entry;
    if (isProbablyTrackerUrl(value)) trackers.push(value);
  }
  return trackers;
}

export function buildMagnetUri(infoHash: string, options: { name?: string | null; sources?: unknown } = {}): string {
  const parts = [`magnet:?xt=urn:btih:${infoHash}`];

  if (options.name) {
    parts.push(`dn=${encodeURIComponent(options.name)}`);
  }

  const seen = new Set<string>();
  const trackers: string[] = [];
  // Addon-supplied trackers first: those are the ones the indexer associates with
  // this exact torrent, so they're far likelier to return peers than the generic
  // public list appended after them.
  for (const tracker of [...extractTrackers(options.sources), ...DEFAULT_TRACKERS]) {
    const key = tracker.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    trackers.push(tracker);
    if (trackers.length >= MAX_TRACKERS) break;
  }

  for (const tracker of trackers) {
    parts.push(`tr=${encodeURIComponent(tracker)}`);
  }

  return parts.join('&');
}
