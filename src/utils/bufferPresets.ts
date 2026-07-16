import type { BufferConfig } from 'react-native-video';
import type { BufferPreference } from '@/contexts/PlayerSettingsContext';

export const BUFFER_PRESETS: Record<BufferPreference, BufferConfig> = {
  low: {
    minBufferMs: 5000,
    maxBufferMs: 15000,
    bufferForPlaybackMs: 1000,
    bufferForPlaybackAfterRebufferMs: 2000,
    cacheSizeMB: 100,
  },
  balanced: {
    minBufferMs: 15000,
    maxBufferMs: 50000,
    bufferForPlaybackMs: 2500,
    bufferForPlaybackAfterRebufferMs: 5000,
    cacheSizeMB: 200,
  },
  high: {
    minBufferMs: 30000,
    maxBufferMs: 120000,
    bufferForPlaybackMs: 3000,
    bufferForPlaybackAfterRebufferMs: 8000,
    cacheSizeMB: 400,
  },
};
