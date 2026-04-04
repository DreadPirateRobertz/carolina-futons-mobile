#!/usr/bin/env bash
# capture-screenshots.sh — automated screenshot capture for all app screens
#
# Usage:
#   bash scripts/capture-screenshots.sh [--session sNN] [--delay N] [--out-dir DIR]
#
# Run on pop-os (Android emulator host):
#   ssh pop-os "cd ~/cfutons_mobile && bash scripts/capture-screenshots.sh"
#
# Requires adb in PATH and Expo dev build running (host.exp.exponent)

set -uo pipefail

# --- Configuration ---
# Dev builds use host.exp.exponent; production APK uses com.carolinafutons.mobile
PACKAGE="${CF_PACKAGE:-host.exp.exponent}"
SCHEME="carolinafutons"
SESSION="${CF_SESSION:-s30}"
DATESTAMP="$(date +%Y%m%d)"
OUT_DIR="${CF_OUT_DIR:-docs/screenshots/${SESSION}-${DATESTAMP}}"
DELAY="${CF_DELAY:-3}"
DEVICE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --session)  SESSION="$2"; OUT_DIR="docs/screenshots/${SESSION}-${DATESTAMP}"; shift 2 ;;
    --delay)    DELAY="$2"; shift 2 ;;
    --out-dir)  OUT_DIR="$2"; shift 2 ;;
    --device)   DEVICE="$2"; shift 2 ;;
    --prod)     PACKAGE="com.carolinafutons.mobile"; shift ;;
    -h|--help)
      echo "Usage: $0 [--session sNN] [--delay N] [--out-dir DIR] [--device SERIAL] [--prod]"
      exit 0 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

ADB="adb"
[[ -n "$DEVICE" ]] && ADB="adb -s $DEVICE"

# Try to find adb if not in PATH
if ! command -v adb &>/dev/null; then
  for candidate in \
      "$HOME/Android/Sdk/platform-tools/adb" \
      "$HOME/android-sdk/platform-tools/adb" \
      "/opt/android-sdk/platform-tools/adb"; do
    if [[ -x "$candidate" ]]; then
      ADB="$candidate"
      break
    fi
  done
fi

TOTAL=0; CAPTURED=0; FAILED=0
mkdir -p "$OUT_DIR"

# --- Helpers ---

shot() {
  local name="$1"
  TOTAL=$((TOTAL + 1))
  $ADB exec-out screencap -p > "${OUT_DIR}/${name}.png" 2>/dev/null \
    && CAPTURED=$((CAPTURED + 1)) && echo "  ✓ ${name}" \
    || { FAILED=$((FAILED + 1)); echo "  ✗ ${name} (failed)"; }
}

nav() {
  $ADB shell am start -a android.intent.action.VIEW \
    -d "${SCHEME}://$1" "$PACKAGE" >/dev/null 2>&1 || true
  sleep "$DELAY"
}

tap()        { $ADB shell input tap "$1" "$2" 2>/dev/null || true; }
swipe_up()   { $ADB shell input swipe 540 1700 540 900 400 2>/dev/null || true; sleep 0.8; }
swipe_more() { $ADB shell input swipe 540 1700 540 300 400 2>/dev/null || true; sleep 0.8; }
back()       { $ADB shell input keyevent KEYCODE_BACK 2>/dev/null || true; sleep 0.8; }
type_text()  { $ADB shell input text "$1" 2>/dev/null || true; sleep 1; }

dismiss_toast() {
  # Dev warning toast: X button top-right of 1080px screen
  tap 1050 88; sleep 0.3; tap 1050 88; sleep 0.5
}

# --- Preflight ---

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Carolina Futons — Screenshot Capture ${SESSION}"
echo "  Package: ${PACKAGE}"
echo "  Output:  ${OUT_DIR}/"
echo "  $(date)"
echo "═══════════════════════════════════════════════════"
echo ""

if ! $ADB get-state >/dev/null 2>&1; then
  echo "❌ No device/emulator found."; exit 1
fi

if ! $ADB shell pm list packages 2>/dev/null | grep -q "$PACKAGE"; then
  echo "❌ $PACKAGE not installed. Run: cd ~/cfutons_mobile && npx expo run:android"
  exit 1
fi

# --- Launch app ---
echo "🚀 Launching $PACKAGE..."
$ADB shell am force-stop "$PACKAGE" 2>/dev/null || true
sleep 1
$ADB shell monkey -p "$PACKAGE" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 || true
sleep 6
dismiss_toast

