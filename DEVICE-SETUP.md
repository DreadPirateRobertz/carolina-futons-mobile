# Testing Carolina Futons Mobile on Your Device

## Quick Start (Expo Go — fastest)

The fastest way to test on your Pixel 9:

```bash
# 1. Install Expo Go from Google Play Store on your Pixel 9

# 2. From this repo:
npm install
npx expo start

# 3. Scan the QR code shown in terminal with your Pixel 9 camera
#    (or open Expo Go app and scan from there)
```

Your phone and computer must be on the **same Wi-Fi network**.

> **Note**: Expo Go has limitations — some native modules (camera, AR) may not
> work in Expo Go. For full functionality, use a development build (below).

## Development Build (full native features)

For camera/AR features, you need a custom dev build:

```bash
# 1. Create an Expo account (one-time)
npx eas login

# 2. Build an APK for your Pixel 9
npx eas build --profile development --platform android

# 3. Download the APK from the link EAS gives you
# 4. Install on your Pixel 9:
#    - Email yourself the APK link, open on phone
#    - OR: adb install <path-to-apk>

# 5. Start the dev server
npx expo start --dev-client

# 6. Open the app on your Pixel 9 — it connects to the dev server
```

## What Works Right Now (v0.1.0)

| Feature | Status | Notes |
|---------|--------|-------|
| Home screen | Working | Brand-themed, AR + Shop CTAs |
| Shop / Browse | Working | Product grid with cards, badges, ratings |
| Categories | Working | Filtered product views |
| Product Detail | Working | Images, pricing, size/color, dimensions, Afterpay/Affirm messaging |
| AR Camera | Partial | UI built, needs real AR models (uses placeholder teapot) |
| Cart | Working | Add/remove items, quantity, subtotal |
| Wishlist | Working | Save/remove products, persisted locally |
| Store Locator | Working | Store list with distance calculation |
| Account | Working | Login/signup UI (mock auth — real Wix auth in progress) |
| Order History | Working | Mock order data display |
| Checkout | Working | UI flow (no real payment processing yet) |
| Theme | Working | Full Blue Ridge Mountain palette, dark mode toggle |
| Deep Links | Working | `carolinafutons://` scheme configured |

## What's Coming Next

- **Real Wix auth** (login/signup via Wix Members API) — in progress
- **Live product data** from Wix Stores API — hooks wired, needs API keys
- **Push notifications** — queued
- **Offline mode** — queued
- **Onboarding flow** — queued

## Troubleshooting

### "Network error" or app won't connect
- Ensure phone and computer are on same Wi-Fi
- Try `npx expo start --tunnel` (slower but works across networks)

### Fonts look wrong / system fallback
- Fonts load from Google Fonts on first launch — needs internet
- If fonts fail, app still works with system fallback

### AR Camera shows black/crashes
- AR requires a development build (not Expo Go)
- Pixel 9 supports ARCore — should work with dev build

### Build fails
```bash
# Clear caches and retry
npx expo start --clear
rm -rf node_modules && npm install
```

## Environment Info

- Expo SDK: 52
- React Native: via Expo
- Node: 18+ required
- EAS CLI: `npm install -g eas-cli`
