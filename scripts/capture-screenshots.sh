#!/usr/bin/env bash
# capture-screenshots.sh — automated screenshot capture for all app screens
#
# Usage:
#   ./scripts/capture-screenshots.sh [--device SERIAL] [--delay SECONDS] [--out-dir DIR]
#
# Requires:
#   - adb in PATH
#   - Android emulator/device running with the app installed
#   - App package: com.carolinafutons.mobile
#
# Run on pop-os where Android emulator lives:
#   ssh pop-os "cd ~/cfutons_mobile && bash scripts/capture-screenshots.sh"

set -euo pipefail

# --- Configuration ---
PACKAGE="com.carolinafutons.mobile"
SCHEME="carolinafutons"
DATESTAMP="$(date +%Y%m%d)"
OUT_DIR="docs/screenshots/s29-${DATESTAMP}"
DELAY=3          # seconds to wait after navigation before capture
DEVICE=""        # optional: adb -s <serial>

# --- Parse args ---
while [[ $# -gt 0 ]]; do
  case "$1" in
    --device)  DEVICE="$2"; shift 2 ;;
    --delay)   DELAY="$2"; shift 2 ;;
    --out-dir) OUT_DIR="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 [--device SERIAL] [--delay SECONDS] [--out-dir DIR]"
      exit 0
      ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

ADB="adb"
if [[ -n "$DEVICE" ]]; then
  ADB="adb -s $DEVICE"
fi

# --- Helpers ---

capture() {
  local name="$1"
  local remote="/sdcard/screenshot-tmp.png"
  local local_path="${OUT_DIR}/${name}.png"

  echo "  📸 Capturing: ${name}"
  $ADB shell screencap -p "$remote" 2>/dev/null
  $ADB pull "$remote" "$local_path" 2>/dev/null
  $ADB shell rm -f "$remote" 2>/dev/null
}

wait_settle() {
  sleep "${1:-$DELAY}"
}

deep_link() {
  local path="$1"
  $ADB shell am start -a android.intent.action.VIEW \
    -d "${SCHEME}://${path}" \
    "$PACKAGE" 2>/dev/null
}

press_back() {
  $ADB shell input keyevent KEYCODE_BACK
  sleep 0.5
}

scroll_down() {
  $ADB shell input swipe 540 1800 540 800 300 2>/dev/null || true
  sleep 0.5
}

# --- Preflight ---

echo "🔍 Checking adb connectivity..."
if ! $ADB get-state >/dev/null 2>&1; then
  echo "❌ No device/emulator found. Start one and retry."
  exit 1
fi

echo "🔍 Checking app is installed..."
if ! $ADB shell pm list packages 2>/dev/null | grep -q "$PACKAGE"; then
  echo "❌ Package $PACKAGE not found. Install the app first."
  exit 1
fi

mkdir -p "$OUT_DIR"

TOTAL=0
CAPTURED=0
FAILED=0

screenshot() {
  local name="$1"
  TOTAL=$((TOTAL + 1))
  if capture "$name"; then
    CAPTURED=$((CAPTURED + 1))
  else
    echo "  ⚠️  Failed: ${name}"
    FAILED=$((FAILED + 1))
  fi
}

# --- Screen Capture Sequence ---

echo ""
echo "═══════════════════════════════════════════"
echo "  Carolina Futons — Screenshot Capture"
echo "  Build: s29-${DATESTAMP}"
echo "  Output: ${OUT_DIR}/"
echo "  Delay:  ${DELAY}s per screen"
echo "═══════════════════════════════════════════"
echo ""

# 1. Onboarding — requires fresh install to trigger
echo "── Onboarding ──"
echo "  ℹ️  Clearing app data to trigger onboarding..."
$ADB shell pm clear "$PACKAGE" 2>/dev/null || true
$ADB shell am start -n "$PACKAGE/.MainActivity" 2>/dev/null || true
wait_settle 4
screenshot "01-onboarding-welcome"
# Swipe to feature slides
$ADB shell input swipe 800 1000 200 1000 200 2>/dev/null || true
wait_settle 1
screenshot "02-onboarding-slides"
# Swipe to last slide
for _ in 2 3 4 5; do
  $ADB shell input swipe 800 1000 200 1000 200 2>/dev/null || true
  sleep 0.4
done
wait_settle 1
screenshot "03-onboarding-signup"

# 2. Tab screens
echo ""
echo "── Tab Screens ──"

deep_link "home"
wait_settle
screenshot "04-home"

scroll_down
wait_settle 1
screenshot "05-home-quests"
deep_link "home"
wait_settle 1

deep_link "shop"
wait_settle
screenshot "06-shop"

deep_link "cart"
wait_settle
screenshot "07-cart-empty"

deep_link "account"
wait_settle
screenshot "08-account-signedout"

# 3. Product browsing
echo ""
echo "── Product Browsing ──"

deep_link "category/futons"
wait_settle
screenshot "09-category-futons"

deep_link "product/asheville-full-futon"
wait_settle
screenshot "10-pdp-gallery"
scroll_down
wait_settle 1
screenshot "11-pdp-bnpl"
scroll_down
wait_settle 1
screenshot "12-pdp-features-ar"

# 4. Search
echo ""
echo "── Search ──"

deep_link "shop"
wait_settle 1
# Tap search icon (top-right ~1080px wide screen)
$ADB shell input tap 980 180 2>/dev/null || true
wait_settle 2
screenshot "13-search-empty"

$ADB shell input text "futon" 2>/dev/null || true
wait_settle 2
screenshot "14-search-results"
press_back
press_back

# 5. Collections
echo ""
echo "── Collections ──"

deep_link "collections"
wait_settle
screenshot "15-collections"

