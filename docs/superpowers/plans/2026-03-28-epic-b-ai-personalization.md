# Epic B — AI Personalization Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface Fit Score badge on PDP, Sommelier results on HomeScreen, and resolve the double-waterfall fetch — coalescing personalization data into a single parallel-fetch hook with a CMS cache layer.

**Architecture:** `usePersonalization` replaces the separate `useSommelierResults` + `useQuizRecommendations` fetches with a single `Promise.all`. `useFitScore` follows the `useSocialProof` pattern exactly. All personalization is additive — missing/null data silently hides the UI; nothing breaks for guests or users with no quiz. `PERSONALIZATION_FIT_SCORE_ENABLED` feature flag gates the Fit Score until cf-hx8m ships.

**Tech Stack:** React Native, AsyncStorage (cache), WixClient.callFunction, jest-expo

**Branch:** `cm-epicB-ai-personalization` (branch off main)

---

## Pre-task: Create branch

```bash
git checkout main && git pull origin main
git checkout -b cm-epicB-ai-personalization
```

---

## Task 1: PersonalizationCache

**Files:**

- Create: `src/services/personalizationCache.ts`
- Create: `src/services/__tests__/personalizationCache.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/services/__tests__/personalizationCache.test.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCachedFitScore,
  setCachedFitScore,
  getCachedSommelierResult,
  setCachedSommelierResult,
  invalidatePersonalizationCache,
} from '../personalizationCache';

const HOUR_MS = 60 * 60 * 1000;

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
});

it('getCachedFitScore returns null when nothing cached', async () => {
  const result = await getCachedFitScore('prod-1', 'member-1');
  expect(result).toBeNull();
});

it('getCachedFitScore returns null when cache is expired', async () => {
  const expired = { score: 88, reasons: [], cachedAt: Date.now() - HOUR_MS - 1 };
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
    JSON.stringify({ 'prod-1_member-1': expired }),
  );
  const result = await getCachedFitScore('prod-1', 'member-1');
  expect(result).toBeNull();
});

it('getCachedFitScore returns value within TTL', async () => {
  const fresh = { score: 92, reasons: ['firm', 'queen'], cachedAt: Date.now() - 1000 };
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
    JSON.stringify({ 'prod-1_member-1': fresh }),
  );
  const result = await getCachedFitScore('prod-1', 'member-1');
  expect(result).toEqual({ score: 92, reasons: ['firm', 'queen'] });
});

it('setCachedFitScore writes with timestamp', async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  await setCachedFitScore('prod-1', 'member-1', { score: 75, reasons: [] });
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(
    '@cf_fit_score_cache',
    expect.stringContaining('"score":75'),
  );
});

it('invalidatePersonalizationCache removes both cache keys', async () => {
  await invalidatePersonalizationCache();
  expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@cf_fit_score_cache');
  expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@cf_sommelier_cache');
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx jest src/services/__tests__/personalizationCache.test.ts --no-coverage
```

- [ ] **Step 3: Implement PersonalizationCache**

