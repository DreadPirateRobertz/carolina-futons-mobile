# Carolina Futons Mobile v2.0 Feature Roadmap

**Date:** 2026-03-16
**Author:** cfutons_mobile/crew/dallas
**Contributors:** bishop (tech risk), ripley (UI/UX), burke (a11y), hicks (perf), melania (PM/web coordination)
**Status:** Draft — pending final review

---

## Overview

Three-phase roadmap to take the Carolina Futons mobile app from beta (mock data, working UI) to production-ready (real customers, real payments) and beyond (differentiation, growth). 19 features across 12 weeks.

**Current state:** 23 screens, 53 hooks, 2,700+ tests passing. AR, Stripe payments, push notifications, offline sync all functional. Product catalog runs on static mock data. Wix backend integration is code-complete but inactive.

**Goal:** Go live with real customers → expand features that differentiate → grow downloads and retention.

---

## Phase 1: Go-Live Ready (Weeks 1-3)

Critical path to real customers. Nothing ships without these.

### 1.1 Stripe ↔ Wix Order Saga

**Risk:** CRITICAL (bishop)
**Owner:** bishop (architecture) + dallas (integration)

**Problem:** Current flow is cart → Stripe payment intent → Wix order creation. If Wix order creation fails after Stripe charges, there's no compensation transaction. Offline queue replay could create duplicate orders.

**Solution:**

- Implement saga pattern: Stripe charge → Wix order → confirm, with rollback (Stripe refund) on Wix failure
- Add idempotency keys to order creation to prevent duplicate orders on offline replay
- Add order status state machine: `pending` → `payment_captured` → `order_created` → `confirmed`
- Compensation transaction: if Wix fails, auto-refund Stripe + notify user
- Timeout policy: Wix order creation must respond within 15s; 3 retries with exponential backoff (1s, 3s, 9s) before triggering rollback
- If Stripe refund itself fails: log to Sentry as CRITICAL, persist failed refund record for manual resolution, notify user "we're processing your refund"

**Acceptance criteria:**

- Stripe charge never persists without a corresponding Wix order
- Offline replay of order creation is idempotent (idempotency key = `order_{cartId}_{timestamp}`)
- Failed order creation triggers automatic Stripe refund within 30s
- If refund fails, incident is logged and queued for manual resolution
- User sees clear error state if order saga fails, with support contact CTA
- Wix order creation times out after 15s with 3 retries before rollback

### 1.2 Dynamic Tax + Shipping

**Risk:** CRITICAL (bishop)
**Owner:** dallas + coordinate with melania (web backend)

**Problem:** Tax hardcoded at 7% NC rate. Won't survive multi-state sales. Shipping rates are placeholder.

**Solution:**

- Integrate Stripe Tax for automatic tax calculation by shipping address state
- Consume web's UPS shipping API (`ups-shipping.web.js`) for real zone-based rates — 695 lines battle-tested, don't duplicate
- Fallback: flat-rate shipping if UPS API unreachable
- Premium members retain free shipping benefit

**Acceptance criteria:**

- Tax calculated dynamically based on shipping address (state + county/local jurisdiction via Stripe Tax)
- States with no sales tax (OR, MT, NH, DE, AK) correctly show $0 tax
- Tax line items displayed in order summary before confirmation
- Shipping rates from UPS API with zone logic
- Fallback to flat rate ($49.99) on UPS API failure
- Premium free shipping preserved

### 1.3 Wix Backend Activation

**Risk:** LOW (bishop)
**Owner:** dallas, hicks (timeout hardening)

**Problem:** App runs on static mock data. Wix integration is code-complete but configured for sandbox.

**Solution:**

- Set production Wix environment variables
- Add 10s timeout to all wixSdkClient calls (currently no timeout)
- Extend cache-first strategy from productCache.ts to collections
- Monitor rate limits on production Wix API
- Configure webhook signatures for inventory updates

**Acceptance criteria:**

