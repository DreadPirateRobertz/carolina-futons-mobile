# TDD Spec: cm-001 — Weight-Based Shipping Tiers

**Bead**: cm-001  
**Author**: bishop  
**Date**: 2026-04-28  
**Status**: DRAFT — pending blaidd's `/api/delivery-zone` schema  
**Implementor**: hicks  

---

## Purpose

This spec defines the test cases hicks must write (TDD) and pass before cm-001 ships.
Structured as: regression guards first, then new behavior, then failure modes.

---

## 1. Regression Guard — Existing Tests Must Not Break

The following 7 test cases in `src/services/__tests__/shippingService.test.ts` cover
the current flat-rate + free-shipping logic. **All must continue to pass after cm-001.**

| # | Description | Input | Expected |
|---|-------------|-------|----------|
| R1 | Free shipping at threshold | subtotal=499, zip=28202, premium=false | cost=0, applied=true, reason='threshold' |
| R2 | Premium always free | subtotal=100, zip=28202, premium=true | cost=0, applied=true, reason='premium' |
| R3 | Flat rate below threshold | subtotal=200, zip=28202, premium=false | cost=49.99, applied=false, fallback=true |
| R4 | Estimated days returned | subtotal=200, zip=28202, premium=false | estimatedDays > 0 |
| R5 | Boundary: just below threshold | subtotal=498.99, premium=false | cost=49.99 |
| R5b | Boundary: exactly at threshold | subtotal=499, premium=false | cost=0 |
| R6 | Premium + above threshold → reason='premium' | subtotal=1000, premium=true | reason='premium' |
| R7 | Zero subtotal, non-premium | subtotal=0, premium=false | cost=49.99, applied=false |

> **Note**: `ShippingInput` must grow a `weight` field. Make it optional (`weight?: number`)
> to keep existing callers from breaking, OR update all callers. Hicks to decide and document.

---

## 2. Weight Tier Classification

### 2.1 Tier Boundaries

Three tiers derived from boundary conditions in the assignment:

| Tier | Weight Range | Label |
|------|-------------|-------|
| 1 | < 70 lbs | Light |
| 2 | 70 lbs ≤ w < 500 lbs | Standard |
| 3 | ≥ 500 lbs | Heavy / Freight |

Actual rates per tier come from blaidd's `/api/delivery-zone` response — **see §4 below (pending)**.
Until the API spec lands, test cases should mock the API response.

### 2.2 Boundary Test Cases (required)

All at subtotal=200 (below free-shipping threshold), non-premium, zip=28202 (non-NC for isolation).

| # | Weight | Expected Tier | Notes |
|---|--------|--------------|-------|
| W1 | 69.9 lbs | Tier 1 (Light) | just under 70 |
| W2 | 70.0 lbs | Tier 2 (Standard) | exactly at boundary — inclusive lower |
| W3 | 70.1 lbs | Tier 2 (Standard) | just over 70 |
| W4 | 499.9 lbs | Tier 2 (Standard) | just under 500 |
| W5 | 500.0 lbs | Tier 3 (Heavy) | exactly at boundary — inclusive lower |
| W6 | 500.1 lbs | Tier 3 (Heavy) | just over 500 |
| W7 | 0 lbs | Tier 1 (Light) | zero weight → lightest tier |
| W8 | negative weight | throw or treat as 0 | invalid input — must not return undefined cost |

> **Action for hicks**: Mock `/api/delivery-zone` to return a predictable rate per tier.
> Document the mock shape here once blaidd's schema is received.

### 2.3 Free-Shipping Precedence with Weight

Weight tiers only affect the *paid* shipping cost. Free-shipping rules (premium, threshold)
take precedence and short-circuit before weight calculation.

| # | Setup | Expected |
|---|-------|----------|
| WP1 | weight=500 lbs (Tier 3), isPremium=true | cost=0, reason='premium' — no freight charge |
| WP2 | weight=500 lbs (Tier 3), subtotal=499 | cost=0, reason='threshold' — no freight charge |

---

## 3. NC Zip Code Edge Cases

NC zips begin with '27' (27000–27999) or '28' (28000–28999).
These zips are local-market — expected to receive different `estimatedDays` (and possibly rates).

### 3.1 Zip Classification

| # | Zip | Classification | Notes |
|---|-----|---------------|-------|
| Z1 | '27000' | NC | first valid NC '27' zip |
| Z2 | '27601' | NC | Raleigh |
| Z3 | '27999' | NC | last '27' zip |
| Z4 | '28000' | NC | first '28' zip |
| Z5 | '28202' | NC | Charlotte (used in existing tests) |
| Z6 | '28999' | NC | last '28' zip |
| Z7 | '29000' | Non-NC | just outside '28' range |
| Z8 | '26999' | Non-NC | just outside '27' range |
| Z9 | '10001' | Non-NC | New York |

### 3.2 NC vs Non-NC Test Cases

Exact estimatedDays values TBD by blaidd's API spec. Test structure:

```ts
it('NC zip gets faster estimated delivery than non-NC zip', async () => {
  const nc = await calculateShipping({ subtotal: 200, shippingZip: '28202', isPremium: false, weight: 50 });
  const nonNc = await calculateShipping({ subtotal: 200, shippingZip: '10001', isPremium: false, weight: 50 });
  expect(nc.estimatedDays).toBeLessThan(nonNc.estimatedDays);
});
```

| # | Description | Must hold |
|---|-------------|-----------|
| NC1 | NC zip → faster delivery than non-NC | estimatedDays(NC) < estimatedDays(non-NC) |
| NC2 | NC zip boundary '27000' → NC treatment | classified as NC |
| NC3 | Zip '26999' → non-NC treatment | not classified as NC |
| NC4 | Zip '28999' → NC treatment | classified as NC |
| NC5 | Zip '29000' → non-NC treatment | not classified as NC |
| NC6 | Zip with leading zeros preserved (string) | '07001' does not match NC |
| NC7 | Zip undefined or empty string | must not throw; use fallback delivery estimate |
| NC8 | Zip with non-numeric chars (e.g. 'ABCDE') | must not throw; treat as non-NC |

---

## 4. API Failure Cases — `/api/delivery-zone`

The service will call `/api/delivery-zone` to resolve zone rates. The existing flat-rate
fallback (`49.99`, `fallback: true`) is the safe degraded mode.

### 4.1 Failure Scenarios

| # | Failure Mode | Expected Behavior |
|---|-------------|-------------------|
| A1 | HTTP 500 from `/api/delivery-zone` | fallback to flat rate, `fallback: true`, no throw |
| A2 | Network timeout (>Xms — threshold TBD) | fallback to flat rate, `fallback: true`, no throw |
| A3 | Malformed JSON response | fallback to flat rate, `fallback: true`, no throw |
| A4 | HTTP 404 (zone not found) | fallback to flat rate, `fallback: true`, no throw |
| A5 | Response missing required fields | fallback to flat rate, `fallback: true`, no throw |
| A6 | Empty response body `{}` | fallback to flat rate, `fallback: true`, no throw |
| A7 | API returns rate=0 (legit $0 shipping) | `shippingCost: 0`, `fallback: false` — distinguish from failure |

> **Constraint**: No catch block may be left empty. Failures must be logged.
> Use `console.error` or the project logger — not silently swallowed.

### 4.2 Required test structure (A1 as example)

```ts
it('falls back to flat rate on HTTP 500 from delivery-zone API', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: false,
    status: 500,
    json: async () => { throw new Error('server error'); },
  } as Response);

  const result = await calculateShipping({ subtotal: 200, shippingZip: '28202', isPremium: false, weight: 50 });

  expect(result.shippingCost).toBe(49.99);
  expect(result.fallback).toBe(true);
  expect(result.freeShippingApplied).toBe(false);
});
```

---

## 5. ShippingResult Shape — Expected Additions

After cm-001, `ShippingResult` should include:

```ts
export interface ShippingResult {
  shippingCost: number;
  freeShippingApplied: boolean;
  freeShippingReason?: 'threshold' | 'premium';
  fallback: boolean;
  estimatedDays: number;
  // NEW in cm-001:
  weightTier?: 1 | 2 | 3;           // which tier was applied (absent if free shipping)
  deliveryZone?: string;             // zone ID from API (absent on fallback)
  isNcLocal?: boolean;               // true if zip classified as NC-local
}
```

> Hicks to confirm additions before implementation. All new fields should be optional
> so the interface stays backward-compatible.

---

## 6. Gaps Pending Blaidd's API Spec

The following test case values CANNOT be finalized until blaidd delivers `/api/delivery-zone` schema:

1. **Tier rates** — actual `shippingCost` per tier per zone (W1–W6 expect specific dollar amounts)
2. **NC estimatedDays** — how many days faster than non-NC? (NC1–NC5 need concrete numbers)
3. **Timeout threshold** — what ms count as a timeout? (A2 mock timing)
4. **Zone ID format** — needed for `deliveryZone` field in `ShippingResult`
5. **API auth** — does `/api/delivery-zone` require a token? If so, what happens on 401?

Once blaidd's spec lands, bishop will review for gaps and push updates to this doc.

---

## 7. Summary Checklist for hicks

Before opening the cm-001 PR:

- [ ] All R1–R7 regression tests still pass (zero new failures)
- [ ] W1–W8 weight boundary tests written and passing
- [ ] WP1–WP2 precedence tests written and passing
- [ ] Z1–Z9 zip classification tests written (NC1–NC8 behavior tests)
- [ ] A1–A7 API failure tests written and passing
- [ ] No empty catch blocks — every catch logs
- [ ] `ShippingInput` `weight` field added (optional or required — document the choice)
- [ ] `ShippingResult` new fields documented
- [ ] Blaidd's API spec incorporated (pending — do not ship without)