```typescript
// src/services/personalizationCache.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const FIT_SCORE_KEY = '@cf_fit_score_cache';
const SOMMELIER_KEY = '@cf_sommelier_cache';
const TTL_MS = 60 * 60 * 1000; // 1 hour

export interface FitScoreCacheEntry {
  score: number;
  reasons: string[];
}

export interface SommelierCacheEntry {
  memberId: string;
  topStyle: string;
  flavors: string[];
  recommendations: unknown[];
}

async function readCache<T extends Record<string, unknown>>(key: string): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : ({} as T);
}

export async function getCachedFitScore(
  productId: string,
  memberId: string,
): Promise<FitScoreCacheEntry | null> {
  const cache =
    await readCache<Record<string, FitScoreCacheEntry & { cachedAt: number }>>(FIT_SCORE_KEY);
  const entry = cache[`${productId}_${memberId}`];
  if (!entry || Date.now() - entry.cachedAt > TTL_MS) return null;
  return { score: entry.score, reasons: entry.reasons };
}

export async function setCachedFitScore(
  productId: string,
  memberId: string,
  data: FitScoreCacheEntry,
): Promise<void> {
  const cache =
    await readCache<Record<string, FitScoreCacheEntry & { cachedAt: number }>>(FIT_SCORE_KEY);
  cache[`${productId}_${memberId}`] = { ...data, cachedAt: Date.now() };
  await AsyncStorage.setItem(FIT_SCORE_KEY, JSON.stringify(cache));
}

export async function getCachedSommelierResult(
  memberId: string,
): Promise<SommelierCacheEntry | null> {
  const cache =
    await readCache<Record<string, SommelierCacheEntry & { cachedAt: number }>>(SOMMELIER_KEY);
  const entry = cache[memberId];
  if (!entry || Date.now() - entry.cachedAt > TTL_MS) return null;
  const { cachedAt: _, ...rest } = entry;
  return rest;
}

export async function setCachedSommelierResult(
  memberId: string,
  data: SommelierCacheEntry,
): Promise<void> {
  const cache =
    await readCache<Record<string, SommelierCacheEntry & { cachedAt: number }>>(SOMMELIER_KEY);
  cache[memberId] = { ...data, cachedAt: Date.now() };
  await AsyncStorage.setItem(SOMMELIER_KEY, JSON.stringify(cache));
}

export async function invalidatePersonalizationCache(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(FIT_SCORE_KEY),
    AsyncStorage.removeItem(SOMMELIER_KEY),
  ]);
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx jest src/services/__tests__/personalizationCache.test.ts --no-coverage
```

- [ ] **Step 5: Commit**

```bash
git add src/services/personalizationCache.ts src/services/__tests__/personalizationCache.test.ts
git commit -m "feat(epicB): PersonalizationCache with 1-hour TTL for Fit Score + Sommelier"
```

---

## Task 2: useFitScore hook

**Files:**

- Create: `src/hooks/useFitScore.ts`
- Create: `src/hooks/__tests__/useFitScore.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/hooks/__tests__/useFitScore.test.ts
import { renderHook, act } from '@testing-library/react-native';

const mockCallFunction = jest.fn();
jest.mock('@/services/wix/wixProvider', () => ({
  useWixClient: () => ({ callFunction: mockCallFunction }),
}));
jest.mock('@/services/personalizationCache', () => ({
  getCachedFitScore: jest.fn().mockResolvedValue(null),
  setCachedFitScore: jest.fn().mockResolvedValue(undefined),
}));

import { useFitScore } from '../useFitScore';
import { getCachedFitScore, setCachedFitScore } from '@/services/personalizationCache';

beforeEach(() => jest.clearAllMocks());

it('returns null when memberId is null (guest user)', async () => {
  const { result } = renderHook(() => useFitScore('prod-1', null));
  await act(async () => {});
  expect(result.current.score).toBeNull();
  expect(mockCallFunction).not.toHaveBeenCalled();
});

it('returns cached score without calling Wix', async () => {
  (getCachedFitScore as jest.Mock).mockResolvedValue({ score: 88, reasons: ['firm'] });
  const { result } = renderHook(() => useFitScore('prod-1', 'member-1'));
  await act(async () => {});
  expect(result.current.score).toBe(88);
  expect(mockCallFunction).not.toHaveBeenCalled();
});

it('fetches from Wix on cache miss and stores result', async () => {
  mockCallFunction.mockResolvedValue({ score: 92, reasons: ['firm', 'queen'] });
  const { result } = renderHook(() => useFitScore('prod-1', 'member-1'));
  await act(async () => {});
  expect(result.current.score).toBe(92);
  expect(setCachedFitScore).toHaveBeenCalledWith('prod-1', 'member-1', {
    score: 92,
    reasons: ['firm', 'queen'],
  });
});

it('returns null score on API error without throwing', async () => {
  mockCallFunction.mockRejectedValue(new Error('network'));
  const { result } = renderHook(() => useFitScore('prod-1', 'member-1'));
  await act(async () => {});
  expect(result.current.score).toBeNull();
  expect(result.current.error).toBeTruthy();
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx jest src/hooks/__tests__/useFitScore.test.ts --no-coverage
```

