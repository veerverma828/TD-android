/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Palettes = {
  marquee: {
    text: '#f2ead9',
    background: '#0b0d12',
    backgroundElement: '#161a22',
    backgroundSelected: '#1f2530',
    textSecondary: '#a99d84',
    accent: '#e8823f',
    textOnAccent: '#ffffff',
    ratingGold: '#FFD700',
  },
  classic: {
    text: '#ffffff',
    background: '#080808',
    backgroundElement: '#111111',
    backgroundSelected: '#1a1a1a',
    textSecondary: '#999999',
    accent: '#e50914',
    textOnAccent: '#ffffff',
    ratingGold: '#FFD700',
  },
  onyx: {
    text: '#f5f5f5',
    background: '#0a0a0a',
    backgroundElement: '#151515',
    backgroundSelected: '#202020',
    textSecondary: '#8a8a8a',
    accent: '#ffffff',
    textOnAccent: '#0a0a0a',
    ratingGold: '#FFD700',
  },
  azure: {
    text: '#eaf2fb',
    background: '#070b12',
    backgroundElement: '#10161f',
    backgroundSelected: '#182131',
    textSecondary: '#8391a8',
    accent: '#3b82f6',
    textOnAccent: '#ffffff',
    ratingGold: '#FFD700',
  },
  violet: {
    text: '#f1ecfb',
    background: '#0c0812',
    backgroundElement: '#17111f',
    backgroundSelected: '#221a2e',
    textSecondary: '#9384ab',
    accent: '#8b5cf6',
    textOnAccent: '#ffffff',
    ratingGold: '#FFD700',
  },
  emerald: {
    text: '#eaf7f0',
    background: '#071009',
    backgroundElement: '#101d15',
    backgroundSelected: '#182b20',
    textSecondary: '#7fa591',
    accent: '#10b981',
    textOnAccent: '#04150d',
    ratingGold: '#FFD700',
  },
  gold: {
    text: '#f8f1e4',
    background: '#100d08',
    backgroundElement: '#1c1710',
    backgroundSelected: '#2a2116',
    textSecondary: '#ad9c7c',
    accent: '#d4af37',
    textOnAccent: '#1a1408',
    ratingGold: '#d4af37',
  },
} as const;

export type PaletteName = keyof typeof Palettes;
export type ThemeColor = keyof typeof Palettes.marquee;

/** Static fallback for module-scope contexts (e.g. StyleSheet.create) that can't use the theme hook. */
export const Colors = { light: Palettes.marquee, dark: Palettes.marquee } as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
