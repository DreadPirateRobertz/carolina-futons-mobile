# Carolina Futons Mobile — Live Status

> **Last updated:** 2026-05-03 21:14 MDT (auto-refreshed every 20 min)

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

**Last commit:** 53531fc3 fix(hq-5sa4): a11y audit — GamificationPushBridge + TierCelebrationModal

**Recent commits:**
```
53531fc3 fix(hq-5sa4): a11y audit — GamificationPushBridge + TierCelebrationModal
cdeeb40c feat(hq-kjyd): wire managePushPreferences Velo webMethod to mobile
d6e4c42a feat(hq-452z): migrate 6 components from expo-image to AppImage
b1d9a7c9 fix(hq-sxgx/hq-1e63): wire CFW dual-write + push pipeline
bf074778 chore(status): auto-update [skip ci]
```

---

## Open PRs

  (gh not available)

---

## Bead Progress

### In Progress
◐ hq-bzb ● P2 ProductRecommendations — align useProductRecommendations hook to confirmed Wix schema; add recommended-for-you section on PDP and cart
◐ hq-ap43 ● P3 [bug] GAP-M4/M5: wire emitBadgeEarned + emitCartAbandoned crossRig events — implemented but zero callers; loyalty point leakage on badge earn + cart abandon

### Ready (no blockers)
○ hq-s2o4 ● P1 [HIGH] Deacon stuck_heartbeat_857s detected by stuck-agent-dog
○ hq-fjoq ● P1 RECOVERED_BEAD tl-c8n
○ hq-m5mh ● P1 [HIGH] Deacon stuck_heartbeat_842s detected by stuck-agent-dog
○ hq-bhei ● P1 [HIGH] Memory critical: 125MB free (8012 pages × 16KB). Below 200MB threshold. OOM kill risk.
○ hq-x8sl ● P1 [HIGH] Deacon stuck_heartbeat_625s detected by stuck-agent-dog

---

## Test Suite

Test Suites: 2 skipped, 570 passed, 570 of 572 total
Tests:       32 skipped, 10706 passed, 10738 total

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

