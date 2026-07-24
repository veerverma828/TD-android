const { withAppBuildGradle } = require('expo/config-plugins');

// The RN/Expo template ships `release { signingConfig signingConfigs.debug }` with a
// "generate your own keystore" comment that nobody had acted on - every release build
// was signed with the well-known public debug key (password 'android'), which anyone
// can use to re-sign a malicious APK update, and which the Play Store will reject
// outright for a real listing.
//
// This adds a real `release` signingConfig that reads from env vars / gradle
// properties (RELEASE_STORE_FILE, RELEASE_STORE_PASSWORD, RELEASE_KEY_ALIAS,
// RELEASE_KEY_PASSWORD) at *build* time (not prebuild time), so supplying real
// credentials later never requires re-running `expo prebuild`. Deliberately falls
// back to the debug keystore (with a loud Gradle warning) when they're absent, rather
// than failing the build outright - today's local/CI debug-signed release builds keep
// working exactly as before until real credentials are actually supplied.
const OLD_SIGNING_CONFIGS = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`;

const NEW_SIGNING_CONFIGS = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            def releaseStoreFile = System.getenv('RELEASE_STORE_FILE') ?: findProperty('RELEASE_STORE_FILE')
            if (releaseStoreFile) {
                storeFile file(releaseStoreFile)
                storePassword System.getenv('RELEASE_STORE_PASSWORD') ?: findProperty('RELEASE_STORE_PASSWORD')
                keyAlias System.getenv('RELEASE_KEY_ALIAS') ?: findProperty('RELEASE_KEY_ALIAS')
                keyPassword System.getenv('RELEASE_KEY_PASSWORD') ?: findProperty('RELEASE_KEY_PASSWORD')
            } else {
                logger.warn('WARNING: RELEASE_STORE_FILE not set - release build type is signed with the public debug keystore. Set RELEASE_STORE_FILE/RELEASE_STORE_PASSWORD/RELEASE_KEY_ALIAS/RELEASE_KEY_PASSWORD before shipping a real release.')
                storeFile file('debug.keystore')
                storePassword 'android'
                keyAlias 'androiddebugkey'
                keyPassword 'android'
            }
        }
    }`;

const OLD_RELEASE_BUILD_TYPE = `        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`;

const NEW_RELEASE_BUILD_TYPE = `        release {
            // See plugins/withReleaseSigning.js - signingConfigs.release falls back to
            // the debug keystore (with a build warning) until real credentials are set.
            signingConfig signingConfigs.release`;

function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;

    if (!contents.includes(OLD_SIGNING_CONFIGS)) {
      throw new Error(
        'withReleaseSigning: expected signingConfigs block not found in android/app/build.gradle - ' +
          'the RN/Expo template likely changed. Update plugins/withReleaseSigning.js to match.',
      );
    }
    if (!contents.includes(OLD_RELEASE_BUILD_TYPE)) {
      throw new Error(
        'withReleaseSigning: expected release buildType block not found in android/app/build.gradle - ' +
          'the RN/Expo template likely changed. Update plugins/withReleaseSigning.js to match.',
      );
    }

    config.modResults.contents = contents
      .replace(OLD_SIGNING_CONFIGS, NEW_SIGNING_CONFIGS)
      .replace(OLD_RELEASE_BUILD_TYPE, NEW_RELEASE_BUILD_TYPE);

    return config;
  });
}

module.exports = withReleaseSigning;