- App serves real product data from Wix Stores
- All Wix API calls have 10s timeout
- Cache-first strategy on all data endpoints
- No spinner > 2s on warm cache

### 1.4 Auth Completion

**Risk:** MEDIUM (bishop)
**Owner:** burke (a11y forms) + ripley (UI)

**Problem:** Password reset, account deletion, saved addresses, and payment vault are scaffolded but not functional.

**Solution:**

- Password reset via Wix email service endpoint
- Account deletion flow: confirm → archive data (retained 30 days per CCPA/legal review) → delete Wix member → clear local storage → confirmation email
- Saved addresses CRUD against Wix members API
- Stripe Customer creation for payment method vault
- Fix token refresh race condition: add concurrent refresh guard (mutex/promise dedup)
- Add session invalidation on password change

**Acceptance criteria:**

- User can reset password via email
- Account deletion fully functional with 30-day data retention + confirmation email
- Addresses persist across sessions via Wix
- Payment methods stored securely via Stripe Customer
- No duplicate token refresh calls under poor network

**Accessibility (burke):**

- All form fields have labels and error announcements
- 44pt touch targets on all buttons
- Screen reader narration for all auth flows

### 1.5 Push Notification Backend

**Risk:** LOW-MEDIUM (bishop) — gap: no backend engineers
**Owner:** hicks (service architecture)

**Problem:** App receives and routes push notifications. No backend service to send them.

**Solution:**

- **Approach decision (spike first):** Evaluate Expo managed push service vs. serverless functions (Wix backend functions or AWS Lambda). Spike task: 1 day to prototype simplest option. No backend engineers on crew — prefer managed/serverless over custom service.
- Device token storage in Wix CMS collection (PushTokens)
- Trigger types: order_status_change, cart_abandonment (24hr delay), back_in_stock, promotional
- Segment by notification preferences (already persisted in app)

**Acceptance criteria:**

- Order status changes trigger push notification
- Cart abandonment reminder sent after 24hr
- Back-in-stock alerts sent to subscribed users
- Users can disable notification types (preferences respected)

### 1.6 Store Data Sync

**Risk:** LOW (bishop)
**Owner:** ripley

**Problem:** Store data (hours, inventory, locations) is hardcoded mock data.

**Solution:**

- Connect to Wix Stores locations API (or CMS collection)
- SWR caching with stale-while-revalidate (pattern already established)
- Google Maps integration for directions CTA
- Polling for inventory updates (real-time webhooks deferred)

**Acceptance criteria:**

- Store hours reflect real data
- Per-location inventory shown
- Google Maps directions functional
- Offline fallback to cached store data

---

## Phase 2: Feature Expansion (Weeks 4-8)

Differentiate from competitors. Room Planner has highest ROI (ripley: 80% infrastructure ready).

### 2.1 Room Planner / AR Upgrade

**Risk:** HIGH for persistence (bishop), LOW for core features (ripley)
**Owner:** ripley (UI) + bishop (persistence) + burke (a11y)

**Problem:** AR supports multi-product staging but it's session-only. No way to save, load, or share room layouts.

**Solution:**

- Serialize AR scene to cross-platform JSON format: `{ schemaVersion: 1, models: [{ modelId, position: {x,y,z}, rotation: {x,y,z}, scale: number }], roomDimensions: {width, depth}, createdAt, appVersion }`
- Schema versioning: `schemaVersion` field enables forward-compatible migrations when format changes
- Save/load room layouts to AsyncStorage + optional cloud sync via Wix CMS
- Share room designs via native share sheet (screenshot + deep link: `carolinafutons://room/{roomId}`)
- Suggested arrangements based on room dimensions (measured via AR measurement tool)
- New components: SavedRoomCard, RoomLayoutPicker, ArrangementSuggestions, RoomShareSheet

**Acceptance criteria:**

