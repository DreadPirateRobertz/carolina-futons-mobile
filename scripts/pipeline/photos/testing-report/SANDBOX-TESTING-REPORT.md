# Sandbox Testing Report — 2026-03-01

**Branch**: `cm-ec9-wix-config-and-colors` (PR #40)
**Tester**: cfutons_mobile/crew/dallas
**Date**: 2026-03-01 19:45 PST

---

## Platform Status

| Platform | Device | Status | Screenshot |
|----------|--------|--------|------------|
| iOS | iPhone 17 Pro (Simulator, iOS 26.2) | Running | `ios-onboarding.png`, `ios-current.png` |
| Android | Pixel 7 API 34 (Emulator, Android 14) | Running | `android-onboarding.png` |
| Web | localhost:8082 (Chrome/Puppeteer) | Running | (captured via Puppeteer) |

## What Was Tested

### App Startup
- **iOS**: App loads via Expo Go. Onboarding screen renders correctly with futon icon, "Welcome to Carolina Futons" title, subtitle text, Skip/Next buttons, and carousel dots.
- **Android**: App loads via Expo Go (freshly installed APK). Same onboarding screen renders identically to iOS. Dev menu overlay present on first launch.
- **Web**: App loads at localhost:8082. Onboarding renders with proper dark background, coral CTA button, and pagination dots. Skip navigates to home screen successfully.

### Issues Found

| # | Severity | Platform | Description | Root Cause |
|---|----------|----------|-------------|------------|
| 1 | **Blocker (fixed)** | All | `expo-image` in app.json plugins crashes Expo CLI on Node 22 | expo-image 2.0.7 has no config plugin but `main` points to `src/index.ts`; Node 22 TS stripping rejects it. **Fix**: removed from plugins array. |
| 2 | **Blocker (fixed)** | All | `URL.protocol is not implemented` error on app load | React Native missing URL polyfill. **Fix**: `import 'react-native-url-polyfill/auto'` in App.tsx (on this branch). |
| 3 | **Warning** | All | Package version mismatches: `@react-native-async-storage/async-storage@2.2.0` (expected 1.23.1), `react-native@0.76.7` (expected 0.76.9), `react-native-safe-area-context@4.14.1` (expected 4.12.0) | Expo SDK 52 compatibility. Non-blocking but should be addressed. |
| 4 | **Warning** | Web | `props.pointerEvents is deprecated. Use style.pointerEvents` (many warnings) | React Native Web deprecation. Non-blocking. |

### Not Yet Tested
- Navigation between all screens (Home, Browse, Cart, AR, Profile)
- Product listing and detail screens
- Cart add/remove functionality
- Auth flow (Login, SignUp, ForgotPassword)
- Deep linking
- Offline mode
- Push notifications
- AR camera (requires native build, not available in Expo Go)

## Infrastructure Setup

### iOS
- Xcode simulators available (iPhone 17 Pro booted)
- Expo Go 2.32.18 pre-installed
- No additional setup needed

### Android
- Android SDK installed via `sdkmanager` (platforms;android-34, system-images, emulator, platform-tools)
- Java: OpenJDK 21.0.10 (Homebrew)
- AVD: Pixel_7_API_34 (arm64-v8a, Google APIs)
- Expo Go installed via ADB
- **Note**: `ANDROID_HOME` and `JAVA_HOME` not in default shell PATH. Requires explicit export.

### Web
- Expo web bundler on port 8082
- Metro Bundler on port 8081 (shared with native)
- 1223 modules bundled in ~9s

## PR Fix Summary

| PR | Issue | Fix | Status |
|----|-------|-----|--------|
| #40 (this branch) | Lint failure | `npm install` (expo-image missing from node_modules) | Pushed, CI re-running |
| #40 (this branch) | Node 22 crash | Removed `expo-image` from app.json plugins | Pushed |
| #39 (perf) | Lint failure + merge conflict | Rebased on main, resolved 5 formatting conflicts | Pushed |
| #38 (typography) | No issues — needs review | N/A | Green, awaiting approval |
| #41 (3D catalog) | No issues — needs review | N/A | Green, awaiting approval |

## Follow-Up Work Needed
1. Full screen-by-screen testing on all 3 platforms
2. Fix package version mismatches for Expo SDK 52 compatibility
3. Native build (expo prebuild) for AR camera testing
4. E2E test suite execution (Detox configured but not run)
5. Cross-platform design token alignment (melania directive: remove mauve, coral CTAs everywhere)
