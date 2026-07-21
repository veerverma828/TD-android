# Graph Report - TD-android  (2026-07-22)

## Corpus Check
- 134 files · ~69,853 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 818 nodes · 1939 edges · 98 communities (34 shown, 64 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `42d127bb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Downloads/Preplay/Player Screens
- Trakt Sync & Auth
- Discover & Player Screens
- Details Screen & File Selection
- Search & Genre Wall UI
- Build Tooling & Debrid Catalog Config
- Adaptive App Icon Config
- Tab Layout & Splash Animation
- Episode Row & Selector UI
- Android Native Player Activity
- Android Player UI (Compose)
- App Tabs & Hero Banner
- Library & See-All Screens
- Player Gesture Controller
- Calendar Screen
- Smart Dev Script (Device ADB Tooling)
- Home Screen & Row Config
- Native Player Expo Module Bridge
- TypeScript Config
- Player Controls Callbacks
- Carousel Component
- Expo Core Dependencies
- Project Reset Script
- Caveman Persona Config (AGENTS/CLAUDE.md)
- Native Player Event Emitters
- Subtitle Parser
- Icon Generation Script
- ESLint Config
- CodeGraph MCP Config
- Android TV Banner Config Plugin
- Settings Layout Route
- Graphify Search Tool Convention
- expo-application dep
- expo-clipboard dep
- expo-constants dep
- expo-dev-client dep
- expo-device dep
- expo-file-system dep
- expo-glass-effect dep
- expo-image dep
- expo-intent-launcher dep
- expo-keep-awake dep
- expo-linear-gradient dep
- expo-linking dep
- expo-modules-autolinking dep
- expo-navigation-bar dep
- expo-screen-orientation dep
- expo-secure-store dep
- expo-splash-screen dep
- expo-status-bar dep
- expo-symbols dep
- expo-system-ui dep
- @expo/ui dep
- @expo/vector-icons dep
- expo-web-browser dep
- Native Video Player Module (TS bridge)
- Native Video Player Module (web stub)
- react dep
- react-dom dep
- react-native dep
- async-storage dep
- gesture-handler dep
- safe-area-context dep
- react-native-screens dep
- react-native-web dep
- Expo Symbol Icon Asset
- Icon Background Asset
- Icon Foreground Asset (TD)
- App Icon Full Asset
- Android Icon Foreground PNG
- Expo Badge Asset
- Expo Badge White Asset
- Expo Logo Asset
- Favicon Asset
- App Icon PNG
- Logo Glow Asset
- React Logo Icon Asset
- React Logo @2x Asset
- React Logo @3x Asset
- Splash Icon Asset
- Explore Tab Icon @2x
- Explore Tab Icon @3x
- Explore Tab Icon
- Home Tab Icon
- Home Tab Icon @2x
- Home Tab Icon @3x
- Torrent Debrid Title Logo Asset
- Tutorial Web Screenshot Asset
- workflows/graphify.md
- expo

## God Nodes (most connected - your core abstractions)
1. `useAppTheme()` - 88 edges
2. `FocusablePressable()` - 45 edges
3. `ThemedText()` - 44 edges
4. `PlayerActivity` - 31 edges
5. `useRestoreFocus()` - 25 edges
6. `IconSymbol()` - 24 edges
7. `expo-router` - 22 edges
8. `useSettings()` - 21 edges
9. `DetailsScreen()` - 19 edges
10. `ThemedView()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `Build Android APK workflow` --references--> `TD-Android (Torrent Debrid Android)`  [EXTRACTED]
  .github/workflows/build-apk.yml → README.md
- `CalendarScreen()` --calls--> `useAppTheme()`  [EXTRACTED]
  src/app/calendar.tsx → src/contexts/ThemeContext.tsx
- `DetailsScreen()` --calls--> `useIsTV()`  [EXTRACTED]
  src/app/details.tsx → src/contexts/DeviceModeContext.tsx
- `DetailsScreen()` --calls--> `useMyList()`  [EXTRACTED]
  src/app/details.tsx → src/contexts/MyListContext.tsx
- `DetailsScreen()` --calls--> `useSettings()`  [EXTRACTED]
  src/app/details.tsx → src/contexts/SettingsContext.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Duplicate caveman persona configs across IDE agent tools** — clinerules_caveman, github_copilot_instructions, opencode_agents, windsurf_rules_caveman, agents [INFERRED 0.90]
- **CI Android release build pipeline (stamp, sign, build, release)** — github_workflows_build_apk_yml, build_number_stamping, release_signing_config, td_android_app [EXTRACTED 1.00]
- **Stremio metadata + debrid streaming pipeline** — cinemeta, torrentio, real_debrid, torbox [EXTRACTED 1.00]

## Communities (98 total, 64 thin omitted)

### Community 0 - "Downloads/Preplay/Player Screens"
Cohesion: 0.07
Nodes (65): styles, styles, DISCOVER_LAYOUT_OPTIONS, EPISODE_LAYOUT_OPTIONS, THEME_OPTIONS, SOURCE_OPTIONS, DisplayModeSettingsScreen(), MODE_OPTIONS (+57 more)

### Community 1 - "Trakt Sync & Auth"
Cohesion: 0.13
Nodes (25): deleteSecureItem(), saveSecureItem(), addToHistory(), buildHistoryBody(), CancellablePoll, DeviceAuthStart, disconnect(), DisconnectListener (+17 more)

### Community 2 - "Discover & Player Screens"
Cohesion: 0.09
Nodes (34): AppTabs(), NO_TAB_BAR_ROUTES, FileSelectionModal(), styles, IconSymbol(), IconSymbolName, MAPPING, ListItemProps (+26 more)

### Community 3 - "Details Screen & File Selection"
Cohesion: 0.09
Nodes (44): DetailsScreen(), styles, TAB_LABELS, TabKey, tvStyles, { width: SCREEN_WIDTH }, AddonsSettingsScreen(), EPISODE_SELECTORS (+36 more)

### Community 4 - "Search & Genre Wall UI"
Cohesion: 0.07
Nodes (44): expo-router, SearchScreen(), styles, NotificationsSettingsScreen(), Chip(), DiscoverGenreWall(), MediaType, styles (+36 more)

### Community 5 - "Build Tooling & Debrid Catalog Config"
Cohesion: 0.05
Nodes (38): Build number stamping for in-app updater, chokidar, Cinemeta (Stremio catalogs), eslint, eslint-config-expo, expo-router, Build Android APK workflow, nodemon (+30 more)

### Community 6 - "Adaptive App Icon Config"
Cohesion: 0.05
Nodes (38): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, permissions, predictiveBackGestureEnabled (+30 more)

### Community 7 - "Tab Layout & Splash Animation"
Cohesion: 0.07
Nodes (29): formatBytes(), StorageSettingsScreen(), UpdateState, AnimatedSplashOverlay(), styles, ErrorBoundary, ErrorBoundaryProps, ErrorBoundaryState (+21 more)

### Community 8 - "Episode Row & Selector UI"
Cohesion: 0.18
Nodes (15): ContinueWatchingSource, DiscoverLayout, EPISODE_LAYOUTS, EpisodeLayout, SettingsContext, SettingsContextValue, useTrakt(), PlaybackSnapshot (+7 more)

### Community 9 - "Android Native Player Activity"
Cohesion: 0.06
Nodes (18): AudioManager, Bundle, com, ComponentActivity, Configuration, JSONObject, ExoPlayer, PlayerActivity (+10 more)

### Community 10 - "Android Player UI (Compose)"
Cohesion: 0.10
Nodes (27): Color, Context, Modifier, BrightnessIndicator(), formatSpeedLabel(), formatTime(), isTvDevice(), ExoPlayer (+19 more)

### Community 11 - "App Tabs & Hero Banner"
Cohesion: 0.15
Nodes (12): HeroBanner(), HeroBannerProps, HeroItem, styles, tvStyles, DeviceModeContext, DeviceModeContextValue, DeviceModePreference (+4 more)

### Community 12 - "Library & See-All Screens"
Cohesion: 0.17
Nodes (19): CalendarScreen(), formatDateHeading(), DiscoverScreen(), styles, LibraryScreen(), SeeAllScreen(), styles, tvStyles (+11 more)

### Community 13 - "Player Gesture Controller"
Cohesion: 0.18
Nodes (12): PlayerScreen(), styles, ClosedEvent, ErrorEvent, NativePlayer, NativePlayerBridgeCallbacks, NativePlayerEventsMap, NativePlayerLaunchConfig (+4 more)

### Community 14 - "Calendar Screen"
Cohesion: 0.16
Nodes (13): expo-image, CalendarEntry, styles, PreplayScreen(), styles, ContinueWatchingSettingsScreen(), PreplaySettingsScreen(), PosterCardProps (+5 more)

### Community 15 - "Smart Dev Script (Device ADB Tooling)"
Cohesion: 0.33
Nodes (9): usePlaybackPosition(), deletePosition(), getAllPositions(), PositionsMap, readPositions(), StoredPosition, writePositions(), getPreference() (+1 more)

### Community 16 - "Home Screen & Row Config"
Cohesion: 0.15
Nodes (16): CURRENT_YEAR, EXTRA_ROWS, HomeScreen(), RowConfig, seededShuffle(), styles, Carousel(), ContinueWatchingRow() (+8 more)

### Community 17 - "Native Player Expo Module Bridge"
Cohesion: 0.18
Nodes (8): ExpoModulesCore, Module, ModuleDefinition, emit(), Module, NativePlayerModule, NativeVideoPlayerModule, WritableMap

### Community 18 - "TypeScript Config"
Cohesion: 0.15
Nodes (12): ./assets/*, expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, **/*.ts, **/*.tsx, compilerOptions, paths (+4 more)

### Community 19 - "Player Controls Callbacks"
Cohesion: 0.33
Nodes (9): dedupePerSeries(), RawEntry, useContinueWatching(), getHistoryEpisodes(), getHistoryMovies(), removePlaybackItem(), buildContentId(), parseContentId() (+1 more)

### Community 20 - "Carousel Component"
Cohesion: 0.40
Nodes (4): CarouselItem, CarouselProps, styles, PosterCard

### Community 21 - "Expo Core Dependencies"
Cohesion: 0.22
Nodes (9): expo-blur, expo-constants, expo-font, expo-notifications, dependencies, expo-blur, expo-constants, expo-font (+1 more)

### Community 22 - "Project Reset Script"
Cohesion: 0.22
Nodes (7): exampleDirPath, fs, oldDirs, path, readline, rl, root

### Community 24 - "Native Player Event Emitters"
Cohesion: 0.25
Nodes (7): DeviceAuthState, TraktAuthStatus, TraktContext, TraktContextValue, TraktProvider(), DeviceAuthResult, isConnected()

### Community 25 - "Subtitle Parser"
Cohesion: 0.47
Nodes (4): parseSubtitles(), stripTags(), SubtitleCue, toSeconds()

### Community 26 - "Icon Generation Script"
Cohesion: 0.50
Nodes (4): OUT, path, render(), sharp

## Knowledge Gaps
- **277 isolated node(s):** `codegraph`, `name`, `slug`, `version`, `orientation` (+272 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **64 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAppTheme()` connect `Downloads/Preplay/Player Screens` to `Discover & Player Screens`, `Details Screen & File Selection`, `Search & Genre Wall UI`, `Tab Layout & Splash Animation`, `App Tabs & Hero Banner`, `Library & See-All Screens`, `Player Gesture Controller`, `Calendar Screen`, `Home Screen & Row Config`, `Carousel Component`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `plugins` connect `Adaptive App Icon Config` to `Search & Genre Wall UI`, `Calendar Screen`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `codegraph`, `name`, `slug` to the rest of the system?**
  _277 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Downloads/Preplay/Player Screens` be split into smaller, more focused modules?**
  _Cohesion score 0.06851485148514852 - nodes in this community are weakly interconnected._
- **Should `Trakt Sync & Auth` be split into smaller, more focused modules?**
  _Cohesion score 0.12561576354679804 - nodes in this community are weakly interconnected._
- **Should `Discover & Player Screens` be split into smaller, more focused modules?**
  _Cohesion score 0.08668076109936575 - nodes in this community are weakly interconnected._
- **Should `Details Screen & File Selection` be split into smaller, more focused modules?**
  _Cohesion score 0.08784313725490196 - nodes in this community are weakly interconnected._