- User can save an AR room layout and reload it later
- Layouts persist across app restarts (AsyncStorage with schema version)
- Share generates screenshot + deep link (`carolinafutons://room/{roomId}`)
- Shared link opens room layout on recipient's device (models re-placed from JSON, not AR anchors)
- App handles older schema versions gracefully (migration or "please update" prompt)
- Suggested arrangements based on measured room size

**Accessibility (burke):**

- Audio/haptic feedback for model placement and interaction
- High-contrast overlay mode for loading states
- Screen reader announcements for AR state changes (loading, placed, error)
- Camera permission rationale text clear and accessible

**Performance (hicks):**

- Reuse existing ARScreen surface detection + lighting estimation
- JS heap < 150MB on mid-tier (iPhone 12 / Pixel 5)
- No feature increases cold start by > 300ms

### 2.2 Smart Recommendations (DB-driven)

**Risk:** LOW (scoped down per bishop)
**Owner:** hicks (queries + caching)

**Problem:** No product recommendations beyond manual curation.

**Solution:**

- "Customers also bought" based on order history co-occurrence
- Style quiz result matching: recommend products matching user's aesthetic/room/use preferences
- Query against Wix collections — no ML infrastructure
- Cache recommendations per user with 1hr TTL

**Acceptance criteria:**

- Product detail shows "Customers also bought" section
- Home screen shows personalized picks based on style quiz
- Recommendations update when quiz results change
- Graceful fallback to featured products if no data

### 2.3 Loyalty / Rewards Program

**Risk:** LOW-MEDIUM (bishop)
**Owner:** coordinate with melania (miquella building web side)

**Problem:** No customer retention incentives beyond CF+ premium.

**Solution:**

