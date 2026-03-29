#!/usr/bin/env bash
# post-epic-screen-sync.sh — Full capture + HTML update + commit after an epic merge
#
# Run this on pop-os after an epic lands on main and the app is running in the emulator.
#
# Usage:
#   bash scripts/post-epic-screen-sync.sh [--session sNN] [--delay N] [--prod]
#
# What it does:
#   1. git pull (ensure we're on latest main)
#   2. capture-screenshots.sh  (ADB capture from running emulator)
#   3. update-screen-html.py   (embed captured screenshots into screen-reference.html)
#   4. git add + commit + push  (lands the updated HTML on main)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

SESSION="s31"
DELAY=3
PROD_FLAG=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --session)  SESSION="$2"; shift 2 ;;
    --delay)    DELAY="$2"; shift 2 ;;
    --prod)     PROD_FLAG="--prod"; shift ;;
    -h|--help)
      echo "Usage: $0 [--session sNN] [--delay N] [--prod]"
      echo ""
      echo "  --session sNN   Session label for screenshot directory (default: s31)"
      echo "  --delay N       Seconds to wait after navigation before capture (default: 3)"
      echo "  --prod          Use production APK (com.carolinafutons.mobile)"
      exit 0 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

echo "=== post-epic-screen-sync: ${SESSION} ==="
echo ""

# Step 1: pull latest main
echo "→ git pull --rebase"
git pull --rebase

# Step 2: capture screenshots
DATESTAMP="$(date +%Y%m%d)"
OUT_DIR="docs/screenshots/${SESSION}-${DATESTAMP}"

echo "→ capture-screenshots.sh --session ${SESSION} --delay ${DELAY}"
# shellcheck disable=SC2086
bash scripts/capture-screenshots.sh \
  --session "$SESSION" \
  --delay "$DELAY" \
  --out-dir "$OUT_DIR" \
  $PROD_FLAG

# Step 3: update HTML
echo ""
echo "→ update-screen-html.py --screenshots-dir ${OUT_DIR}"
python3 scripts/update-screen-html.py --screenshots-dir "$OUT_DIR"

# Step 4: commit and push if anything changed
echo ""
CHANGED_FILES=()
if ! git diff --quiet docs/screen-reference.html; then
  CHANGED_FILES+=("docs/screen-reference.html")
fi
# Include new screenshot files
mapfile -t NEW_SHOTS < <(git ls-files --others --exclude-standard "docs/screenshots/${SESSION}-${DATESTAMP}/")
CHANGED_FILES+=("${NEW_SHOTS[@]}")

if [[ ${#CHANGED_FILES[@]} -eq 0 ]]; then
  echo "Nothing changed — screen-reference.html already up to date."
  exit 0
fi

echo "→ Committing ${#CHANGED_FILES[@]} changed file(s)"
git add "${CHANGED_FILES[@]}"
git commit -m "docs(screen-ref): ${SESSION} screenshot pass — $(date +%Y-%m-%d)"
git push

echo ""
echo "=== Done. screen-reference.html updated and pushed. ==="
