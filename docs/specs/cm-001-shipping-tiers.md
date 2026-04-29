# TDD Spec: cm-001 — Weight-Based Shipping Tiers

**Bead**: cm-001  
**Author**: bishop  
**Date**: 2026-04-28  
**Status**: AUDIT IN PROGRESS — hicks has implemented; spec reflects actual design + gap analysis  
**Implementor**: hicks  

---

## Purpose

Audit map of existing tests + TDD spec for cm-001 (weight tiers).
Hicks has already started implementation — this doc:
1. Maps regression tests (must not break)
2. Documents the actual design decisions hicks made
3. Calls out gaps and open questions

---

## 1. Regression Guard — Existing Tests Must Not Break

All 7 original cases in `src/services/__tests__/shippingService.test.ts`. Hicks has already
updated these to use `itemWeightLbs: 10` and `NON_NC_ZIP = '30301'` (Georgia) for isolation.

| # | Description | Input | Expected |
|---|-------------|-------|----------|
| R1 | Free shipping at threshold | subtotal=499, zip=30301, premium=false, weight=10 | cost=0, applied=true, reason='threshold' |
| R2 | Premium always free | subtotal=100, zip=30301, premium=true, weight=10 | cost=0, applied=true, reason='premium' |
| R3 | Flat rate below threshold | subtotal=200, zip=30301, premium=false, weight=10 | cost=49.99, applied=false, fallback=true |
| R4 | Estimated days returned | subtotal=200, zip=30301, premium=false, weight=10 | estimatedDays > 0 |
| R5 | Just below threshold | subtotal=498.99, premium=false, weight=10 | cost=49.99 |
| R5b | Exactly at threshold | subtotal=499, premium=false, weight=10 | cost=0 |
| R6 | Premium + above threshold → reason='premium' | subtotal=1000, premium=true, weight=10 | reason='premium' |
| R7 | Zero subtotal, non-premium | subtotal=0, premium=false, weight=10 | cost=49.99, applied=false |

> **Note**: `isPremium: true` tests now also have `deliveryTier` in their result.
> White-glove + free shipping: both can coexist (see WP1–WP2 below).

---

## 2. Interface Changes (as implemented by hicks)

### 2.1 ShippingInput — new field

```ts
export interface ShippingInput {
  subtotal: number;
  shippingZip: string;
  isPremium: boolean;
  itemWeightLbs: number;   // NEW — required (not optional)
}
```

> `itemWeightLbs` is **required**. All callers must pass it.

### 2.2 ShippingResult — new field

```ts
export interface ShippingResult {
  shippingCost: number;
  freeShippingApplied: boolean;
  freeShippingReason?: 'threshold' | 'premium';
  fallback: boolean;
  estimatedDays: number;
  deliveryTier: 'parcel' | 'ltl' | 'freight' | 'white_glove';  // NEW — always present
}
```

---

## 3. Weight Tier Logic (as implemented)

### 3.1 Tier Definitions

| Tier | Condition | Label |
|------|-----------|-------|
| `parcel` | itemWeightLbs < 70 | Light parcel |
| `ltl` | 70 ≤ itemWeightLbs ≤ 500 | Less-than-truckload |
| `freight` | itemWeightLbs > 500 | Freight / oversize |
| `white_glove` | NC zip (overrides all above) | White-glove local delivery |

**500 lbs is `ltl`, not `freight`.** Only `>500` triggers freight.

### 3.2 Weight Boundary Test Cases

All at subtotal=200, non-premium, `NON_NC_ZIP='30301'`.

| # | Weight | Expected Tier | Status |
|---|--------|--------------|--------|
| W1 | 69.9 lbs | parcel | ✓ tested in both test files |
| W2 | 70.0 lbs | ltl (boundary inclusive) | ✓ tested |
| W3 | 70.1 lbs | ltl | ✓ tested in main test file |
| W4 | 499.9 lbs | ltl | ⚠️ NOT explicitly tested — add this |
| W5 | 500.0 lbs | ltl (inclusive — NOT freight) | ✓ tested |
| W6 | 500.1 lbs | freight | ✓ tested |
| W7 | 0 lbs | parcel | ✓ tested |
| W8 | negative weight | **UNTESTED** — see §6 gaps | ❌ gap |

### 3.3 Free-Shipping Precedence with Weight

Free shipping short-circuits before weight calculation, but `deliveryTier` is still set.

