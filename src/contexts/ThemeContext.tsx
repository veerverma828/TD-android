import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Palettes, PaletteName, ThemeColor } from '@/constants/theme';

const THEME_KEY = 'settings:app_theme';
const DEFAULT_THEME: PaletteName = 'marquee';

interface AppThemeContextValue {
  themeName: PaletteName;
  setThemeName: (name: PaletteName) => void;
  colors: Record<ThemeColor, string>;
}

const AppThemeContext = createContext<AppThemeContextValue>({
  themeName: DEFAULT_THEME,
  setThemeName: () => {},
  colors: Palettes[DEFAULT_THEME],
});

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeNameState] = useState<PaletteName>(DEFAULT_THEME);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((value) => {
      if (value && value in Palettes) setThemeNameState(value as PaletteName);
    });
  }, []);

  const setThemeName = (name: PaletteName) => {
    setThemeNameState(name);
    AsyncStorage.setItem(THEME_KEY, name);
  };

  return (
    <AppThemeContext.Provider value={{ themeName, setThemeName, colors: Palettes[themeName] }}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(AppThemeContext);
}
