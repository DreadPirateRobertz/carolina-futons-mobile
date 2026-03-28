#!/usr/bin/env bash
# capture-screenshots.sh — automated screenshot capture for all app screens
#
# Usage:
#   ./scripts/capture-screenshots.sh [--device SERIAL] [--delay SECONDS]
#
# Requires:
#   - adb in PATH
#   - Android emulator/device running with the app installed
#   - App package: com.carolinafutons.mobile (adjust PACKAGE below)
#
# Output: docs/screenshots/s28/<screen-name>.png
#
# The script navigates to each screen via deep links (carolinafutons://)
# and falls back to adb shell am start for screens without deep link routes.

set -euo pipefail

# --- Configuration ---
PACKAGE="com.carolinafutons.mobile"
SCHEME="carolinafutons"
OUT_DIR="docs/screenshots/s28"
DELAY=3          # seconds to wait after navigation before capture
DEVICE=""        # optional: adb -s <serial>

# --- Parse args ---
while [[ $# -gt 0 ]]; do
  case "$1" in
    --device) DEVICE="$2"; shift 2 ;;
    --delay)  DELAY="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 [--device SERIAL] [--delay SECONDS]"
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
echo "  Output: ${OUT_DIR}/"
echo "  Delay:  ${DELAY}s per screen"
echo "═══════════════════════════════════════════"
echo ""

# 1. Onboarding (cold start — clear data to trigger)
echo "── Onboarding ──"
# NOTE: Onboarding only shows on first launch. To capture it:
#   $ADB shell pm clear "$PACKAGE"
# Uncomment the line above if you want a fresh-install capture.
# For now, skip to avoid clearing user data.
echo "  ⏭  Skipping onboarding (requires fresh install). Uncomment pm clear to enable."

# 2. Tab screens — navigate via deep links
echo ""
echo "── Tab Screens ──"

deep_link "home"
wait_settle
screenshot "01-home"

deep_link "shop"
wait_settle
screenshot "02-shop"

deep_link "cart"
wait_settle
screenshot "03-cart"

deep_link "account"
wait_settle
screenshot "04-account"

# 3. Product browsing
echo ""
echo "── Product Browsing ──"

deep_link "category/futons"
wait_settle
screenshot "05-category-futons"

deep_link "category/murphy-beds"
wait_settle
screenshot "06-category-murphy-beds"

deep_link "product/asheville-full-futon"
wait_settle
screenshot "07-product-detail-futon"

deep_link "product/hendersonville-queen-murphy-cabinet-bed"
wait_settle
screenshot "08-product-detail-murphy"

deep_link "product/mountain-weave-cover"
wait_settle
screenshot "09-product-detail-accessory"

# 4. Search
echo ""
echo "── Search ──"

# Search doesn't have a deep link — navigate from Shop tab
deep_link "shop"
wait_settle 1
# Tap the search icon (top-right area of shop screen)
# Coordinates depend on device resolution — 1080x2400 default
$ADB shell input tap 980 180 2>/dev/null || true
wait_settle 2
screenshot "10-search-empty"

# Type a query
$ADB shell input text "futon" 2>/dev/null || true
wait_settle 2
screenshot "11-search-results"
press_back
press_back

# 5. Collections
echo ""
echo "── Collections ──"

deep_link "collections"
wait_settle
screenshot "12-collections"

# First collection — use a known slug if available, else skip
deep_link "collections/best-sellers"
wait_settle
screenshot "13-collection-detail"

# 6. Compare
echo ""
echo "── Compare ──"

# Compare requires product slugs as params — navigate via deep link
# The Compare screen needs productSlugs query params
$ADB shell am start -a android.intent.action.VIEW \
  -d "${SCHEME}://compare?slugs=asheville-full-futon,blue-ridge-queen-futon" \
  "$PACKAGE" 2>/dev/null || true
wait_settle
screenshot "14-compare"

# 7. Wishlist
echo ""
echo "── Wishlist ──"

deep_link "wishlist"
wait_settle
screenshot "15-wishlist"

