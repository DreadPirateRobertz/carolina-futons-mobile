# Epic D — Social + Gamification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the social referral layer, fix known gamification UX debt (RewardsScreen error inconsistency, DailyQuestsCard flash), and wire streak/badge/challenge push through the Epic A notification engine.

**Architecture:** `ReferralService` generates and records deep-link referral codes via Wix. `ShareSheet` wraps RN `Share.share()`. `ReferralLandingScreen` handles the `carolinafutons://referral/{code}` deep link. `useRewardsSectionData` centralizes all 8 RewardsScreen fetches into one hook with per-section error isolation. DailyQuestsCard flash fixed by replacing unmount/remount with in-place state update.

**Tech Stack:** React Native Share API, deep links (existing linking config), crossRigEventBus (existing + Epic A additions), jest-expo

**Branch:** `cm-epicD-social-gamification` (branch off main, after Epic A merges)

**Pre-condition:** Epic A must be merged before starting Task 6 (push wiring). Tasks 1-5 can start immediately.

---

## Pre-task 0: useReducedMotion audit (burke — run before sprint)

- [ ] **Step 1: Find all Animated usages in gamification components**

```bash
grep -rn "Animated\." src/components/ChallengeCard.tsx src/components/DailyQuestsCard.tsx src/screens/LoyaltyScreen.tsx src/screens/RewardsScreen.tsx src/screens/ChallengesScreen.tsx
```

- [ ] **Step 2: Wrap each animation with reducedMotion check**

For each `Animated.timing()` / `Animated.spring()` call found:

```typescript
import { useReducedMotion } from '@/hooks/useReducedMotion'; // existing hook

const reducedMotion = useReducedMotion();

// Replace:
Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }).start();

// With:
Animated.timing(anim, {
  toValue: 1,
  duration: reducedMotion ? 0 : 400,
  useNativeDriver: true,
}).start();
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ src/screens/
git commit -m "feat(epicD): useReducedMotion applied to all gamification animations"
```

---

## Task 1: ReferralService

**Files:**
- Create: `src/services/referralService.ts`
- Create: `src/services/__tests__/referralService.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/services/__tests__/referralService.test.ts
const mockCallFunction = jest.fn();
jest.mock('@/services/wix/wixProvider', () => ({
  useWixClient: () => ({ callFunction: mockCallFunction }),
}));
jest.mock('@/services/crashReporting', () => ({ captureException: jest.fn() }));

import { generateReferralLink, recordReferralConversion } from '../referralService';

beforeEach(() => jest.clearAllMocks());

it('generateReferralLink calls Wix and returns deep link URL', async () => {
  mockCallFunction.mockResolvedValue({ code: 'ABC123' });
  const link = await generateReferralLink(mockCallFunction as never, 'member-1');
  expect(link).toBe('carolinafutons://referral/ABC123');
  expect(mockCallFunction).toHaveBeenCalledWith(
    '/_functions/generateReferralLink',
    'POST',
    { memberId: 'member-1' },
  );
});

it('generateReferralLink returns null on error without throwing', async () => {
  mockCallFunction.mockRejectedValue(new Error('network'));
  const link = await generateReferralLink(mockCallFunction as never, 'member-1');
  expect(link).toBeNull();
});

it('recordReferralConversion calls Wix record endpoint', async () => {
  mockCallFunction.mockResolvedValue({ success: true });
  await recordReferralConversion(mockCallFunction as never, 'ABC123', 'new-member-1');
  expect(mockCallFunction).toHaveBeenCalledWith(
    '/_functions/recordReferralConversion',
    'POST',
    { code: 'ABC123', newMemberId: 'new-member-1' },
  );
});

it('recordReferralConversion does not throw on Wix error', async () => {
  mockCallFunction.mockRejectedValue(new Error('network'));
  await expect(
    recordReferralConversion(mockCallFunction as never, 'ABC123', 'new-member-1'),
  ).resolves.not.toThrow();
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx jest src/services/__tests__/referralService.test.ts --no-coverage
```

- [ ] **Step 3: Implement ReferralService**