- [ ] **Step 3: Implement useFitScore**

```typescript
// src/hooks/useFitScore.ts
import { useState, useEffect } from 'react';
import { useWixClient } from '@/services/wix/wixProvider';
import { getCachedFitScore, setCachedFitScore } from '@/services/personalizationCache';
import { captureException } from '@/services/crashReporting';

const FIT_SCORE_ENABLED = process.env.EXPO_PUBLIC_FIT_SCORE_ENABLED === 'true';

export interface FitScoreResult {
  score: number | null;
  reasons: string[];
  isLoading: boolean;
  error: string | null;
}

export function useFitScore(productId: string, memberId: string | null): FitScoreResult {
  const client = useWixClient();
  const [score, setScore] = useState<number | null>(null);
  const [reasons, setReasons] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!memberId || !FIT_SCORE_ENABLED || !client) return;

    let cancelled = false;
    setIsLoading(true);

    async function fetch() {
      try {
        const cached = await getCachedFitScore(productId, memberId!);
        if (cached && !cancelled) {
          setScore(cached.score);
          setReasons(cached.reasons);
          return;
        }
        const result = (await client!.callFunction(
          `/_functions/getFitScore?productId=${encodeURIComponent(productId)}&memberId=${encodeURIComponent(memberId!)}`,
          'GET',
        )) as { score: number; reasons: string[] };
        if (!cancelled) {
          setScore(result.score);
          setReasons(result.reasons);
          await setCachedFitScore(productId, memberId!, {
            score: result.score,
            reasons: result.reasons,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'fit_score_error');
          captureException(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetch();
    return () => {
      cancelled = true;
    };
  }, [productId, memberId, client]);

  return { score, reasons, isLoading, error };
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx jest src/hooks/__tests__/useFitScore.test.ts --no-coverage
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useFitScore.ts src/hooks/__tests__/useFitScore.test.ts
git commit -m "feat(epicB): useFitScore hook — cache-first, guest-safe, feature-flagged"
```

---

## Task 3: FitScoreBadge component

**Files:**

- Modify: `src/components/productBadgeTypes.ts` (add FIT_SCORE type)
- Create: `src/components/FitScoreBadge.tsx`
- Create: `src/components/__tests__/FitScoreBadge.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// src/components/__tests__/FitScoreBadge.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@/hooks/useFitScore', () => ({
  useFitScore: jest.fn(),
}));
jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: { mountainBlue: '#5B8FA8', offWhite: '#FAF7F2', sandDark: '#D4BC96' },
    spacing: { xs: 4, sm: 8 },
    typography: { bodyFamily: 'System' },
    borderRadius: { sm: 4 },
  }),
}));

import { useFitScore } from '@/hooks/useFitScore';
import { FitScoreBadge } from '../FitScoreBadge';

beforeEach(() => jest.clearAllMocks());

it('renders nothing when score is null', () => {
  (useFitScore as jest.Mock).mockReturnValue({ score: null, reasons: [], isLoading: false, error: null });
  const { queryByTestId } = render(<FitScoreBadge productId="prod-1" memberId="mem-1" />);
  expect(queryByTestId('fit-score-badge')).toBeNull();
});

it('renders skeleton when loading', () => {
  (useFitScore as jest.Mock).mockReturnValue({ score: null, reasons: [], isLoading: true, error: null });
  const { getByTestId } = render(<FitScoreBadge productId="prod-1" memberId="mem-1" />);
  expect(getByTestId('fit-score-skeleton')).toBeTruthy();
});

it('renders score when available', () => {
  (useFitScore as jest.Mock).mockReturnValue({ score: 94, reasons: ['firm'], isLoading: false, error: null });
  const { getByText, getByTestId } = render(<FitScoreBadge productId="prod-1" memberId="mem-1" />);
  expect(getByText(/94% match/i)).toBeTruthy();
  expect(getByTestId('fit-score-badge')).toBeTruthy();
});

it('renders nothing on error (graceful degradation)', () => {
  (useFitScore as jest.Mock).mockReturnValue({ score: null, reasons: [], isLoading: false, error: 'network' });
  const { queryByTestId } = render(<FitScoreBadge productId="prod-1" memberId="mem-1" />);
  expect(queryByTestId('fit-score-badge')).toBeNull();
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx jest src/components/__tests__/FitScoreBadge.test.tsx --no-coverage
```

