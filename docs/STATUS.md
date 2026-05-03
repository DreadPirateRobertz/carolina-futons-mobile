# Carolina Futons Mobile — Live Status

> **Last updated:** 2026-05-03 17:08 MDT (auto-refreshed every 20 min)

---

## Android Build Artifacts

| Build | Size | Timestamp | Path |
|-------|------|-----------|------|
| **Release APK** | 136M | 2026-04-12 19:01:46.811532435 -0600 | `pop-os:~/gt/cfutons_mobile/android/app/build/outputs/apk/release/app-release.apk` |
| **Debug APK** | 105M | 2026-04-13 22:15:38.312664691 -0600 | `pop-os:~/gt/cfutons_mobile/android/app/build/outputs/apk/debug/app-debug.apk` |

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

`ci-fix-typecheck-lint` — ↑0 ↓0 vs origin/main

**Last commit:** 7aeba4cf feat(cm-006): dual-write sendCrossRigEvent to Wix + CFW

**Recent commits:**
```
7aeba4cf feat(cm-006): dual-write sendCrossRigEvent to Wix + CFW
944ab952 docs(cm-006): TDD spec for Channel A dual-write (Wix + CFW legs)
019f3dfa fix(cm-001): align isNcZip to CFW numeric prefix range 270-289
b5e87407 fix(cm-001): restore weight tier impl + add bishop's edge cases
39732d20 docs(cm-001): TDD spec for weight tiers — regression map + gap analysis
```

---

## Open PRs

  (gh not available)

---

## Bead Progress

### In Progress
◐ cm-rpz ● P1 [bug] Refinery test_command misconfigured: go test on RN project

### Ready (no blockers)
○ cm-7s9 ● P1 a11y: AchievementBadgesScreen — badge press + modal close buttons missing accessibilityLabel/Role
○ cm-2c8 ● P1 a11y: LeaderboardScreen — period-tab and refresh TouchableOpacity missing accessibilityRole/Label
○ cfutons_mobile-rig-cfutons_mobile ● P2 cfutons_mobile

---

## Test Suite

Test Suites: 2 skipped, 429 passed, 429 of 431 total
Tests:       32 skipped, 7455 passed, 7487 total

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

