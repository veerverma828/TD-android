export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

const TIMESTAMP_RE = /(\d{1,2}:)?(\d{2}):(\d{2})[.,](\d{1,3})\s*-->\s*(\d{1,2}:)?(\d{2}):(\d{2})[.,](\d{1,3})/;

function toSeconds(hours: string | undefined, minutes: string, seconds: string, millis: string): number {
  const h = hours ? parseInt(hours, 10) : 0;
  const m = parseInt(minutes, 10);
  const s = parseInt(seconds, 10);
  const ms = parseInt(millis.padEnd(3, '0'), 10);
  return h * 3600 + m * 60 + s + ms / 1000;
}

function stripTags(text: string): string {
  return text.replace(/<[^>]+>/g, '').trim();
}

/** Parses SRT or WebVTT cue text into a flat list of timed cues, sorted by start time. */
export function parseSubtitles(raw: string): SubtitleCue[] {
  const cleaned = raw.replace(/\r/g, '').replace(/^WEBVTT.*\n/, '');
  const blocks = cleaned.split(/\n\s*\n/);
  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length === 0) continue;

    const timeLineIdx = lines.findIndex((l) => TIMESTAMP_RE.test(l));
    if (timeLineIdx === -1) continue;

    const match = lines[timeLineIdx].match(TIMESTAMP_RE);
    if (!match) continue;

    const start = toSeconds(match[1]?.replace(':', ''), match[2], match[3], match[4]);
    const end = toSeconds(match[5]?.replace(':', ''), match[6], match[7], match[8]);
    const text = stripTags(lines.slice(timeLineIdx + 1).join('\n'));
    if (text) cues.push({ start, end, text });
  }

  return cues.sort((a, b) => a.start - b.start);
}

/** Binary search for the cue active at the given playback time, or null if none. */
export function findActiveCue(cues: SubtitleCue[], time: number): SubtitleCue | null {
  let lo = 0;
  let hi = cues.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const cue = cues[mid];
    if (time < cue.start) hi = mid - 1;
    else if (time > cue.end) lo = mid + 1;
    else return cue;
  }
  return null;
}
