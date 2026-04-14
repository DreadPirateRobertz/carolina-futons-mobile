# Cross-Platform Feature Plan — Carolina Futons Mobile + Web

**Date:** 2026-04-04
**Authors:** Dallas (cfutons_mobile PM), Melania (cfutons web PM)
**Status:** Draft — pending overseer review

## Summary

Coordinated feature roadmap across cfutons_mobile (React Native) and carolina-futons (Wix). Three phases: cross-platform joint work, web-to-mobile ports, and mobile-unique features. 15 features total across 5 crew members + melania coordination.

## Current State

**Mobile (cfutons_mobile):** 40 screens, 7400+ tests, Expo SDK 55, React Native 0.84. Core flows complete: browse, AR preview, cart, checkout (Stripe), order history. Gamification system (achievements, challenges, leaderboard, loyalty tiers, daily quests, avatar). Push notifications. Offline sync.

**Web (carolina-futons):** Wix-based, 48 features shipped in session 31. Commerce, gamification, UGC, email sequences, content calendar, Room Planner canvas. 7 crew active.

## Phase 1: Cross-Platform Joint Work

### 1.1 Loyalty Unification (cm-elo)

**Goal:** Single points ledger and tier system across web + mobile.

**Tiers (4):** Trail Blazer, Mountain Guide, Summit Master, Blue Ridge Legend

**Web source of truth:** `gamificationTokens.js POINTS_CONFIG`, `loyaltyService.web.js`, `loyaltyTiers.web.js`

**Mobile changes:**

- Wire `LoyaltyScreen`, `PointsHistoryScreen`, `RewardsScreen` to Wix Members API
- Replace local mock points with shared `LoyaltyPoints` Wix collection
- Sync tier perks with web's `TierPerkDeliveries` collection
- Display same perk unlocks: free delivery, styling call, early access

**Coordinator:** Dallas + Melania (joint spec via mail)

### 1.2 UGC Photo Sharing (cm-nw8)

**Goal:** Users submit room photos on both platforms, displayed everywhere.

**Shared Wix collection:** `UGCPhotos`

```
{
  roomType: "living-room" | "bedroom" | "office" | "dorm" | "porch" | "other",
  productId: string,
  photoUrl: string,
  caption: string (max 80),
  submittedAt: Date,
  status: "pending" | "approved" | "featured" | "rejected",
  voteCount: number,
  memberId: string
}
```

**Mobile changes:**

- `RoomGalleryScreen`: add photo submit (expo-image-picker)
- `ProductDetailScreen`: add UGC gallery section (horizontal scroll)
- Vote/like functionality
- Moderation: only show `approved` + `featured` status photos

**Assigned:** Ripley (after deacon-59x)

### 1.3 BNPL Parity (cm-1s7)

**Goal:** Consistent Affirm financing estimates across platforms.

**Web reference:** `financingCalc.web.js`, `BNPLWidget.js`

**Mobile changes:**

