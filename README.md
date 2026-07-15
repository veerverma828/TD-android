# TD-Android (Torrent Debrid Android) 🚀

TD-Android is the ultimate premium torrent-debrid streaming client built on React Native & Expo. 

Say goodbye to buffering, public P2P warning letters, and slow peers. TD-Android aggregates movie and series metadata using **Cinemeta** (Stremio catalogs), queries torrent streams via **Torrentio**, and resolves links on-the-fly through high-speed direct links from **Real-Debrid** and **Torbox** APIs.

---

## ✨ Features

- **🔒 Zero P2P Traffic**: Stream cached media directly from high-speed HTTP servers. No peer-to-peer uploading, no VPN required.
- **⚡ Buffer-Free 4K/HDR**: Experience immediate start and seek times, streaming directly from Debrid premium hosts.
- **🔌 Multi-Debrid Support**: Native integration with both **Real-Debrid** and **Torbox** APIs.
- **🎬 Stremio Ecosystem Integration**: 
  - Complete catalogs powered by **Cinemeta** (Movies & TV Shows).
  - Instant aggregation of stream links using **Torrentio** addons.
- **📺 Advanced Video Player**: Smooth playback controls, full gestures, audio track selection, and sub-title toggling.
- **📱 Clean Modern UI**: Beautifully crafted dark mode theme, detailed metadata info pages, robust search engines, and carousel highlights.

---

## 🛠️ Tech Stack

- **Framework**: [Expo](https://expo.dev) & [React Native](https://reactnative.dev)
- **Navigation**: Expo Router (File-based Routing)
- **Language**: TypeScript
- **Styling**: Native CSS styled variables for perfect dark-mode adaptability
- **Storage**: AsyncStorage & Expo SecureStore for safe credential handling

---

## 🚀 Getting Started

Follow these steps to set up the development environment and run TD-Android:

### 1. Prerequisites
- **Node.js** (LTS version recommended)
- **Git**
- A **Real-Debrid** or **Torbox** account with an API token.
- **Expo Go** app on your Android device (or Android Studio for emulator setup).

### 2. Installation
Clone the repository and install all dependencies:
```bash
# Clone the repository
git clone https://github.com/veerverma828/TD-android.git
cd TD-android

# Install dependencies
npm install
```

### 3. Start Development Server
Boot up the Expo bundler:
```bash
npx expo start
```

- Press **`a`** to open in an Android emulator.
- Scan the QR code with your **Expo Go** app to run on your physical Android device.

---

## ⚙️ Configuration

1. Launch the app on your device/emulator.
2. Go to the **Settings** tab.
3. Select your active Debrid Provider: **Real-Debrid** or **Torbox**.
4. Paste your API key (obtained from your provider's API page) and save.
5. You're ready to stream! Browse the catalog or search, select an episode or movie, choose your torrent stream, and play.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
