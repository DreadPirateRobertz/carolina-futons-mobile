# Epic B — AI Personalization Layer

**Date:** 2026-03-28
**Leads:** ripley (UI components), hicks (perf/data layer)
**Dependencies:** Fit Score API (miquella, cf-hx8m); pgvector embedding pipeline (hq-r1251). UI shell starts now; live data wired when infra lands.
**Bead prefix:** `cm-epicB-*`
**Quality gate:** screen-reference.html updated after epic closes
**Cross-platform contract:** melania (cf-hx8m, cf-tj6f, cf-a220) — data contracts below

---

## 1. Goal

Surface AI-powered personalization throughout the app: Fit Score badge on PDP, Sommelier results on HomeScreen, and a personalized hero section. Resolve the double-waterfall fetch on HomeScreen. Add a CMS cache layer so personalization data doesn't hit Wix on every mount.

Success criteria:

- PDP shows "94% match" Fit Score badge for logged-in users with a quiz result
- HomeScreen shows Sommelier top-style recommendation with product grid
- HomeScreen personalization data loads from cache on repeat visits (no Wix round-trip)
- useSommelierResults + useQuizRecommendations coalesced into parallel fetch (no waterfall)
- Fit Score badge degrades gracefully when API unavailable (hides, does not crash)
- All new hooks and components have full test coverage including loading/error/empty states

---

## 2. Architecture

```
Wix Backend
  ├── /_functions/getFitScore?productId=&memberId=  (cf-hx8m, miquella)
  └── /_functions/getSommelierResults?memberId=     (cf-a220, live)

        │
        ▼
usePersonalization (src/hooks/usePersonalization.ts)  ← NEW (replaces double waterfall)
  ├── fetchFitScore(productId, memberId)
  ├── fetchSommelierResults(memberId)
  └── PersonalizationCache (AsyncStorage, TTL 1 hour)

        │
        ▼
Components:
  ├── FitScoreBadge (PDP — new ProductBadge type)
  ├── SommelierHeroCard (HomeScreen)
  └── PersonalizedProductGrid (HomeScreen — replaces generic grid for logged-in users)
```

**Progressive enhancement:** If user has no quiz result, no Fit Score, personalization is off — show standard PDP and HomeScreen. No degraded state visible to the user.

**Partial unblock strategy:** Build all UI components with mock data now. Wire live `getFitScore` API the moment cf-hx8m ships. This way the epic does not sit idle waiting on infra.

---

## 3. Components

### 3.1 FitScoreBadge — PDP

Implemented as a new `ProductBadge` type (`FIT_SCORE`) following ripley's recommendation:

```ts
// In productBadgeTypes.ts — add:
| { type: 'FIT_SCORE'; score: number; reasons: string[] }
```

Visual: pill badge near product title (`PointsChip` visual weight). Shows "94% match" in `mountainBlue`. On tap: opens `FitScoreExplainerSheet` (bottom sheet listing the match reasons).

**Loading state:** skeleton pill (same width as badge) while fetching.
**Not-logged-in / no quiz:** badge hidden entirely — no placeholder.
**API unavailable:** badge hidden, no error shown (personalization is additive, not critical).

### 3.2 useFitScore (`src/hooks/useFitScore.ts`) — NEW

Follows `useSocialProof` pattern exactly:

```ts
useFitScore(productId: string, memberId: string | null): {
  score: number | null;
  reasons: string[];
  isLoading: boolean;
  error: string | null;
}
```

- Returns null state if `memberId` is null (guest user)
- Reads from PersonalizationCache before fetching
- On cache hit (< 1 hour old): returns cached value immediately, no Wix call

### 3.3 usePersonalization (`src/hooks/usePersonalization.ts`) — NEW

Replaces the double-waterfall pattern on HomeScreen. Fires `getSommelierResults` and `getQuizRecommendations` in parallel using `Promise.all`:

```ts
usePersonalization(memberId: string | null): {
  sommelierResult: SommelierResult | null;
  recommendations: Product[];
  topStyle: string | null;
  isLoading: boolean;
  error: string | null;
}
```

Both fetches share a single loading gate — HomeScreen shows one skeleton, not two sequential ones.

### 3.4 SommelierHeroCard (`src/components/SommelierHeroCard.tsx`) — NEW

Shown on HomeScreen above product grid when user has a Sommelier result.

- Displays: "Based on your style quiz: [topStyle]" with top 2 flavors as chips
- CTA: "See your picks" → scrolls to PersonalizedProductGrid
- Dismiss button: hides for session (AsyncStorage flag), does not re-show until next quiz
- Skeleton: two-row placeholder matching final card dimensions

### 3.5 PersonalizedProductGrid (`src/components/PersonalizedProductGrid.tsx`) — NEW

Replaces standard HomeScreen FlatList for logged-in users with quiz results. Shows `recommendations[]` from usePersonalization. Falls back to standard grid if recommendations are empty.

---

## 4. Data Contracts

### getFitScore (cf-hx8m — in development by miquella)

```
GET /_functions/getFitScore?productId={id}&memberId={id}
→ { score: number (0-100), reasons: string[], computedAt: number }
```

### getSommelierResults (cf-a220 — live)

```
GET /_functions/getSommelierResults?memberId={id}
→ { memberId, topStyle, flavors[], recommendations[] }
```

### PersonalizationCache schema (AsyncStorage)

```ts
{
  fitScore: { [productId_memberId]: { score, reasons, cachedAt } },
  sommelierResult: { [memberId]: { result, cachedAt } },
}
```

TTL: 1 hour. Invalidated on new quiz completion.

---

## 5. Error Handling

| Scenario                          | Handling                                                                     |
| --------------------------------- | ---------------------------------------------------------------------------- |
| getFitScore API not yet live      | Feature flag `PERSONALIZATION_FIT_SCORE_ENABLED` — false until cf-hx8m ships |
| getSommelierResults 404 (no quiz) | Return null, show standard UI                                                |
| Both personalization fetches fail | Show standard HomeScreen, log to Sentry (non-fatal)                          |
| Cache read fails                  | Fall through to network fetch, log warning                                   |
| memberId null (guest)             | Skip all personalization fetches entirely                                    |

---

## 6. Testing

- **Unit:** useFitScore (null member, cached hit, cache miss, API error), usePersonalization (parallel fetch, single loading gate, partial failure), PersonalizationCache TTL logic
- **Component:** FitScoreBadge (loading/loaded/hidden states), SommelierHeroCard (dismiss persistence), PersonalizedProductGrid (fallback to standard grid)
- **Edge cases:** Quiz completed mid-session (cache invalidation), score = 0 (hide badge), score = 100 (show "Perfect match"), very long reason strings in FitScoreExplainerSheet

---

## 7. Beads

| Bead       | Description                                                     | Lead   |
| ---------- | --------------------------------------------------------------- | ------ |
| cm-epicB-1 | PersonalizationCache + usePersonalization hook (parallel fetch) | hicks  |
| cm-epicB-2 | useFitScore hook + FIT_SCORE badge type                         | ripley |
| cm-epicB-3 | FitScoreBadge component + FitScoreExplainerSheet                | ripley |
| cm-epicB-4 | SommelierHeroCard component                                     | ripley |
| cm-epicB-5 | PersonalizedProductGrid + HomeScreen integration                | hicks  |
| cm-epicB-6 | Wire live getFitScore API (blocked on cf-hx8m)                  | hicks  |
| cm-epicB-7 | Feature flag + graceful degradation audit                       | bishop |