deep_link "collections/best-sellers"
wait_settle
screenshot "16-collection-detail"

# 6. Compare
echo ""
echo "── Compare ──"

$ADB shell am start -a android.intent.action.VIEW \
  -d "${SCHEME}://compare?slugs=asheville-full-futon,blue-ridge-queen-futon" \
  "$PACKAGE" 2>/dev/null || true
wait_settle
screenshot "17-compare"

# 7. Wishlist
echo ""
echo "── Wishlist ──"

deep_link "wishlist"
wait_settle
screenshot "18-wishlist"

# 8. Auth screens
echo ""
echo "── Authentication ──"

deep_link "login"
wait_settle
screenshot "19-login"
press_back

deep_link "signup"
wait_settle
screenshot "20-signup"
press_back

deep_link "forgot-password"
wait_settle
screenshot "21-forgot-password"
press_back

# 9. Checkout flow
echo ""
echo "── Checkout Flow ──"

deep_link "checkout"
wait_settle
screenshot "22-checkout"

deep_link "payment-confirmation"
wait_settle
screenshot "23-payment-confirmation"

$ADB shell am start -a android.intent.action.VIEW \
  -d "${SCHEME}://order-success?orderId=CF-TEST-001" \
  "$PACKAGE" 2>/dev/null || true
wait_settle
screenshot "24-order-success"

deep_link "order-confirmation"
wait_settle
screenshot "25-order-confirmation"

deep_link "orders"
wait_settle
screenshot "26-order-history"

$ADB shell am start -a android.intent.action.VIEW \
  -d "${SCHEME}://orders/CF-TEST-001" \
  "$PACKAGE" 2>/dev/null || true
wait_settle
screenshot "27-order-detail"

# 10. Store locator
echo ""
echo "── Store Locator ──"

deep_link "stores"
wait_settle
screenshot "28-store-locator"

$ADB shell input tap 540 600 2>/dev/null || true
wait_settle 2
screenshot "29-store-detail"
press_back

# 11. Notifications
echo ""
echo "── Notifications ──"

deep_link "notifications"
wait_settle
screenshot "30-notifications-inbox"

deep_link "notification-preferences"
wait_settle
screenshot "31-notification-preferences"
press_back

# NotificationPermissionPromptScreen — navigation hookup pending
# Will be added when screen is registered in navigator
echo "  ⏭  Skipping notif-permission-prompt (not yet in navigation)"

# 12. Premium
echo ""
echo "── Premium ──"

deep_link "premium"
wait_settle
screenshot "32-premium"

# 13. Style Quiz
echo ""
echo "── Style Quiz ──"

deep_link "style-quiz"
wait_settle
screenshot "33-style-quiz"

# 14. AR screens
echo ""
echo "── AR Experience ──"

deep_link "ar"
wait_settle 4
screenshot "34-ar-camera"
press_back

# AR permission denied — should show if camera permission not granted
# Emulator may show this automatically
deep_link "ar"
wait_settle 2
screenshot "35-ar-permission-denied"
press_back

# 15. AR Web Viewer
echo ""
echo "── AR Web Viewer ──"

deep_link "ar-web?productSlug=asheville-full-futon"
wait_settle 4
screenshot "36-ar-web-viewer"
press_back

# 16. Room Gallery
echo ""
echo "── Room Gallery ──"

deep_link "room-gallery"
wait_settle
screenshot "37-room-gallery"
press_back

# 17. Gamification / Loyalty
echo ""
echo "── Gamification & Loyalty ──"

$ADB shell am start -a android.intent.action.VIEW \
  -d "${SCHEME}://loyalty" \
  "$PACKAGE" 2>/dev/null || true
wait_settle
screenshot "38-loyalty"

$ADB shell am start -a android.intent.action.VIEW \
  -d "${SCHEME}://loyalty?tab=quests" \
  "$PACKAGE" 2>/dev/null || true
wait_settle
screenshot "39-loyalty-quests"
press_back

deep_link "challenges"
wait_settle
screenshot "40-challenges"
press_back

deep_link "leaderboard"
wait_settle
screenshot "41-leaderboard"
press_back

deep_link "achievements"
wait_settle
screenshot "42-achievements"
press_back

deep_link "points-history"
wait_settle
screenshot "43-points-history"
press_back

deep_link "avatar"
wait_settle
screenshot "44-avatar-equip"
press_back

# 18. Referral
echo ""
echo "── Referral ──"

deep_link "referral/TESTCODE123"
wait_settle
screenshot "45-referral-landing"
press_back

# 19. Rewards
echo ""
echo "── Rewards ──"

deep_link "rewards"
wait_settle
screenshot "46-rewards"
press_back

# 20. Privacy Policy
echo ""
echo "── Privacy Policy ──"

deep_link "privacy"
wait_settle
screenshot "47-privacy-policy"

# 21. Cart with items
echo ""
echo "── Cart (with items) ──"

deep_link "product/asheville-full-futon"
wait_settle 2
$ADB shell input tap 540 1900 2>/dev/null || true
wait_settle 2
deep_link "cart"
wait_settle
screenshot "48-cart-items"

# --- Summary ---
echo ""
echo "═══════════════════════════════════════════"
echo "  ✅ Capture complete"
echo "  Total:    ${TOTAL}"
echo "  Captured: ${CAPTURED}"
echo "  Failed:   ${FAILED}"
echo "  Output:   ${OUT_DIR}/"
echo "═══════════════════════════════════════════"
echo ""

# List captured files
echo "📁 Files:"
ls -la "${OUT_DIR}/"*.png 2>/dev/null | awk '{print "  " $NF " (" $5 " bytes)"}'
