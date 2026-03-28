# Epic D — Social + Gamification

**Date:** 2026-03-28
**Leads:** ripley (UI/components), hicks (perf/data)
**Dependencies:** Epic A (Push Notification Engine) for streak/badge/challenge push delivery
**Bead prefix:** `cm-epicD-*`
**Quality gate:** screen-reference.html updated after epic closes
**Note:** Gamification foundation (badges, streaks, challenges, points, DailyQuestsCard) already exists. This epic adds social layer and fixes known UX debt.

---

## 1. Goal

Build the social sharing layer (referral deep links, share sheet, leaderboard social context) on top of the existing gamification foundation. Fix the known UX debt in RewardsScreen and DailyQuestsCard. Wire streak/badge/challenge push notifications via the Epic A engine.

Success criteria:
- User can share a referral link from ProfileScreen; link deep-links to app download with referral attribution
- ReferralLinks Wix collection tracks clicks and conversions
- RewardsScreen has consistent error UX across all 8 try/catch blocks
- DailyQuestsCard refresh no longer causes visible flash (state update, not remount)
- Streak/badge/challenge push notifications fire via Epic A engine
- `useReducedMotion` applied to all gamification animations
- Leaderboard and challenge lists have proper VoiceOver list semantics

---

## 2. Architecture

```
Existing gamification layer:
  badges, streaks, challenges, points, DailyQuestsCard, LoyaltyScreen,
  ChallengesScreen, RewardsScreen, LeaderboardScreen

New social layer:
  ├── ReferralService (src/services/referralService.ts)        ← NEW
  │       ├── generateReferralLink(memberId) → deep link URL
  │       ├── recordReferralClick(code)
  │       └── recordReferralConversion(code, newMemberId)
  │
  ├── ShareSheet (src/components/ShareSheet.tsx)               ← NEW
  │       └── Uses React Native Share API + deep link
  │
  └── Epic A push engine
          ├── emitStreakExtended → push "🔥 Day {n} streak!"
          ├── emitBadgeEarned → push "{badge} earned!"  (NEW emitter)
          └── emitChallengeStarted → push "Challenge started"

Referral deep links:
  carolinafutons://referral/{code}  → ReferralLandingScreen (new)
  → auto-applies referral, shows referral reward context
```

---

## 3. Components & Fixes

### 3.1 ReferralService (`src/services/referralService.ts`) — NEW

```ts
generateReferralLink(memberId: string): Promise<string>
// → calls /_functions/generateReferralLink POST { memberId }
// → returns carolinafutons://referral/{code} deep link

recordReferralConversion(code: string): Promise<void>
// → called on ReferralLandingScreen mount for logged-in new users
```

Wix collection: `ReferralLinks { memberId, code, clickCount, conversions, createdAt }` (cf-heou, radahn)

### 3.2 ShareSheet (`src/components/ShareSheet.tsx`) — NEW

Wraps React Native `Share.share()`:
- Share message: "Check out Carolina Futons! Use my link for [X] points: {deepLink}"
- Copy link button as fallback (clipboard)
- Analytics: `REFERRAL_SHARED` event on successful share

Entry point: ProfileScreen "Share & Earn" card (new section on ProfileScreen).

### 3.3 ReferralLandingScreen (`src/screens/ReferralLandingScreen.tsx`) — NEW

Handles `carolinafutons://referral/{code}` deep link:
- If guest: shows app download CTA with referral context preserved
- If new logged-in user: calls `recordReferralConversion`, shows "You and [referrer] each earn X points"
- If existing user: shows "Referral already applied" message, no double-award

### 3.4 RewardsScreen error UX fix (existing file — rework)

Current: 8 try/catch blocks with inconsistent handling (some show error state, some swallow silently).

Fix: Extract shared `useRewardsSectionData` hook that wraps all 8 fetches with:
- Unified error state per section (not global error — each section can fail independently)
- All errors logged to Sentry (none silently swallowed)
- Per-section retry button
- Loading skeleton per section (not spinner)

