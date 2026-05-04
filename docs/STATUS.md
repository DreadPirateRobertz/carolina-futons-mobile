# Carolina Futons Mobile — Live Status

> **Last updated:** 2026-05-03 19:21 MDT (auto-refreshed every 20 min)

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

`main` — ↑0 ↓0 vs origin/main

**Last commit:** 2feac34d chore(status): auto-update [skip ci]

**Recent commits:**
```
2feac34d chore(status): auto-update [skip ci]
e493f163 chore(status): auto-update [skip ci]
0fc1f6a2 fix(cm-isj): mock useWishlist in PDS tests — prevent async state leak
6b490e66 fix(cm-isj): sentry module isolation + PDS wishlist async leak
16a4b46a fix(cm-b5f): addItem rollback + syncError on addToCart rejection (cm-vjz)
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

Test Suites: 2 skipped, 568 passed, 568 of 570 total
Tests:       32 skipped, 10679 passed, 10711 total

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

