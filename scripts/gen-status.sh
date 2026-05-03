#!/usr/bin/env bash
# Generates docs/STATUS.md — run via cron every 20 min
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$REPO_ROOT/docs/STATUS.md"
NOW=$(date '+%Y-%m-%d %H:%M %Z')
NOW_MT=$(TZ='America/Denver' date '+%Y-%m-%d %H:%M MDT')

# ── helpers ───────────────────────────────────────────────────────────────────

run_ssh() { ssh pop-os "$@" 2>/dev/null || echo "(unavailable)"; }

# ── git info ──────────────────────────────────────────────────────────────────

cd "$REPO_ROOT"
git fetch --quiet origin 2>/dev/null || true

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?")
LAST_COMMIT=$(git log --oneline -1 2>/dev/null || echo "?")
AHEAD_BEHIND=$(git rev-list --left-right --count origin/main...HEAD 2>/dev/null | awk '{print "↑"$2" ↓"$1}' || echo "?")
RECENT_COMMITS=$(git log --oneline -5 2>/dev/null || echo "(none)")

# ── APK / build artifacts ─────────────────────────────────────────────────────

APK_RELEASE=$(run_ssh "stat -c '%y %n' ~/gt/cfutons_mobile/android/app/build/outputs/apk/release/app-release.apk 2>/dev/null | awk '{print \$1,\$2,\$3}'" || echo "(not built)")
APK_DEBUG=$(run_ssh "stat -c '%y %n' ~/gt/cfutons_mobile/android/app/build/outputs/apk/debug/app-debug.apk 2>/dev/null | awk '{print \$1,\$2,\$3}'" || echo "(not built)")
APK_RELEASE_PATH="pop-os:~/gt/cfutons_mobile/android/app/build/outputs/apk/release/app-release.apk"
APK_DEBUG_PATH="pop-os:~/gt/cfutons_mobile/android/app/build/outputs/apk/debug/app-debug.apk"
APK_RELEASE_SIZE=$(run_ssh "du -sh ~/gt/cfutons_mobile/android/app/build/outputs/apk/release/app-release.apk 2>/dev/null | cut -f1" || echo "?")
APK_DEBUG_SIZE=$(run_ssh "du -sh ~/gt/cfutons_mobile/android/app/build/outputs/apk/debug/app-debug.apk 2>/dev/null | cut -f1" || echo "?")

# ── CI status ─────────────────────────────────────────────────────────────────

CI_STATUS=$(cd "$REPO_ROOT" && gh run list --workflow=ci.yml --limit 3 --json status,conclusion,displayTitle,createdAt,headBranch \
  --jq '.[] | "  \(.conclusion // .status | ascii_upcase) — \(.displayTitle[0:60]) (\(.headBranch))"' 2>/dev/null || echo "  (gh not available)")

# ── open PRs ─────────────────────────────────────────────────────────────────

OPEN_PRS=$(cd "$REPO_ROOT" && gh pr list --state open --limit 8 \
  --json number,title,headRefName,createdAt \
  --jq '.[] | "  #\(.number) \(.title[0:55]) [\(.headRefName)]"' 2>/dev/null || echo "  (gh not available)")

# ── bead status ───────────────────────────────────────────────────────────────

BD_IN_PROGRESS=$(bd list --status=in_progress 2>/dev/null | grep -E "^◐" | head -10 || echo "  (none)")
BD_READY=$(bd ready 2>/dev/null | grep -E "^○" | head -5 || echo "  (none)")

# ── test count (cached from last run) ────────────────────────────────────────

TEST_SUMMARY=$(run_ssh "cd ~/gt/cfutons_mobile && source ~/.nvm/nvm.sh && npx jest --ci --passWithNoTests --silent 2>&1 | grep -E 'Tests:|Test Suites:' | tail -2" || echo "  (run tests to refresh)")

# ── write doc ─────────────────────────────────────────────────────────────────

cat > "$OUT" <<STATUS
# Carolina Futons Mobile — Live Status

> **Last updated:** $NOW_MT (auto-refreshed every 20 min)

---

## Android Build Artifacts

| Build | Size | Timestamp | Path |
|-------|------|-----------|------|
| **Release APK** | $APK_RELEASE_SIZE | $APK_RELEASE | \`$APK_RELEASE_PATH\` |
| **Debug APK** | $APK_DEBUG_SIZE | $APK_DEBUG | \`$APK_DEBUG_PATH\` |

To install on a connected device:
\`\`\`
adb install -r "$(echo $APK_RELEASE_PATH | sed 's/pop-os://')"
\`\`\`
Or pull to Mac first:
\`\`\`
scp pop-os:~/gt/cfutons_mobile/android/app/build/outputs/apk/release/app-release.apk ~/Desktop/cf-latest.apk
\`\`\`

---

## CI Status (last 3 runs)

$CI_STATUS

---

## Current Branch

\`$BRANCH\` — $AHEAD_BEHIND vs origin/main

**Last commit:** $LAST_COMMIT

**Recent commits:**
\`\`\`
$RECENT_COMMITS
\`\`\`

---

## Open PRs

$OPEN_PRS

---

## Bead Progress

### In Progress
$BD_IN_PROGRESS

### Ready (no blockers)
$BD_READY

---

## Test Suite

$TEST_SUMMARY

---

## Build Instructions

**Build release APK on Linux:**
\`\`\`bash
ssh pop-os "source ~/.nvm/nvm.sh && cd ~/gt/cfutons_mobile && npm run build:android"
# or manually:
ssh pop-os "cd ~/gt/cfutons_mobile && ./android/gradlew -p android assembleRelease --no-daemon"
\`\`\`

**Run tests on Linux:**
\`\`\`bash
ssh pop-os "source ~/.nvm/nvm.sh && cd ~/gt/cfutons_mobile && npm test -- --ci"
\`\`\`

STATUS

echo "STATUS.md updated at $NOW_MT"
