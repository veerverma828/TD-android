import { ReactNode, useRef, useState } from 'react';
import { Animated, Pressable, PressableProps, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useIsTV } from '@/contexts/DeviceModeContext';
import { useFocusRingStyle } from './TVFocusRing';
import { useTVScroll } from '@/contexts/TVScrollContext';

const OUTER_LAYOUT_KEYS = new Set([
  'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
  'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf',
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
  'marginHorizontal', 'marginVertical', 'marginStart', 'marginEnd',
  'position', 'top', 'bottom', 'left', 'right', 'aspectRatio', 'zIndex',
]);

function splitStyle(style: StyleProp<ViewStyle> | undefined): { outer: ViewStyle; inner: ViewStyle } {
  const flat = (StyleSheet.flatten(style) ?? {}) as ViewStyle;
  const outer: ViewStyle = {};
  const inner: ViewStyle = {};
  for (const key of Object.keys(flat) as (keyof ViewStyle)[]) {
    if (OUTER_LAYOUT_KEYS.has(key)) {
      (outer as Record<string, unknown>)[key] = flat[key];
    } else {
      (inner as Record<string, unknown>)[key] = flat[key];
    }
  }
  return { outer, inner };
}

type StyleFn = (state: { pressed: boolean }) => StyleProp<ViewStyle>;

interface FocusablePressableProps extends Omit<PressableProps, 'style' | 'children'> {
  style?: StyleProp<ViewStyle> | StyleFn;
  children?: ReactNode | ((state: { pressed: boolean; focused: boolean }) => ReactNode);
  hasTVPreferredFocus?: boolean;
  focusRingBorderRadius?: number;
  focusRingScale?: boolean;
}

export function FocusablePressable({
  style,
  children,
  hasTVPreferredFocus,
  focusRingBorderRadius = 8,
  focusRingScale = true,
  onFocus,
  onBlur,
  ...rest
}: FocusablePressableProps) {
  const isTV = useIsTV();
  const [focused, setFocused] = useState(false);
  const ringStyle = useFocusRingStyle(focused, focusRingScale);
  const nodeRef = useRef<View>(null);
  const tvScroll = useTVScroll();

  if (!isTV) {
    return (
      <Pressable style={style} onFocus={onFocus} onBlur={onBlur} {...rest}>
        {typeof children === 'function'
          ? (state) => children({ pressed: state.pressed, focused: false })
          : children}
      </Pressable>
    );
  }

  const resolvedStyle = typeof style === 'function' ? style({ pressed: false }) : style;
  const { outer, inner } = splitStyle(resolvedStyle);

  return (
    <View style={[styles.wrapper, outer]}>
      <Pressable
        ref={nodeRef}
        style={[styles.fill, inner]}
        focusable
        hasTVPreferredFocus={hasTVPreferredFocus}
        onFocus={(e) => {
          setFocused(true);
          tvScroll?.requestScrollIntoView(nodeRef.current);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      >
        {(state) => (typeof children === 'function' ? children({ ...state, focused }) : children)}
      </Pressable>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, ringStyle, { borderRadius: focusRingBorderRadius, margin: focusRingScale ? -3 : 0 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative' },
  fill: { flex: 1 },
});
