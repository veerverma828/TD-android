const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Adds Android TV leanback launcher support to the generated manifest:
 * - LEANBACK_LAUNCHER intent-filter category so the app appears on the TV home screen
 * - leanback feature declared as optional (keeps mobile installs unaffected)
 * - touchscreen feature declared as optional, which is required for the app to be
 *   installable at all on touchscreen-less TV hardware (without this line the Play
 *   Store / adb install refuses the app on a device with no touchscreen).
 *
 * No TV banner asset ships yet (assets/images/tv-banner.png, 320x180) — add one and
 * set `android:banner="@drawable/tv_banner"` on the <application> tag once available;
 * the leanback launcher falls back to the app icon/label until then.
 */
function withAndroidTVBanner(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const app = manifest.manifest.application?.[0];
    if (!app) return config;

    const mainActivity = app.activity?.find(
      (a) => a['intent-filter']?.some((f) => f.action?.some((act) => act.$['android:name'] === 'android.intent.action.MAIN'))
    );

    if (mainActivity) {
      for (const filter of mainActivity['intent-filter']) {
        const hasLauncherCategory = filter.category?.some((c) => c.$['android:name'] === 'android.intent.category.LAUNCHER');
        if (hasLauncherCategory) {
          const hasLeanback = filter.category.some((c) => c.$['android:name'] === 'android.intent.category.LEANBACK_LAUNCHER');
          if (!hasLeanback) {
            filter.category.push({ $: { 'android:name': 'android.intent.category.LEANBACK_LAUNCHER' } });
          }
        }
      }
    }

    manifest.manifest['uses-feature'] = manifest.manifest['uses-feature'] || [];
    const existingFeatures = new Set(manifest.manifest['uses-feature'].map((f) => f.$['android:name']));

    if (!existingFeatures.has('android.software.leanback')) {
      manifest.manifest['uses-feature'].push({
        $: { 'android:name': 'android.software.leanback', 'android:required': 'false' },
      });
    }
    if (!existingFeatures.has('android.hardware.touchscreen')) {
      manifest.manifest['uses-feature'].push({
        $: { 'android:name': 'android.hardware.touchscreen', 'android:required': 'false' },
      });
    }

    return config;
  });
}

module.exports = withAndroidTVBanner;
