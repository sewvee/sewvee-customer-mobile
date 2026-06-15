#!/bin/bash
# Force the app to load the LATEST JavaScript bundle (fixes "old UI" / "changes not showing")
#
# ROOT CAUSE: When you run "npx react-native start --reset-cache", if another Metro
# process is ALREADY running on port 8081, the NEW Metro never binds to 8081. The app
# keeps talking to the OLD Metro, which serves a cached/old bundle. So you keep seeing
# the old UI no matter how many times you change the code.
#
# This script: kills Metro, clears caches, clears app data, starts fresh Metro, runs app.

set -e
cd "$(dirname "$0")/.."

echo "=== 1. Killing any Metro/packager on port 8081 ==="
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
sleep 2

echo "=== 2. Clearing Metro cache ==="
rm -rf "${TMPDIR}/metro-"* 2>/dev/null || true
rm -rf "${TMPDIR}/haste-"* 2>/dev/null || true
rm -rf node_modules/.cache/metro 2>/dev/null || true
watchman watch-del-all 2>/dev/null || true

echo "=== 3. Clearing app data on device (forces fresh bundle fetch) ==="
adb shell pm clear com.sewvee 2>/dev/null || true

echo "=== 4. Starting Metro with --reset-cache (run in foreground) ==="
echo "    In another terminal run: npx react-native run-android"
echo "    Or press 'a' in this Metro terminal to run Android."
echo ""
npx react-native start --reset-cache
