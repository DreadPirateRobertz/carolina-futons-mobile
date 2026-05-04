# Carolina Futons Mobile — Live Status

> **Last updated:** 2026-05-04 01:14 MDT (auto-refreshed every 20 min)

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

`hq-mtc6-empty-state` — ↑1 ↓0 vs origin/main

**Last commit:** 33bbae49 feat(hq-mtc6): EmptyState shared component — subtitle prop + ARProductPicker wiring

**Recent commits:**
```
33bbae49 feat(hq-mtc6): EmptyState shared component — subtitle prop + ARProductPicker wiring
b6a17463 chore(status): auto-update [skip ci]
88b7a5da chore(status): auto-update [skip ci]
1e53073e feat(hq-8zif): OfflineBanner a11y announcements + usePendingSyncCount hook (#534)
a8515467 chore(status): auto-update [skip ci]
```

---

## Open PRs

  (gh not available)

---

## Bead Progress

### In Progress
◐ cm-rpz ● P1 [bug] Refinery test_command misconfigured: go test on RN project

### Ready (no blockers)
○ cfutons_mobile-rig-cfutons_mobile ● P2 cfutons_mobile

---

## Test Suite

Test Suites: 3 failed, 2 skipped, 572 passed, 575 of 577 total
Tests:       3 failed, 32 skipped, 10754 passed, 10789 total

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

