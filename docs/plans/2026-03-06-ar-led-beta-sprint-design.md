# AR-Led, Stability-Guaranteed Beta Sprint — Design

> **Approved by overseer 2026-03-06.** Two-phase plan: beta sprint + feature expansion.

## Guiding Principle

**Stability is the floor, AR excellence is the ceiling.**

Every feature ships with tests, error handling, and offline graceful degradation.
No flashy features on a shaky foundation. Build for production quality, release as beta.

---

## Phase 1: Beta Sprint (2 Weeks)

### Week 1: Production Infrastructure + Stability

The floor. Nothing else ships until this is solid.

#### 1A. Crash Reporting — Sentry Integration
**Why:** Can't diagnose production issues without it. Must be live before AR expansion.
- Wire `SentryCrashReportingProvider` into `crashReportingInit.ts`
- Add Sentry DSN to `.env` / `.env.example`
- Call `initCrashReporting()` in App.tsx on mount
- Verify breadcrumbs flow through ErrorBoundary and ScreenErrorBoundary
- Test: force a JS error, confirm it appears in Sentry dashboard

**Files:**
- Modify: `src/services/crashReportingInit.ts`
- Modify: `src/services/providers/sentryCrashReporting.ts`
- Modify: `App.tsx`
- Modify: `.env.example`

#### 1B. Analytics — Firebase + Mixpanel Registration
**Why:** 48 event types are instrumented but logging to console. Wire to real providers.
- Call `initAnalytics()` in App.tsx with config from env
- Add `EXPO_PUBLIC_MIXPANEL_TOKEN` to `.env.example`
- Verify screen_view, add_to_cart, ar_view_in_room_tap events reach providers
- Test: mock providers in test, verify event dispatch

**Files:**
- Modify: `App.tsx`
- Modify: `.env.example`
- Create: `src/services/__tests__/analyticsInit.test.ts`

#### 1C. Stripe Payment Integration
**Why:** Checkout screen exists but payment is framework-only. Need real PaymentIntent flow.
- Payment service (`src/services/payment.ts`) already has types and `calculateTotals()`
- Wire `usePayment` hook to call backend API for PaymentIntent creation
- Integrate `@stripe/stripe-react-native` StripeProvider in App.tsx (already a dependency)
- Handle payment confirmation, failure, and cancellation paths
- BNPL (Buy Now Pay Later): Affirm/Klarna support via Stripe payment method types
- Test: payment failure paths, cart total calculations, network errors

**Files:**
- Modify: `src/services/payment.ts` (add real API calls)
- Modify: `src/hooks/usePayment.ts` (wire to Stripe SDK)
- Modify: `src/screens/CheckoutScreen.tsx` (Stripe payment sheet)
- Modify: `App.tsx` (StripeProvider wrapper)
- Create: `src/services/__tests__/payment.integration.test.ts`

#### 1D. Push Notification Backend Wiring
**Why:** Client framework complete, but tokens never reach the backend.
- Add token registration endpoint call in `useNotifications` on permission grant
- Wire Wix webhook or custom backend for order status → push notification
- Test: mock token registration, verify retry on failure

**Files:**
- Modify: `src/hooks/useNotifications.tsx`
- Modify: `src/services/notifications.ts` (add registerToken)
- Create: `src/services/__tests__/notificationRegistration.test.ts`

#### 1E. Offline Resilience Hardening
**Why:** offlineQueue.ts exists but needs stress testing and real API endpoint wiring.
- Wire `offlineQueue.replay()` to actual Wix/backend endpoints
- Add exponential backoff on replay failures
- Test: queue mutations offline → reconnect → verify sync
- Ensure cart/wishlist survive app kill + cold restart

**Files:**
- Modify: `src/services/offlineQueue.ts`
- Modify: `src/hooks/useOfflineSync.tsx`
- Create: `src/services/__tests__/offlineQueueReplay.test.ts`

---

### Week 2: AR Feature Expansion