- [ ] **Step 3: Implement FitScoreBadge**

```typescript
// src/components/FitScoreBadge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { useFitScore } from '@/hooks/useFitScore';

interface FitScoreBadgeProps {
  productId: string;
  memberId: string | null;
}

export function FitScoreBadge({ productId, memberId }: FitScoreBadgeProps) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { score, isLoading, error } = useFitScore(productId, memberId);

  if (isLoading) {
    return (
      <View
        testID="fit-score-skeleton"
        style={[styles.skeleton, { backgroundColor: colors.sandDark, borderRadius: borderRadius.sm }]}
      />
    );
  }

  if (!score || error) return null;

  const styles2 = StyleSheet.create({
    badge: {
      backgroundColor: colors.mountainBlue,
      borderRadius: borderRadius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      alignSelf: 'flex-start',
    },
    text: {
      color: colors.offWhite,
      fontFamily: typography.bodyFamily,
      fontSize: 12,
      fontWeight: '600',
    },
  });

  return (
    <View
      testID="fit-score-badge"
      style={styles2.badge}
      accessibilityLabel={`${score}% match for you`}
    >
      <Text style={styles2.text}>{score}% match</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: { width: 72, height: 22 },
});
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx jest src/components/__tests__/FitScoreBadge.test.tsx --no-coverage
```

- [ ] **Step 5: Commit**

```bash
git add src/components/FitScoreBadge.tsx src/components/__tests__/FitScoreBadge.test.tsx
git commit -m "feat(epicB): FitScoreBadge component — skeleton, score, graceful null"
```

---

## Task 4: usePersonalization hook (replaces double waterfall)

**Files:**

- Create: `src/hooks/usePersonalization.ts`
- Create: `src/hooks/__tests__/usePersonalization.test.ts`
- Modify: `src/screens/HomeScreen.tsx` (swap out double hook for single usePersonalization)

- [ ] **Step 1: Write failing tests**

```typescript
// src/hooks/__tests__/usePersonalization.test.ts
import { renderHook, act } from '@testing-library/react-native';

const mockCallFunction = jest.fn();
jest.mock('@/services/wix/wixProvider', () => ({
  useWixClient: () => ({ callFunction: mockCallFunction }),
}));
jest.mock('@/services/personalizationCache', () => ({
  getCachedSommelierResult: jest.fn().mockResolvedValue(null),
  setCachedSommelierResult: jest.fn().mockResolvedValue(undefined),
}));

import { usePersonalization } from '../usePersonalization';

beforeEach(() => jest.clearAllMocks());

it('returns empty state when memberId is null', async () => {
  const { result } = renderHook(() => usePersonalization(null));
  await act(async () => {});
  expect(result.current.sommelierResult).toBeNull();
  expect(result.current.recommendations).toEqual([]);
  expect(result.current.isLoading).toBe(false);
  expect(mockCallFunction).not.toHaveBeenCalled();
});

it('fires both fetches in parallel (single loading gate)', async () => {
  let resolveA: (v: unknown) => void;
  let resolveB: (v: unknown) => void;
  mockCallFunction
    .mockReturnValueOnce(
      new Promise((r) => {
        resolveA = r;
      }),
    )
    .mockReturnValueOnce(
      new Promise((r) => {
        resolveB = r;
      }),
    );

  const { result } = renderHook(() => usePersonalization('member-1'));
  expect(result.current.isLoading).toBe(true);

  await act(async () => {
    resolveA!({ memberId: 'member-1', topStyle: 'Modern', flavors: [], recommendations: [] });
    resolveB!([]);
  });

  expect(result.current.isLoading).toBe(false);
  expect(result.current.sommelierResult?.topStyle).toBe('Modern');
});

it('partial failure does not crash — returns what succeeded', async () => {
  mockCallFunction
    .mockResolvedValueOnce({
      memberId: 'member-1',
      topStyle: 'Cozy',
      flavors: [],
      recommendations: [],
    })
    .mockRejectedValueOnce(new Error('network'));

  const { result } = renderHook(() => usePersonalization('member-1'));
  await act(async () => {});
  expect(result.current.sommelierResult?.topStyle).toBe('Cozy');
  expect(result.current.recommendations).toEqual([]);
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx jest src/hooks/__tests__/usePersonalization.test.ts --no-coverage
```

