import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

const SHOW_RATING_KEY = 'settings:show_rating';
const DISCOVER_LAYOUT_KEY = 'settings:discover_layout';
const CONTINUE_WATCHING_SOURCE_KEY = 'settings:continue_watching_source';

export type DiscoverLayout = 'railSwitch' | 'genreWall' | 'indexAccordion';
const DEFAULT_DISCOVER_LAYOUT: DiscoverLayout = 'railSwitch';

export type ContinueWatchingSource = 'local' | 'trakt';
const DEFAULT_CONTINUE_WATCHING_SOURCE: ContinueWatchingSource = 'local';

interface SettingsContextValue {
  showRating: boolean;
  setShowRating: (value: boolean) => void;
  discoverLayout: DiscoverLayout;
  setDiscoverLayout: (value: DiscoverLayout) => void;
  continueWatchingSource: ContinueWatchingSource;
  setContinueWatchingSource: (value: ContinueWatchingSource) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  showRating: true,
  setShowRating: () => {},
  discoverLayout: DEFAULT_DISCOVER_LAYOUT,
  setDiscoverLayout: () => {},
  continueWatchingSource: DEFAULT_CONTINUE_WATCHING_SOURCE,
  setContinueWatchingSource: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [showRating, setShowRatingState] = useState(true);
  const [discoverLayout, setDiscoverLayoutState] = useState<DiscoverLayout>(DEFAULT_DISCOVER_LAYOUT);
  const [continueWatchingSource, setContinueWatchingSourceState] = useState<ContinueWatchingSource>(DEFAULT_CONTINUE_WATCHING_SOURCE);

  useEffect(() => {
    AsyncStorage.getItem(SHOW_RATING_KEY).then((value) => {
      if (value !== null) setShowRatingState(value === 'true');
    });
    AsyncStorage.getItem(DISCOVER_LAYOUT_KEY).then((value) => {
      if (value === 'railSwitch' || value === 'genreWall' || value === 'indexAccordion') {
        setDiscoverLayoutState(value);
      }
    });
    AsyncStorage.getItem(CONTINUE_WATCHING_SOURCE_KEY).then((value) => {
      if (value === 'local' || value === 'trakt') {
        setContinueWatchingSourceState(value);
      }
    });
  }, []);

  const setShowRating = (value: boolean) => {
    setShowRatingState(value);
    AsyncStorage.setItem(SHOW_RATING_KEY, String(value));
  };

  const setDiscoverLayout = (value: DiscoverLayout) => {
    setDiscoverLayoutState(value);
    AsyncStorage.setItem(DISCOVER_LAYOUT_KEY, value);
  };

  const setContinueWatchingSource = (value: ContinueWatchingSource) => {
    setContinueWatchingSourceState(value);
    AsyncStorage.setItem(CONTINUE_WATCHING_SOURCE_KEY, value);
  };

  return (
    <SettingsContext.Provider
      value={{
        showRating,
        setShowRating,
        discoverLayout,
        setDiscoverLayout,
        continueWatchingSource,
        setContinueWatchingSource,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
