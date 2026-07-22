# Graph Report - .  (2026-07-23)

## Corpus Check
- 41 files · ~75,883 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 911 nodes · 1729 edges · 121 communities (39 shown, 82 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.78)
- Token cost: 150 input · 200 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 73
- Community 75
- Community 76
- Community 77
- Community 80
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 118
- Community 119

## God Nodes (most connected - your core abstractions)
1. `useAppTheme()` - 59 edges
2. `FocusablePressable` - 41 edges
3. `ThemedText()` - 29 edges
4. `expo-router` - 22 edges
5. `PlayerControlsOverlay()` - 19 edges
6. `PlayerRoot()` - 16 edges
7. `expo` - 15 edges
8. `expo-image` - 15 edges
9. `PlayerControlsCallbacks` - 14 edges
10. `ThemedView()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `onCreate()` --calls--> `GestureSettings`  [INFERRED]
  modules/native-video-player/android/src/main/java/com/tdandroid/app/player/PlayerActivity.kt → modules/native-video-player/android/src/main/java/com/tdandroid/app/player/PlayerGestureController.kt
- `Build Android APK workflow` --references--> `TD-Android (Torrent Debrid Android)`  [EXTRACTED]
  .github/workflows/build-apk.yml → README.md
- `onCreate()` --calls--> `PlayerGestureController`  [INFERRED]
  modules/native-video-player/android/src/main/java/com/tdandroid/app/player/PlayerActivity.kt → modules/native-video-player/android/src/main/java/com/tdandroid/app/player/PlayerGestureController.kt
- `AddonsSettingsScreen()` --calls--> `getAddons()`  [EXTRACTED]
  src/app/settings/addons.tsx → src/services/addonService.ts
- `ContinueWatchingSettingsScreen()` --calls--> `useTrakt()`  [EXTRACTED]
  src/app/settings/continue-watching.tsx → src/contexts/TraktContext.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Duplicate caveman persona configs across IDE agent tools** — clinerules_caveman, github_copilot_instructions, opencode_agents, windsurf_rules_caveman, agents [INFERRED 0.90]
- **CI Android release build pipeline (stamp, sign, build, release)** — github_workflows_build_apk_yml, build_number_stamping, release_signing_config, td_android_app [EXTRACTED 1.00]
- **Stremio metadata + debrid streaming pipeline** — cinemeta, torrentio, real_debrid, torbox [EXTRACTED 1.00]

## Communities (121 total, 82 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (91): expo-router, CalendarEntry, CalendarScreen(), formatDateHeading(), styles, DiscoverScreen(), styles, styles (+83 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (71): ContinueWatchingSource, DiscoverLayout, EPISODE_LAYOUTS, EpisodeLayout, SettingsContext, SettingsContextValue, DeviceAuthState, TraktAuthStatus (+63 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (35): Bundle, Color, FocusRequester, Modifier, onCreate(), ExoPlayer, Format, TrackManager (+27 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (29): AnimatedSplashOverlay(), styles, ErrorBoundary, ErrorBoundaryProps, ErrorBoundaryState, styles, InstallState, styles (+21 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (38): TorrentModalProps, keyFor(), MyListContext, MyListContextValue, MyListProvider(), delay(), DetailedMetaItem, encodePathPart() (+30 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (38): Build number stamping for in-app updater, chokidar, Cinemeta (Stremio catalogs), eslint, eslint-config-expo, expo-router, Build Android APK workflow, nodemon (+30 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (30): FileSelectionModalProps, NextEpisodeTarget, useNextEpisode(), ALLOWED_SCHEMES, hasAllowedScheme(), PlaybackMeta, useStreamActions(), addAddon() (+22 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (31): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, permissions, predictiveBackGestureEnabled (+23 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (10): ExpoModulesCore, Module, ModuleDefinition, emit(), NativePlayerModule, buildPlayer(), ExoPlayer, reportFatalError() (+2 more)

### Community 9 - "Community 9"
Cohesion: 0.21
Nodes (15): EpisodeRow, EpisodeRowProps, styles, EpisodeSelectorAccordion(), styles, EpisodeSelectorNumberedGrid(), styles, EpisodeSelectorSplitRail() (+7 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (19): plugins, expo-dev-client, expo-notifications, expo-secure-store, expo-status-bar, expo-web-browser, ./plugins/withAndroidTVBanner.js, PlayerScreen() (+11 more)

### Community 11 - "Community 11"
Cohesion: 0.15
Nodes (14): DetailsScreen(), styles, TAB_LABELS, TabKey, tvStyles, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }, LibraryScreen(), styles (+6 more)

### Community 12 - "Community 12"
Cohesion: 0.12
Nodes (14): CURRENT_YEAR, EXTRA_ROWS, HomeScreen(), RowConfig, seededShuffle(), styles, HeroBanner(), HeroBannerProps (+6 more)

### Community 13 - "Community 13"
Cohesion: 0.15
Nodes (8): GestureSettings, Mode, HORIZONTAL, NONE, VERTICAL, PlayerGestureCallbacks, PlayerGestureController, MotionEvent

### Community 14 - "Community 14"
Cohesion: 0.19
Nodes (8): Callbacks, Classification, DECODER_INIT, IO_NETWORK, OTHER, UNSUPPORTED, ErrorRecoveryManager, PlaybackException

### Community 15 - "Community 15"
Cohesion: 0.17
Nodes (10): Carousel, CarouselItem, CarouselProps, styles, ContinueWatchingRowProps, EpisodeSelectorCardCarousel(), styles, CONTINUE_WATCHING_SOURCE_COLORS (+2 more)

### Community 16 - "Community 16"
Cohesion: 0.24
Nodes (6): AnalyticsListener, androidx, LoadEventInfo, MediaLoadData, Format, PlaybackAnalyticsListener

### Community 17 - "Community 17"
Cohesion: 0.30
Nodes (3): KeyEvent, TvRemoteCallbacks, TvRemoteInputController

### Community 18 - "Community 18"
Cohesion: 0.15
Nodes (12): ./assets/*, expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, **/*.ts, **/*.tsx, compilerOptions, paths (+4 more)

### Community 19 - "Community 19"
Cohesion: 0.20
Nodes (7): DefaultLoadErrorHandlingPolicy, LoadErrorHandlingPolicy, MediaItem, MediaSource, Context, MediaSourceFactory, StreamingLoadErrorHandlingPolicy

### Community 20 - "Community 20"
Cohesion: 0.18
Nodes (6): expo-image, styles, styles, ListItem, ListItemProps, styles

### Community 21 - "Community 21"
Cohesion: 0.25
Nodes (7): PreplayScreen(), styles, PosterCardImpl(), PosterCardProps, styles, ImageType, normalizeImageUrl()

### Community 22 - "Community 22"
Cohesion: 0.22
Nodes (7): CATEGORIES, tvStyles, CategoryRow(), Colors, Fonts, Palettes, Spacing

### Community 23 - "Community 23"
Cohesion: 0.38
Nodes (8): formatBytes(), StorageSettingsScreen(), UpdateState, checkForUpdate(), CURRENT_BUILD, downloadAndInstallUpdate(), isDevBuild(), UpdateInfo

### Community 24 - "Community 24"
Cohesion: 0.22
Nodes (9): expo, expo-blur, expo-font, expo-notifications, dependencies, expo, expo-blur, expo-font (+1 more)

### Community 25 - "Community 25"
Cohesion: 0.22
Nodes (7): exampleDirPath, fs, oldDirs, path, readline, rl, root

### Community 27 - "Community 27"
Cohesion: 0.29
Nodes (4): MeasurableNode, TVScrollContext, TVScrollContextValue, UseTVAutoScrollOptions

### Community 28 - "Community 28"
Cohesion: 0.47
Nodes (3): DefaultLoadControl, BufferManager, Context

### Community 30 - "Community 30"
Cohesion: 0.47
Nodes (4): parseSubtitles(), stripTags(), SubtitleCue, toSeconds()

### Community 31 - "Community 31"
Cohesion: 0.50
Nodes (4): OUT, path, render(), sharp

### Community 32 - "Community 32"
Cohesion: 0.50
Nodes (4): NO_TAB_BAR_ROUTES, styles, TAB_ICONS, TVTabBar()

## Knowledge Gaps
- **288 isolated node(s):** `codegraph`, `path`, `OUT`, `{ defineConfig }`, `expoConfig` (+283 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **82 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `expo-router` connect `Community 0` to `Community 3`, `Community 6`, `Community 10`, `Community 11`, `Community 12`, `Community 20`, `Community 21`, `Community 22`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `plugins` connect `Community 10` to `Community 0`, `Community 20`, `Community 7`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `expo` connect `Community 7` to `Community 10`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **What connects `codegraph`, `path`, `OUT` to the rest of the system?**
  _288 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05026423957721668 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05070028011204482 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07197763801537387 - nodes in this community are weakly interconnected._