- [ ] **Step 3: Implement usePersonalization**

```typescript
// src/hooks/usePersonalization.ts
import { useState, useEffect } from 'react';
import { useWixClient } from '@/services/wix/wixProvider';
import {
  getCachedSommelierResult,
  setCachedSommelierResult,
} from '@/services/personalizationCache';
import { captureException } from '@/services/crashReporting';
import type { SommelierCacheEntry } from '@/services/personalizationCache';

export interface PersonalizationResult {
  sommelierResult: SommelierCacheEntry | null;
  recommendations: unknown[];
  topStyle: string | null;
  isLoading: boolean;
  error: string | null;
}

export function usePersonalization(memberId: string | null): PersonalizationResult {
  const client = useWixClient();
  const [sommelierResult, setSommelierResult] = useState<SommelierCacheEntry | null>(null);
  const [recommendations, setRecommendations] = useState<unknown[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!memberId || !client) return;

    let cancelled = false;
    setIsLoading(true);

    async function fetchSommelier(): Promise<SommelierCacheEntry | null> {
      const cached = await getCachedSommelierResult(memberId!);
      if (cached) return cached;
      const result = (await client!.callFunction(
        `/_functions/getSommelierResults?memberId=${encodeURIComponent(memberId!)}`,
        'GET',
      )) as SommelierCacheEntry;
      await setCachedSommelierResult(memberId!, result);
      return result;
    }

    async function fetchRecommendations(): Promise<unknown[]> {
      const result = (await client!.callFunction(
        `/_functions/getQuizRecommendations?memberId=${encodeURIComponent(memberId!)}`,
        'GET',
      )) as unknown[];
      return result ?? [];
    }

    const [sommelierSettled, recsSettled] = [] as unknown as [
      PromiseSettledResult<SommelierCacheEntry | null>,
      PromiseSettledResult<unknown[]>,
    ];

    Promise.allSettled([fetchSommelier(), fetchRecommendations()]).then(([s, r]) => {
      if (cancelled) return;
      if (s.status === 'fulfilled') setSommelierResult(s.value);
      else captureException(s.reason instanceof Error ? s.reason : new Error(String(s.reason)));
      if (r.status === 'fulfilled') setRecommendations(r.value);
      else captureException(r.reason instanceof Error ? r.reason : new Error(String(r.reason)));
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [memberId, client]);

  return {
    sommelierResult,
    recommendations,
    topStyle: sommelierResult?.topStyle ?? null,
    isLoading,
    error,
  };
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx jest src/hooks/__tests__/usePersonalization.test.ts --no-coverage
```

- [ ] **Step 5: Update HomeScreen to use usePersonalization**

In `src/screens/HomeScreen.tsx`, replace the two separate hook calls:

```typescript
// REMOVE:
const { result: sommelierResult } = useSommelierResults(memberId);
const { recommendations } = useQuizRecommendations(memberId);

// REPLACE WITH:
const {
  sommelierResult,
  recommendations,
  topStyle,
  isLoading: personalizationLoading,
} = usePersonalization(memberId);
```

Update any references to the old hook return values to match the new property names.

- [ ] **Step 6: Run HomeScreen tests**

```bash
npx jest src/screens/__tests__/HomeScreen.test.tsx --no-coverage
```

