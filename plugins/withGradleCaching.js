const { withGradleProperties } = require('expo/config-plugins');

/**
 * Sets org.gradle.caching=true in the generated android/gradle.properties.
 * Without this, expo run:android's per-device -PreactNativeArchitectures
 * override (see @expo/cli resolveGradlePropsAsync.js) causes native tasks to
 * miss cache and rebuild every time you switch to a device with a different
 * ABI. Plain gradle.properties edits don't survive prebuild since /android
 * is gitignored and regenerated from template each run — this plugin runs
 * as part of that regeneration instead.
 */
function withGradleCaching(config) {
  return withGradleProperties(config, (config) => {
    const props = config.modResults;
    const existing = props.find((p) => p.type === 'property' && p.key === 'org.gradle.caching');
    if (existing) {
      existing.value = 'true';
    } else {
      props.push({ type: 'property', key: 'org.gradle.caching', value: 'true' });
    }
    return config;
  });
}

module.exports = withGradleCaching;
