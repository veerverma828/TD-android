import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { UpdatePromptModal } from '@/components/UpdatePromptModal';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { MyListProvider } from '@/contexts/MyListContext';
import { AppThemeProvider } from '@/contexts/ThemeContext';
import { DeviceModeProvider } from '@/contexts/DeviceModeContext';
import { PlayerSettingsProvider } from '@/contexts/PlayerSettingsContext';
import { TraktProvider } from '@/contexts/TraktContext';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ErrorBoundary>
      <AppThemeProvider>
        <DeviceModeProvider>
          <SettingsProvider>
            <MyListProvider>
              <PlayerSettingsProvider>
                <TraktProvider>
                  <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                    <AnimatedSplashOverlay />
                    <AppTabs />
                    <UpdatePromptModal />
                  </ThemeProvider>
                </TraktProvider>
              </PlayerSettingsProvider>
            </MyListProvider>
          </SettingsProvider>
        </DeviceModeProvider>
      </AppThemeProvider>
    </ErrorBoundary>
  );
}