### 3.5 DailyQuestsCard flash fix (existing component — rework)

Current: `isLoading` toggle causes full unmount+remount → visible flash.

Fix: Replace unmount pattern with in-place state update. Keep the component mounted; update `quests` state array directly. Skeleton overlays data during refresh without destroying the tree.

### 3.6 Gamification push wiring (crossRigEventBus — extend)

Add two new emitters (Epic A engine prerequisite):
```ts
emitBadgeEarned(client, { badgeId, badgeName }): Promise<CrossRigEventResult>
emitTierChanged(client, { oldTier, newTier }): Promise<CrossRigEventResult>
```

Push copy:
- Badge earned: "🏅 New badge: {badgeName}!"
- Tier changed: "⬆️ You reached {newTier} tier!"
- Streak extended: "🔥 {n}-day streak! Keep it up."

### 3.7 A11y fixes across gamification screens

**useReducedMotion audit:** Inventory all `Animated` usages in gamification components; wrap with `useReducedMotion` check. Affected: streak reveal animation, badge unlock animation, points increment counter, challenge progress bar.

**Leaderboard/challenge list semantics:**
- FlatList items: `accessibilityLabel="Rank {n} of {total}: {username}, {points} points"`
- Challenges: `accessibilityLabel="Challenge: {name}, {n} of {m} steps complete"`

**Badge/achievement modal focus management:**
- On modal open: focus first interactive element
- On modal dismiss: return focus to trigger element (`useRef` on trigger button)

---

## 4. Data Contracts

### ReferralLinks (Wix — cf-heou, radahn)
```
{ memberId, code, clickCount, conversions, createdAt, rewardPoints }
```

### crossRigEventBus new events
```ts
badge_earned:  { badgeId: string, badgeName: string }
tier_changed:  { oldTier: string, newTier: string }
```

---

## 5. Error Handling

| Scenario | Handling |
|----------|----------|
| generateReferralLink fails | Show "Unable to generate link — try again" in ShareSheet, do not crash |
| recordReferralConversion fails | Log to Sentry, show generic welcome (user doesn't lose their points — Wix handles idempotency) |
| Duplicate referral code | ReferralLandingScreen shows "Already applied" message |
| Badge push fires but Epic A not yet live | Emitter queues in AsyncStorage (existing crossRigEventBus pattern) |
| RewardsScreen section fetch fails | Per-section error state with retry button — never silently swallowed |

---

## 6. Testing

- **Unit:** ReferralService (generate, record conversion, duplicate handling), crossRigEventBus new emitters, useRewardsSectionData per-section error isolation
- **Component:** ShareSheet (share success, clipboard fallback), ReferralLandingScreen (guest/new user/existing user states), DailyQuestsCard (no flash on refresh)
- **A11y:** Focus management on badge modal open/dismiss, leaderboard accessibilityLabel format, reducedMotion alternatives
- **Edge cases:** Referral code with expired reward, mid-session tier change (tier modal stacking), badge earned while app backgrounded

---

## 7. Beads

| Bead | Description | Lead |
|------|-------------|------|
| cm-epicD-0 | useReducedMotion audit across gamification (pre-epic) | burke |
| cm-epicD-1 | ReferralService + generateReferralLink API | bishop |
| cm-epicD-2 | ShareSheet component + ProfileScreen "Share & Earn" section | ripley |
| cm-epicD-3 | ReferralLandingScreen + deep-link routing | ripley |
| cm-epicD-4 | RewardsScreen error UX rework (useRewardsSectionData) | hicks |
| cm-epicD-5 | DailyQuestsCard flash fix | hicks |
| cm-epicD-6 | emitBadgeEarned + emitTierChanged (crossRigEventBus) | bishop |
| cm-epicD-7 | Gamification push wiring via Epic A engine | bishop |
| cm-epicD-8 | A11y fixes: focus management, list semantics, reducedMotion | burke |
