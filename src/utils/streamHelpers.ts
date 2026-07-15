export interface TorrentioStream {
  title: string;
  size: number;
  seeders: number;
  magnet: string;
  isDirect: boolean;
  fileIdx: number | null;
  filename: string | null;
  infoHash: string | null;
  provider: string;
}

export function formatTorrentio(data: any): TorrentioStream[] {
  const streams = data?.streams || [];
  return streams
    .filter((item: any) => item.infoHash || item.url)
    .map((item: any) => {
      return {
        title: item.title || item.name || "Unknown Stream",
        size: item.behaviorHints?.videoSize || 0,
        seeders: 0,
        magnet: item.infoHash ? `magnet:?xt=urn:btih:${item.infoHash}` : item.url,
        isDirect: !item.infoHash && !!item.url,
        fileIdx: typeof item.fileIdx === "number" ? item.fileIdx : null,
        filename: item.behaviorHints?.filename || null,
        infoHash: item.infoHash || null,
        provider: item.name || "Addon",
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
