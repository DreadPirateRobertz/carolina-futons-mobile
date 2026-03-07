# Feature Roadmap — Post-Beta Launch

> **Status:** Proposed. Ready for mayor convoy formation.
> **Date:** 2026-03-07
> **Context:** Sprint 2 (Beta Launch) nearing completion. 23 screens, 2699 tests, zero TS errors. AR, payments, push, offline, analytics all wired. Ready queue nearly empty.

---

## Current State

All core e-commerce flows are built: browse -> product detail -> AR preview -> cart -> checkout -> order confirmation. Supporting flows: auth, wishlist, push notifications, store locator, premium membership, collections, offline sync.

**What's missing for production launch:** User-facing polish, discoverability features, and conversion optimization.

---

## Convoy 1: "Discovery & Conversion" (6-8 beads)

**Theme:** Help users find products faster and convert at higher rates.

| Bead Title | Priority | Scope |
|-----------|----------|-------|
| Product search with autocomplete | P1 | Search bar + Wix search API + recent searches + suggested terms |
| Product filtering & sorting | P1 | Price range, size, fabric, color filters on shop/category screens |
| Recently viewed products | P2 | Persist last 10 viewed products, show on home + shop screens |
| Financing calculator (Affirm/Afterpay) | P2 | Monthly payment breakdown on product detail, checkout integration |
| Social proof: ratings & reviews | P2 | Star rating display on product cards + review list on detail screen |
| Smart recommendations | P2 | "Customers also bought" carousel on product detail + cart |

**Why now:** Without search and filtering, users can only browse by category. This is the #1 gap vs the web experience.

---

## Convoy 2: "Trust & Engagement" (5-6 beads)

**Theme:** Build customer confidence and repeat engagement.

| Bead Title | Priority | Scope |
|-----------|----------|-------|
| Delivery date estimation | P1 | Estimated delivery on product detail + checkout based on zip code |
| Order tracking with push updates | P1 | Real-time status timeline on order detail, push on status change |
| Fabric sample request | P2 | Request physical fabric swatches from product detail screen |
| Share product / AR screenshot | P2 | Native share sheet for product links and AR room screenshots |
| Save AR room layouts | P2 | Persist multi-product AR arrangements, reload later or share |

**Why now:** Furniture is a high-consideration purchase. Delivery timeline and physical samples reduce purchase anxiety.

---

## Convoy 3: "Accessibility & Performance" (4-5 beads)

**Theme:** Production-grade quality for app store review.

| Bead Title | Priority | Scope |
|-----------|----------|-------|
| Accessibility audit + fixes | P1 | Screen reader labels, focus order, contrast ratios, reduced motion |
| Image optimization pass | P1 | Progressive loading, blurhash placeholders, WebP where supported |
| List virtualization audit | P2 | FlatList optimization on product grids, prevent re-renders |
| App Store listing assets | P2 | Screenshots (6.7"/6.5"/5.5"), store description, privacy policy |
| Error recovery UX | P2 | Retry patterns for failed loads, graceful degradation across all screens |

**Why now:** App Store review will reject without accessibility basics. Performance issues at scale will tank ratings.

---

## Convoy 4: "Loyalty & Growth" (4-5 beads)

**Theme:** Post-launch retention and growth features.

| Bead Title | Priority | Scope |
|-----------|----------|-------|
| Referral program | P2 | Share referral code, track referrals, discount rewards |
| Push notification campaigns | P2 | Back-in-stock alerts, price drop notifications, cart abandonment |
| In-app customer support | P3 | Live chat or support ticket submission |
| Style quiz improvements | P3 | Personalized recommendations based on onboarding quiz answers |

**Why now:** These are post-launch growth levers. Lower priority than core experience but high ROI for retention.

---

## Recommended Execution Order

1. **Convoy 1** first — search and filtering are table-stakes for e-commerce
2. **Convoy 3** in parallel — accessibility is a launch blocker
3. **Convoy 2** next — trust builders for conversion
4. **Convoy 4** post-launch — growth features

## Immediate Actions

1. Fix the 2 ready bugs (cm-dpb, cm-701) — Dallas can handle these now
2. Wait for polecat wisps to complete (cart offline sync, Google Sign-In, etc.)
3. Request mayor form Convoy 1 + Convoy 3 as the next wave