- Align `FinancingCalculator` component math with web's `financingCalc.web.js`
- Ensure same Affirm merchant config
- Mobile already has Affirm + Afterpay calculator on PDP (PR #403 merged)

**Assigned:** Hicks (after deacon-t26)

## Phase 2: Web-to-Mobile Ports

### 2.1 Virtual Consultation Booking

**New screen:** `ConsultationBookingScreen`
**Deep link:** `carolinafutons://consultation`
**Wix collection:** `ConsultationBookings` (schema pending from melania)
**Features:** Calendar picker, time slot selection, 30-min video call booking, confirmation push
**Assigned:** Bishop (after deacon-51g)

### 2.2 Warranty Registration

**New screen:** `WarrantyRegistrationScreen`
**Entry point:** OrderDetailScreen (post-delivery)
**Wix collection:** `WarrantyRegistrations`
**Features:** Order number, product, purchase date, receipt photo upload
**Assigned:** Burke (after deacon-gia)

### 2.3 Post-Purchase NPS Survey

**New component:** `NPSSurveyModal`
**Trigger:** Push notification 7 days post-delivery
**Wix collection:** `SurveyResponses`
**Features:** 0-10 NPS scale, optional text, dismiss + submit
**Assigned:** Nux (after deacon-905)

### 2.4 Price Drop Push Notifications

**New component:** `PriceAlertButton` on ProductDetailScreen
**Wix collection:** `PriceAlerts`
**Webhook format (from melania):**

```json
{
  "productId": "string",
  "productName": "string",
  "oldPrice": "number",
  "newPrice": "number",
  "percentDrop": "number",
  "subscriberDeviceToken": "string"
}
```

**Features:** Subscribe from PDP, push on price drop, deep link to PDP on tap
**Assigned:** Bishop

### 2.5 Product Q&A on PDP

**New component:** `ProductQASection` on ProductDetailScreen
**Wix collection:** `ProductQuestions`
**API (from melania):** `insertGuestQuestion`, `getApprovedQuestions`, `submitAnswer`
**Rate limit:** 3 questions/hr per user (match web)
**Assigned:** Ripley

### 2.6 Bundle Deals

**New component:** `BundleSuggestion` on ProductDetailScreen + CartScreen
**Wix collection:** `BundleDefinitions` (SKU arrays)
**API (from melania):** `getCompatibleItems`, `calculateBundlePrice`, `addBundleToCart`
**Coupon format:** Auto-generated `CF-BUNDLE-{8chars}`
**Assigned:** Hicks

### 2.7 Video Reviews on PDP

**New component:** `VideoReviewGallery` on ProductDetailScreen
**Wix collection:** `VideoReviews`
**Features:** Horizontal thumbnail scroll, full-screen playback, TikTok-style grid
**Assigned:** Burke

## Phase 3: Mobile-Unique (In Progress)

| Bead       | Feature                   | Assigned | Status |
| ---------- | ------------------------- | -------- | ------ |
| deacon-51g | Product ratings & reviews | Bishop   | Active |
| deacon-59x | Promo banner carousel     | Ripley   | Active |
| deacon-t26 | Share via native sheet    | Hicks    | Active |
| deacon-905 | Visual search camera      | Nux      | Active |
| deacon-gia | Test coverage gap-fill    | Burke    | Active |

## Design Constraints

- **TDD mandatory** — tests before implementation (Melania quality gate)
- **Edge cases required** — network errors, empty states, permission denied, offline
- **Coverage target** — all new files above 80% line coverage
- **Design tokens** — shared palette: Sand #E8D5B7, Espresso #3A2518, Mountain Blue #5B8FA8, Coral #E8845C, CTA always sunsetCoral
- **Architecture** — screens import from hooks, never from `@/data/` directly
- **Wix API** — rate-limited writes (3/hr per user), clock injection for tests, never expose on `Permissions.Anyone`
- **Payments** — mobile uses Stripe only, web uses Wix Payments (locked architecture)
- **Builds** — all work on Linux (ssh pop-os), Mac = coordination only

## Execution Order

Phase 3 is already running. Phase 2 starts as Phase 3 items complete (crew rolls into next assignment). Phase 1 runs in parallel with melania coordination via mail.

**Estimated crew throughput:** 5 crew x 2 features each = 10 features in Phase 2+3, plus 3 joint Phase 1 features = **15 features total**.

## Dependencies

- Melania: `ConsultationBookings` collection schema (requested)
- Melania: Joint loyalty spec session (initiated)
- Melania: Price drop webhook → push adapter (format agreed)
- EAS build quota: Apple builds deferred until quota resets
- Emulator: Running on pop-os with 4GB RAM (fixed this session)

## Open Questions

1. Gift registry — web has it, mobile worth adding? (Deferred — low mobile use case)
2. Pre-sale chatbot (Claude-powered) — mobile in-app chat? (Deferred — needs API budget approval)
3. Room Planner 2D on mobile — web has canvas, mobile has AR. Redundant or complementary? (Deferred — assess after Phase 1)