| # | Setup | Expected |
|---|-------|----------|
| WP1 | weight=80 lbs (ltl), isPremium=true, zip=30301 | cost=0, reason='premium', deliveryTier='ltl' |
| WP2 | weight=30 lbs (parcel), subtotal=500, zip=30301 | cost=0, reason='threshold', deliveryTier='parcel' |

Both ✓ tested in `shippingService.weightTiers.test.ts`.

---

## 4. NC Zip Code Logic (as implemented)

NC classification: `zip.startsWith('27') || zip.startsWith('28')`

`white_glove` **overrides** the weight tier — NC zips always get `white_glove` regardless of weight.

### 4.1 NC Classification Test Cases

| # | Zip | Expected Tier | Status |
|---|-----|--------------|--------|
| Z1 | '27601' (Raleigh) | white_glove | ✓ tested |
| Z2 | '28202' (Charlotte) | white_glove | ✓ tested |
| Z3 | '30301' (Atlanta) | NOT white_glove | ✓ tested |
| Z4 | '29201' (SC) | NOT white_glove | ✓ tested |
| Z5 | '27000' | white_glove | ❌ not tested — add |
| Z6 | '27999' | white_glove | ❌ not tested — add |
| Z7 | '28000' | white_glove | ❌ not tested — add |
| Z8 | '28999' | white_glove | ❌ not tested — add |
| Z9 | '26999' | NOT white_glove | ❌ not tested — add |
| Z10 | '29000' | NOT white_glove | ❌ not tested — add |

> Z5–Z10 test the exact range boundaries ('27'/'28' prefix). Add these before shipping.

### 4.2 NC edge cases (untested — must add)

| # | Input | Expected |
|---|-------|----------|
| ZE1 | zip='' (empty string) | must not throw; fallback to non-NC |
| ZE2 | zip='ABCDE' (non-numeric) | must not throw; fallback to non-NC |
| ZE3 | zip=undefined/null (runtime) | must not throw |
| ZE4 | zip='270' (too short) | should this be NC? Currently YES via startsWith — **confirm intent** |

---

## 5. API / Fallback Architecture

**Design decision by hicks**: No call to `/api/delivery-zone` — tier logic is local.
Comment in implementation: "CFW has /api/delivery-zone (cf-eihx) but mobile mirrors the tier logic locally — no live call needed."

This means:
- `fallback: true` is always set when cost is `49.99` (below threshold, non-premium)
- `fallback: false` on free-shipping paths
- No API failure modes to test (no API call)

> **Open question for dallas/blaidd**: Is local-only final, or will a future ticket add the live API call?
> If live API is planned, the failure cases below become mandatory:

### 5.1 API Failure Cases (IF live API is added — pending)

| # | Failure Mode | Expected Behavior |
|---|-------------|-------------------|
| A1 | HTTP 500 from `/api/delivery-zone` | fallback=true, cost=49.99, no throw |
| A2 | Network timeout | fallback=true, cost=49.99, no throw |
| A3 | Malformed JSON | fallback=true, cost=49.99, no throw |
| A4 | Response missing required fields | fallback=true, cost=49.99, no throw |
| A5 | API returns rate=0 (legit $0) | cost=0, fallback=false — distinct from free-shipping |

---

## 6. Open Gaps (hicks must address before PR)

| Priority | Gap | Detail |
|----------|-----|--------|
| HIGH | `W4: 499.9 lbs` not tested | Must add explicit test at 499.9 to confirm ltl, not freight |
| HIGH | Negative weight | `resolveDeliveryTier` with `itemWeightLbs=-1` returns 'parcel' silently. Should validate or document intent. |
| MEDIUM | NC range boundaries | Z5–Z10: test exactly `27000`, `27999`, `28000`, `28999`, `26999`, `29000` |
| MEDIUM | Invalid zip strings | ZE1–ZE4: empty, non-numeric, too-short zips |
| LOW | `NaN` weight | `itemWeightLbs: NaN` — `NaN < 70` is `false`, so returns `ltl`. Intended? |
| LOW | live API architecture | Confirm local-only is the final design for mobile |

---

## 7. Summary Checklist for hicks (before PR)

- [ ] R1–R7 regression tests all pass
- [ ] W1–W8 weight boundary tests (add W4=499.9, W8=negative)
- [ ] WP1–WP2 precedence tests pass
- [ ] Z5–Z10 NC boundary zips tested
- [ ] ZE1–ZE4 invalid zip inputs tested
- [ ] Confirm or document negative/NaN weight behavior
- [ ] Confirm local-only architecture (no live API) is approved
- [ ] All catch blocks log — no silent failures
