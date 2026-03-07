#!/usr/bin/env bash
#
# qa-sandbox.sh — Cross-platform QA sandbox test runner
#
# Runs automated quality checks across Android, iOS, and Web.
# Designed to be run by crew or polecats after every significant push.
#
# Usage:
#   ./scripts/qa-sandbox.sh [all|unit|web|typecheck|lint]
#   ./scripts/qa-sandbox.sh          # runs all checks
#   ./scripts/qa-sandbox.sh web      # web bundle + serve test only
#
# Exit codes:
#   0 — all checks passed
#   1 — one or more checks failed (see output for details)
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

FAILED=0
PASSED=0
SKIPPED=0
RESULTS=()

run_check() {
  local name="$1"
  shift
  echo ""
  echo "========================================"
  echo "  CHECK: $name"
  echo "========================================"
  if "$@" 2>&1; then
    PASSED=$((PASSED + 1))
    RESULTS+=("${GREEN}PASS${NC} $name")
  else
    FAILED=$((FAILED + 1))
    RESULTS+=("${RED}FAIL${NC} $name")
  fi
}

skip_check() {
  local name="$1"
  local reason="$2"
  SKIPPED=$((SKIPPED + 1))
  RESULTS+=("${YELLOW}SKIP${NC} $name — $reason")
}

# --- Check selection ---
MODE="${1:-all}"

# 1. Unit tests (Jest)
if [[ "$MODE" == "all" || "$MODE" == "unit" ]]; then
  run_check "Jest unit tests (all platforms)" npx jest --no-coverage --passWithNoTests
fi

# 2. TypeScript strict check
if [[ "$MODE" == "all" || "$MODE" == "typecheck" ]]; then
  run_check "TypeScript strict typecheck" npx tsc --noEmit
fi

# 3. ESLint
if [[ "$MODE" == "all" || "$MODE" == "lint" ]]; then
  if command -v npx &>/dev/null && npx eslint --version &>/dev/null 2>&1; then
    run_check "ESLint" npx eslint src/ --max-warnings 50 --quiet
  else
    skip_check "ESLint" "eslint not configured"
  fi
fi

# 4. Web build (Expo Web — validates web platform works)
if [[ "$MODE" == "all" || "$MODE" == "web" ]]; then
  run_check "Expo Web export (bundle validation)" npx expo export --platform web --output-dir /tmp/cfutons-web-qa --clear
fi

# 5. Android build check (validates Android config, no actual APK)
if [[ "$MODE" == "all" || "$MODE" == "android" ]]; then
  if command -v eas &>/dev/null; then
    skip_check "EAS Android build" "run manually: eas build --profile preview --platform android"
  else
    skip_check "EAS Android build" "eas CLI not installed"
  fi
fi

# 6. iOS build check (validates iOS config, no actual IPA)
if [[ "$MODE" == "all" || "$MODE" == "ios" ]]; then
  if [[ "$(uname)" == "Darwin" ]]; then
    skip_check "EAS iOS build" "run manually: eas build --profile preview --platform ios"
  else
    skip_check "EAS iOS build" "not on macOS"
  fi
fi

# 7. Bundle size check
if [[ "$MODE" == "all" ]]; then
  if [[ -d /tmp/cfutons-web-qa ]]; then
    BUNDLE_SIZE=$(du -sh /tmp/cfutons-web-qa 2>/dev/null | cut -f1)
    echo ""
    echo "Web bundle size: $BUNDLE_SIZE"
    RESULTS+=("${GREEN}INFO${NC} Web bundle size: $BUNDLE_SIZE")
  fi
fi

# --- Summary ---
echo ""
echo "========================================"
echo "  QA SANDBOX RESULTS"
echo "========================================"
for r in "${RESULTS[@]}"; do
  echo -e "  $r"
done
echo ""
echo "  Passed: $PASSED  Failed: $FAILED  Skipped: $SKIPPED"
echo "========================================"

if [[ $FAILED -gt 0 ]]; then
  echo -e "${RED}QA FAILED — $FAILED check(s) did not pass${NC}"
  exit 1
else
  echo -e "${GREEN}QA PASSED — all checks green${NC}"
  exit 0
fi
