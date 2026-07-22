# Graph Report - TD-android  (2026-07-22)

## Corpus Check
- 136 files · ~72,145 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 829 nodes · 2001 edges · 90 communities (27 shown, 63 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0da5d448`
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
- Player Gesture Controller
- Home Screen & Row Config
- Native Player Expo Module Bridge
- TypeScript Config
- Carousel Component
- Expo Core Dependencies
- Project Reset Script
- Caveman Persona Config (AGENTS/CLAUDE.md)
- Subtitle Parser
- Icon Generation Script
- ESLint Config
- CodeGraph MCP Config
- Android TV Banner Config Plugin
- Graphify Search Tool Convention
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
- expo-constants

## God Nodes (most connected - your core abstractions)
1. `useAppTheme()` - 88 edges
2. `ThemedText()` - 44 edges
3. `FocusablePressable` - 41 edges
4. `PlayerActivity` - 32 edges
5. `useIsTV()` - 30 edges
6. `IconSymbol()` - 24 edges
7. `useRestoreFocus()` - 24 edges
8. `expo-router` - 22 edges
9. `DetailsScreen()` - 21 edges
10. `useSettings()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `CoverImage()` --calls--> `useIsTV()`  [EXTRACTED]
  src/app/details.tsx → src/contexts/DeviceModeContext.tsx
- `Build Android APK workflow` --references--> `TD-Android (Torrent Debrid Android)`  [EXTRACTED]
  .github/workflows/build-apk.yml → README.md
- `CalendarScreen()` --calls--> `useMyList()`  [EXTRACTED]
  src/app/calendar.tsx → src/contexts/MyListContext.tsx
- `DetailsScreen()` --calls--> `useIsTV()`  [EXTRACTED]
  src/app/details.tsx → src/contexts/DeviceModeContext.tsx
- `DetailsScreen()` --calls--> `useMyList()`  [EXTRACTED]
  src/app/details.tsx → src/contexts/MyListContext.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Duplicate caveman persona configs across IDE agent tools** — clinerules_caveman, github_copilot_instructions, opencode_agents, windsurf_rules_caveman, agents [INFERRED 0.90]
- **CI Android release build pipeline (stamp, sign, build, release)** — github_workflows_build_apk_yml, build_number_stamping, release_signing_config, td_android_app [EXTRACTED 1.00]
- **Stremio metadata + debrid streaming pipeline** — cinemeta, torrentio, real_debrid, torbox [EXTRACTED 1.00]

## Communities (90 total, 63 thin omitted)

### Community 0 - "Downloads/Preplay/Player Screens"
Cohesion: 0.06
Nodes (75): CalendarEntry, CalendarScreen(), formatDateHeading(), styles, DiscoverScreen(), styles, styles, PlayerScreen() (+67 more)

### Community 1 - "Trakt Sync & Auth"
Cohesion: 0.05
Nodes (65): ContinueWatchingSource, DiscoverLayout, EPISODE_LAYOUTS, EpisodeLayout, SettingsContext, SettingsContextValue, DeviceAuthState, TraktAuthStatus (+57 more)

### Community 2 - "Discover & Player Screens"
Cohesion: 0.08
Nodes (36): styles, AppTabs(), NO_TAB_BAR_ROUTES, FileSelectionModal(), styles, IconSymbol(), IconSymbolName, MAPPING (+28 more)

### Community 3 - "Details Screen & File Selection"
Cohesion: 0.13
Nodes (30): FileSelectionModalProps, NextEpisodeTarget, useNextEpisode(), ALLOWED_SCHEMES, hasAllowedScheme(), PlaybackMeta, useStreamActions(), addAddon() (+22 more)

### Community 4 - "Search & Genre Wall UI"
Cohesion: 0.07
Nodes (52): CoverImage(), DetailsScreen(), styles, TAB_LABELS, TabKey, tvStyles, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }, SearchScreen() (+44 more)

### Community 5 - "Build Tooling & Debrid Catalog Config"
Cohesion: 0.05
Nodes (38): Build number stamping for in-app updater, chokidar, Cinemeta (Stremio catalogs), eslint, eslint-config-expo, expo-router, Build Android APK workflow, nodemon (+30 more)

