# Why Team & Roles (and other) UI updates don’t show on the app

## Root cause

**An old Metro bundler is still running on port 8081.**

When you run `npx react-native start --reset-cache`, a **new** Metro process starts. If something is **already** using port 8081 (e.g. a previous Metro from another terminal or an old Cursor run), the new Metro **cannot** bind to 8081. The app always connects to **port 8081** to load the JS bundle. So it keeps talking to the **old** Metro, which serves an **old/cached** bundle. Your latest code never runs.

So you see:
- Old “Team & Roles” UI (e.g. “Name” / “Role” / “Last Login” headers, plain cards)
- No “New UI” badge, no stats chips, no colored card bars, no “Team members” section

even though the source code has been updated many times.

## Fix (do this when the UI doesn’t update)

1. **Kill whatever is on 8081**
   ```bash
   lsof -ti:8081 | xargs kill -9
   ```

2. **Clear Metro cache**
   ```bash
   rm -rf $TMPDIR/metro-* $TMPDIR/haste-* 2>/dev/null
   rm -rf node_modules/.cache/metro 2>/dev/null
   ```

3. **Clear app data** (so the app doesn’t use any on-device bundle cache)
   ```bash
   adb shell pm clear com.sewvee
   ```

4. **Start Metro with a clean cache**
   ```bash
   npx react-native start --reset-cache
   ```
   Leave this running in one terminal.

5. **Run the app**
   - In another terminal: `npx react-native run-android`, or  
   - Start the emulator, then open the Sewvee app.

After this, the app will load the **new** bundle from the **new** Metro. You should see the new Team & Roles UI and a small **“New UI”** badge under the title (confirms the new bundle is loaded).

## One-shot script

From the project root:

```bash
chmod +x scripts/fresh-run-android.sh
./scripts/fresh-run-android.sh
```

That script kills Metro on 8081, clears caches, clears app data, and starts Metro with `--reset-cache`. In a second terminal, run `npx react-native run-android` (or start the emulator and open the app).

## Summary

| What you see                         | Cause                          | Fix                                      |
|--------------------------------------|---------------------------------|------------------------------------------|
| Old UI after changing code           | Old Metro still on 8081        | Kill 8081, clear caches, restart Metro   |
| “New UI” badge + new layout visible  | App is using the new bundle    | None                                     |
