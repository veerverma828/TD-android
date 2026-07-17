import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import React from 'react';
import { OpaqueColorValue, StyleProp, ViewStyle } from 'react-native';

// Add your SFSymbol to MaterialIcons mappings here.
const MAPPING = {
  // See MaterialIcons here: https://icons.expo.fyi
  // See SF Symbols in the SF Symbols app on Mac.
  'house.fill': 'home',
  'magnifyingglass': 'search',
  'arrow.down.circle.fill': 'file-download',
  'bookmark.fill': 'bookmark',
  'gearshape.fill': 'settings',
  'play.fill': 'play-arrow',
  'play.circle.fill': 'play-circle-filled',
  'plus': 'add',
  'tv': 'tv',
  'bell': 'notifications',
  'chevron.left': 'chevron-left',
  'play.rectangle.fill': 'smart-display',
  'slash.circle': 'error-outline',
  'chevron.down': 'expand-more',
  'chevron.up': 'expand-less',
  'arrow.up.right.square': 'open-in-new',
  'doc.on.doc': 'content-copy',
  'arrow.down.circle': 'download',
  'xmark.circle.fill': 'cancel',
  'chevron.right': 'chevron-right',
  'waveform': 'audiotrack',
  'pause': 'pause',
  'speaker.wave.3.fill': 'volume-up',
  'speaker.slash.fill': 'volume-off',
  'speaker.wave.1.fill': 'volume-down',
  'sun.max.fill': 'brightness-6',
  'goforward': 'fast-forward',
  'gobackward': 'fast-rewind',
  'photo': 'image',
  'star.fill': 'star',
  'checkmark': 'check',
  'compass': 'explore',
  'trash.fill': 'delete',
  'info.circle': 'info-outline',
  'lock.fill': 'lock',
  'lock.open.fill': 'lock-open',
  'pip': 'picture-in-picture-alt',
  'pip.exit': 'picture-in-picture',
  'rotate.right': 'screen-rotation',
  'captions.bubble': 'closed-caption',
  'speedometer': 'speed',
  'aspectratio': 'aspect-ratio',
  'crop': 'crop',
  'rectangle.arrowtriangle.2.inward': 'fit-screen',
  'arrow.forward.to.line': 'skip-next',
  'arrow.backward.to.line': 'skip-previous',
  'forward.end.fill': 'skip-next',
  'backward.end.fill': 'skip-previous',
  'hand.tap': 'touch-app',
  'flame.fill': 'local-fire-department',
};

export type IconSymbolName = keyof typeof MAPPING;

/**
 * An icon component that uses native SFSymbols on iOS, and MaterialIcons on Android and web. This ensures a consistent look across platforms, and optimal resource usage.
 *
 * Icon `name`s are based on SFSymbols and require manual mapping to MaterialIcons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name] as any} style={style as any} />;
}
