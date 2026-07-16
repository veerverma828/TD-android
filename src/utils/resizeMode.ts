import { ResizeMode } from 'react-native-video';
import type { ResizeModePref } from '@/contexts/PlayerSettingsContext';

/**
 * react-native-video only exposes none/contain/cover/stretch. "Crop/Zoom" reuses
 * cover plus an extra scale transform applied to the video view (see ZOOM_SCALE),
 * since there's no native "extra zoom" knob.
 */
export const ZOOM_SCALE = 1.3;

export function toNativeResizeMode(pref: ResizeModePref): ResizeMode {
  switch (pref) {
    case 'fit':
      return ResizeMode.CONTAIN;
    case 'fill':
      return ResizeMode.COVER;
    case 'crop':
      return ResizeMode.COVER;
    case 'stretch':
      return ResizeMode.STRETCH;
  }
}
