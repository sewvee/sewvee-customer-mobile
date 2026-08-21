# Release Checklist (Mobile)

**Mandatory Checklist for every Mobile App Release (Play Store / App Store / CodePush OTA)**

### 1. Environment & API Checks
- [ ] The build script `npm run build` or `npm run android --variant=release` passes without `prebuild` errors.
- [ ] `src/config/env.js` correctly points to `https://api.sewvee.com` (verified by the `check-prod-env.js` script).
- [ ] No hardcoded `api-stage.sewvee.com` endpoints exist in the codebase.

### 2. Versioning
- [ ] `versionCode` in `android/app/build.gradle` is incremented.
- [ ] `versionName` in `android/app/build.gradle` accurately reflects the new release version.
- [ ] `version` in `package.json` matches `versionName`.

### 3. Build & Test
- [ ] A local release APK has been generated and tested to verify network requests hit production.
- [ ] If using CodePush/OTA, ensure the target deployment track is `Production`, NOT `Staging`.

### 4. Agent Instructions
- **Agents:** Whenever the user asks for a "release", "build", or "OTA update", you **MUST** read and verify all items in this checklist before proceeding. Do not assume the environment is correct without checking.