- Consume shared CMS collections: LoyaltyAccounts, LoyaltyTransactions (melania's team building)
- Points per purchase (1 point per $1)
- Tiers: Bronze (0), Silver (500pts), Gold (1500pts)
- Birthday rewards: bonus points on birth month
- CF+ premium members earn 2x points
- Display: points balance, tier progress, transaction history
- Redemption: points redeemable as checkout discount ($1 per 100 points, min 500 points to redeem). Redemption logic owned by web backend — mobile calls shared API.

**Acceptance criteria:**

- Points awarded on order confirmation
- Tier badge displayed in account screen
- Point balance visible across app (account, checkout)
- CF+ members earn double points
- Points redeemable at checkout (min 500 points = $5 off), via shared backend API

**Accessibility (burke):**

- Progress bars have accessibilityValue (min/max/now)
- WCAG AA contrast (4.5:1) on tier badges
- Points/rewards status announced to screen reader on load

### 2.4 Photo Reviews

**Risk:** LOW (ripley: integrates into existing components)
**Owner:** ripley + coordinate with melania (ReviewRequests CMS, CF-k8hw)

**Problem:** Reviews are text-only. No visual proof of purchase or room setup.

**Solution:**

- Add photo upload to existing ReviewForm (expo-image-picker)
- Image carousel in ReviewCard
- Verified purchase badge (match review author to order history)
- Consume shared ReviewRequests CMS collection from web team

**Acceptance criteria:**

- Users can attach 1-5 photos to reviews
- Photos display in carousel on review cards
- Verified purchase badge shown when applicable
- Images compressed before upload (< 1MB each)

**Accessibility (burke):**

- All user-uploaded images require alt text prompt
- Form field labels and error announcements via accessibilityLiveRegion
- Image carousel supports VoiceOver navigation

### 2.5 BNPL Native (Affirm + Klarna)

**Risk:** MEDIUM-HIGH (bishop: 2-3 beads per provider)
**Owner:** bishop (SDK integration) + hicks (perf)

**Problem:** Cart shows BNPL teaser copy but no real financing integration.

**Solution:**

- Affirm SDK integration: prequalification check → checkout redirect → webhook confirmation
- Klarna SDK integration: same flow, different provider
- Display monthly payment estimate on product detail and cart
- Handle partial payment states in order saga

**Acceptance criteria:**

- Affirm and Klarna both functional at checkout
- Monthly payment estimate shown on products > $200
- BNPL order confirmation flows through same order saga as card payments
- Graceful degradation if provider SDK unavailable (BNPL option hidden, card/Apple Pay still work)
- Declined financing shows clear message + fallback to card payment ("Financing not approved. You can still pay with card.")
- Sequence: implement Affirm first; Klarna in parallel if crew capacity allows

### 2.6 Fabric Sample Ordering

**Risk:** LOW
**Owner:** coordinate with melania (FabricSwatches CMS provisioned)

**Problem:** Fabric sample request form exists but no backend.

**Solution:**

- Consume FabricSwatches CMS collection from web team
- Order creation for free swatch shipment
- Track sample delivery status
- Follow-up push notification: "Tried your swatch? Buy the futon" (7 days after delivery)

**Acceptance criteria:**

- User can order up to 5 free fabric swatches
- Delivery tracking shown in order history
- Follow-up push sent 7 days post-delivery

### 2.7 Enhanced Compare Tool

**Risk:** LOW
**Owner:** ripley

**Problem:** Current CompareScreen is basic. No structured spec comparison.

**Solution:**

- Progressive disclosure (ripley): key dimensions first → expand for full specs
- Side-by-side CompareTable component
- FabricSwatchComparison component
- Shareable comparison deep links
- New components: CompareTable, FabricSwatchComparison

**Acceptance criteria:**

- 2-3 products compared side-by-side with key specs
- Full spec disclosure on tap
- Comparison shareable via deep link
- Works offline with cached product data

---

## Phase 3: Growth & Engagement (Weeks 9-12)

Maximize downloads, retention, and revenue per user.

### 3.1 Referral Program

**Risk:** LOW
**Owner:** coordinate with melania (ReferralCodes CMS exists)

**Problem:** No viral acquisition mechanism. Customer acquisition is entirely paid/organic.

**Solution:**

- "Give $25, Get $25" referral program
- Consume shared ReferralCodes CMS collection
- Shareable referral links with attribution tracking
- Auto-apply discount on referred user's first purchase
- Referral dashboard in account screen

**Acceptance criteria:**

- User can generate and share a unique referral link
- Referred user gets $25 off first order (auto-applied at checkout)
- Referrer gets $25 credit after referred user completes first purchase
- Referral dashboard shows pending/completed referrals
- Referral links work via deep link and web fallback

### 3.2 Push Campaign Engine

**Risk:** MEDIUM
**Owner:** hicks

**Problem:** Push notifications are transactional only (order updates, cart abandonment). No promotional/marketing push capability.

**Solution:**

- Scheduled promotional push notifications
- Segmentation by purchase history, style quiz results, location
- Campaign types: flash sales, new arrivals, seasonal, back-in-stock batch
- Campaign analytics: open rate, conversion rate

**Acceptance criteria:**

- Campaigns can be scheduled for future send time
- Segments filter users by at least: purchase history, style quiz result, geo-location
- Campaign analytics show delivery count, open rate, tap-through rate
- Users who disabled promotional notifications are excluded
- Rate limit: max 3 promotional pushes per user per week

### 3.3 Onboarding Optimization

**Risk:** LOW
**Owner:** burke (a11y) + ripley (UI)

**Problem:** All users see the same onboarding regardless of how they discovered the app. No fast path for high-intent users.

**Solution:**

- Personalized onboarding based on entry point (ad, referral, organic, deep link)
- Skip-to-AR fast path for users coming from AR-focused marketing
- "What brings you here?" segmentation → tailored home screen
- Use Wix feature flags for A/B testing onboarding variants (melania: don't build custom framework)

**Acceptance criteria:**

- At least 3 onboarding variants: default, AR-focused, referred-user
- Entry point detected from deep link parameters or referral attribution
- Skip-to-AR path reaches AR screen in ≤ 2 taps from app open
- Onboarding completion rate tracked per variant via analytics
- Wix feature flags control variant assignment (no custom A/B framework)

**Accessibility (burke):**

- Screen reader narration for each onboarding step
- Focus management: auto-focus first interactive element per screen
- Skip option keyboard/switch-accessible
- 44pt touch targets, reduced motion support

### 3.4 Review & Rating Engine

**Risk:** LOW
**Owner:** ripley + bishop

**Problem:** No automated review collection. Reviews are passive — users must find the review form. No incentives.

**Solution:**

- Post-delivery review prompts (push 7 days after delivery + in-app banner)
- Photo upload incentives (10 loyalty points per photo review)
- Verified purchase badges
- Helpful vote system ("Was this review helpful?")
- Smart prompt timing: avoid prompting during returns/complaints

**Acceptance criteria:**

- Review prompt push sent 7 days after delivery confirmation
- In-app banner appears on home screen for unreviewed delivered orders
- Photo reviews earn 10 loyalty points (requires loyalty program from 2.3)
- Helpful vote count displayed on review cards, sorted by helpfulness
- No review prompt sent if order has open return/complaint

### 3.5 Analytics Dashboard

**Risk:** LOW
**Owner:** hicks

**Problem:** Analytics data flows to Firebase + Mixpanel but there's no internal view for business decisions. Need to log into third-party dashboards.

**Solution:**

- Internal admin view (separate screen or web dashboard)
- Metrics: conversion funnels, AR engagement rates, popular products, cart abandonment, push open rates
- Built on existing analytics infrastructure (Firebase + Mixpanel)
- Actionable insights: "AR users convert 3x more" → surface AR CTA

**Acceptance criteria:**

- Dashboard shows: daily/weekly orders, revenue, conversion rate, AR engagement, top products
- Cart abandonment funnel: cart → checkout → payment → confirmation with drop-off rates
- Push campaign metrics: sent, opened, converted
- Data refreshes within 24hrs (not real-time — batch is acceptable)
- Accessible via authenticated admin screen in app or web URL

### 3.6 Community Gallery

**Risk:** MEDIUM (moderation complexity)
**Owner:** ripley + burke (a11y)
**Note:** Deferred from Phase 2 per ripley — high surface area, needs moderation

**Problem:** No user-generated content beyond reviews. No way for customers to showcase their setups or inspire others.

**Solution:**

- "Share my setup" social cards from AR screenshots
- User gallery with infinite scroll (FlatList + pagination)
- Moderation pipeline (flag/report, admin review)
- Aggressive image caching via expo-image

**Acceptance criteria:**

- Users can submit AR screenshots or room photos with caption
- Gallery displays submissions in reverse-chronological infinite scroll
- Flag/report button on every submission
- Flagged content hidden pending admin review
- Gallery loads ≤ 20 items per page, next page on scroll threshold

**Accessibility (burke):**

- VoiceOver list navigation for feed
- Alt text on all user images
- Share actions have accessible labels

---

## Cross-Cutting Requirements

### Performance Guardrails (hicks)

| Metric                          | Target                | Phase |
| ------------------------------- | --------------------- | ----- |
| API response P95                | < 500ms               | 1+    |
| API response P99                | < 1.5s                | 1+    |
| Wix SDK call timeout            | 10s                   | 1+    |
| Spinner on warm cache           | < 2s                  | 1+    |
| JS heap (mid-tier device)       | < 150MB               | 2+    |
| Cold start increase per feature | < 300ms               | 2+    |
| JS bundle ceiling               | 8MB (currently 6.1MB) | 3+    |
| A/B experiment size             | < 50KB each           | 3+    |

**Infrastructure:**

- Bundle size check added to `qa-sandbox.sh` (hicks owns)
- Perf regression CI gate: fail PR if JS bundle exceeds ceiling
- Memory profiling on CI for Phase 2 features (Detox + Hermes heap snapshots)

### Accessibility Requirements (burke)

All new features must meet:

- WCAG AA contrast minimum (4.5:1) on all text
- 44pt minimum touch targets on all interactive elements
- Screen reader narration (VoiceOver/TalkBack) for all user flows
- Focus management on screen transitions (auto-focus first interactive)
- Reduced motion support (prefers-reduced-motion)
- Alt text on all user-generated images
- accessibilityRole + accessibilityLabel on all interactive elements
- Dynamic type / font scaling support up to 200%
- Error states use role="alert" for screen reader announcement

### Web Coordination (melania)

4 shared CMS backends — mobile consumes, does not duplicate:

| Collection                            | Web Status               | Mobile Phase |
| ------------------------------------- | ------------------------ | ------------ |
| LoyaltyAccounts + LoyaltyTransactions | CF-pa20, miquella active | Phase 2      |
| ReviewRequests                        | CF-k8hw, rennala active  | Phase 2      |
| ReferralCodes                         | Provisioned              | Phase 3      |
| FabricSwatches                        | Provisioned on staging   | Phase 2      |

Shared API: `ups-shipping.web.js` for shipping rates (Phase 1).

---

## Crew Assignments (Proposed)

| Crew Member | Primary Focus                 | Phase 1                             | Phase 2                                      | Phase 3                             |
| ----------- | ----------------------------- | ----------------------------------- | -------------------------------------------- | ----------------------------------- |
| **bishop**  | Architecture, SDK integration | Order saga, auth race conditions    | BNPL SDKs, AR persistence                    | Review engine                       |
| **ripley**  | UI components, high velocity  | Store sync, auth UI                 | Room Planner UI, photo reviews, compare tool | Onboarding UI, community gallery    |
| **burke**   | Accessibility, gestures       | Auth a11y forms                     | Room Planner a11y, loyalty a11y              | Onboarding a11y, community a11y     |
| **hicks**   | Performance, backend services | Wix timeout hardening, push service | Recommendations, perf guardrails             | Push campaigns, analytics dashboard |
| **dallas**  | PM, integration, coordination | Tax/shipping, Wix activation        | Cross-team coordination (melania)            | Referral, ASO coordination          |

---

## Success Metrics

| Phase | Metric                      | Target               | Timeframe                                   |
| ----- | --------------------------- | -------------------- | ------------------------------------------- |
| 1     | Orders processed end-to-end | 10 real orders       | First 2 weeks post-launch                   |
| 1     | Payment success rate        | > 95%                | Steady state (after first week)             |
| 1     | App crash rate              | < 1% sessions        | Ongoing                                     |
| 2     | AR room saves per week      | 50+                  | Steady state (4 weeks after feature launch) |
| 2     | Reviews with photos         | 30% of all reviews   | Steady state (8 weeks after feature launch) |
| 2     | BNPL adoption               | 15% of orders > $500 | Steady state                                |
| 3     | Referral signups            | 100                  | First 30 days after referral program launch |
| 3     | Push notification open rate | > 8%                 | Steady state                                |
| 3     | 30-day retention            | > 25%                | Measured 60 days post-Phase 3 launch        |

---

## Risks & Mitigations

| Risk                                           | Impact                                  | Mitigation                                          |
| ---------------------------------------------- | --------------------------------------- | --------------------------------------------------- |
| Stripe↔Wix order saga failure                  | Business-ending: charges without orders | Saga pattern with auto-refund rollback              |
| No backend engineers for push service          | Push features blocked                   | Evaluate Expo push service or serverless functions  |
| Apple Developer Program not purchased          | iOS limited to simulator                | Deferred to go-live (overseer decision)             |
| AR anchor serialization fragile across updates | Room planner data loss                  | Use model IDs + relative positions, not raw anchors |
| BNPL SDK complexity (2-3 beads each)           | Phase 2 timeline risk                   | Start Affirm first, Klarna in parallel if capacity  |
| Wix production rate limits unknown             | API throttling in production            | Cache-first strategy, monitor, escalate if needed   |

---

## Phase Dependency Ordering

Features within each phase have implicit dependencies. Respect this sequencing:

**Phase 1 (sequential dependencies):**

1. **1.3 Wix Backend Activation** — must be live before anything else can use real data
2. **1.2 Dynamic Tax + Shipping** — requires live Wix for product prices + melania's UPS API
3. **1.1 Order Saga** — requires live Wix + real tax/shipping to test end-to-end
4. **1.4 Auth Completion** — can run in parallel with 1.1-1.2 (independent)
5. **1.5 Push Backend** — spike first (week 1), implement after order saga exists (needs order events)
6. **1.6 Store Sync** — fully independent, can run in parallel from day 1

**Phase 2 (mostly independent):**

- 2.1 Room Planner, 2.2 Recommendations, 2.7 Compare Tool — fully independent, parallelize
- 2.3 Loyalty — blocked on melania's web team completing LoyaltyAccounts CMS (CF-pa20)
- 2.4 Photo Reviews — blocked on melania's ReviewRequests CMS (CF-k8hw)
- 2.5 BNPL — independent but high effort; start Affirm week 4, Klarna week 6
- 2.6 Fabric Samples — blocked on melania's FabricSwatches CMS

**Phase 3:** All features independent. Prioritize by expected impact.

---

## Testing Strategy

Per CLAUDE.md: TDD mandatory, edge cases required, happy-path-only PRs rejected.

**Phase 1 — Integration-heavy, highest test rigor:**

- Order saga: integration tests with Stripe test mode + Wix sandbox. Test: happy path, Wix failure → refund, Stripe failure, timeout, idempotent replay, offline queue replay
- Tax/shipping: unit tests for calculation logic, integration tests against Stripe Tax test mode and UPS API sandbox
- Auth: unit tests for token refresh mutex, integration tests for password reset flow, E2E for login → reset → login cycle
- Push: unit tests for trigger logic, mock Expo Push API for send verification

**Phase 2 — Component + feature tests:**

- Room Planner: unit tests for serialization/deserialization, schema migration. Manual AR testing on device (Detox cannot automate AR). Deep link tests for room sharing
- BNPL: integration tests with Affirm/Klarna test modes. Test: approval, decline → fallback, timeout, partial payment
- Photo Reviews: component tests for image upload, carousel. Integration test for review submission

**Phase 3 — Analytics + behavioral tests:**

- Referral: E2E test for referral link generation → redemption
- Push campaigns: unit tests for segmentation logic, rate limiting
- Community gallery: component tests for infinite scroll, moderation flag flow

**Cross-cutting:**

- Perf regression CI gate (hicks): bundle size check on every PR
- Memory profiling for Phase 2 features via Detox + Hermes heap snapshots
- All new screens get ScreenErrorBoundary wrapping

---

## App Store Submission Requirements

Phase 1 targets real customers, which requires store submission:

**Google Play Store (Android — no blocker):**

- Privacy policy URL required (create or link to web privacy policy)
- Data safety form: declare collected data types (email, payment, location, analytics)
- Content rating questionnaire
- Target audience and content declarations
- APK signing with upload key (already configured in EAS)

**Apple App Store (iOS — BLOCKED on Apple Developer Program):**

- $99/yr Apple Developer Program enrollment (overseer deferred to go-live)
- App Review guidelines compliance: payment disclosure, privacy labels
- Once enrolled: TestFlight beta → App Review → public release
- Privacy nutrition labels: declare all data categories

**Action:** Android can submit to Play Store in Phase 1. iOS submission deferred until Apple Developer Program purchased.

---

## Out of Scope (Deferred to v3+)

- **A/B Testing Framework** — Use Wix feature flags for now (melania)
- **App Store Optimization** — Marketing ops, not dev (melania)
- **ML-based personalization** — DB-driven recs sufficient for v2 (bishop)
- **Multi-user AR sessions** — Single-device only for v2
- **Custom AR filters/shaders** — Not prioritized
- **Real-time inventory webhooks** — Polling acceptable for launch
