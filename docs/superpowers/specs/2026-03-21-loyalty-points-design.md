# Loyalty Points System Design — cm-elo

**Date:** 2026-03-21
**Bead:** cm-elo (P2, Sprint 3)
**PM:** Dallas (cfutons_mobile) + Melania (cfutons — co-owner, Velo compat review)
**Cross-rig:** CF-yq80 (cfutons web loyalty tier display) — co-launch when CF-yq80 enters review

---

## Overview

Tiered loyalty points system for Carolina Futons mobile app. Members earn points on purchases, photo reviews, and referrals. Points unlock Bronze / Silver / Gold tier with discount perks.

---

## Tier Structure

| Tier   | Threshold  | Perk                         |
|--------|-----------|------------------------------|
| Bronze | 0–999 pts | 5% off next purchase         |
| Silver | 1000–4999 | 10% off + free shipping      |
| Gold   | 5000+     | 15% off + priority support   |

---

## Earning Rules

| Action            | Points | Timing                                              |
|-------------------|--------|-----------------------------------------------------|
| Purchase          | 10 pts / $1 | On `order_confirmed` (NOT BNPL auth) — prevents points on failed installments |
| Photo review      | 100 pts | On review approval                                  |
| Referral          | 500 pts | On referral's first completed order                 |

**BNPL point timing (melania directive):** Award on `order_confirmed` event only, never on BNPL authorization. This prevents phantom points from failed Klarna/Affirm installments.

---

## Data Architecture

### Identity Anchor
Use **Wix Members API** for identity (memberId, email) only. No extensible fields in Wix Members — do not store loyalty data there.

### Custom Wix Data Collection: `LoyaltyPoints`
```
{
  _id: string,           // Wix auto-generated
  memberId: string,      // Wix Members ID
  points: number,        // current balance
  tier: 'bronze' | 'silver' | 'gold',
  totalEarned: number,   // lifetime points
  createdDate: Date,
  updatedDate: Date
}
```

### Custom Wix Data Collection: `LoyaltyTransactions`
```
{
  _id: string,
  memberId: string,
  delta: number,         // positive = earned, negative = redeemed
  reason: 'purchase' | 'photo_review' | 'referral' | 'redemption',
  orderId?: string,
  reviewId?: string,
  referralId?: string,
  createdDate: Date,
  expiresAt?: Date       // future: point expiry logic
}
```

---

## Components

### `useLoyalty` Hook
```typescript
interface LoyaltyState {
  points: number;
  tier: 'bronze' | 'silver' | 'gold';
  totalEarned: number;
  transactions: LoyaltyTransaction[];
  loading: boolean;
  error: string | null;
}

useLoyalty(): LoyaltyState & {
  refreshPoints: () => Promise<void>;
}
```

- Fetches from Wix Data collection via REST API
- Uses Wix Members API for memberId resolution
- Error state on fetch failure (network, auth, missing collection)
- Empty state for new members (0 points, bronze)

### `LoyaltyScreen`
- Current points balance + tier badge
- Tier progress bar (points to next tier)
- Transaction history (FlatList, infinite scroll)
- Perk display per current tier
- Empty state: "Start earning — make your first purchase"
- Error state with retry

### `LoyaltyBadge` (shared component)
- Small tier indicator for ProfileScreen / CheckoutScreen
- Props: `tier`, `points`, `compact?: boolean`

---

## Security

- All Wix Data reads filtered by `memberId` (server-side) — no IDOR risk
- Mobile never writes to LoyaltyTransactions directly — writes go via Wix backend functions only
- Wix backend function validates memberId matches authenticated user before any write

---

## Velo Compatibility (Melania Review Required)

Before implementation: melania reviews this spec for Wix Velo compatibility:
- Wix Data collection field types match Velo schema constraints
- Backend function patterns for atomic point credit
- CF-yq80 (web tier display) reads from same collections — schema must be shared

---

## TDD Acceptance Criteria (16 tests)

### `useLoyalty` hook (8 tests)
1. Returns 0 points + bronze tier for new member
2. Returns correct points and tier for existing member
3. Calculates tier from points: 0→bronze, 1000→silver, 5000→gold
4. Shows loading state during fetch
5. Shows error state on API failure
6. Shows error state on network failure (offline)
7. refreshPoints re-fetches and updates state
8. Empty transaction history shows empty state

### `LoyaltyScreen` (5 tests)
9. Renders points balance and tier correctly
10. Shows tier progress bar with correct percentage
11. Renders transaction history list
12. Shows empty state for 0 transactions
13. Shows error state with retry button

### `LoyaltyBadge` (3 tests)
14. Renders bronze badge for 0–999 pts
15. Renders silver badge for 1000–4999 pts
16. Renders gold badge for 5000+ pts

---

## Co-launch Gate

- Wait for CF-yq80 (melania) to enter review before shipping cm-elo
- Shared Wix Data schema must be confirmed with melania before first commit
- Dallas to flag melania when cm-elo enters PR review

---

## Out of Scope (Sprint 3)

- Point expiry (expiresAt field reserved for future)
- Redemption UI (earn only in v1)
- Push notification for tier upgrade (future sprint)
