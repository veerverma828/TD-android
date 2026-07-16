import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';

const STORAGE_KEY = 'player_settings';

export type ResizeModePref = 'fit' | 'fill' | 'crop' | 'stretch';
export type BufferPreference = 'low' | 'balanced' | 'high';
export type DefaultOrientation = 'auto' | 'landscape' | 'portrait';
export type PreplayVariant = 'fullBleed' | 'split' | 'centered';

export interface SubtitleAppearance {
  fontSize: number;
  color: string;
  backgroundOpacity: number;
}

export interface PlayerSettings {
  defaultSpeed: number;
  resizeMode: ResizeModePref;
  autoPiP: boolean;
  autoPlayNextEpisode: boolean;
  resumeAutomatically: boolean;
  rememberPosition: boolean;
  seekDurationSeconds: number;
  gesturesEnabled: boolean;
  brightnessGestureEnabled: boolean;
  volumeGestureEnabled: boolean;
  horizontalSeekGestureEnabled: boolean;
  doubleTapSeekEnabled: boolean;
  gestureSensitivity: number;
  autoHideMs: number;
  defaultSubtitleLanguage: string | null;
  defaultAudioLanguage: string | null;
  subtitleAppearance: SubtitleAppearance;
  bufferPreference: BufferPreference;
  keepScreenAwake: boolean;
  defaultOrientation: DefaultOrientation;
  preplayVariant: PreplayVariant;
}

export const DEFAULT_PLAYER_SETTINGS: PlayerSettings = {
  defaultSpeed: 1,
  resizeMode: 'fit',
  autoPiP: false,
  autoPlayNextEpisode: true,
  resumeAutomatically: false,
  rememberPosition: true,
  seekDurationSeconds: 10,
  gesturesEnabled: true,
  brightnessGestureEnabled: true,
  volumeGestureEnabled: true,
  horizontalSeekGestureEnabled: true,
  doubleTapSeekEnabled: true,
  gestureSensitivity: 1,
  autoHideMs: 4000,
  defaultSubtitleLanguage: null,
  defaultAudioLanguage: null,
  subtitleAppearance: {
    fontSize: 18,
    color: '#ffffff',
    backgroundOpacity: 0.5,
  },
  bufferPreference: 'balanced',
  keepScreenAwake: true,
  defaultOrientation: 'auto',
  preplayVariant: 'centered',
};

interface PlayerSettingsContextValue {
  settings: PlayerSettings;
  loaded: boolean;
  updateSettings: (patch: Partial<PlayerSettings>) => void;
  resetSettings: () => void;
}

const PlayerSettingsContext = createContext<PlayerSettingsContextValue>({
  settings: DEFAULT_PLAYER_SETTINGS,
  loaded: false,
  updateSettings: () => {},
  resetSettings: () => {},
});

export function PlayerSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PlayerSettings>(DEFAULT_PLAYER_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setSettings({ ...DEFAULT_PLAYER_SETTINGS, ...parsed });
        } catch {
          // ignore corrupt storage
        }
      }
      setLoaded(true);
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<PlayerSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_PLAYER_SETTINGS);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PLAYER_SETTINGS)).catch(() => {});
  }, []);

  return (
    <PlayerSettingsContext.Provider value={{ settings, loaded, updateSettings, resetSettings }}>
      {children}
    </PlayerSettingsContext.Provider>
  );
}

export function usePlayerSettings() {
  return useContext(PlayerSettingsContext);
}
