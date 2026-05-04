# Carolina Futons Mobile — Live Status

> **Last updated:** 2026-05-03 18:01 MDT (auto-refreshed every 20 min)

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

`main` — up to date with origin/main

**Last commit:** 717f936 fix(cm-7s9): a11y — badge card + modal close button in AchievementBadgesScreen

**Recent commits:**
```
717f936 fix(cm-7s9): a11y — AchievementBadgesScreen badge cards + modal close
13ebb1c test(cm-7s9): TDD a11y tests for badge cards + modal close button
f567930 chore: disable nightly integration schedule (#522)
817b632 fix(cm-007,cm-008): crossRigSync secret-absent error logging + env var cleanup (#521)
5f2be08 fix(ci): TypeScript + prettier failures blocking CI since cm-001 (#520)
```

---

## Open PRs

- **CFW PR #315** `cm-002-ar-model-viewer` — AR model-viewer on CFW PDP (CI running)
  - ripley's ArModelViewer component + dallas models3d catalog + catalog-guarded render
  - 29 vitest tests pass, typecheck clean

---

## Bead Progress

### Completed This Session
✓ cm-7s9 — AchievementBadgesScreen a11y (badge card + modal close) — PR #523 merged
✓ cm-2c8 — LeaderboardScreen a11y — already fixed by cm-b6v, closed
✓ hq-wegjr — CROSS_RIG_SECRET provisioning — mobile .env set, CFW .env.local set
✓ cm-002 (CFW) — AR model-viewer on PDP — PR #315 open, CI running

### No Open cfutons_mobile Beads
All current P1 beads closed. System up to date.

---

## Test Suite

Test Suites: 601 test files (from npx jest --listTests)
Latest run: 56/56 AchievementBadgesScreen, 31/31 LeaderboardScreen — all passing

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