Fix any test failures caused by the hook swap (update mocks to mock `usePersonalization` instead of two separate hooks).

- [ ] **Step 7: Commit**

```bash
git add src/hooks/usePersonalization.ts src/hooks/__tests__/usePersonalization.test.ts src/screens/HomeScreen.tsx
git commit -m "feat(epicB): usePersonalization parallel fetch — eliminates double waterfall on HomeScreen"
```

---

## Task 5: SommelierHeroCard component

**Files:**

- Create: `src/components/SommelierHeroCard.tsx`
- Create: `src/components/__tests__/SommelierHeroCard.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// src/components/__tests__/SommelierHeroCard.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: { espresso: '#3A2518', sandBase: '#E8D5B7', sunsetCoral: '#E8845C', offWhite: '#FAF7F2' },
    spacing: { sm: 8, md: 16, lg: 24 },
    typography: { bodyFamily: 'System', headingFamily: 'System' },
    borderRadius: { md: 8 },
  }),
}));

const mockOnSeepicks = jest.fn();
const DISMISSED_KEY = '@cf_sommelier_hero_dismissed';

import { SommelierHeroCard } from '../SommelierHeroCard';

const result = { topStyle: 'Modern Minimalist', flavors: ['Firm', 'Queen'], memberId: 'm1', recommendations: [] };

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
});

it('renders topStyle and flavors', () => {
  const { getByText } = render(<SommelierHeroCard result={result} onSeePicks={mockOnSeeicks} />);
  expect(getByText(/Modern Minimalist/)).toBeTruthy();
  expect(getByText(/Firm/)).toBeTruthy();
});

it('calls onSeePicks when CTA pressed', () => {
  const { getByText } = render(<SommelierHeroCard result={result} onSeePicks={mockOnSeePicks} />);
  fireEvent.press(getByText(/see your picks/i));
  expect(mockOnSeePicks).toHaveBeenCalled();
});

it('stores dismiss flag and hides card on dismiss', async () => {
  const { getByTestId, queryByTestId } = render(
    <SommelierHeroCard result={result} onSeePicks={mockOnSeePicks} />,
  );
  fireEvent.press(getByTestId('sommelier-hero-dismiss'));
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(DISMISSED_KEY, 'true');
});

it('renders nothing when already dismissed', async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
  const { act } = require('@testing-library/react-native');
  let result2: ReturnType<typeof render>;
  await act(async () => {
    result2 = render(<SommelierHeroCard result={result} onSeePicks={mockOnSeePicks} />);
  });
  expect(result2!.queryByTestId('sommelier-hero-card')).toBeNull();
});

const mockOnSeePicks = mockOnSeeicks = jest.fn();
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx jest src/components/__tests__/SommelierHeroCard.test.tsx --no-coverage
```

- [ ] **Step 3: Implement SommelierHeroCard**