# ── 1. Onboarding ───────────────────────────────────────────────
echo ""
echo "── 1. Onboarding ──"
# Clear AsyncStorage onboarding flag so first-run flow appears
$ADB shell "run-as $PACKAGE sh -c 'find /data/user/0/$PACKAGE -name \"*.json\" | xargs grep -l \"onboarding\" 2>/dev/null | head -1 | xargs rm -f'" 2>/dev/null || true
$ADB shell am force-stop "$PACKAGE" 2>/dev/null || true; sleep 1
$ADB shell monkey -p "$PACKAGE" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 || true
sleep 6; dismiss_toast
shot "01-onboarding-welcome"
tap 800 1200; sleep 1.5; shot "02-onboarding-slide2"
tap 800 1200; sleep 1.5; shot "03-onboarding-slide3"
# Tap through remaining slides then Get Started
tap 800 1200; sleep 1; tap 800 1200; sleep 1; tap 800 1200; sleep 1
tap 540 2100; sleep 2  # Get Started / Create Account

# ── 2. Home Tab ─────────────────────────────────────────────────
echo ""
echo "── 2. Home Tab ──"
nav "home"; dismiss_toast
shot "04-home-hero"
swipe_up; shot "05-home-quests"
swipe_up; shot "06-home-collections"
swipe_more; shot "07-home-bottom"

# ── 3. Shop Tab ─────────────────────────────────────────────────
echo ""
echo "── 3. Shop Tab ──"
nav "shop"
shot "08-shop-grid"
swipe_up; shot "09-shop-scrolled"

# ── 4. Product Detail ───────────────────────────────────────────
echo ""
echo "── 4. Product Detail (PDP) ──"
nav "product/mesa-5000-futon-frame"
shot "10-pdp-gallery"
swipe_up; shot "11-pdp-bnpl"
swipe_up; shot "12-pdp-features-ar"
# Fullscreen gallery
nav "product/mesa-5000-futon-frame"
tap 540 450; sleep 2; shot "13-pdp-gallery-fullscreen"; back

# ── 5. Cart (add items first) ───────────────────────────────────
echo ""
echo "── 5. Cart ──"
nav "product/mesa-5000-futon-frame"
tap 540 2150; sleep 2  # Add to Cart
nav "product/gemini-futon-frame"
tap 540 2150; sleep 2  # Add to Cart
nav "cart"
shot "14-cart-with-items"
swipe_up; shot "15-cart-scrolled"

# ── 6. Account Tab ──────────────────────────────────────────────
echo ""
echo "── 6. Account ──"
nav "account"
shot "16-account-signed-out"
swipe_up; shot "17-account-bottom"

# ── 7. Auth Screens ─────────────────────────────────────────────
echo ""
echo "── 7. Auth ──"
nav "login";          shot "18-login"
nav "signup";         shot "19-signup"
nav "forgot-password"; shot "20-forgot-password"

# ── 8. Search ───────────────────────────────────────────────────
echo ""
echo "── 8. Search ──"
nav "shop"; sleep 1
tap 980 175; sleep 2  # tap search icon
shot "21-search-empty"
type_text "futon"; sleep 2
shot "22-search-results"
back; back

# ── 9. Collections ──────────────────────────────────────────────
echo ""
echo "── 9. Collections ──"
nav "collections"; shot "23-collections-grid"
swipe_up; shot "24-collections-scrolled"

# ── 10. Collection Detail ───────────────────────────────────────
echo ""
echo "── 10. Collection Detail ──"
nav "collections/the-minimalist-den"
shot "25-collection-detail-hero"
swipe_up; shot "26-collection-detail-products"
swipe_up; shot "27-collection-detail-total"

# ── 11. Wishlist ────────────────────────────────────────────────
echo ""
echo "── 11. Wishlist ──"
nav "wishlist"; shot "28-wishlist"

# ── 12. Checkout ────────────────────────────────────────────────
echo ""
echo "── 12. Checkout ──"
nav "checkout"; shot "29-checkout"

# ── 13. Order History ───────────────────────────────────────────
echo ""
echo "── 13. Order History ──"
nav "orders"; shot "30-order-history"

# ── 14. AR Camera ───────────────────────────────────────────────
echo ""
echo "── 14. AR Camera ──"
nav "ar"; sleep 5
shot "31-ar-camera"

# ── 15. Style Quiz ──────────────────────────────────────────────
echo ""
echo "── 15. Style Quiz ──"
nav "style-quiz"
shot "32-style-quiz-q1"
tap 540 900; sleep 1; shot "33-style-quiz-q2"

