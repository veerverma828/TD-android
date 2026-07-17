import { ReactNode } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

// Stock react-native (not the tvos fork) doesn't ship TVFocusGuideView, so this
// is a plain grouping container — directional focus relies on Android's default
// nearest-neighbor engine walking layout order rather than explicit focus traps.
interface FocusSectionProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function FocusSection({ children, style }: FocusSectionProps) {
  return <View style={style}>{children}</View>;
}
