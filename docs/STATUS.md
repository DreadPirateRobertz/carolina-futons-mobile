# Carolina Futons Mobile — Live Status

> **Last updated:** 2026-05-04 01:38 MDT (auto-refreshed every 20 min)

---

## Android Build Artifacts

| Build | Size | Timestamp | Path |
|-------|------|-----------|------|
| **Release APK** | (unavailable) | (unavailable) | `pop-os:~/gt/cfutons_mobile/android/app/build/outputs/apk/release/app-release.apk` |
| **Debug APK** | (unavailable) | (unavailable) | `pop-os:~/gt/cfutons_mobile/android/app/build/outputs/apk/debug/app-debug.apk` |

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

`main` — ↑0 ↓0 vs origin/main

**Last commit:** dffa4cf1 feat(hq-mtc6): EmptyState — rename message→subtitle, expand tests to 41, wire ARProductPicker (#535)

**Recent commits:**
```
dffa4cf1 feat(hq-mtc6): EmptyState — rename message→subtitle, expand tests to 41, wire ARProductPicker (#535)
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

(unavailable)

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

