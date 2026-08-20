import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

const SHOW_RATING_KEY = 'settings:show_rating';
const DISCOVER_LAYOUT_KEY = 'settings:discover_layout';
const CONTINUE_WATCHING_SOURCE_KEY = 'settings:continue_watching_source';
const EPISODE_LAYOUT_KEY = 'settings:episode_layout';
const STREAMING_MODE_KEY = 'settings:streaming_mode';

export type DiscoverLayout = 'railSwitch' | 'genreWall' | 'indexAccordion';
const DEFAULT_DISCOVER_LAYOUT: DiscoverLayout = 'railSwitch';

export type ContinueWatchingSource = 'local' | 'trakt';
const DEFAULT_CONTINUE_WATCHING_SOURCE: ContinueWatchingSource = 'local';

export type EpisodeLayout = 'verticalRail' | 'numberedGrid' | 'cardCarousel' | 'accordionStack' | 'splitRail';
const DEFAULT_EPISODE_LAYOUT: EpisodeLayout = 'verticalRail';
const EPISODE_LAYOUTS: EpisodeLayout[] = ['verticalRail', 'numberedGrid', 'cardCarousel', 'accordionStack', 'splitRail'];

// 'direct-api': existing flow — user's own Real-Debrid/TorBox key resolves addon-supplied
// magnets. 'addon-managed': Stremio-style — the addon itself is already configured with a
// debrid service externally, so it returns ready-to-play links and the app stores no key.
export type StreamingMode = 'direct-api' | 'addon-managed';
const DEFAULT_STREAMING_MODE: StreamingMode = 'direct-api';

interface SettingsContextValue {
  showRating: boolean;
  setShowRating: (value: boolean) => void;
  discoverLayout: DiscoverLayout;
  setDiscoverLayout: (value: DiscoverLayout) => void;
  continueWatchingSource: ContinueWatchingSource;
  setContinueWatchingSource: (value: ContinueWatchingSource) => void;
  episodeLayout: EpisodeLayout;
  setEpisodeLayout: (value: EpisodeLayout) => void;
  streamingMode: StreamingMode;
  setStreamingMode: (value: StreamingMode) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  showRating: true,
  setShowRating: () => {},
  discoverLayout: DEFAULT_DISCOVER_LAYOUT,
  setDiscoverLayout: () => {},
  continueWatchingSource: DEFAULT_CONTINUE_WATCHING_SOURCE,
  setContinueWatchingSource: () => {},
  episodeLayout: DEFAULT_EPISODE_LAYOUT,
  setEpisodeLayout: () => {},
  streamingMode: DEFAULT_STREAMING_MODE,
  setStreamingMode: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [showRating, setShowRatingState] = useState(true);
  const [discoverLayout, setDiscoverLayoutState] = useState<DiscoverLayout>(DEFAULT_DISCOVER_LAYOUT);
  const [continueWatchingSource, setContinueWatchingSourceState] = useState<ContinueWatchingSource>(DEFAULT_CONTINUE_WATCHING_SOURCE);
  const [episodeLayout, setEpisodeLayoutState] = useState<EpisodeLayout>(DEFAULT_EPISODE_LAYOUT);
  const [streamingMode, setStreamingModeState] = useState<StreamingMode>(DEFAULT_STREAMING_MODE);

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
    AsyncStorage.getItem(EPISODE_LAYOUT_KEY).then((value) => {
      if (value && (EPISODE_LAYOUTS as string[]).includes(value)) {
        setEpisodeLayoutState(value as EpisodeLayout);
      }
    });
    AsyncStorage.getItem(STREAMING_MODE_KEY).then((value) => {
      if (value === 'direct-api' || value === 'addon-managed') {
        setStreamingModeState(value);
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

  const setEpisodeLayout = (value: EpisodeLayout) => {
    setEpisodeLayoutState(value);
    AsyncStorage.setItem(EPISODE_LAYOUT_KEY, value);
  };

  const setStreamingMode = (value: StreamingMode) => {
    setStreamingModeState(value);
    AsyncStorage.setItem(STREAMING_MODE_KEY, value);
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
        episodeLayout,
        setEpisodeLayout,
        streamingMode,
        setStreamingMode,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