### Community 6 - "Adaptive App Icon Config"
Cohesion: 0.05
Nodes (38): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, permissions, predictiveBackGestureEnabled (+30 more)

### Community 7 - "Tab Layout & Splash Animation"
Cohesion: 0.07
Nodes (28): formatBytes(), StorageSettingsScreen(), AnimatedSplashOverlay(), styles, ErrorBoundary, ErrorBoundaryProps, ErrorBoundaryState, styles (+20 more)

### Community 9 - "Android Native Player Activity"
Cohesion: 0.06
Nodes (19): AudioManager, Bundle, com, ComponentActivity, Configuration, JSONObject, KeyEvent, ExoPlayer (+11 more)

### Community 10 - "Android Player UI (Compose)"
Cohesion: 0.10
Nodes (27): Color, Context, Modifier, BrightnessIndicator(), formatSpeedLabel(), formatTime(), isTvDevice(), ExoPlayer (+19 more)

### Community 13 - "Player Gesture Controller"
Cohesion: 0.20
Nodes (10): ClosedEvent, ErrorEvent, NativePlayer, NativePlayerBridgeCallbacks, NativePlayerEventsMap, NativePlayerLaunchConfig, PipModeChangedEvent, playerEmitter (+2 more)

### Community 16 - "Home Screen & Row Config"
Cohesion: 0.05
Nodes (52): expo-image, expo-router, CURRENT_YEAR, EXTRA_ROWS, HomeScreen(), RowConfig, seededShuffle(), styles (+44 more)

### Community 17 - "Native Player Expo Module Bridge"
Cohesion: 0.18
Nodes (8): ExpoModulesCore, Module, ModuleDefinition, emit(), Module, NativePlayerModule, NativeVideoPlayerModule, WritableMap

### Community 18 - "TypeScript Config"
Cohesion: 0.15
Nodes (12): ./assets/*, expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, **/*.ts, **/*.tsx, compilerOptions, paths (+4 more)

### Community 20 - "Carousel Component"
Cohesion: 0.17
Nodes (17): CarouselItem, CarouselProps, styles, EpisodeRow, EpisodeSelectorCardCarousel(), styles, EpisodeSelectorNumberedGrid(), styles (+9 more)

### Community 21 - "Expo Core Dependencies"
Cohesion: 0.22
Nodes (9): expo-application, expo-blur, expo-font, expo-notifications, dependencies, expo-application, expo-blur, expo-font (+1 more)

### Community 22 - "Project Reset Script"
Cohesion: 0.22
Nodes (7): exampleDirPath, fs, oldDirs, path, readline, rl, root

### Community 25 - "Subtitle Parser"
Cohesion: 0.47
Nodes (4): parseSubtitles(), stripTags(), SubtitleCue, toSeconds()

### Community 26 - "Icon Generation Script"
Cohesion: 0.50
Nodes (4): OUT, path, render(), sharp

## Knowledge Gaps
- **279 isolated node(s):** `codegraph`, `name`, `slug`, `version`, `orientation` (+274 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **63 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAppTheme()` connect `Downloads/Preplay/Player Screens` to `Discover & Player Screens`, `Search & Genre Wall UI`, `Tab Layout & Splash Animation`, `Home Screen & Row Config`, `Carousel Component`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `plugins` connect `Adaptive App Icon Config` to `Home Screen & Row Config`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `codegraph`, `name`, `slug` to the rest of the system?**
  _279 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Downloads/Preplay/Player Screens` be split into smaller, more focused modules?**
  _Cohesion score 0.06074766355140187 - nodes in this community are weakly interconnected._
- **Should `Trakt Sync & Auth` be split into smaller, more focused modules?**
  _Cohesion score 0.054945054945054944 - nodes in this community are weakly interconnected._
- **Should `Discover & Player Screens` be split into smaller, more focused modules?**
  _Cohesion score 0.0824829931972789 - nodes in this community are weakly interconnected._
- **Should `Details Screen & File Selection` be split into smaller, more focused modules?**
  _Cohesion score 0.12605042016806722 - nodes in this community are weakly interconnected._