The ceiling. Build on the stable floor.

#### 2A. Real 3D Model Assets
**Why:** Current catalog has PoC models. Need production-quality models for all products.
- Commission/source GLB + USDZ models for full product catalog
- Upload to CDN (`cdn.carolinafutons.com/models/`)
- Update `shared/catalog-3d.json` → run `npm run catalog:sync`
- Verify model dimensions match real-world measurements
- Test: model loader downloads, caches, and serves each model

**Files:**
- Modify: `shared/catalog-3d.json`
- Auto-generated: `src/data/models3d.ts` (via sync script)
- Test: `src/services/__tests__/modelLoader.test.ts` (expand coverage)

#### 2B. AR Room Measurement Tool
**Why:** Customers want to know if a futon fits before buying. Measure wall-to-wall distance.
- Add measurement mode toggle to ARControls
- Use surface detection hit tests to place two endpoints
- Calculate and display distance between endpoints in feet/inches
- Show "Fits!" / "Too large" indicator when comparing to selected model dimensions
- Haptic feedback on endpoint placement

**Files:**
- Create: `src/components/ARMeasurementOverlay.tsx`
- Create: `src/hooks/useARMeasurement.ts`
- Modify: `src/components/ARControls.tsx` (add measurement toggle)
- Modify: `src/screens/ARScreen.tsx` (integrate measurement mode)
- Create: `src/components/__tests__/ARMeasurementOverlay.test.tsx`
- Create: `src/hooks/__tests__/useARMeasurement.test.ts`

#### 2C. AR Fabric Preview Enhancement
**Why:** Fabric swatches are color circles. Show actual texture on the 3D model.
- Support `hasFabricVariants` flag from model catalog
- When true, swap model texture URL based on selected fabric
- Show fabric texture thumbnail (not just color swatch) in AR controls
- Preload next-likely fabric texture while user browses

**Files:**
- Modify: `src/components/ARFutonOverlay.tsx` (texture application)
- Modify: `src/components/ARControls.tsx` (texture thumbnails)
- Modify: `src/data/models3d.ts` types (add texture URLs)
- Create: `src/services/fabricTextureLoader.ts`
- Create: `src/services/__tests__/fabricTextureLoader.test.ts`

#### 2D. AR Multi-Product Staging
**Why:** Customers furnishing a room want to see multiple pieces together (futon + frame + pillows).
- Allow placing multiple models simultaneously
- Each model independently draggable/scalable/rotatable
- "Add another piece" button in AR controls
- Maximum 3 products in scene (performance constraint)
- Total price displayed for all staged items

**Files:**
- Create: `src/hooks/useARScene.ts` (multi-model state management)
- Modify: `src/screens/ARScreen.tsx` (multi-model rendering)
- Modify: `src/components/ARControls.tsx` (multi-model UI)
- Create: `src/hooks/__tests__/useARScene.test.ts`

#### 2E. AR Comparison Mode
**Why:** "Should I get the queen or the full?" — show two sizes side by side.
- Split-screen or ghost overlay showing two models at same scale
- Toggle between models A/B with swipe gesture
- Display dimension comparison (width/depth/height)
- Share comparison screenshot

**Files:**
- Create: `src/components/ARComparisonOverlay.tsx`
- Modify: `src/screens/ARScreen.tsx` (comparison mode toggle)
- Modify: `src/components/ARControls.tsx` (comparison UI)
- Create: `src/components/__tests__/ARComparisonOverlay.test.tsx`

#### 2F. EAS Build + TestFlight/Play Store Internal Track
**Why:** End of sprint deliverable — a real installable beta.
- Configure `eas.json` with preview + production profiles
- Build iOS (TestFlight) + Android (Play Console internal track)
- Verify deep linking works on real devices
- Smoke test all screens on physical hardware

**Files:**
- Create/Modify: `eas.json`
- Verify: `app.json` (bundle IDs, versioning)

