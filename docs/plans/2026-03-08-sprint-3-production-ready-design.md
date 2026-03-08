# Sprint 3: "Production Ready" — Design

> **Status:** Approved by human 2026-03-08.
> **Prerequisite:** Clean Slate convoy (cm-9pj, cm-can, cm-7i6, cm-ahz) must complete first.
> **Context:** Sprint 2 shipped 23 screens, 50+ components, 3017 tests. Core e-commerce flows complete. App runs on mock data. CI blocked by 84 pre-existing type errors (convoy in progress).

---

## Guiding Principle

**Ship what's unblocked. Queue what's blocked.**

Tracks B+C (store submission + conversion) start immediately — zero external dependencies. Track A (real data) slots in when the Wix token unblocks. Track D (resilience) runs concurrent with everything.

---

## Track A: "Real Data Pipeline" (P1, 3 beads)

The app runs on mock data. This track wires everything to live backends.

**Status: BLOCKED** on Wix API token. Start as soon as melania confirms token availability.

| Bead | Description | Dependency | Crew |
|------|-------------|------------|------|
| Wire useProducts to Wix MCP catalog | Replace mock products with `velo_catalog_import`. Update `useProducts` to call MCP tool, map response to `Product` type, handle pagination. | Melania's MCP tool (merged), Wix token (blocked) | bishop |
| Stripe payment end-to-end | Real PaymentIntent flow via backend API. Wire `usePayment` to Stripe SDK. Apple Pay + Google Pay confirmation paths. Handle failure, cancellation, 3DS. | Backend API endpoint for PaymentIntent | hicks |
| Order sync with Wix eCommerce | Real order creation via Wix Orders API. Status tracking with push notification on status change. Wire `useOrders` to live data. | Wix Orders API access | ripley |

### Key decisions
- **Product type mapping**: `velo_catalog_import` returns Wix schema. We transform in `wixClient.ts` (existing `transformWixProduct`). Size inference via regex stays as fallback until Wix has structured size fields.
- **Payment**: Stripe is already a dependency. Backend creates PaymentIntent, frontend confirms via `@stripe/stripe-react-native`. No BNPL in Sprint 3 — add as Sprint 4 bead.
- **Orders**: Wix eCommerce API for creation. Polling for status updates (webhook requires server). Push notification on status change via Expo push.

---

## Track B: "Store Submission" (P1, 4 beads)

Everything Apple and Google require to approve the app.

**Status: UNBLOCKED** — start immediately after Clean Slate.

| Bead | Description | Crew | Effort |
|------|-------------|------|--------|
| Image optimization pass | Blurhash placeholders for product images (generate hashes server-side, store in product data). Progressive loading with `expo-image`. WebP format where supported. Lazy loading for off-screen images in grids. | ripley | 1 session |
| App Store listing assets | Screenshots for 6.7" (iPhone 15 Pro Max), 6.5" (iPhone 11 Pro Max), 5.5" (iPhone 8 Plus). Android: phone + 7" + 10" tablet. Store description, keywords, privacy policy URL, app category selection. | dallas | 1 session |
| List virtualization audit | Audit all FlatList/ScrollView usage. Add `getItemLayout` for fixed-height rows. Implement `windowSize` + `maxToRenderPerBatch` tuning. Prevent unnecessary re-renders with `React.memo` + stable callbacks. Measure before/after FPS. | bishop | 1 session |
| Accessibility completion | Audit remaining screens against WCAG 2.1 AA. Fix contrast ratios (minimum 4.5:1 for text). Add `accessibilityHint` where labels aren't sufficient. Implement `reduceMotionEnabled` checks for all animations. Test with VoiceOver (iOS) and TalkBack (Android). | burke | 1 session |

### Key decisions
- **Blurhash**: Generate hashes as part of product data pipeline (Track A dependency for real products). For mock data, pre-compute and store in `products.ts`.
- **Screenshots**: Use Expo's `expo-screen-capture` or manual simulator screenshots. No automated screenshot pipeline in Sprint 3.
- **Virtualization**: Focus on ShopScreen and CategoryScreen product grids first — these are the highest-traffic lists.
- **Accessibility**: VoiceOver audit (cm-cv3) already done. This bead covers remaining gaps: contrast, reduced motion, TalkBack, and any screens missed.

---

## Track C: "Conversion Polish" (P2, 4 beads)

Features that drive purchase confidence and conversion rate.

**Status: UNBLOCKED** — start after Clean Slate, parallel with Track B.

| Bead | Description | Crew | Effort |
|------|-------------|------|--------|
| Delivery date estimation | Estimate delivery window on ProductDetailScreen and CheckoutScreen based on zip code. Zip-to-zone mapping (static table, 5 zones). Display as "Estimated delivery: Mar 15-18". Free shipping threshold indicator. | hicks | 1 session |
| Financing calculator | Monthly payment breakdown on ProductDetailScreen for products > $299. Affirm/Afterpay rates (static calculation, no API integration in Sprint 3). "As low as $X/mo" badge on ProductCard. | bishop | 1 session |
| Fabric sample request | "Request Free Swatches" button on ProductDetailScreen when product has `fabricOptions`. Simple form: name, address, selected fabrics. Submit via email API or Wix form. Confirmation screen. | ripley | 1 session |
| Cart abandonment push | Track cart state in AsyncStorage with timestamp. Schedule local notification 24h after last cart modification if cart is non-empty. Respect notification preferences. Deep link to CartScreen. | burke | 1 session |

