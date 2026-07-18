export interface TorrentioStream {
  title: string;
  filename: string | null;
  size: number | null;
  seeders: number | null;
  provider: string | null;
  quality: string | null;
  hdr: string | null;
  dolbyVision: boolean;
  is3D: boolean;
  codec: string | null;
  bitDepth: string | null;
  audio: string | null;
  source: string | null;
  releaseGroup: string | null;
  languages: string[];
  magnet: string;
  isDirect: boolean;
  fileIdx: number | null;
  infoHash: string | null;
  addonName: string | null;
}

const SIZE_UNIT_EXPONENT: Record<string, number> = { KB: 1, MB: 2, GB: 3, TB: 4 };
const RESOLUTIONS = new Set(['4k', '2160p', '1440p', '1080p', '720p', '480p', '360p']);
const SOURCE_TAGS = new Set(['dvdrip', 'dvd', 'bdrip', 'brrip', 'hdrip', 'bdmux']);

const CODEC_RE = /\b(x264|x265|HEVC|AVC|AV1|VP9)\b/i;
const BITDEPTH_RE = /\b(8bit|10bit|12bit)\b/i;
const SOURCE_RE = /\b(BluRay|Blu-Ray|REMUX|WEB-DL|WEBDL|WEBRip|HDTV|HDRip|BRRip|BDRip|DVDRip|CAM|TS|TC|PDTV)\b/i;
const AUDIO_RE = /\b(TrueHD(?:[ .]?Atmos)?|Atmos|DTS-HD[ .]?MA|DTS-HD|DTS-X|DTSX|DTS|EAC3|DDP\d?(?:\.\d)?|DD\+|DD5\.1|DD2\.0|DD7\.1|AC3|FLAC|AAC|MP3)\b/i;
const GROUP_BRACKET_RE = /\[([A-Za-z0-9._-]+)]\s*$/;
const GROUP_DASH_RE = /-([A-Za-z0-9]+)$/;

function parseMetaLine(lines: string[]) {
  const metaLineIdx = lines.findIndex((l) => /👤/.test(l));
  if (metaLineIdx === -1) {
    return { metaLineIdx: -1, seeders: null, size: null, provider: null };
  }
  const metaLine = lines[metaLineIdx];

  let seeders: number | null = null;
  const seedersMatch = metaLine.match(/👤\s*(\d+)/);
  if (seedersMatch) seeders = parseInt(seedersMatch[1], 10);

  let size: number | null = null;
  const sizeMatch = metaLine.match(/💾\s*([\d.]+)\s*(KB|MB|GB|TB)/i);
  if (sizeMatch) {
    const value = parseFloat(sizeMatch[1]);
    const exponent = SIZE_UNIT_EXPONENT[sizeMatch[2].toUpperCase()] ?? 0;
    if (!Number.isNaN(value)) size = Math.round(value * Math.pow(1024, exponent));
  }

  // Requires an actual gear (Torrentio) or magnifier (Comet) glyph — without
  // this, the optional-emoji version matched at index 0 and swallowed the
  // whole meta line (seeders/size included) as "provider".
  let provider: string | null = null;
  const providerMatch = metaLine.match(/(?:⚙️|🔎)\s*(.+)$/);
  if (providerMatch) provider = providerMatch[1].trim() || null;

  return { metaLineIdx, seeders, size, provider };
}

// Different addons put quality/resolution tags in different places — Torrentio
// puts them on the second line of `name`, Comet appends them to a single-line
// `name` alongside a service tag. Scanning every line/token instead of a fixed
// line index keeps this working across addons without per-addon special-casing.
function parseQualityTag(name: string) {
  const tokens = (name || '')
    .split('\n')
    .flatMap((line) => line.split(/\s*\|\s*|\s+/))
    .map((t) => t.trim())
    .filter(Boolean);

  let quality: string | null = null;
  let sourceTag: string | null = null;
  let hdr: string | null = null;
  let dolbyVision = false;
  let is3D = false;

  for (const raw of tokens) {
    const t = raw.toLowerCase();
    if (RESOLUTIONS.has(t)) quality = t === '4k' ? '4K' : raw;
    else if (SOURCE_TAGS.has(t)) sourceTag = raw.toUpperCase();
    else if (t === 'hdr10+') hdr = 'HDR10+';
    else if (t === 'hdr') hdr = hdr || 'HDR';
    else if (t === 'dv') dolbyVision = true;
    else if (t === '3d') is3D = true;
  }

  return { quality, sourceTag, hdr, dolbyVision, is3D };
}

