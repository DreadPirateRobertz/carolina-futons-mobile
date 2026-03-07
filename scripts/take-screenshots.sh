#!/usr/bin/env bash
#
# take-screenshots.sh — Capture App Store / Play Store screenshots
# via Detox across multiple device configurations.
#
# Usage:
#   ./scripts/take-screenshots.sh [ios|android|all]
#
# Screenshots are saved to ./screenshots/<platform>/<device>/
#
set -euo pipefail

PLATFORM="${1:-all}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$PROJECT_DIR/screenshots"

# Apple requires screenshots for these display sizes:
#   6.9"  — iPhone 16 Pro Max  (1320x2868)
#   6.7"  — iPhone 15 Plus     (1290x2796)
#   6.5"  — iPhone 14 Plus     (1284x2778)
#   5.5"  — iPhone 8 Plus      (1242x2208)
# We capture on the largest sim available and let App Store Connect
# auto-scale where needed — one device covers the 6.5"+ requirement.

IOS_CONFIGS=(
  "ios.screenshot.iphone15"
)

# Google Play requires:
#   Phone — at least one phone screenshot
#   7" tablet, 10" tablet — optional but recommended
ANDROID_CONFIGS=(
  "android.screenshot.pixel6"
)

run_detox() {
  local config="$1"
  local out_dir="$2"

  echo ">>> Running screenshots: config=$config  output=$out_dir"
  mkdir -p "$out_dir"

  npx detox test \
    --configuration "$config" \
    --artifacts-location "$out_dir" \
    --record-logs none \
    --take-screenshots all \
    --testNamePattern "App Store Screenshots" \
    -- --testPathPattern "e2e/screenshots.test.ts"
}

if [[ "$PLATFORM" == "ios" || "$PLATFORM" == "all" ]]; then
  for cfg in "${IOS_CONFIGS[@]}"; do
    device_name="${cfg##*.}"
    run_detox "$cfg" "$OUTPUT_DIR/ios/$device_name"
  done
fi

if [[ "$PLATFORM" == "android" || "$PLATFORM" == "all" ]]; then
  for cfg in "${ANDROID_CONFIGS[@]}"; do
    device_name="${cfg##*.}"
    run_detox "$cfg" "$OUTPUT_DIR/android/$device_name"
  done
fi

echo ""
echo "Screenshots saved to: $OUTPUT_DIR"
echo "Organize by store requirements before uploading."