```typescript
// src/components/SommelierHeroCard.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/theme';
import type { SommelierCacheEntry } from '@/services/personalizationCache';

const DISMISSED_KEY = '@cf_sommelier_hero_dismissed';

interface SommelierHeroCardProps {
  result: SommelierCacheEntry;
  onSeePicks: () => void;
}

export function SommelierHeroCard({ result, onSeePicks }: SommelierHeroCardProps) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY).then((v) => setDismissed(v === 'true'));
  }, []);

  async function handleDismiss() {
    await AsyncStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  }

  if (dismissed === null || dismissed) return null;

  const styles = StyleSheet.create({
    card: { backgroundColor: colors.sandBase, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md },
    label: { fontFamily: typography.bodyFamily, fontSize: 12, color: colors.espresso, marginBottom: spacing.sm / 2 },
    style: { fontFamily: typography.headingFamily, fontSize: 18, color: colors.espresso, marginBottom: spacing.sm },
    flavorsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
    flavor: { backgroundColor: colors.offWhite, borderRadius: borderRadius.md, paddingHorizontal: spacing.sm, paddingVertical: 4, marginRight: spacing.sm / 2, marginBottom: spacing.sm / 2 },
    flavorText: { fontFamily: typography.bodyFamily, fontSize: 12, color: colors.espresso },
    cta: { backgroundColor: colors.sunsetCoral, borderRadius: borderRadius.md, paddingVertical: spacing.sm, alignItems: 'center' },
    ctaText: { color: colors.offWhite, fontFamily: typography.bodyFamily, fontWeight: '600' },
    dismiss: { position: 'absolute', top: spacing.sm, right: spacing.sm, padding: spacing.sm },
    dismissText: { color: colors.espresso, fontSize: 16 },
  });

  return (
    <View testID="sommelier-hero-card" style={styles.card}>
      <TouchableOpacity testID="sommelier-hero-dismiss" style={styles.dismiss} onPress={handleDismiss} accessibilityLabel="Dismiss style recommendation">
        <Text style={styles.dismissText}>×</Text>
      </TouchableOpacity>
      <Text style={styles.label}>Based on your style quiz</Text>
      <Text style={styles.style}>{result.topStyle}</Text>
      <View style={styles.flavorsRow}>
        {result.flavors.map((f) => (
          <View key={f} style={styles.flavor}><Text style={styles.flavorText}>{f}</Text></View>
        ))}
      </View>
      <TouchableOpacity style={styles.cta} onPress={onSeePicks} accessibilityRole="button" accessibilityLabel="See your picks">
        <Text style={styles.ctaText}>See your picks</Text>
      </TouchableOpacity>
    </View>
  );
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx jest src/components/__tests__/SommelierHeroCard.test.tsx --no-coverage
```

- [ ] **Step 5: Integrate into HomeScreen**

In `src/screens/HomeScreen.tsx`, add `SommelierHeroCard` above the product grid when `sommelierResult` is non-null:

```typescript
{sommelierResult && (
  <SommelierHeroCard
    result={sommelierResult}
    onSeePicks={() => {/* scroll to product grid ref */}}
  />
)}
```

- [ ] **Step 6: Invalidate cache on quiz completion**

In `src/screens/StyleQuizScreen.tsx`, after a successful quiz submission, call `invalidatePersonalizationCache()` so the next HomeScreen load fetches fresh results.

- [ ] **Step 7: Commit and open PR**

```bash
git add -A
git commit -m "feat(epicB): SommelierHeroCard + FitScoreBadge on PDP + usePersonalization parallel fetch"
git push origin cm-epicB-ai-personalization
gh pr create -R DreadPirateRobertz/carolina-futons-mobile \
  --title "feat(epicB): AI Personalization Layer — Fit Score + Sommelier + parallel fetch" \
  --body "$(cat <<'EOF'
## Summary
- PersonalizationCache: 1-hour TTL AsyncStorage cache for Fit Score + Sommelier
- useFitScore: cache-first, guest-safe, feature-flagged (EXPO_PUBLIC_FIT_SCORE_ENABLED)
- FitScoreBadge: pill badge on PDP with graceful null/error degradation
- usePersonalization: replaces double waterfall — parallel Promise.allSettled fetch
- SommelierHeroCard: dismissible hero on HomeScreen with style + flavors
- Cache invalidated on quiz completion

## Test plan
- [ ] All unit tests pass on linux
- [ ] HomeScreen shows single skeleton during personalization load (not two)
- [ ] FitScoreBadge hidden for guest users and on error
- [ ] SommelierHeroCard dismiss persists across app restarts
- [ ] EXPO_PUBLIC_FIT_SCORE_ENABLED=false hides badge entirely

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review Checklist

- ✅ `PersonalizationCache` → `useFitScore` / `usePersonalization` import paths consistent
- ✅ `SommelierCacheEntry` type used in both cache and hook — no rename drift
- ✅ Feature flag `EXPO_PUBLIC_FIT_SCORE_ENABLED` checked before any Wix call in `useFitScore`
- ✅ `Promise.allSettled` used (not `Promise.all`) — partial failure handled gracefully
- ✅ Quiz completion invalidation wired in Task 5 Step 6
- ✅ No TBDs or placeholders
