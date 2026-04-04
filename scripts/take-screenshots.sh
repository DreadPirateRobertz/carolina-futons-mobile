#!/usr/bin/env bash
#
# take-screenshots.sh — Capture App Store / Play Store screenshots
# via Detox across required display sizes.
#
# App Store required screenshot sizes (as of 2026):
#   6.7"  — iPhone 15 Pro Max / 16 Plus / 17 Pro Max  (1290×2796)
#   6.5"  — iPhone 14 Plus / 11–13 Pro Max            (1284×2778 or 1242×2688)
#   5.5"  — iPhone 8 Plus                             (1242×2208)
#
# Notes:
#   • 6.9" screenshots (17 Pro Max) satisfy the 6.7" slot in App Store Connect.
#   • 6.5" and 5.5" simulators must exist on this machine. Create them with:
#       xcrun simctl create "iPhone 14 Plus" "iPhone 14 Plus" $(xcrun simctl list runtimes | grep iOS | tail -1 | awk '{print $NF}')
#       xcrun simctl create "iPhone 8 Plus"  "iPhone 8 Plus"  $(xcrun simctl list runtimes | grep iOS | tail -1 | awk '{print $NF}')
#
# Usage:
#   ./scripts/take-screenshots.sh [ios|android|all]
#
# Outputs:
#   screenshots/ios/6_7/   — 6.7" iPhone screenshots
#   screenshots/ios/6_5/   — 6.5" iPhone screenshots
#   screenshots/ios/5_5/   — 5.5" iPhone screenshots
#   screenshots/android/pixel6/ — Play Store screenshots
#
set -euo pipefail

PLATFORM="${1:-all}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$PROJECT_DIR/screenshots"

# iOS size configurations: "<detox-config> <output-subdir> <display-label>"
IOS_CONFIGS=(
  "ios.screenshot.6_7 ios/6_7 6.7\""
  "ios.screenshot.6_5 ios/6_5 6.5\""
  "ios.screenshot.5_5 ios/5_5 5.5\""
)

ANDROID_CONFIGS=(
  "android.screenshot.pixel6 android/pixel6 Pixel6"
)

# --- Helpers ---

check_ios_build() {
  local build_path="$PROJECT_DIR/ios/build/Build/Products/Release-iphonesimulator/CarolinaFutons.app"
  if [[ ! -d "$build_path" ]]; then
    echo ""
    echo "❌ iOS release build not found at:"
    echo "   $build_path"
    echo ""
    echo "Build it first:"
    echo "   xcodebuild -workspace ios/CarolinaFutons.xcworkspace \\"
    echo "              -scheme CarolinaFutons \\"
    echo "              -configuration Release \\"
    echo "              -sdk iphonesimulator \\"
    echo "              -derivedDataPath ios/build"
    echo ""
    exit 1
  fi
}

check_simulator_available() {
  local device_type="$1"
  if ! xcrun simctl list devices available 2>/dev/null | grep -q "$device_type"; then
    echo ""
    echo "⚠️  Simulator not found: $device_type"
    echo "   Create it with:"
    local runtime
    runtime=$(xcrun simctl list runtimes 2>/dev/null | grep "iOS 1" | tail -1 | awk '{print $NF}')
    echo "   xcrun simctl create \"$device_type\" \"$device_type\" $runtime"
    echo ""
    return 1
  fi
  return 0
}

run_detox() {
  local config="$1"
  local out_dir="$2"
  local label="$3"

  echo ""
  echo ">>> Capturing screenshots: $label  →  $out_dir/"
  mkdir -p "$out_dir"

  npx detox test \
    --configuration "$config" \
    --artifacts-location "$out_dir" \
    --record-logs none \
    --take-screenshots all \
    --testNamePattern "App Store Screenshots" \
    -- --testPathPattern "e2e/screenshots.test.ts"

  local count
  count=$(find "$out_dir" -name "*.png" | wc -l | tr -d ' ')
  echo "    ✅ $count screenshots saved to $out_dir/"
}

# --- iOS ---

if [[ "$PLATFORM" == "ios" || "$PLATFORM" == "all" ]]; then
  check_ios_build

  local_failed=0
  for entry in "${IOS_CONFIGS[@]}"; do
    read -r cfg subdir label <<< "$entry"
    device_type=""
    case "$cfg" in
      *6_7) device_type="iPhone 17 Pro Max" ;;
      *6_5) device_type="iPhone 14 Plus" ;;
      *5_5) device_type="iPhone 8 Plus" ;;
    esac

    if check_simulator_available "$device_type"; then
      run_detox "$cfg" "$OUTPUT_DIR/$subdir" "$label"
    else
      echo "    ⏭  Skipping $label — simulator not available"
      local_failed=$((local_failed + 1))
    fi
  done

  if [[ $local_failed -gt 0 ]]; then
    echo ""
    echo "⚠️  $local_failed iOS size(s) skipped — create the missing simulators and re-run."
  fi
fi

# --- Android ---

if [[ "$PLATFORM" == "android" || "$PLATFORM" == "all" ]]; then
  for entry in "${ANDROID_CONFIGS[@]}"; do
    read -r cfg subdir label <<< "$entry"
    run_detox "$cfg" "$OUTPUT_DIR/$subdir" "$label"
  done
fi

# --- Summary ---

echo ""
echo "════════════════════════════════════════════"
echo "  Screenshots saved to: $OUTPUT_DIR/"
echo ""
echo "  App Store Connect upload slots:"
echo "    6.7\" → screenshots/ios/6_7/  (required)"
echo "    6.5\" → screenshots/ios/6_5/  (required)"
echo "    5.5\" → screenshots/ios/5_5/  (required for ≥ iOS 12 universal)"
echo ""
echo "  Google Play → screenshots/android/pixel6/"
echo "════════════════════════════════════════════"