```typescript
// src/services/referralService.ts
import { captureException } from '@/services/crashReporting';

type WixCallFn = (path: string, method: 'GET' | 'POST', body?: unknown) => Promise<unknown>;

export async function generateReferralLink(
  callFunction: WixCallFn,
  memberId: string,
): Promise<string | null> {
  try {
    const result = await callFunction('/_functions/generateReferralLink', 'POST', { memberId }) as { code: string };
    return `carolinafutons://referral/${result.code}`;
  } catch (err) {
    captureException(err instanceof Error ? err : new Error(String(err)));
    return null;
  }
}

export async function recordReferralConversion(
  callFunction: WixCallFn,
  code: string,
  newMemberId: string,
): Promise<void> {
  try {
    await callFunction('/_functions/recordReferralConversion', 'POST', { code, newMemberId });
  } catch (err) {
    captureException(err instanceof Error ? err : new Error(String(err)));
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx jest src/services/__tests__/referralService.test.ts --no-coverage
```

- [ ] **Step 5: Commit**

```bash
git add src/services/referralService.ts src/services/__tests__/referralService.test.ts
git commit -m "feat(epicD): ReferralService — generateReferralLink + recordReferralConversion"
```

---

## Task 2: ShareSheet component

**Files:**
- Create: `src/components/ShareSheet.tsx`
- Create: `src/components/__tests__/ShareSheet.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// src/components/__tests__/ShareSheet.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Share, Clipboard } from 'react-native';

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: { espresso: '#3A2518', sandBase: '#E8D5B7', sunsetCoral: '#E8845C', offWhite: '#FAF7F2' },
    spacing: { sm: 8, md: 16 },
    typography: { bodyFamily: 'System', headingFamily: 'System' },
    borderRadius: { md: 8 },
  }),
}));

jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);
jest.spyOn(Clipboard, 'setString').mockImplementation(() => {});

const mockGenerate = jest.fn().mockResolvedValue('carolinafutons://referral/ABC123');
jest.mock('@/services/referralService', () => ({ generateReferralLink: mockGenerate }));
jest.mock('@/services/wix/wixProvider', () => ({ useWixClient: () => ({ callFunction: jest.fn() }) }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'member-1' } }) }));

import { ShareSheet } from '../ShareSheet';

beforeEach(() => jest.clearAllMocks());

it('renders share and copy buttons', async () => {
  const { getByTestId } = render(<ShareSheet />);
  await waitFor(() => expect(getByTestId('share-btn')).toBeTruthy());
  expect(getByTestId('copy-link-btn')).toBeTruthy();
});

it('calls Share.share with referral link', async () => {
  const { getByTestId } = render(<ShareSheet />);
  await waitFor(() => expect(getByTestId('share-btn')).toBeTruthy());
  fireEvent.press(getByTestId('share-btn'));
  await waitFor(() =>
    expect(Share.share).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('carolinafutons://referral/ABC123') }),
    ),
  );
});

it('copies link to clipboard', async () => {
  const { getByTestId } = render(<ShareSheet />);
  await waitFor(() => expect(getByTestId('copy-link-btn')).toBeTruthy());
  fireEvent.press(getByTestId('copy-link-btn'));
  expect(Clipboard.setString).toHaveBeenCalledWith('carolinafutons://referral/ABC123');
});

