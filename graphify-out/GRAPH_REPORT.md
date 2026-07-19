# Graph Report - .  (2026-07-19)

## Corpus Check
- 154 files · ~96,735 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 729 nodes · 1780 edges · 59 communities (22 shown, 37 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.71)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- UI Settings and Core Overlays
- Discovery and Catalog UI
- Trakt Sync and History
- Android Native Player Module
- Android TV Layouts
- Torrents and Debrid Modals
- Expo App Configuration
- Home Screen and Carousels
- App Boot and Themes
- Package and Build Scripts
- Stremio Addons Service
- Expo Native Module Core
- TypeScript Configuration
- Expo Dependencies
- React Native Bridge
- Component 15
- Component 16
- Component 17
- Component 18
- Component 19
- Component 20
- Component 21
- Component 22
- Component 23
- Component 24
- Component 25
- Component 26
- Component 27
- Component 28
- Component 29
- Component 30
- Component 31
- Component 32
- Component 33
- Component 34
- Component 35
- Component 36
- Component 37
- Component 38
- Component 39
- Component 40
- Component 41
- Component 42
- Component 43
- Component 44
- Component 45
- Component 46
- Component 47
- Component 48
- Component 49
- Component 50
- Component 51
- Component 52
- Component 53
- Component 54

## God Nodes (most connected - your core abstractions)
1. `useAppTheme()` - 90 edges
2. `ThemedText()` - 45 edges
3. `FocusablePressable()` - 35 edges
4. `PlayerActivity` - 25 edges
5. `IconSymbol()` - 23 edges
6. `expo-router` - 22 edges
7. `useSettings()` - 21 edges
8. `ThemedView()` - 20 edges
9. `DetailsScreen()` - 16 edges
10. `expo-image` - 15 edges

## Surprising Connections (you probably didn't know these)
- `CalendarScreen()` --calls--> `useAppTheme()`  [EXTRACTED]
  src/app/calendar.tsx → src/contexts/ThemeContext.tsx
- `DetailsScreen()` --calls--> `useAppTheme()`  [EXTRACTED]
  src/app/details.tsx → src/contexts/ThemeContext.tsx
- `DetailsScreen()` --calls--> `getEnabledAddons()`  [EXTRACTED]
  src/app/details.tsx → src/services/addonService.ts
- `DetailsScreen()` --calls--> `checkCachedHashes()`  [EXTRACTED]
  src/app/details.tsx → src/services/debridService.ts
- `DetailsScreen()` --calls--> `getActiveDebridProvider()`  [EXTRACTED]
  src/app/details.tsx → src/services/debridService.ts

## Import Cycles
- None detected.

## Communities (59 total, 37 thin omitted)

### Community 0 - "UI Settings and Core Overlays"
Cohesion: 0.06
Nodes (64): styles, PreplayScreen(), styles, AppearanceSettingsScreen(), DISCOVER_LAYOUT_OPTIONS, EPISODE_LAYOUT_OPTIONS, THEME_OPTIONS, ContinueWatchingSettingsScreen() (+56 more)

### Community 1 - "Discovery and Catalog UI"
Cohesion: 0.06
Nodes (70): expo-image, expo-router, CalendarEntry, CalendarScreen(), formatDateHeading(), styles, DetailsScreen(), styles (+62 more)

### Community 2 - "Trakt Sync and History"
Cohesion: 0.05
Nodes (69): ContinueWatchingSource, EPISODE_LAYOUTS, SettingsContext, SettingsContextValue, DeviceAuthState, TraktAuthStatus, TraktContext, TraktContextValue (+61 more)

### Community 3 - "Android Native Player Module"
Cohesion: 0.05
Nodes (34): AudioManager, Bundle, Color, com, ComponentActivity, JSONObject, ExoPlayer, PlayerActivity (+26 more)

### Community 4 - "Android TV Layouts"
Cohesion: 0.08
Nodes (39): AppTabs(), NO_TAB_BAR_ROUTES, EpisodeRow, EpisodeRowProps, styles, EpisodeSelectorAccordion(), styles, EpisodeSelectorCardCarousel() (+31 more)

