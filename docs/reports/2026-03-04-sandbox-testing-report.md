# Sandbox Testing Report — 2026-03-04

**Bead**: cm-3m3
**Tester**: cfutons_mobile/crew/dallas
**Platforms**: Expo Web (Chrome), iOS Simulator (iPhone 16e, iOS 26.2)
**Android**: Not available (no emulator configured on this machine)

---

## Blockers Fixed During Testing

| # | Issue | Fix | Commit |
|---|-------|-----|--------|
| 1 | App crashes without `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Created `.env` with required vars; Ripley added `.env.example` (PR #52) | f449920, 3c71c9f |
| 2 | `@stripe/stripe-react-native` breaks web builds (deep RN internal imports) | Added `web/empty-module.js` stub + metro.config.js web routing | f449920 |
| 3 | `app.json` missing `bundler: "metro"` for web | Added to web config | f449920 |
| 4 | Stripe plugin missing `merchantIdentifier` in app.json | Added config object with merchantIdentifier + enableGooglePay | f449920 |
| 5 | `react-native@0.76.7` version mismatch | Upgraded to 0.76.9 via `npx expo install --fix` | f449920 |

## Expo Web Results

| Screen | Status | Elements | SVGs | Notes |
|--------|--------|----------|------|-------|
| Onboarding | PASS | 74 | 1 (20 paths) | MountainSkyline renders, text correct, Skip/Next work |
| Home | PASS | 159 | 2 | Tab nav, CTAs (Try in Room, Browse), brand header |
| Shop | PASS | 370 | 3 | Full catalog, 8 categories, products with ratings/prices |
| Product Detail | PASS | 279 | 1 | Images, fabric selector, 3D dimensions, reviews with ratings |
| Cart (empty) | PASS | 84 | 1 | Empty state illustration + message |
| Account | PASS | 85 | 1 | Sign-in prompt renders |
| Checkout | PASS | 55 | 0 | Payment methods: Google Pay, Affirm, Klarna, CC |
| Collections | PASS | 108 | 0 | 5 curated collections with tags |
| Wishlist (empty) | PASS | 44 | 1 | Empty state with illustration |
| Store Locator | FAIL | — | — | Redirects to /home (route not in linking config) |

**Web Summary**: 9/10 screens pass. Store Locator needs route fix.

## iOS Simulator Results (iPhone 16e, iOS 26.2)

| Screen | Status | Notes |
|--------|--------|-------|
| Onboarding | PASS | MountainSkyline SVG renders, dark editorial treatment, pagination dots visible |
| Further screens | BLOCKED | Expo Go dev menu modal cannot be dismissed via `simctl io tap` (iOS 26.2 limitation) |

**iOS Summary**: App launches, Expo Go SDK 52.0.0 confirmed, Onboarding renders correctly. Further screen testing requires manual interaction or Expo Dev Client build.

## Android Results

**Not tested** — no Android emulator available on this machine. Nightly CI (PR #50) includes Android build job that will validate build success.

## SVG Rendering Observations

- MountainSkyline: Renders on both web and iOS with full path detail
- Empty state illustrations (Cart, Wishlist): SVGs render on web
- Product images: Placeholder/catalog images load correctly
- **Note**: Overseer has flagged illustrations as "too abstract" — Figma-first pivot in progress (Melania, cf-hfly)

## Issues to File

1. **Store Locator route missing from linking config** — `/store-locator` redirects to home on web
2. **iOS simctl tap broken on iOS 26.2** — cannot automate UI interaction for testing
3. **Android emulator not available** — need emulator setup for full coverage

## Recommendations

1. Add store-locator to linking config for web deep linking
2. Set up Expo Dev Client for automated iOS testing (bypasses Expo Go dev menu)
3. Configure Android emulator on CI machine for local testing
4. Hold further illustration work pending Figma-first pivot (Melania coordinating)
