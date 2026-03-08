#!/usr/bin/env bash
#
# nightly-integration.sh — Nightly integration test suite
#
# Runs the full QA sandbox + E2E smoke tests and reports results.
# Designed to be triggered by cron or manually by the PM.
#
# Usage:
#   ./scripts/nightly-integration.sh
#
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

REPORT_FILE="/tmp/cfutons-nightly-$(date +%Y%m%d-%H%M%S).log"
FAILED=0

echo "=== Carolina Futons Mobile — Nightly Integration ===" | tee "$REPORT_FILE"
echo "Date: $(date)" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"

# 1. Full unit test suite
echo "--- Unit Tests ---" | tee -a "$REPORT_FILE"
if npx jest --no-coverage --passWithNoTests 2>&1 | tee -a "$REPORT_FILE" | tail -5; then
  echo "PASS: Unit tests" | tee -a "$REPORT_FILE"
else
  echo "FAIL: Unit tests" | tee -a "$REPORT_FILE"
  FAILED=$((FAILED + 1))
fi

# 2. TypeScript typecheck
echo "" | tee -a "$REPORT_FILE"
echo "--- TypeScript Typecheck ---" | tee -a "$REPORT_FILE"
if npx tsc --noEmit 2>&1 | tee -a "$REPORT_FILE"; then
  echo "PASS: TypeScript" | tee -a "$REPORT_FILE"
else
  echo "FAIL: TypeScript" | tee -a "$REPORT_FILE"
  FAILED=$((FAILED + 1))
fi

# 3. ESLint
echo "" | tee -a "$REPORT_FILE"
echo "--- ESLint ---" | tee -a "$REPORT_FILE"
if npx eslint src/ --max-warnings 50 --quiet 2>&1 | tee -a "$REPORT_FILE"; then
  echo "PASS: ESLint" | tee -a "$REPORT_FILE"
else
  echo "FAIL: ESLint" | tee -a "$REPORT_FILE"
  FAILED=$((FAILED + 1))
fi

# 4. Web export bundle validation
echo "" | tee -a "$REPORT_FILE"
echo "--- Web Export ---" | tee -a "$REPORT_FILE"
if npx expo export --platform web --output-dir /tmp/cfutons-web-nightly --clear 2>&1 | tee -a "$REPORT_FILE"; then
  echo "PASS: Web export" | tee -a "$REPORT_FILE"
  BUNDLE_SIZE=$(du -sh /tmp/cfutons-web-nightly 2>/dev/null | cut -f1)
  echo "Web bundle size: $BUNDLE_SIZE" | tee -a "$REPORT_FILE"
else
  echo "FAIL: Web export" | tee -a "$REPORT_FILE"
  FAILED=$((FAILED + 1))
fi

# 5. Summary
echo "" | tee -a "$REPORT_FILE"
echo "=== NIGHTLY SUMMARY ===" | tee -a "$REPORT_FILE"
if [[ $FAILED -eq 0 ]]; then
  echo "ALL CHECKS PASSED" | tee -a "$REPORT_FILE"
else
  echo "FAILED: $FAILED check(s)" | tee -a "$REPORT_FILE"
fi
echo "Full report: $REPORT_FILE" | tee -a "$REPORT_FILE"

exit $FAILED