# ── 16. Achievements / Gamification ────────────────────────────
echo ""
echo "── 16. Achievements ──"
nav "achievements"
shot "34-achievements-top"
swipe_up; shot "35-achievements-scrolled"

# Leaderboard — now has deep link
nav "leaderboard"; shot "36-leaderboard"

# Challenges — now has deep link
nav "challenges"; shot "37-challenges"

# Avatar equipment — now has deep link
nav "avatar"; shot "38-avatar-equip"

# ── 17. Notifications ───────────────────────────────────────────
echo ""
echo "── 17. Notifications ──"
# 'alerts' = Notifications inbox screen
nav "alerts"; shot "39-notifications-inbox"
# 'notifications' = NotificationPreferences screen
nav "notifications"; shot "40-notification-prefs"

# ── 18. Store Locator ───────────────────────────────────────────
echo ""
echo "── 18. Store Locator ──"
nav "stores"; sleep 4  # map needs extra time
shot "41-store-locator"

# ── 19. Store Detail ────────────────────────────────────────────
echo ""
echo "── 19. Store Detail ──"
nav "stores/raleigh"; shot "42-store-detail"

# ── 20. Room Gallery ────────────────────────────────────────────
echo ""
echo "── 20. Room Gallery ──"
# 'gallery' = RoomGallery (newly added deep link)
nav "gallery"; shot "43-room-gallery"
swipe_up; shot "44-room-gallery-scrolled"

# ── 21. Referral / Premium ──────────────────────────────────────
echo ""
echo "── 21. Referral + Premium ──"
nav "referral/DEMO2026"; sleep 2; shot "45-referral-landing"

# ── 22. Category (Filtered Grid) ───────────────────────────────
echo ""
echo "── 22. Category ──"
nav "category/living-room-futons"; shot "46-category-filtered-grid"
swipe_up; shot "47-category-scrolled"

# ── 23. Compare (Side by Side) ─────────────────────────────────
echo ""
echo "── 23. Compare ──"
nav "compare"; shot "48-compare-side-by-side"

# ── 24. Payment Confirmation / Order Success ───────────────────
echo ""
echo "── 24. Payment + Order Flow ──"
nav "payment-confirmation"; sleep 2; shot "49-payment-confirmation"
nav "order-success"; sleep 2; shot "50-order-success"
nav "order-confirmation"; sleep 2; shot "51-order-confirmation"
nav "orders/ORD-001"; sleep 2; shot "52-order-detail"

# ── 25. AR Web Viewer ──────────────────────────────────────────
echo ""
echo "── 25. AR Web Viewer ──"
nav "ar-web"; sleep 3; shot "53-ar-web-viewer"

# ── 26. CF+ Premium ────────────────────────────────────────────
echo ""
echo "── 26. CF+ Premium ──"
nav "premium"; sleep 2; shot "54-cf-plus-premium"

# ── 27. Loyalty / Points ───────────────────────────────────────
echo ""
echo "── 27. Loyalty ──"
nav "loyalty"; sleep 2; shot "55-loyalty-program"
nav "points-history"; sleep 2; shot "56-points-history"

# ── 28. Rewards Catalog ────────────────────────────────────────
echo ""
echo "── 28. Rewards Catalog ──"
nav "rewards"; sleep 2; shot "57-rewards-catalog"

# ── 29. Push Permission Pre-Prompt ─────────────────────────────
echo ""
echo "── 29. Push Permission ──"
nav "notification-permission"; sleep 2; shot "58-push-permission-prompt"

# ── 30. Checkout Details ───────────────────────────────────────
echo ""
echo "── 30. Checkout Details ──"
# Promo code input — navigate to cart first, ensure items, then checkout
nav "cart"; sleep 1
nav "checkout"; sleep 3
shot "59-checkout-form-skeleton"
sleep 3
shot "60-checkout-promo-code"
# Keyboard focus on a field
tap 540 800; sleep 2
shot "61-checkout-keyboard-a11y"
back

# ── 31. Privacy Policy ─────────────────────────────────────────
echo ""
echo "── 31. Privacy ──"
nav "privacy-policy"; sleep 2; shot "62-privacy-policy"

# --- Summary ---
echo ""
echo "═══════════════════════════════════════════════════"
echo "  Done!  Captured: ${CAPTURED}  Failed: ${FAILED}  Total: ${TOTAL}"
echo "  Output: ${OUT_DIR}/"
echo "  Next: scp pop-os:~/cfutons_mobile/${OUT_DIR} docs/screenshots/"
echo "        python3 scripts/update-screen-html.py ${OUT_DIR}"
echo "═══════════════════════════════════════════════════"
