import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { MyListProvider } from '@/contexts/MyListContext';
import { AppThemeProvider } from '@/contexts/ThemeContext';
import { PlayerSettingsProvider } from '@/contexts/PlayerSettingsContext';
import { TraktProvider } from '@/contexts/TraktContext';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ErrorBoundary>
      <AppThemeProvider>
        <SettingsProvider>
          <MyListProvider>
            <PlayerSettingsProvider>
              <TraktProvider>
                <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                  <AnimatedSplashOverlay />
                  <AppTabs />
                </ThemeProvider>
              </TraktProvider>
            </PlayerSettingsProvider>
          </MyListProvider>
        </SettingsProvider>
      </AppThemeProvider>
    </ErrorBoundary>
  );
}