function extractFromReleaseTitle(releaseTitle: string) {
  const codecMatch = releaseTitle.match(CODEC_RE);
  let codec: string | null = null;
  if (codecMatch) {
    const lower = codecMatch[1].toLowerCase();
    codec = lower === 'x264' || lower === 'x265' ? lower : codecMatch[1].toUpperCase();
  }

  const bitDepthMatch = releaseTitle.match(BITDEPTH_RE);
  const sourceMatch = releaseTitle.match(SOURCE_RE);
  const audioMatch = releaseTitle.match(AUDIO_RE);

  let releaseGroup: string | null = null;
  const bracketMatch = releaseTitle.match(GROUP_BRACKET_RE);
  if (bracketMatch) {
    releaseGroup = bracketMatch[1];
  } else {
    const withoutExt = releaseTitle.replace(/\.\w{2,4}$/, '');
    const dashMatch = withoutExt.match(GROUP_DASH_RE);
    if (dashMatch && dashMatch[1].length <= 20 && /[A-Za-z]/.test(dashMatch[1])) {
      releaseGroup = dashMatch[1];
    }
  }

  return {
    codec,
    bitDepth: bitDepthMatch ? bitDepthMatch[1].toLowerCase() : null,
    source: sourceMatch ? sourceMatch[1] : null,
    audio: audioMatch ? audioMatch[1].replace(/\./g, ' ').trim() : null,
    releaseGroup,
  };
}

export function formatTorrentio(data: any): TorrentioStream[] {
  const streams = data?.streams || [];
  return streams
    .filter((item: any) => item.infoHash || item.url)
    .map((item: any) => {
      // Torrentio puts the human-readable details in `title`; addons like Comet
      // leave `title` unset and put the same kind of multi-line details in
      // `description` instead, using `name` for a short badge (service + resolution).
      // Falling back to `name` first (as before) meant every Comet stream showed
      // that near-identical badge as its "title" — prefer `description` instead.
      const rawTitle: string = item.title || item.description || item.name || 'Unknown Stream';
      const lines = rawTitle.split('\n').map((l: string) => l.trim()).filter(Boolean);
      const { metaLineIdx, seeders, size, provider } = parseMetaLine(lines);

      const beforeLines = metaLineIdx >= 0 ? lines.slice(0, metaLineIdx) : lines;
      const afterLines = metaLineIdx >= 0 ? lines.slice(metaLineIdx + 1) : [];

      const releaseTitle = (beforeLines[0] || 'Unknown Stream').replace(/^[^\w(]+\s*/, '');
      const derivedFilename = beforeLines.length > 1 ? beforeLines[beforeLines.length - 1] : null;

      const languages = afterLines
        .join(' / ')
        .split('/')
        .map((s) => s.trim())
        .filter(Boolean);

      // Torrentio puts quality/HDR/DV tags in `name`; Comet's `name` only has
      // the resolution and puts HDR/DV/source tags in `description`'s own
      // lines (📹/⭐). Scanning both together catches either layout.
      const { quality, sourceTag, hdr, dolbyVision, is3D } = parseQualityTag(`${item.name || ''}\n${rawTitle}`);
      const { codec, bitDepth, source, audio, releaseGroup } = extractFromReleaseTitle(releaseTitle);

      return {
        title: releaseTitle,
        filename: item.behaviorHints?.filename || derivedFilename || null,
        size: size ?? (typeof item.behaviorHints?.videoSize === 'number' ? item.behaviorHints.videoSize : null),
        seeders,
        provider,
        quality,
        hdr,
        dolbyVision,
        is3D,
        codec,
        bitDepth,
        audio,
        source: source || sourceTag,
        releaseGroup,
        languages,
        magnet: item.infoHash ? `magnet:?xt=urn:btih:${item.infoHash}` : item.url,
        isDirect: !item.infoHash && !!item.url,
        fileIdx: typeof item.fileIdx === 'number' ? item.fileIdx : null,
        infoHash: item.infoHash || null,
        addonName: null,
      };
    });
}

export function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
