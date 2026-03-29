# Carolina Futons Mobile

> React Native app for [Carolina Futons](https://carolinafutons.com) — a Hendersonville, NC futon retailer. Shop, configure, and place furniture in your room using AR, all from your phone.

**Platform:** iOS + Android &nbsp;|&nbsp; **Stack:** Expo SDK 55 · React Native 0.84 · React 19 · TypeScript strict &nbsp;|&nbsp; **Tests:** 6,936 passing (392 suites)

---

## What the App Does

### Augmented Reality — Place Before You Buy
The centerpiece feature. Point your camera at any room and place true-to-scale 3D futon models directly in your space before purchasing. Powered by ARKit (iOS) and ARCore (Android).

- Full AR room placement with ARKit/ARCore
- Real-time 3D model positioning, rotation, and scaling
- Side-by-side AR comparison of two models simultaneously
- Room measurement overlay — measure your space in AR
- Fabric swatch visualization — see different fabrics applied to the model in real time
- One-tap share of AR room photos to social or messaging
- 3D web viewer fallback for devices without AR support
- Offline model caching — downloaded models available without internet

### Product Discovery
- **39 screens** covering the full shopping journey (see [Screen Reference Guide](docs/screen-reference.html))
- Shop grid with full Wix catalog (88+ products, real CDN images)
- Category and collection browsing
- Side-by-side product comparison
- Wishlist with persistence
- Search with Wix search API

### Product Detail
- Multi-image gallery with pinch-to-zoom
- Video gallery (product demos, lifestyle)
- Fabric/finish variant picker
- Delivery date estimation by ZIP code
- Shipping type detection (parcel vs. LTL freight for wide items)
- Social proof: sold count, star ratings, review excerpts (Stamped integration)
- CF+ Premium exclusives badge
- "Launch AR" deep link from PDP to AR camera

### Cart & Checkout
- Persistent cart with Wix sync
- Stripe PaymentSheet — full card, Apple Pay, Google Pay
- Cart abandonment recovery — push notification at 1hr with email dedup
- Promo code redemption
- Payment timeout handling and retry flow
- Order confirmation with points earned (gamification)

### Loyalty & Gamification
A full RPG-style loyalty system layered on top of commerce:

- **Points & Tiers** — Bronze → Silver → Gold → Platinum with escalating perks
- **Daily Spin** — wheel spin for bonus points
- **Challenges** — time-limited tasks (first purchase, review, AR session, referral)
- **Achievements & Badges** — unlockable badges with share capability
- **Leaderboard** — weekly/monthly/all-time rankings
- **Avatar Equipment** — unlock cosmetic items from challenges
- **Style Scout Quest Pack** — style quiz unlocks personalized challenge track
- **Referral Program** — share referral code, earn rewards on friend's first purchase
- **Cross-rig Event Bus** — gamification events fire on order placed, streak extended, badge earned, tier change; synced to Wix backend via webhook

### AI Personalization
- **Fit Score** — AI-powered compatibility score for each product based on quiz answers and browse history
- **Style Sommelier** — conversational AI that asks a few questions and recommends the right futon
- Parallel fetch architecture — personalization data loaded alongside product data, no waterfall

### Push Notifications
- Permission prompt with pre-ask explanation screen
- Per-channel preference toggles (order updates, promos, price drops, loyalty, cart reminders)
- Order shipped / delivered / refunded alerts
- Streak milestone reminders
- Badge earned + tier change notifications
- Price drop alerts on wishlisted items
- Token registration tied to auth lifecycle (fires on sign-in, clears on sign-out)

### Authentication
- Email/password via Wix Members
- Google Sign-In (OAuth)
- Apple Sign-In (iOS)
- Session persistence with automatic refresh
- Secure token storage

### CF+ Premium Membership
- Exclusive product access
- Priority shipping tier
- Double points on purchases
- In-app purchase flow

### Offline Support
- `OfflineBanner` — real-time network status indicator
- Cached product catalog and 3D models available offline
- Cart persists locally and syncs on reconnect

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 55 (bare workflow, React Native 0.84) |
| Language | TypeScript (strict) |
| Navigation | React Navigation v7 (native-stack) |
| Animations | react-native-reanimated v4 |
| Gestures | react-native-gesture-handler v2 |
| State | React Context + useReducer + SWR |
| Backend | Wix Headless (products, auth, orders, CMS) |
| Payments | Stripe React Native (PaymentSheet) |
| Push | expo-notifications (APNs + FCM via Expo) |
| AR | ARKit (iOS) / ARCore (Android) + model-viewer web fallback |
| Analytics | Firebase + Mixpanel (multi-provider) |
| Crash Reporting | Sentry |
| Testing | Jest + React Native Testing Library (6,936 tests) |
| Build | EAS Build (dev / preview / production profiles) |
| CI | GitHub Actions (lint, test, catalog-sync) |

---

## Screen Reference Guide

Visual reference for all 39 screens: **[docs/screen-reference.html](docs/screen-reference.html)**

Covers every screen with feature annotations, navigation flows, component inventory, and build info. Updated after each major feature release.

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env
# Fill in Stripe and Wix credentials (see .env.example)

# 3. Start dev server (on Linux — do NOT run on Mac, Metro causes OOM)
npx expo start
```

### Required Environment Variables

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `EXPO_PUBLIC_WIX_CLIENT_ID` | Wix OAuth client ID |
| `EXPO_PUBLIC_WIX_API_KEY` | Wix REST API key (`IST.eyJ...`) |
| `EXPO_PUBLIC_WIX_SITE_ID` | Wix site ID |

See [`.env.example`](.env.example) for the full list.

---

## Running Tests

```bash
# All tests (run on Linux — 32GB RAM recommended)
npm test

# Watch mode
npm test -- --watch

# Single file
npm test -- src/hooks/__tests__/useAuth.test.tsx
```

---

## Building

Builds run via EAS on Linux (ssh pop-os). Do not run `expo run:android` on the Mac.

```bash
# Android debug APK (on Linux)
npx expo run:android

# EAS cloud build
eas build --platform android --profile preview
```

See [DEVICE-SETUP.md](DEVICE-SETUP.md) for emulator setup and [ARCHITECTURE.md](ARCHITECTURE.md) for a deep-dive on the codebase structure.
