#!/bin/bash
# Kill ports, clear cache, and run Android with fresh build

set -e
cd "$(dirname "$0")/.."

echo "🔪 Killing processes on port 8081..."
lsof -ti:8081 | xargs kill -9 2>/dev/null || true

echo "🗑️  Clearing caches..."
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf android/app/build 2>/dev/null || true
watchman watch-del-all 2>/dev/null || true

echo "📱 Starting Metro with reset cache (in background)..."
npx react-native start --reset-cache &
METRO_PID=$!
sleep 8

echo "🏗️  Building and installing Android app..."
npx react-native run-android

kill $METRO_PID 2>/dev/null || true
echo "✅ Done!"