---

## Phase 2: Feature Expansion (Post-Beta)

Build on the proven beta foundation. Each feature follows the same discipline:
tests + error handling + offline graceful degradation from day one.

### 2.1 Loyalty & Rewards Program
- Points earned per purchase (1 point per dollar)
- Tier system: Bronze → Silver → Gold (based on lifetime spend)
- Rewards: free shipping, percentage discounts, early access to new collections
- Points balance visible on Account screen
- Integration with Wix loyalty API or custom backend

### 2.2 Social Features
- Share wishlist as a curated link (gift registry use case)
- "Room Inspiration" feed — user-submitted AR screenshots
- Follow friends' wishlists for gift ideas
- Social login (Apple, Google, Facebook)

### 2.3 AI-Powered Room Style Recommendations
- Upload a photo of your room → AI suggests matching futon styles/fabrics
- "Complete the Look" — recommend complementary products based on cart
- Personalized home screen based on browsing history + style quiz answers
- Uses existing style quiz data from onboarding

### 2.4 Advanced AR Features
- AR room scanning + persistent world map (revisit placements)
- Light probe rendering (realistic reflections based on room lighting)
- Video recording of AR scene (not just screenshots)
- AR annotations (add notes/labels to placed furniture)
- AR ruler tool (continuous measurement, not just point-to-point)

### 2.5 Customer Reviews with Photos
- Photo upload with reviews (show futon in customer's actual room)
- "Verified Purchase" badge
- Review helpfulness voting (already exists) + sorting
- Review response from Carolina Futons team

### 2.6 Live Chat Support
- In-app chat widget (Intercom, Zendesk, or custom)
- AR screenshot sharing within chat (show support what you're looking at)
- Order-linked conversations (support sees order context)
- Chatbot for FAQs, human escalation for complex issues

### 2.7 Accessibility Pass
- Full VoiceOver/TalkBack audit across all screens
- Color contrast verification (WCAG AA minimum)
- Reduced motion support (respect OS setting)
- Screen reader descriptions for AR features
- Keyboard navigation for web platform

---

## Crew Assignment Strategy

| Work | Owner | Notes |
|------|-------|-------|
| Wix API integration (cm-uyy) | Bishop | Already in progress |
| Wishlist/cart sync (cm-cea) | Ripley | Assigned |
| Crash reporting + analytics (1A, 1B) | Dallas | Quick wins, unblocks everything |
| Stripe integration (1C) | Ripley (after cm-cea) | Payment expertise |
| Push notifications (1D) | Bishop (after cm-uyy) | Backend integration |
| AR measurement tool (2B) | Dallas | Core AR investment |
| AR fabric preview (2C) | Bishop | Ties into Wix product data |
| AR multi-product (2D) | Dallas | Complex state management |
| AR comparison (2E) | Ripley | UI-focused |
| EAS build (2F) | Dallas | Coordination role |
| Illustrations (cm-djl) | Blocked | Waiting on Figma assets from Melania/Rennala |

---

## Success Criteria

### Beta (end of Phase 1)
- [ ] App installs and runs on physical iOS + Android devices
- [ ] Full checkout flow works with Stripe test mode
- [ ] AR places at least 5 real product models with correct dimensions
- [ ] AR measurement tool accurately measures room distances
- [ ] Crash reporting captures errors in Sentry
- [ ] Analytics events reach Firebase/Mixpanel
- [ ] Push notifications deliver on both platforms
- [ ] Offline mode: app remains functional, syncs on reconnect
- [ ] All 2300+ tests pass
- [ ] Zero TypeScript errors in strict mode

### Production (end of Phase 2)
- [ ] Full product catalog with AR models
- [ ] Loyalty program active
- [ ] Social sharing + room inspiration feed
- [ ] AI style recommendations
- [ ] Photo reviews
- [ ] Live chat support
- [ ] WCAG AA accessibility compliance
- [ ] App Store + Play Store public listing