### Key decisions
- **Delivery estimation**: Static zone table, not real carrier API. Good enough for beta. Zones: East Coast (3-5 days), Midwest (5-7), Mountain (7-9), West Coast (7-10), Hawaii/Alaska (10-14).
- **Financing**: Static calculation only (no Affirm/Afterpay SDK). Formula: `price / months` with APR markup. Shows "subject to approval" disclaimer.
- **Fabric samples**: Email-based for beta. Future: Wix form submission API.
- **Cart abandonment**: Local notifications only (not server-push). Expo Notifications scheduling API. 24h delay, max 1 per week.

---

## Track D: "Resilience" (P2, 2 beads)

Production hardening that prevents 1-star reviews.

**Status: UNBLOCKED** — runs concurrent with B+C.

| Bead | Description | Crew | Effort |
|------|-------------|------|--------|
| Retry patterns across all screens | Unified `RetryableView` component wrapping any async content. Exponential backoff (1s, 2s, 4s, max 3 retries). Visual: inline retry button, not full-screen error. Apply to: ProductDetail, OrderDetail, ShopScreen, CategoryScreen, CollectionsScreen. | hicks | 1 session |
| Performance monitoring + alerts | Track cold start time via `performance.mark`/`measure`. Screen transition FPS via `useScrollPerformance` (already exists). API latency tracking in `wixClient`. Log to analytics. Set up Sentry performance monitoring. | dallas | 1 session |

### Key decisions
- **RetryableView**: Wraps children with error boundary + retry logic. Uses `NetworkErrorState` component (already exists) for offline, custom inline retry for transient errors.
- **Performance**: No new dependencies. Use existing analytics pipeline + Sentry's performance SDK (already integrated). Dashboard via Sentry, not custom.

---

## Execution Plan

### Phase 0: Clean Slate (in progress)
- 4 convoy beads clearing 84 type errors + ESLint + test failures
- **Gate:** CI green on main (0 TS errors, 0 ESLint errors, 0 test failures)
- Estimated: 1 session

### Phase 1: Store Submission + Conversion (Tracks B + C)
- 8 beads, fully parallelizable across 4 crew + dallas
- **Crew dispatch:**
  - bishop: List virtualization (B) → Financing calculator (C)
  - ripley: Image optimization (B) → Fabric sample request (C)
  - burke: Accessibility completion (B) → Cart abandonment push (C)
  - hicks: Delivery estimation (C) → Retry patterns (D)
  - dallas: App Store assets (B) → Performance monitoring (D)
- Estimated: 2-3 sessions

### Phase 2: Real Data Pipeline (Track A, when unblocked)
- 3 beads, partially parallelizable (product sync must land before orders)
- bishop: Wix product sync → ripley: Order sync → hicks: Stripe payment
- **Gate:** Wix token available from melania
- Estimated: 2 sessions

### Phase 3: Final QA + Submission
- Full QA sandbox: all platforms (iOS, Android, Web)
- EAS build: dev + preview + production profiles
- App Store Connect + Google Play Console submission
- TestFlight / Internal Testing track distribution
- Estimated: 1 session

---

## Quality Gates (Sprint Complete criteria)

1. Zero TypeScript errors
2. ESLint clean (`npm run lint` passes)
3. 3000+ tests passing with 0 failures
4. Web export succeeds (`npx expo export --platform web`)
5. EAS build succeeds (dev + preview profiles, both platforms)
6. VoiceOver (iOS) + TalkBack (Android) pass on all 23 screens
7. All screens render correctly on iOS 16+, Android 12+, and web
8. No hardcoded colors outside design tokens (`grep -r '#[0-9a-fA-F]{6}' src/` returns only token definitions)
9. Cold start < 3 seconds on mid-range device
10. Product grid scroll maintains 60fps (measured via useScrollPerformance)

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Wix token stays blocked | Medium | High — Track A can't start | Tracks B+C are independent. Track A can be Sprint 4 if needed. |
| EAS build fails on production profile | Low | High — can't submit to stores | Test with preview profile early. Address signing issues incrementally. |
| Accessibility audit reveals major gaps | Medium | Medium — delays submission | VoiceOver audit (cm-cv3) already done. This is incremental fixes. |
| Stripe test mode → production mode issues | Medium | Medium — payment failures | Stay in test mode for beta. Production switch is a separate bead. |
| Image optimization breaks existing layout | Low | Low — visual regression | Test on all 3 platforms before merging. Blurhash fallbacks are additive. |

---

## Dependencies

### Cross-rig (cfutons → cfutons_mobile)
- `velo_catalog_import` MCP tool (merged, needs Wix token)
- Product type schema alignment (shared types between web + mobile)

### External
- Wix API token (melania tracking)
- Apple Developer account (for App Store submission)
- Google Play Console account (for Play Store submission)
- Stripe account in test mode (for payment flow)

---

## Sprint 3 Bead Summary

| # | Bead | Track | Priority | Crew | Blocked? |
|---|------|-------|----------|------|----------|
| 1 | Image optimization pass | B | P1 | ripley | No |
| 2 | App Store listing assets | B | P1 | dallas | No |
| 3 | List virtualization audit | B | P1 | bishop | No |
| 4 | Accessibility completion | B | P1 | burke | No |
| 5 | Delivery date estimation | C | P2 | hicks | No |
| 6 | Financing calculator | C | P2 | bishop | No |
| 7 | Fabric sample request | C | P2 | ripley | No |
| 8 | Cart abandonment push | C | P2 | burke | No |
| 9 | Retry patterns | D | P2 | hicks | No |
| 10 | Performance monitoring | D | P2 | dallas | No |
| 11 | Wire useProducts to Wix MCP | A | P1 | bishop | YES (Wix token) |
| 12 | Stripe payment end-to-end | A | P1 | hicks | No |
| 13 | Order sync with Wix eCommerce | A | P1 | ripley | YES (Wix token) |

**Total: 13 beads, 10 unblocked, 3 blocked on Wix token.**
