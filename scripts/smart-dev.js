const chokidar = require('chokidar');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

let activeProcess = null;
let metroProcess = null;
let debounceTimer = null;

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

// -----------------------------------------------------------------------
// Sync marker — tracks when the last successful native build ran, so that
// starting dev:smart after editing files WITHOUT it running (e.g. edits
// made while it was closed) doesn't leave the APK stale. On startup we scan
// every watched native file's mtime against the marker's mtime; if anything
// is newer, a build kicks off immediately instead of waiting for the next
// file-save event.
// -----------------------------------------------------------------------
const BUILD_MARKER = path.join(__dirname, '.last-native-build');
const NATIVE_EXTS = new Set(['.kt', '.java', '.swift', '.m', '.cpp', '.h', '.gradle']);
const NATIVE_ROOTS = ['modules', 'android/app/src/main', 'ios'];

function touchMarker() {
  fs.writeFileSync(BUILD_MARKER, String(Date.now()));
}

function walk(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return; // dir doesn't exist (e.g. no ios/ in this project)
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (NATIVE_EXTS.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
}

function hasUnsyncedNativeChanges() {
  const markerTime = fs.existsSync(BUILD_MARKER)
    ? Number(fs.readFileSync(BUILD_MARKER, 'utf8')) || 0
    : 0;
  if (markerTime === 0) return true; // never built before — force a first build

  const files = [];
  for (const root of NATIVE_ROOTS) walk(root, files);
  return files.some((f) => fs.statSync(f).mtimeMs > markerTime);
}

// Start Metro bundler which handles fast refresh for JS/TS
function startMetro() {
  if (metroProcess) return;
  console.log('\n[smart-dev] Starting Expo Metro Bundler (Fast Refresh)...');
  metroProcess = spawn('npm run start', { stdio: 'inherit', shell: true });
}

function runCommand(commandString, name, onSuccess) {
  if (activeProcess) {
    console.log(`\n[smart-dev] Killing active ${name} process...`);
    activeProcess.kill();
  }

  console.log(`\n[smart-dev] Running ${name}...`);
  activeProcess = spawn(commandString, { stdio: 'inherit', shell: true });

  activeProcess.on('close', (code) => {
    if (code !== 0 && code !== null) {
      console.log(`\n[smart-dev] ${name} failed with code ${code}`);
    } else {
      console.log(`\n[smart-dev] ${name} finished successfully.`);
      onSuccess?.();
    }
    activeProcess = null;
  });
}

function triggerBuild(type) {
  clearTimeout(debounceTimer);
  
  debounceTimer = setTimeout(() => {
    if (type === 'prebuild') {
      console.log('\n[smart-dev] Config change detected. Running prebuild then android build...');
      runCommand('npm run prebuild', 'prebuild', touchMarker);
    } else if (type === 'native') {
      console.log('\n[smart-dev] Native code change detected. Running android build...');
      runCommand('npm run android', 'native build', touchMarker);
    }
  }, 2000); // 2s debounce to prevent multiple builds when saving multiple files
}

console.log('[smart-dev] Initializing professional watch environment...');

// Start Metro
startMetro();

// If native files changed while dev:smart wasn't running (or its last build
// failed before touching the marker), the installed APK is stale — kick off
// a build immediately instead of waiting for the next file-save.
if (hasUnsyncedNativeChanges()) {
  console.log('\n[smart-dev] Unsynced native changes detected since last build. Running android build now...');
  runCommand('npm run android', 'native build', touchMarker);
}

// chokidar v4/v5 dropped glob-pattern support (literal paths only) — glob
// strings like 'modules/**/*.kt' silently match nothing, no error. Watch the
// real directories instead and filter by extension in the callback.
const nativeWatcher = chokidar.watch(NATIVE_ROOTS, {
  ignored: (path) => /(^|[\/\\])\../.test(path), // ignore dotfiles/dirs
  persistent: true,
  ignoreInitial: true,
});

nativeWatcher.on('all', (event, path) => {
  const ext = path.slice(path.lastIndexOf('.'));
  if (!NATIVE_EXTS.has(ext)) return;
  console.log(`[smart-dev] Native file changed: ${path}`);
  triggerBuild('native');
});

// Watch for config changes
const configWatcher = chokidar.watch(['app.json', 'package.json'], {
  persistent: true,
  ignoreInitial: true,
});

configWatcher.on('all', (event, path) => {
  console.log(`[smart-dev] Config file changed: ${path}`);
  triggerBuild('prebuild');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  if (metroProcess) metroProcess.kill();
  if (activeProcess) activeProcess.kill();
  process.exit();
});

console.log('[smart-dev] Watching for native and config changes...');
