const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

/**
 * `android/` is fully gitignored and regenerated from scratch by `expo prebuild`
 * every time (including in CI). The native player's Kotlin sources therefore
 * cannot live inside `android/` directly — they were lost once already because
 * of this. The permanent, git-tracked copy lives in `native/android-player/`;
 * this plugin copies it into the generated Android project on every prebuild.
 */
function withNativePlayerFiles(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const srcDir = path.join(config.modRequest.projectRoot, 'native', 'android-player');
      const destDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'java',
        'com',
        'tdandroid',
        'app',
        'player',
      );
      copyDirRecursive(srcDir, destDir);
      return config;
    },
  ]);
}

function copyDirRecursive(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

module.exports = withNativePlayerFiles;