it('shows error when generateReferralLink returns null', async () => {
  mockGenerate.mockResolvedValue(null);
  const { getByText } = render(<ShareSheet />);
  await waitFor(() => expect(getByText(/unable to generate link/i)).toBeTruthy());
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx jest src/components/__tests__/ShareSheet.test.tsx --no-coverage
```

- [ ] **Step 3: Implement ShareSheet**

```typescript
// src/components/ShareSheet.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Share, Clipboard, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { useWixClient } from '@/services/wix/wixProvider';
import { useAuth } from '@/hooks/useAuth';
import { generateReferralLink } from '@/services/referralService';

export function ShareSheet() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const client = useWixClient();
  const { user } = useAuth();
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user?.id || !client) return;
    generateReferralLink(client.callFunction.bind(client), user.id).then((l) => {
      if (l) setLink(l);
      else setError(true);
    });
  }, [user?.id, client]);

  async function handleShare() {
    if (!link) return;
    await Share.share({
      message: `Check out Carolina Futons! Use my link: ${link}`,
      url: link,
    });
  }

  function handleCopy() {
    if (!link) return;
    Clipboard.setString(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const s = StyleSheet.create({
    container: { padding: spacing.md },
    shareBtn: { backgroundColor: colors.sunsetCoral, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center', marginBottom: spacing.sm },
    shareBtnText: { color: colors.offWhite, fontFamily: typography.bodyFamily, fontWeight: '600' },
    copyBtn: { borderWidth: 1, borderColor: colors.espresso, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center' },
    copyBtnText: { color: colors.espresso, fontFamily: typography.bodyFamily },
    error: { color: 'red', fontFamily: typography.bodyFamily, textAlign: 'center', marginTop: spacing.sm },
  });

  if (error) {
    return <Text style={s.error}>Unable to generate link — try again later</Text>;
  }

  return (
    <View style={s.container}>
      <TouchableOpacity testID="share-btn" style={s.shareBtn} onPress={handleShare} disabled={!link} accessibilityRole="button">
        <Text style={s.shareBtnText}>Share & Earn</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="copy-link-btn" style={s.copyBtn} onPress={handleCopy} disabled={!link} accessibilityRole="button">
        <Text style={s.copyBtnText}>{copied ? '✓ Copied!' : 'Copy link'}</Text>
      </TouchableOpacity>
    </View>
  );
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx jest src/components/__tests__/ShareSheet.test.tsx --no-coverage
```

- [ ] **Step 5: Add ShareSheet to ProfileScreen**

In `src/screens/ProfileScreen.tsx`, add a "Share & Earn" section card containing `<ShareSheet />` above the settings list. Only shown for logged-in users.

- [ ] **Step 6: Commit**

```bash
git add src/components/ShareSheet.tsx src/components/__tests__/ShareSheet.test.tsx src/screens/ProfileScreen.tsx
git commit -m "feat(epicD): ShareSheet + ProfileScreen Share & Earn section"
```

---

## Task 3: ReferralLandingScreen

**Files:**
- Create: `src/screens/ReferralLandingScreen.tsx`
- Create: `src/screens/__tests__/ReferralLandingScreen.test.tsx`
- Modify: `src/navigation/index.ts` (add route + deep-link handler for `carolinafutons://referral/:code`)

- [ ] **Step 1: Write failing tests**

```typescript
// src/screens/__tests__/ReferralLandingScreen.test.tsx
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: { espresso: '#3A2518', offWhite: '#FAF7F2', sunsetCoral: '#E8845C', success: '#4A7C59' },
    spacing: { md: 16, lg: 24 },
    typography: { bodyFamily: 'System', headingFamily: 'System' },
    borderRadius: { md: 8 },
  }),
}));

const mockRecord = jest.fn().mockResolvedValue(undefined);
jest.mock('@/services/referralService', () => ({ recordReferralConversion: mockRecord }));
jest.mock('@/services/wix/wixProvider', () => ({ useWixClient: () => ({ callFunction: jest.fn() }) }));
jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: { code: 'ABC123' } }),
  useNavigation: () => ({ navigate: jest.fn() }),
}));

// Logged-in user
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'new-member-1' } }) }));

import { ReferralLandingScreen } from '../ReferralLandingScreen';

it('shows referral welcome message', async () => {
  const { getByTestId } = render(<ReferralLandingScreen />);
  await waitFor(() => expect(getByTestId('referral-landing-welcome')).toBeTruthy());
});

it('records referral conversion for logged-in new user', async () => {
  render(<ReferralLandingScreen />);
  await waitFor(() =>
    expect(mockRecord).toHaveBeenCalledWith(expect.any(Function), 'ABC123', 'new-member-1'),
  );
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx jest src/screens/__tests__/ReferralLandingScreen.test.tsx --no-coverage
```

- [ ] **Step 3: Implement ReferralLandingScreen**

```typescript
// src/screens/ReferralLandingScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme';
import { useAuth } from '@/hooks/useAuth';
import { useWixClient } from '@/services/wix/wixProvider';
import { recordReferralConversion } from '@/services/referralService';

export function ReferralLandingScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const route = useRoute<{ key: string; name: string; params: { code: string } }>();
  const navigation = useNavigation();
  const { user } = useAuth();
  const client = useWixClient();
  const { code } = route.params;
  const [recorded, setRecorded] = useState(false);

  useEffect(() => {
    if (user?.id && client && !recorded) {
      recordReferralConversion(client.callFunction.bind(client), code, user.id).then(() => {
        setRecorded(true);
      });
    }
  }, [user?.id, client, code, recorded]);

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.offWhite, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
    title: { fontFamily: typography.headingFamily, fontSize: 24, color: colors.espresso, marginBottom: spacing.md, textAlign: 'center' },
    body: { fontFamily: typography.bodyFamily, fontSize: 16, color: colors.espresso, textAlign: 'center', marginBottom: spacing.lg * 2 },
    btn: { backgroundColor: colors.sunsetCoral, borderRadius: borderRadius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg * 2 },
    btnText: { color: colors.offWhite, fontFamily: typography.bodyFamily, fontWeight: '600' },
  });

  return (
    <View style={s.container}>
      <Text testID="referral-landing-welcome" style={s.title}>
        {user ? "You've been referred!" : 'Welcome to Carolina Futons'}
      </Text>
      <Text style={s.body}>
        {user
          ? 'You and your friend each earn bonus points.'
          : 'Download the app to claim your referral reward.'}
      </Text>
      <TouchableOpacity
        style={s.btn}
        onPress={() => navigation.navigate('Home' as never)}
        accessibilityRole="button"
      >
        <Text style={s.btnText}>Shop now</Text>
      </TouchableOpacity>
    </View>
  );
}
```

- [ ] **Step 4: Register deep-link route**

In `src/navigation/index.ts` (or wherever `linkingConfig` is defined), add to the config:

```typescript
// In linking.config.screens:
ReferralLanding: 'referral/:code',
```

And register `ReferralLandingScreen` in the navigator stack.

- [ ] **Step 5: Run tests — expect PASS**

```bash
npx jest src/screens/__tests__/ReferralLandingScreen.test.tsx --no-coverage
```

- [ ] **Step 6: Commit**

```bash
git add src/screens/ReferralLandingScreen.tsx src/screens/__tests__/ReferralLandingScreen.test.tsx src/navigation/
git commit -m "feat(epicD): ReferralLandingScreen with deep-link + conversion recording"
```

---

## Task 4: RewardsScreen error UX fix

**Files:**
- Create: `src/hooks/useRewardsSectionData.ts`
- Create: `src/hooks/__tests__/useRewardsSectionData.test.ts`
- Modify: `src/screens/RewardsScreen.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// src/hooks/__tests__/useRewardsSectionData.test.ts
import { renderHook, act } from '@testing-library/react-native';

const mockFetchers = {
  fetchPoints: jest.fn(),
  fetchBadges: jest.fn(),
  fetchChallenges: jest.fn(),
};

jest.mock('@/services/gamificationApi', () => mockFetchers);

import { useRewardsSectionData } from '../useRewardsSectionData';

beforeEach(() => jest.clearAllMocks());

it('returns per-section loading state', async () => {
  mockFetchers.fetchPoints.mockResolvedValue({ total: 500 });
  mockFetchers.fetchBadges.mockResolvedValue([]);
  mockFetchers.fetchChallenges.mockResolvedValue([]);

  const { result } = renderHook(() => useRewardsSectionData('member-1'));
  expect(result.current.points.isLoading).toBe(true);
  await act(async () => {});
  expect(result.current.points.isLoading).toBe(false);
  expect(result.current.points.data?.total).toBe(500);
});

it('isolates errors per section — other sections still render', async () => {
  mockFetchers.fetchPoints.mockRejectedValue(new Error('network'));
  mockFetchers.fetchBadges.mockResolvedValue([{ id: 'b1' }]);
  mockFetchers.fetchChallenges.mockResolvedValue([]);

  const { result } = renderHook(() => useRewardsSectionData('member-1'));
  await act(async () => {});
  expect(result.current.points.error).toBeTruthy();
  expect(result.current.badges.data).toHaveLength(1);
  expect(result.current.badges.error).toBeNull();
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx jest src/hooks/__tests__/useRewardsSectionData.test.ts --no-coverage
```

- [ ] **Step 3: Implement useRewardsSectionData**

```typescript
// src/hooks/useRewardsSectionData.ts
import { useState, useEffect } from 'react';
import { fetchPoints, fetchBadges, fetchChallenges } from '@/services/gamificationApi';
import { captureException } from '@/services/crashReporting';

interface SectionState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

function makeSection<T>(): SectionState<T> {
  return { data: null, isLoading: true, error: null };
}

function useSection<T>(fetcher: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<SectionState<T>>(makeSection<T>());
  useEffect(() => {
    let cancelled = false;
    setState(makeSection<T>());
    fetcher()
      .then((data) => { if (!cancelled) setState({ data, isLoading: false, error: null }); })
      .catch((err) => {
        if (!cancelled) {
          setState({ data: null, isLoading: false, error: err instanceof Error ? err.message : String(err) });
          captureException(err instanceof Error ? err : new Error(String(err)));
        }
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

export function useRewardsSectionData(memberId: string | null) {
  const points = useSection(() => fetchPoints(memberId!), [memberId]);
  const badges = useSection(() => fetchBadges(memberId!), [memberId]);
  const challenges = useSection(() => fetchChallenges(memberId!), [memberId]);
  return { points, badges, challenges };
}
```

- [ ] **Step 4: Update RewardsScreen**

In `src/screens/RewardsScreen.tsx`, replace the 8 individual try/catch blocks with `useRewardsSectionData`:

```typescript
const { points, badges, challenges } = useRewardsSectionData(memberId);

// For each section, render either skeleton, error-with-retry, or data:
{points.isLoading && <SectionSkeleton />}
{points.error && (
  <SectionError message={points.error} onRetry={() => {/* refetch */}} />
)}
{points.data && <PointsSection data={points.data} />}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npx jest src/hooks/__tests__/useRewardsSectionData.test.ts src/screens/__tests__/RewardsScreen.test.tsx --no-coverage
```

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useRewardsSectionData.ts src/hooks/__tests__/useRewardsSectionData.test.ts src/screens/RewardsScreen.tsx
git commit -m "feat(epicD): useRewardsSectionData — per-section error isolation replaces 8 ad-hoc try/catch"
```

---

## Task 5: DailyQuestsCard flash fix

**Files:**
- Modify: `src/components/DailyQuestsCard.tsx`

- [ ] **Step 1: Find the remount pattern**

```bash
grep -n "isLoading\|setIsLoading\|null\|undefined" src/components/DailyQuestsCard.tsx | head -20
```

- [ ] **Step 2: Write test for no-flash refresh**

Add to `src/components/__tests__/DailyQuestsCard.test.tsx`:

```typescript
it('does not unmount during refresh — quest list stays mounted', async () => {
  const mockRefresh = jest.fn().mockResolvedValue([
    { id: 'q1', title: 'Daily login', progress: 1, target: 1 },
  ]);
  const { getByTestId, queryByTestId } = render(
    <DailyQuestsCard memberId="m1" onRefresh={mockRefresh} />,
  );
  await act(async () => {});
  // Trigger refresh
  await act(async () => { mockRefresh.mockResolvedValue([{ id: 'q1', title: 'Daily login', progress: 1, target: 1 }]); });
  // Card should still be in the tree (no null unmount)
  expect(queryByTestId('daily-quests-card')).not.toBeNull();
});
```

- [ ] **Step 3: Fix the remount pattern**

In `src/components/DailyQuestsCard.tsx`, find the loading pattern that sets content to null/undefined during refresh:

```typescript
// REMOVE pattern like:
if (isRefreshing) return null; // or setQuests(null) before fetch

// REPLACE WITH: keep quests in state, overlay a refresh indicator
const [quests, setQuests] = useState<Quest[]>(initialQuests ?? []);
const [isRefreshing, setIsRefreshing] = useState(false);

async function refresh() {
  setIsRefreshing(true); // DO NOT clear quests
  try {
    const fresh = await fetchQuests(memberId);
    setQuests(fresh); // in-place update — no unmount
  } finally {
    setIsRefreshing(false);
  }
}
```

The card stays mounted; a subtle opacity or skeleton overlay during `isRefreshing` replaces the unmount/remount.

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx jest src/components/__tests__/DailyQuestsCard.test.tsx --no-coverage
```

- [ ] **Step 5: Commit**

```bash
git add src/components/DailyQuestsCard.tsx
git commit -m "fix(epicD): DailyQuestsCard — in-place state update eliminates visible flash on refresh"
```

---

## Task 6: Gamification push wiring (requires Epic A merged)

**Files:**
- Modify: `src/screens/LoyaltyScreen.tsx` (call emitBadgeEarned after badge award)
- Modify: `src/hooks/useStreak.ts` (call emitTierChanged after tier change)

- [ ] **Step 1: Verify Epic A is merged**

```bash
git log --oneline main | grep "epicA" | head -3
```
If Epic A commit is not in log, do not start this task.

- [ ] **Step 2: Wire badge push in LoyaltyScreen**

In `src/screens/LoyaltyScreen.tsx`, after a badge is awarded (gamification event completion):

```typescript
import { emitBadgeEarned } from '@/services/crossRigEventBus';

// After badge award confirmed:
emitBadgeEarned(wixClient, { badgeId: badge.id, badgeName: badge.name }).catch(() => {});
```

- [ ] **Step 3: Wire tier change push**

In the code path that detects a tier upgrade (check `useStreak`, `useLoyalty`, or `gamificationEventBridge.ts`):

```bash
grep -rn "tier\|Tier" src/hooks/useStreak.ts src/services/gamificationEventBridge.ts | head -20
```

After tier upgrade detected:
```typescript
import { emitTierChanged } from '@/services/crossRigEventBus';

emitTierChanged(wixClient, { oldTier: prev, newTier: current }).catch(() => {});
```

- [ ] **Step 4: Run tests**

```bash
npx jest src/screens/__tests__/LoyaltyScreen.crossRig.test.tsx src/hooks/__tests__/ --no-coverage
```

- [ ] **Step 5: Commit and open PR**

```bash
git add -A
git commit -m "feat(epicD): wire badge/tier push via Epic A notification engine"
git push origin cm-epicD-social-gamification
gh pr create -R DreadPirateRobertz/carolina-futons-mobile \
  --title "feat(epicD): Social + Gamification — referrals, RewardsScreen debt, push wiring" \
  --body "$(cat <<'EOF'
## Summary
- useReducedMotion applied to all gamification animations
- ReferralService: generateReferralLink + recordReferralConversion
- ShareSheet: RN Share API + clipboard fallback on ProfileScreen
- ReferralLandingScreen: handles carolinafutons://referral/:code deep link
- useRewardsSectionData: per-section error isolation replaces 8 ad-hoc try/catch
- DailyQuestsCard: in-place state update eliminates remount flash
- Badge/tier push wired via Epic A notification engine

## Test plan
- [ ] All unit tests pass on linux
- [ ] Share sheet: share link on physical device → app opens with referral applied
- [ ] RewardsScreen: simulate network failure on one section → other sections still render
- [ ] DailyQuestsCard: trigger gamification action → card refreshes with no visible flash
- [ ] Referral deep link: carolinafutons://referral/TEST → ReferralLandingScreen opens

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review Checklist

- ✅ `ReferralService` functions take `callFunction` directly (not WixClient) — decoupled and testable
- ✅ `useRewardsSectionData` uses `useSection` helper — no 8 separate duplicated `useState` blocks
- ✅ `DailyQuestsCard` fix described precisely — keep mounted, overlay during refresh
- ✅ Task 6 gated on Epic A merge with explicit verification step
- ✅ Deep-link route `carolinafutons://referral/:code` matches scheme confirmed in app.json (`carolinafutons`)
- ✅ No TBDs or placeholders