### Community 5 - "Torrents and Debrid Modals"
Cohesion: 0.11
Nodes (34): FileSelectionModal(), FileSelectionModalProps, styles, styles, TorrentModal(), TorrentModalProps, NextEpisodeTarget, useNextEpisode() (+26 more)

### Community 6 - "Expo App Configuration"
Cohesion: 0.05
Nodes (37): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, permissions, predictiveBackGestureEnabled (+29 more)

### Community 7 - "Home Screen and Carousels"
Cohesion: 0.09
Nodes (27): CURRENT_YEAR, EXTRA_ROWS, HomeScreen(), RowConfig, seededShuffle(), styles, Carousel(), CarouselItem (+19 more)

### Community 8 - "App Boot and Themes"
Cohesion: 0.07
Nodes (21): AnimatedSplashOverlay(), glowKeyframe, keyframe, logoKeyframe, styles, ErrorBoundary, ErrorBoundaryProps, ErrorBoundaryState (+13 more)

### Community 9 - "Package and Build Scripts"
Cohesion: 0.08
Nodes (24): eslint, eslint-config-expo, devDependencies, eslint, eslint-config-expo, patch-package, @types/react, typescript (+16 more)

### Community 10 - "Stremio Addons Service"
Cohesion: 0.30
Nodes (12): AddonsSettingsScreen(), addAddon(), getAddons(), getEnabledAddons(), readAll(), removeAddon(), setAddonEnabled(), StreamAddon (+4 more)

### Community 11 - "Expo Native Module Core"
Cohesion: 0.18
Nodes (8): ExpoModulesCore, Module, ModuleDefinition, emit(), Module, NativePlayerModule, NativeVideoPlayerModule, WritableMap

### Community 12 - "TypeScript Configuration"
Cohesion: 0.15
Nodes (12): ./assets/*, expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, **/*.ts, **/*.tsx, compilerOptions, paths (+4 more)

### Community 13 - "Expo Dependencies"
Cohesion: 0.18
Nodes (11): expo, expo-application, expo-device, @expo/vector-icons, dependencies, expo, expo-application, expo-device (+3 more)

### Community 14 - "React Native Bridge"
Cohesion: 0.22
Nodes (9): PlayerScreen(), ClosedEvent, ErrorEvent, NativePlayer, NativePlayerBridgeCallbacks, NativePlayerLaunchConfig, playerEmitter, ProgressEvent (+1 more)

### Community 15 - "Component 15"
Cohesion: 0.22
Nodes (7): exampleDirPath, fs, oldDirs, path, readline, rl, root

### Community 16 - "Component 16"
Cohesion: 0.29
Nodes (4): glowKeyframe, keyframe, logoKeyframe, styles

### Community 17 - "Component 17"
Cohesion: 0.47
Nodes (4): parseSubtitles(), stripTags(), SubtitleCue, toSeconds()

## Knowledge Gaps
- **241 isolated node(s):** `codegraph`, `name`, `slug`, `version`, `orientation` (+236 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAppTheme()` connect `UI Settings and Core Overlays` to `Discovery and Catalog UI`, `Android TV Layouts`, `Torrents and Debrid Modals`, `Home Screen and Carousels`, `Stremio Addons Service`, `React Native Bridge`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Why does `plugins` connect `Expo App Configuration` to `Discovery and Catalog UI`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **What connects `codegraph`, `name`, `slug` to the rest of the system?**
  _241 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UI Settings and Core Overlays` be split into smaller, more focused modules?**
  _Cohesion score 0.06177076183939602 - nodes in this community are weakly interconnected._
- **Should `Discovery and Catalog UI` be split into smaller, more focused modules?**
  _Cohesion score 0.05937353903693315 - nodes in this community are weakly interconnected._
- **Should `Trakt Sync and History` be split into smaller, more focused modules?**
  _Cohesion score 0.0526006464883926 - nodes in this community are weakly interconnected._
- **Should `Android Native Player Module` be split into smaller, more focused modules?**
  _Cohesion score 0.050078247261345854 - nodes in this community are weakly interconnected._