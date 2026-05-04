# Carolina Futons Mobile — Live Status

> **Last updated:** 2026-05-03 18:37 MDT (auto-refreshed every 20 min)

---

## Android Build Artifacts

| Build | Size | Timestamp | Path |
|-------|------|-----------|------|
| **Release APK** | 136M | 2026-04-12 19:01:46.811532435 -0600 | `pop-os:~/gt/cfutons_mobile/android/app/build/outputs/apk/release/app-release.apk` |
| **Debug APK** | 109M | 2026-05-03 17:18:51.025906635 -0600 | `pop-os:~/gt/cfutons_mobile/android/app/build/outputs/apk/debug/app-debug.apk` |

To install on a connected device:
```
adb install -r "~/gt/cfutons_mobile/android/app/build/outputs/apk/release/app-release.apk"
```
Or pull to Mac first:
```
scp pop-os:~/gt/cfutons_mobile/android/app/build/outputs/apk/release/app-release.apk ~/Desktop/cf-latest.apk
```

---

## CI Status (last 3 runs)

  (gh not available)

---

## Current Branch

`cm-7s9-achievement-badges-a11y` — ↑0 ↓0 vs origin/main

**Last commit:** 7609427f chore(status): auto-update [skip ci]

**Recent commits:**
```
7609427f chore(status): auto-update [skip ci]
a17df50e chore(status): auto-update [skip ci]
e29f3644 chore(status): auto-update [skip ci]
8a86d924 docs(status): session update 2026-05-03 18:01 MDT [skip ci]
717f936c fix(cm-7s9): a11y — badge card + modal close button in AchievementBadgesScreen
```

---

## Open PRs

  (gh not available)

---

## Bead Progress

### In Progress
◐ cm-rpz ● P1 [bug] Refinery test_command misconfigured: go test on RN project

### Ready (no blockers)
○ cm-isj ● P2 [bug] fix(ci): sentryCrashReporting.withSentry + ProductDetailScreen flaky in full suite
○ cm-b5f ● P2 fix(ci): CartScreen test isolation — OOM SIGTERM after BundleSuggestion wire-in
○ cm-7hg ● P2 fix(ci): SearchScreen test isolation — scope useFakeTimers to prevent OOM SIGTERM
○ cfutons_mobile-rig-cfutons_mobile ● P2 cfutons_mobile

---

## Test Suite

Test Suites: 2 skipped, 564 passed, 564 of 566 total
Tests:       31 skipped, 10578 passed, 10609 total

---

## Build Instructions

**Build release APK on Linux:**
```bash
ssh pop-os "source ~/.nvm/nvm.sh && cd ~/gt/cfutons_mobile && npm run build:android"
# or manually:
ssh pop-os "cd ~/gt/cfutons_mobile && ./android/gradlew -p android assembleRelease --no-daemon"
```

**Run tests on Linux:**
```bash
ssh pop-os "source ~/.nvm/nvm.sh && cd ~/gt/cfutons_mobile && npm test -- --ci"
```