# 8. Auth screens
echo ""
echo "── Authentication ──"

deep_link "login"
wait_settle
screenshot "16-login"
press_back

deep_link "signup"
wait_settle
screenshot "17-signup"
press_back

deep_link "forgot-password"
wait_settle
screenshot "18-forgot-password"
press_back

# 9. Checkout flow (may show empty cart state)
echo ""
echo "── Checkout Flow ──"

deep_link "checkout"
wait_settle
screenshot "19-checkout"

deep_link "order-confirmation"
wait_settle
screenshot "20-order-confirmation"

# Order success — requires param, may show error state
deep_link "orders"
wait_settle
screenshot "21-order-history"

# 10. Store locator
echo ""
echo "── Store Locator ──"

deep_link "stores"
wait_settle
screenshot "22-store-locator"

# 11. Notifications
echo ""
echo "── Notifications ──"

deep_link "notifications"
wait_settle
screenshot "23-notification-preferences"

# 12. Premium / Subscription
echo ""
echo "── Premium ──"

# Premium doesn't have a deep link — navigate from Account
deep_link "account"
wait_settle 1
# Scroll down and tap Premium option — approximate
$ADB shell input swipe 540 1800 540 800 300 2>/dev/null || true
wait_settle 1
screenshot "24-premium"
press_back

# 13. Style Quiz
echo ""
echo "── Style Quiz ──"

deep_link "style-quiz"
wait_settle
screenshot "25-style-quiz"

# 14. AR screens
echo ""
echo "── AR Experience ──"

deep_link "ar"
wait_settle 4  # AR needs extra time to load
screenshot "26-ar-camera"
press_back

# 15. Room Gallery
echo ""
echo "── Room Gallery ──"

# No deep link — navigate from product detail
deep_link "product/asheville-full-futon"
wait_settle 2
# Look for Room Gallery / "See in room" button — scroll down
$ADB shell input swipe 540 1800 540 600 300 2>/dev/null || true
wait_settle 1
screenshot "27-room-gallery-entry"
press_back

# 16. Gamification / Loyalty
echo ""
echo "── Gamification & Loyalty ──"

# Loyalty has a deep link via notification handlers but also direct navigation
$ADB shell am start -a android.intent.action.VIEW \
  -d "${SCHEME}://loyalty" \
  "$PACKAGE" 2>/dev/null || true
wait_settle
screenshot "28-loyalty-streak"

# Loyalty with quests tab
$ADB shell am start -a android.intent.action.VIEW \
  -d "${SCHEME}://loyalty?tab=quests" \
  "$PACKAGE" 2>/dev/null || true
wait_settle
screenshot "29-loyalty-quests"

press_back

# Challenges
deep_link "account"
wait_settle 1
# Navigate to Challenges from account
$ADB shell input swipe 540 1800 540 800 300 2>/dev/null || true
wait_settle 1
screenshot "30-challenges"
press_back

# Leaderboard — no deep link, try from account
deep_link "account"
wait_settle 1
screenshot "31-leaderboard-entry"
press_back

# 17. Achievement Badges
echo ""
echo "── Achievements ──"
# Accessed from Loyalty or Account sub-navigation
screenshot "32-achievement-badges"

# 18. Points History
echo ""
echo "── Points History ──"
screenshot "33-points-history"

# 19. Rewards
echo ""
echo "── Rewards ──"
screenshot "34-rewards"

# 20. Referral
echo ""
echo "── Referral ──"
deep_link "referral/TESTCODE123"
wait_settle
screenshot "35-referral-landing"
press_back

# 21. Privacy Policy
echo ""
echo "── Privacy Policy ──"

deep_link "account"
wait_settle 1
$ADB shell input swipe 540 1800 540 400 300 2>/dev/null || true
wait_settle 1
screenshot "36-privacy-policy-entry"

# 22. Avatar Equip
echo ""
echo "── Avatar ──"
# Modal — accessed from loyalty/gamification
screenshot "37-avatar-equip"

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
