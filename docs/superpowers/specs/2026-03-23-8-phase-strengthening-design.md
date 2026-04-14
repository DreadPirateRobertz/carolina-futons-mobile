# 8-Phase Strengthening Plan — cfutons_mobile

**Date:** 2026-03-23
**Author:** cfutons_mobile/crew/dallas
**Status:** Approved — ready for bead creation
**Context:** All 8 gamification phases merged (PRs #108–#312). 52 PRs total. 53 screens, 81+ hooks, 2,700+ tests. Phase 8 (social layer) complete as of session 25. This plan identifies remaining hardening work across all phases before go-live.

---

## Overview

The 8 phases built the gamification stack in order: go-live plumbing → engagement → chatbot → challenges → trigger moments → avatar → visual identity → social. Each phase shipped with adequate coverage for its time, but later phases introduced dependencies that expose gaps in earlier ones. This plan closes those gaps.

**Goal:** Every phase independently production-hardened. No silent failures. No missing fallbacks. Full branch coverage on all Phase 4–8 hooks and screens.

---

## Phase Map

| Phase | Label           | Core Deliverable                                    | Status   |
| ----- | --------------- | --------------------------------------------------- | -------- |
| 1     | Go-Live         | Wix activation, Stripe saga, tax/shipping           | ✓ merged |
| 2     | Engagement      | Streaks, recommendations, mini-cart, loyalty card   | ✓ merged |
| 3     | Chatbot         | ChatbotUI modal                                     | ✓ merged |
| 4     | Challenges      | useActiveChallenges, challenge API, HomeScreen wire | ✓ merged |
| 5     | Trigger Moments | Streak danger, tier-up, toast pipeline              | ✓ merged |
| 6     | Avatar          | AvatarDisplay, AvatarEquipScreen                    | ✓ merged |
| 7     | Visual Identity | LivingSkyMountainSkyline, AR renderer               | ✓ merged |
| 8     | Social Layer    | crossRigEventBus, badge showcase, leaderboard       | ✓ merged |

---

## Strengthening Work by Phase

### Phase 1: Go-Live — Production Safety

**Known gaps:**

- `wixClientTimeout.test.ts` exists but only covers the singleton path. The `getLeaderboard` and `getBadges` methods added in Phase 8 have no timeout assertion.
- `orderSaga.test.ts` does not cover the case where Stripe refund itself fails after Wix order creation failure (compensation failure path).

**Strengthening tasks:**

**P1-S1: Extend wixClientTimeout tests to Phase 8 methods** (`cm-p1-strengthen-timeout`)
Add timeout assertions for `client.getLeaderboard()` and `client.getBadges()` — both were added post-timeout implementation and were never tested against the 10s abort signal.

- Acceptance: `getLeaderboard` and `getBadges` reject with timeout error at 10s; test verifies AbortSignal fires.

**P1-S2: Order saga compensation failure path** (`cm-p1-strengthen-saga`)
The saga rolls back via Stripe refund on Wix failure. If the refund itself throws, there is no test verifying the CRITICAL Sentry log + user "processing your refund" message.

- Acceptance: when `stripe.refundPayment()` throws, test verifies: (a) Sentry captures with level CRITICAL, (b) user-facing error includes support contact CTA, (c) saga state transitions to `refund_failed`.

---

### Phase 2: Engagement — Data Integrity

**Known gaps:**

- `useLoyaltyCard.test.ts` does not test the case where the member's tier changes mid-session (tier-up event comes in via crossRigEventBus).
- `useStreak.test.ts` covers fetch/reset but not the interaction with the Phase 5 streak danger banner trigger (streak <= 1 day remaining).

**Strengthening tasks:**

**P2-S1: useLoyaltyCard tier-up event integration** (`cm-p2-strengthen-loyalty`)
When crossRigEventBus emits `tier_upgraded`, useLoyaltyCard must re-fetch and update tier display.

- Acceptance: mock bus emits `tier_upgraded` → hook refetches → test verifies new tier reflected in return value within one render cycle.

**P2-S2: useStreak danger threshold** (`cm-p2-strengthen-streak`)
When `daysRemaining <= 1`, useStreak must set `isDangerous: true`. StreakDangerBanner reads this flag.

- Acceptance: hook returns `isDangerous: true` at 0, 1 day; `false` at 2+ days. Existing `StreakDangerBanner.test.tsx` verifies banner renders when prop is true (already exists — hook side is the gap).

---

### Phase 3: Chatbot — Resilience

**Known gaps:**

- ChatbotUI modal has no test for session timeout (auth token expired mid-conversation).
- No test for the case where the Wix chatbot endpoint is unavailable (503 / network error).

**Strengthening tasks:**

**P3-S1: ChatbotUI error states** (`cm-p3-strengthen-chatbot`)
Add tests for: (a) 503 response from Wix → shows inline error + retry button; (b) auth token expired → navigates to Login with `returnTo` param; (c) empty response body (edge case from Wix SDK).

- Acceptance: 3 new test cases in `ChatbotUI.test.tsx` (or new file), all passing.

---

### Phase 4: Challenges — API Contract

**Known gaps:**

- `useActiveChallenges.test.ts` exists and is solid. Gap: `useChallengeCatalog.test.ts` covers happy path and empty state but not the case where a challenge has `endDate` in the past (expired challenge filtering).
- No test for duplicate challenge IDs in the API response (deduplication logic in the hook).

**Strengthening tasks:**

**P4-S1: Challenge catalog edge cases** (`cm-p4-strengthen-challenges`)
Add to `useChallengeCatalog.test.ts`:

- Expired challenge (`endDate < now`) filtered from returned list
- Duplicate challenge IDs deduplicated (keeps first occurrence)
- Challenge with `null` reward gracefully handled (renders "No reward" label)
- Acceptance: 3 new test branches, all green.

---

### Phase 5: Trigger Moments — Toast Pipeline

**Known gaps:**

- PR #313 (hicks) identified a safe-area positioning bug in `BadgeToast.tsx` and `PointsToast.tsx`. Fix is confirmed correct but was submitted on a stale branch (12,106 deletions). The actual fix (2 files, ~20 lines) has not been merged to main yet.
- `useBadgeToast.test.ts` covers show/hide/queue but not rapid succession (3+ badges awarded simultaneously — queue draining order).
- `TierUpgradeToast.test.tsx` does not test the `animationDuration` prop being 0 (unit test fast-path).

**Strengthening tasks:**

**P5-S1: Cherry-pick toast safe-area fix** (`cm-p5-strengthen-toast-safearea`) — **URGENT**
Create clean branch from current main, apply only the `BadgeToast.tsx` + `PointsToast.tsx` safe-area changes from hicks's PR. Do NOT merge PR #313 as-is.
Changes: add `useSafeAreaInsets`, `bottom: 120 + insets.bottom` (BadgeToast), `bottom: 100 + insets.bottom` (PointsToast).

- Acceptance: both toast components position correctly above tab bar on devices with home indicator; existing toast tests still pass.

**P5-S2: Toast queue drain order** (`cm-p5-strengthen-toast-queue`)
When 3+ badges are awarded in the same tick, test that `useBadgeToast` queues them FIFO and drains one at a time with the configured `displayDuration` gap.

- Acceptance: mock clock advances, verify 3 badges shown sequentially; no badge skipped; no overlap.

---

### Phase 6: Avatar — State Consistency

**Known gaps:**

- `useAvatarState.test.ts` is solid. Gap: `AvatarEquipScreen.test.tsx` does not test the "equip while offline" path (optimistic update + sync on reconnect).
- No test for equipping an item that the member no longer owns (server-side validation returns 403).

**Strengthening tasks:**

**P6-S1: Avatar offline equip + 403 handling** (`cm-p6-strengthen-avatar`)
Add to `AvatarEquipScreen.test.tsx`:

- Offline equip: item shows as equipped optimistically; on reconnect, sync resolves successfully
- 403 response: optimistic state rolled back; user sees "Item no longer available" toast
- Acceptance: 2 new test branches; optimistic update confirmed by checking state before and after mock network response.

---

### Phase 7: Visual Identity — Renderer Stability

**Known gaps:**

- `LivingSkyMountainSkyline` renderer has no test for `reduceMotion` (accessibility setting should disable parallax).
- No test for the renderer when device reports `colorScheme: 'light'` (renderer is dark-mode-first; light mode fallback is untested).

**Strengthening tasks:**

**P7-S1: LivingSkyMountainSkyline a11y + color scheme** (`cm-p7-strengthen-renderer`)
Add to the renderer's test file:

- When `AccessibilityInfo.isReduceMotionEnabled` returns true → parallax animation disabled (static render)
- When `colorScheme === 'light'` → light palette applied (verify background token differs from dark default)
- Acceptance: 2 new test branches; both green; no snapshot-only assertions (assert specific style values).

---

### Phase 8: Social Layer — Null Safety + Endpoint Contract

**Known gaps (identified session 25):**

1. **displayName null** — `LeaderboardEntry.nickname` field renamed to `displayName: string | null` in radahn's endpoint PR #788. Mobile hook used `nickname`. Fix is in PR #314 (branch `cm-p8-leaderboard-null-display`). **Not yet merged — depends on radahn merging #788 first.**

2. **Missing hook tests** — `useAchievements`, `useGameProfile`, `usePushDeepLink`, `usePushNotificationDeepLink` have zero test coverage.

3. **crossRigEventBus error path** — `crossRigEventBus.test.ts` covers emit/receive but not the case where the Wix webhook delivery fails (event lost — no retry, no DLQ).

**Strengthening tasks:**

**P8-S1: Merge PR #314 after radahn's #788** (`cm-p8-null-display`) — **BLOCKED on #788**
Branch `cm-p8-leaderboard-null-display` contains: `displayName: string | null` type update, `displayName ?? 'CF Member'` fallback in LeaderboardScreen, new null fallback test. Merge after #788 lands.

- Acceptance: `LeaderboardEntry.displayName` typed as `string | null`; null renders "CF Member"; tests green.

**P8-S2: useAchievements tests** (`cm-p8-strengthen-achievements`)
Cover: initial fetch, error, empty state, single achievement with `null` iconUrl, achievements sorted by `earnedAt` descending.

- Acceptance: ≥6 test cases, 100% branch coverage on `useAchievements.ts`.

**P8-S3: useGameProfile tests** (`cm-p8-strengthen-gameprofile`)
Cover: fetch with full profile, fetch with partial profile (missing `avatarId`), error state, `isLoading` transitions.

- Acceptance: ≥5 test cases; error path verifies `error` string set and `profile` null.

**P8-S4: usePushDeepLink + usePushNotificationDeepLink tests** (`cm-p8-strengthen-deeplinks`)
Cover: notification with valid deep link navigates to correct screen; notification with unknown route logs warning (no crash); notification with missing `data` field handled gracefully.

- Acceptance: ≥3 test cases each hook; navigation mock verified; no throw on malformed payload.

**P8-S5: crossRigEventBus webhook failure path** (`cm-p8-strengthen-bus-retry`)
When Wix webhook delivery returns non-2xx, the bus currently logs and discards. Add retry with 2 attempts + dead letter logging to Sentry.

- Acceptance: test verifies 2 retry attempts on 503; after both fail, Sentry captures event with original payload; event NOT re-emitted to local subscribers (no phantom state).

---

## Bead Creation Priority

| Priority | Bead ID (proposed)              | Phase | Description                                           |
| -------- | ------------------------------- | ----- | ----------------------------------------------------- |
| P0       | cm-p5-strengthen-toast-safearea | 5     | Toast safe-area fix (cherry-pick) — visual regression |
| P0       | cm-p8-null-display              | 8     | Merge PR #314 after #788 — data correctness           |
| P1       | cm-p8-strengthen-achievements   | 8     | useAchievements — zero coverage                       |
| P1       | cm-p8-strengthen-gameprofile    | 8     | useGameProfile — zero coverage                        |
| P1       | cm-p8-strengthen-deeplinks      | 8     | Push deep link hooks — zero coverage                  |
| P1       | cm-p1-strengthen-saga           | 1     | Order saga compensation failure                       |
| P2       | cm-p8-strengthen-bus-retry      | 8     | Event bus webhook retry                               |
| P2       | cm-p4-strengthen-challenges     | 4     | Challenge catalog edge cases                          |
| P2       | cm-p5-strengthen-toast-queue    | 5     | Toast queue drain order                               |
| P2       | cm-p2-strengthen-loyalty        | 2     | useLoyaltyCard tier-up event                          |
| P3       | cm-p6-strengthen-avatar         | 6     | Avatar offline equip + 403                            |
| P3       | cm-p7-strengthen-renderer       | 7     | LivingSkyMountainSkyline a11y                         |
| P3       | cm-p3-strengthen-chatbot        | 3     | ChatbotUI error states                                |
| P3       | cm-p1-strengthen-timeout        | 1     | Wix timeout for Phase 8 methods                       |
| P3       | cm-p2-strengthen-streak         | 2     | useStreak danger threshold                            |

---

## Crew Assignment Recommendation

| Bead                            | Recommended Crew                  |
| ------------------------------- | --------------------------------- |
| cm-p5-strengthen-toast-safearea | hicks (author of original fix)    |
| cm-p8-null-display              | dallas (PR already authored)      |
| cm-p8-strengthen-achievements   | bishop (hook test patterns)       |
| cm-p8-strengthen-gameprofile    | bishop                            |
| cm-p8-strengthen-deeplinks      | hicks (notification specialist)   |
| cm-p1-strengthen-saga           | burke (Stripe/payment specialist) |
| cm-p8-strengthen-bus-retry      | ripley (event bus author)         |
| cm-p4-strengthen-challenges     | ripley                            |
| cm-p5-strengthen-toast-queue    | hicks                             |
| Remaining P2-P3 beads           | distribute per bandwidth          |

---

## Definition of Done (Strengthening Sprint)

- All 15 beads closed
- PR #313 closed (replaced by cm-p5-strengthen-toast-safearea)
- PR #314 merged (after radahn #788)
- `useAchievements`, `useGameProfile`, `usePushDeepLink`, `usePushNotificationDeepLink` all have tests
- No hook in `src/hooks/` lacks a corresponding test file
- Zero `// TODO: test` or `// FIXME` comments in any gamification file
- CI green on all branches before merge
