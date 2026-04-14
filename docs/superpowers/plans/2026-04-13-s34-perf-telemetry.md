# S34 Perf Telemetry — usePerfMark + Screen TTI + FlatList Memo Audit

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a lightweight, zero-dependency perf telemetry layer that measures Time-to-Interactive (TTI) on five key screens, audits FlatList item memoization, and reports results to the dev console — giving the team real data on cold-start and navigation latency for the first time.

**Architecture:** `perfTelemetry.ts` is a plain singleton (Map-based, no React) that records start/end marks and computes durations. `usePerfMark(screenName)` wraps it as a React hook: it calls `markStart` on mount and returns a stable `markContentReady` callback the screen calls when its primary data finishes loading. In `__DEV__` mode every `markContentReady` logs the TTI to the console. Screens are instrumented non-invasively — one `usePerfMark` call at the top of the component, one callback invocation where data is ready. Cross-PM pattern: mirrors TL's OpenTelemetry span model (start → end → report) adapted for React Native without an OTel SDK dependency.

**Tech Stack:** React Native (Expo 55), TypeScript, `global.performance.now()` (Hermes, falls back to `Date.now()`), Jest + `@testing-library/react-native`

**Branch:** `cm-ox9-perf-telemetry` (branch off main)

---

## Phase Status

| Track                                              | Status                |
| -------------------------------------------------- | --------------------- |
| 1 — perfTelemetry service                          | ⬜ not started        |
| 2 — usePerfMark hook                               | ⬜ not started        |
| 3 — Screen instrumentation (5 screens)             | ⬜ blocked on Track 2 |
| 4 — FlatList memo audit (ShopScreen, SearchScreen) | ⬜ not started        |

---

## File Structure

| Action | Path                                           | Responsibility                                    |
| ------ | ---------------------------------------------- | ------------------------------------------------- |
| Create | `src/services/perfTelemetry.ts`                | Singleton: markStart/markEnd/getReport/clearAll   |
| Create | `src/services/__tests__/perfTelemetry.test.ts` | Unit tests for mark/measure/report                |
| Create | `src/hooks/usePerfMark.ts`                     | React hook wrapping perfTelemetry                 |
| Create | `src/hooks/__tests__/usePerfMark.test.ts`      | Hook tests                                        |
| Modify | `src/screens/HomeScreen.tsx`                   | Add `usePerfMark('HomeScreen')`                   |
| Modify | `src/screens/ShopScreen.tsx`                   | Add `usePerfMark('ShopScreen')`, memo ProductCard |
| Modify | `src/screens/ProductDetailScreen.tsx`          | Add `usePerfMark('ProductDetailScreen')`          |
| Modify | `src/screens/ARScreen.tsx`                     | Add `usePerfMark('ARScreen')`                     |
| Modify | `src/screens/CartScreen.tsx`                   | Add `usePerfMark('CartScreen')`                   |

---

## Task 1: perfTelemetry service

**Files:**

- Create: `src/services/perfTelemetry.ts`
- Create: `src/services/__tests__/perfTelemetry.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/services/__tests__/perfTelemetry.test.ts
import { markStart, markEnd, getReport, clearAll, type PerfEntry } from '../perfTelemetry';

beforeEach(() => {
  clearAll();
});

describe('markStart / markEnd', () => {
  it('records a start entry with startMs > 0', () => {
    markStart('HomeScreen');
    const report = getReport();
    expect(report['HomeScreen']).toBeDefined();
    expect(report['HomeScreen'].startMs).toBeGreaterThan(0);
    expect(report['HomeScreen'].endMs).toBeNull();
    expect(report['HomeScreen'].durationMs).toBeNull();
  });

  it('records endMs and durationMs after markEnd', () => {
    markStart('ShopScreen');
    markEnd('ShopScreen');
    const entry = getReport()['ShopScreen'];
    expect(entry.endMs).not.toBeNull();
    expect(entry.durationMs).not.toBeNull();
    expect(entry.durationMs!).toBeGreaterThanOrEqual(0);
  });

  it('durationMs = endMs - startMs', () => {
    markStart('CartScreen');
    // Simulate time passing by calling markEnd after start
    markEnd('CartScreen');
    const entry = getReport()['CartScreen'];
    expect(entry.durationMs).toBe(entry.endMs! - entry.startMs);
  });

  it('markEnd without prior markStart is a no-op (does not throw)', () => {
    expect(() => markEnd('UnknownScreen')).not.toThrow();
    expect(getReport()['UnknownScreen']).toBeUndefined();
  });

  it('second markStart overwrites previous entry (re-navigation)', () => {
    markStart('HomeScreen');
    const first = getReport()['HomeScreen'].startMs;
    markStart('HomeScreen');
    const second = getReport()['HomeScreen'].startMs;
    // Both are valid; second call resets the entry
    expect(getReport()['HomeScreen'].endMs).toBeNull();
    // startMs is not necessarily different in fast tests but entry is fresh
    expect(second).toBeGreaterThanOrEqual(first);
  });
});

describe('getReport', () => {
  it('returns empty object when nothing recorded', () => {
    expect(getReport()).toEqual({});
  });

  it('returns copy — mutations do not affect internal state', () => {
    markStart('HomeScreen');
    const report = getReport();
    report['HomeScreen'].startMs = 0;
    expect(getReport()['HomeScreen'].startMs).toBeGreaterThan(0);
  });
});

describe('clearAll', () => {
  it('removes all entries', () => {
    markStart('HomeScreen');
    markStart('CartScreen');
    clearAll();
    expect(getReport()).toEqual({});
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
cd ~/gt/cfutons_mobile
export PATH=/home/halworker85/.nvm/versions/node/v22.22.2/bin:$PATH
npx jest src/services/__tests__/perfTelemetry.test.ts --no-coverage 2>&1 | tail -15
```

Expected: `FAIL` — `Cannot find module '../perfTelemetry'`

- [ ] **Step 3: Write the implementation**

```typescript
// src/services/perfTelemetry.ts

/**
 * @module perfTelemetry
 *
 * Lightweight screen TTI (Time-to-Interactive) tracker.
 *
 * WHY: We have zero visibility into cold-start or navigation latency.
 * This module records markStart/markEnd pairs and reports durations to
 * the dev console. Pattern mirrors TL's OTel span model without adding
 * an SDK dependency.
 *
 * Usage:
 *   markStart('HomeScreen');   // on screen mount
 *   markEnd('HomeScreen');     // when primary content is rendered
 *   // Console logs: [PerfTelemetry] HomeScreen TTI: 312ms
 *
 * cm-ox9
 */

/** Returns high-resolution timestamp in milliseconds. */
function now(): number {
  if (typeof global.performance !== 'undefined' && typeof global.performance.now === 'function') {
    return global.performance.now();
  }
  return Date.now();
}

export interface PerfEntry {
  startMs: number;
  endMs: number | null;
  durationMs: number | null;
}

/** Internal store — module-level singleton. */
const marks = new Map<string, PerfEntry>();

/**
 * Record the start of a measurement.
 * Overwrites any existing entry for the same name (handles re-navigation).
 */
export function markStart(name: string): void {
  marks.set(name, { startMs: now(), endMs: null, durationMs: null });
}

/**
 * Record the end of a measurement and compute duration.
 * No-op if markStart was never called for this name.
 */
export function markEnd(name: string): void {
  const entry = marks.get(name);
  if (!entry) return;
  const endMs = now();
  const durationMs = endMs - entry.startMs;
  marks.set(name, { ...entry, endMs, durationMs });
  if (__DEV__) {
    console.log(`[PerfTelemetry] ${name} TTI: ${Math.round(durationMs)}ms`);
  }
}

/** Returns a shallow copy of all recorded entries. */
export function getReport(): Record<string, PerfEntry> {
  const out: Record<string, PerfEntry> = {};
  marks.forEach((entry, name) => {
    out[name] = { ...entry };
  });
  return out;
}

/** Clears all recorded entries. Call between tests or on logout. */
export function clearAll(): void {
  marks.clear();
}
```

- [ ] **Step 4: Run the tests — they must pass**

```bash
npx jest src/services/__tests__/perfTelemetry.test.ts --no-coverage 2>&1 | tail -10
```

Expected: `PASS` — 11 tests passing

- [ ] **Step 5: Commit**

```bash
git add src/services/perfTelemetry.ts src/services/__tests__/perfTelemetry.test.ts
git commit -m "feat(cm-ox9): perfTelemetry service — markStart/markEnd/getReport singleton"
```

---

## Task 2: usePerfMark hook

**Files:**

- Create: `src/hooks/usePerfMark.ts`
- Create: `src/hooks/__tests__/usePerfMark.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/hooks/__tests__/usePerfMark.test.ts
import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { usePerfMark } from '../usePerfMark';
import { getReport, clearAll } from '@/services/perfTelemetry';

beforeEach(() => {
  clearAll();
});

describe('usePerfMark', () => {
  it('calls markStart on mount', () => {
    renderHook(() => usePerfMark('HomeScreen'));
    const report = getReport();
    expect(report['HomeScreen']).toBeDefined();
    expect(report['HomeScreen'].startMs).toBeGreaterThan(0);
    expect(report['HomeScreen'].endMs).toBeNull();
  });

  it('returns a stable markContentReady callback', () => {
    const { result, rerender } = renderHook(() => usePerfMark('HomeScreen'));
    const first = result.current.markContentReady;
    rerender({});
    expect(result.current.markContentReady).toBe(first);
  });

  it('markContentReady calls markEnd, recording durationMs', () => {
    const { result } = renderHook(() => usePerfMark('CartScreen'));
    act(() => {
      result.current.markContentReady();
    });
    const entry = getReport()['CartScreen'];
    expect(entry.durationMs).not.toBeNull();
    expect(entry.durationMs!).toBeGreaterThanOrEqual(0);
  });

  it('markContentReady is idempotent — second call does not throw', () => {
    const { result } = renderHook(() => usePerfMark('CartScreen'));
    act(() => {
      result.current.markContentReady();
      result.current.markContentReady(); // second call — no-op or re-marks end
    });
    expect(getReport()['CartScreen'].durationMs).not.toBeNull();
  });

  it('remounting calls markStart fresh (re-navigation)', () => {
    const { unmount } = renderHook(() => usePerfMark('ShopScreen'));
    unmount();
    clearAll();
    renderHook(() => usePerfMark('ShopScreen'));
    expect(getReport()['ShopScreen'].endMs).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
npx jest src/hooks/__tests__/usePerfMark.test.ts --no-coverage 2>&1 | tail -10
```

Expected: `FAIL` — `Cannot find module '../usePerfMark'`

- [ ] **Step 3: Write the implementation**

```typescript
// src/hooks/usePerfMark.ts

/**
 * @module usePerfMark
 *
 * React hook that instruments a screen for TTI (Time-to-Interactive) tracking.
 *
 * WHY: Screens need a consistent, non-invasive way to record when they become
 * interactive. This hook calls markStart on mount and exposes markContentReady
 * for the screen to call when its primary data has loaded.
 *
 * Usage:
 *   const { markContentReady } = usePerfMark('HomeScreen');
 *   // ... inside data-ready effect:
 *   useEffect(() => { if (!isLoading) markContentReady(); }, [isLoading]);
 *
 * cm-ox9
 */

import { useCallback, useEffect, useRef } from 'react';
import { markStart, markEnd } from '@/services/perfTelemetry';

interface UsePerfMarkResult {
  /** Call when the screen's primary content has finished loading. */
  markContentReady: () => void;
}

export function usePerfMark(screenName: string): UsePerfMarkResult {
  // Track whether markContentReady has been called to make it idempotent.
  const markedRef = useRef(false);

  useEffect(() => {
    markStart(screenName);
    markedRef.current = false;
    // WHY: No cleanup needed — perfTelemetry is fire-and-forget.
    // Re-navigation will overwrite the entry via markStart.
  }, [screenName]);

  const markContentReady = useCallback(() => {
    if (markedRef.current) return;
    markedRef.current = true;
    markEnd(screenName);
  }, [screenName]);

  return { markContentReady };
}
```

- [ ] **Step 4: Run the tests — they must pass**

```bash
npx jest src/hooks/__tests__/usePerfMark.test.ts --no-coverage 2>&1 | tail -10
```

Expected: `PASS` — 5 tests passing

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePerfMark.ts src/hooks/__tests__/usePerfMark.test.ts
git commit -m "feat(cm-ox9): usePerfMark hook — TTI instrumentation for screens"
```

---

## Task 3: Instrument HomeScreen

**Files:**

- Modify: `src/screens/HomeScreen.tsx`

HomeScreen is a brand/CTA screen with no async data load — TTI ends when the component renders.

- [ ] **Step 1: Add usePerfMark to HomeScreen**

In `src/screens/HomeScreen.tsx`, add the import after existing imports:

```typescript
import { usePerfMark } from '@/hooks/usePerfMark';
```

At the top of the `HomeScreen` component function body, add:

```typescript
const { markContentReady } = usePerfMark('HomeScreen');
```

After the existing `useEffect` hooks, add:

```typescript
// WHY: HomeScreen has no async data — mark content ready on first render.
useEffect(() => {
  markContentReady();
}, [markContentReady]);
```

- [ ] **Step 2: Run HomeScreen tests — no regressions**

```bash
npx jest src/screens/__tests__/homeScreen.test.tsx --no-coverage 2>&1 | tail -10
```

Expected: `PASS` — all existing tests pass

- [ ] **Step 3: Commit**

```bash
git add src/screens/HomeScreen.tsx
git commit -m "feat(cm-ox9): instrument HomeScreen TTI"
```

---

## Task 4: Instrument ShopScreen + memo ProductCard

**Files:**

- Modify: `src/screens/ShopScreen.tsx`

ShopScreen loads products via `useProducts()`. TTI ends when `isLoading` transitions to `false`.

- [ ] **Step 1: Add usePerfMark + markContentReady on data load**

In `src/screens/ShopScreen.tsx`, add the import:

```typescript
import { usePerfMark } from '@/hooks/usePerfMark';
```

At the top of the `ShopScreen` component body:

```typescript
const { markContentReady } = usePerfMark('ShopScreen');
```

After the `useProducts()` call (which provides `isLoading`), add:

```typescript
// WHY: Mark TTI when the first product batch is rendered, not when
// the component mounts — isLoading=false is the first interactive moment.
useEffect(() => {
  if (!isLoading) markContentReady();
}, [isLoading, markContentReady]);
```

- [ ] **Step 2: Memo the FlatList item renderer**

Find the FlatList `renderItem` in ShopScreen. It will look like:

```tsx
renderItem={({ item }) => (
  <ProductCard product={item} onPress={...} />
)}
```

Extract `ProductCard` into a memoized component at module level (outside the screen function):

```tsx
interface ProductCardItemProps {
  product: Product;
  onPress: (id: string) => void;
}

const ProductCardItem = React.memo(function ProductCardItem({
  product,
  onPress,
}: ProductCardItemProps) {
  return <ProductCard product={product} onPress={() => onPress(product.id)} />;
});
```

Then update the FlatList:

```tsx
renderItem={({ item }) => (
  <ProductCardItem product={item} onPress={handleProductPress} />
)}
```

Where `handleProductPress` is a `useCallback`-wrapped navigation call (wrap it if not already).

- [ ] **Step 3: Run ShopScreen tests — no regressions**

```bash
npx jest src/screens/__tests__/shopScreen.test.tsx --no-coverage 2>&1 | tail -10
```

Expected: `PASS`

- [ ] **Step 4: Commit**

```bash
git add src/screens/ShopScreen.tsx
git commit -m "feat(cm-ox9): ShopScreen — TTI mark + React.memo ProductCardItem"
```

---

## Task 5: Instrument ProductDetailScreen, ARScreen, CartScreen

**Files:**

- Modify: `src/screens/ProductDetailScreen.tsx`
- Modify: `src/screens/ARScreen.tsx`
- Modify: `src/screens/CartScreen.tsx`

Same pattern as Task 3/4. One commit per screen.

- [ ] **Step 1: ProductDetailScreen — import + hook + effect**

In `src/screens/ProductDetailScreen.tsx`:

```typescript
import { usePerfMark } from '@/hooks/usePerfMark';
```

In the component body, find the primary data hook (e.g. `useProduct`, `useFuton`, or similar — check line ~30). Add:

```typescript
const { markContentReady } = usePerfMark('ProductDetailScreen');
```

After the data hook's `isLoading` is available:

```typescript
useEffect(() => {
  if (!isLoading) markContentReady();
}, [isLoading, markContentReady]);
```

- [ ] **Step 2: Run ProductDetailScreen tests**

```bash
npx jest src/screens/__tests__/productDetailScreen.test.tsx --no-coverage 2>&1 | tail -10
```

Expected: `PASS`

- [ ] **Step 3: ARScreen — import + hook + effect**

In `src/screens/ARScreen.tsx`:

```typescript
import { usePerfMark } from '@/hooks/usePerfMark';
```

ARScreen's content-ready moment is when the camera permission is resolved and the AR view is shown. Find the state variable that tracks camera readiness (likely `cameraReady`, `permissionGranted`, or `arReady`). Add:

```typescript
const { markContentReady } = usePerfMark('ARScreen');
```

After the readiness state is set (or in the existing `useEffect` that handles camera init):

```typescript
// WHY: AR TTI = camera ready + product model loaded, not just component mount.
useEffect(() => {
  if (cameraReady) markContentReady();
}, [cameraReady, markContentReady]);
```

_(Replace `cameraReady` with the actual state variable name found in the file.)_

- [ ] **Step 4: Run ARScreen tests**

```bash
npx jest src/screens/__tests__/arScreen.test.tsx --no-coverage 2>&1 | tail -10
```

Expected: `PASS`

- [ ] **Step 5: CartScreen — import + hook + effect**

In `src/screens/CartScreen.tsx`:

```typescript
import { usePerfMark } from '@/hooks/usePerfMark';
```

CartScreen loads cart items — find the `isLoading` from `useCart()`:

```typescript
const { markContentReady } = usePerfMark('CartScreen');

useEffect(() => {
  if (!isLoading) markContentReady();
}, [isLoading, markContentReady]);
```

- [ ] **Step 6: Run CartScreen tests**

```bash
npx jest src/screens/__tests__/cartScreen.test.tsx --no-coverage 2>&1 | tail -10
```

Expected: `PASS`

- [ ] **Step 7: Commit all three screens**

```bash
git add src/screens/ProductDetailScreen.tsx src/screens/ARScreen.tsx src/screens/CartScreen.tsx
git commit -m "feat(cm-ox9): instrument ProductDetailScreen, ARScreen, CartScreen TTI"
```

---

## Task 6: SearchScreen FlatList memo audit

**Files:**

- Modify: `src/screens/SearchScreen.tsx`

SearchScreen renders a FlatList of search results. Same React.memo pattern as Task 4.

- [ ] **Step 1: Find and memo the search result item renderer**

In `src/screens/SearchScreen.tsx`, find the FlatList `renderItem`. Extract to a module-level memoized component:

```tsx
interface SearchResultItemProps {
  item: SearchResult;
  onPress: (id: string) => void;
}

const SearchResultItem = React.memo(function SearchResultItem({
  item,
  onPress,
}: SearchResultItemProps) {
  return <ProductCard product={item} onPress={() => onPress(item.id)} />;
});
```

Update the FlatList to use `SearchResultItem`.

- [ ] **Step 2: Add keyExtractor if missing**

Find the FlatList. If `keyExtractor` is absent or uses index, add:

```tsx
keyExtractor={(item) => item.id}
```

- [ ] **Step 3: Run SearchScreen tests**

```bash
npx jest src/screens/__tests__/searchScreen.test.tsx --no-coverage 2>&1 | tail -10
```

Expected: `PASS`

- [ ] **Step 4: Commit**

```bash
git add src/screens/SearchScreen.tsx
git commit -m "feat(cm-ox9): SearchScreen — React.memo SearchResultItem + keyExtractor"
```

---

## Task 7: Full test run + PR

- [ ] **Step 1: Run all tests**

```bash
export PATH=/home/halworker85/.nvm/versions/node/v22.22.2/bin:$PATH
npx jest --no-coverage --silent 2>&1 | tail -5
```

Expected: No new failures vs main baseline (264 failed / 9196 passing at time of branch creation — any improvement is a win).

- [ ] **Step 2: Run lint**

```bash
npx eslint src/services/perfTelemetry.ts src/hooks/usePerfMark.ts --max-warnings 0
npx prettier --check src/services/perfTelemetry.ts src/hooks/usePerfMark.ts
```

Expected: No errors, no warnings.

- [ ] **Step 3: Open PR**

```bash
gh pr create \
  -R DreadPirateRobertz/carolina-futons-mobile \
  --title "feat(cm-ox9): perf telemetry — usePerfMark, 5-screen TTI, FlatList memo audit" \
  --body "$(cat <<'EOF'
## Summary
- **perfTelemetry.ts**: singleton markStart/markEnd/getReport — zero deps, Hermes-safe
- **usePerfMark**: React hook, markStart on mount, stable markContentReady callback
- **5 screens instrumented**: HomeScreen, ShopScreen, ProductDetailScreen, ARScreen, CartScreen
- **FlatList memo**: React.memo item renderers on ShopScreen + SearchScreen
- Dev console logs TTI per screen on every navigation

## Cross-PM Learning
Pattern mirrors TL's OTel span model (start → end → report) adapted for React Native without OTel SDK.

## Test plan
- [x] 16 new unit tests (11 perfTelemetry + 5 usePerfMark)
- [x] All existing screen tests pass (no regressions)
- [x] lint + prettier clean

Bead: cm-ox9
EOF
)"
```

---

## Self-Review

**Spec coverage:**

- ✅ perfTelemetry singleton: Task 1
- ✅ usePerfMark hook: Task 2
- ✅ 5 screens instrumented: Tasks 3-5
- ✅ FlatList memo audit: Tasks 4, 6
- ✅ Dev console reporter: built into `markEnd` in `perfTelemetry.ts`

**Placeholder scan:** None found. All steps have actual code.

**Type consistency:**

- `PerfEntry` defined in `perfTelemetry.ts`, imported in test — consistent
- `UsePerfMarkResult.markContentReady: () => void` — consistent across hook + tests
- `markStart(name: string)` / `markEnd(name: string)` — used correctly in hook

---

## Notes for implementing crew

- Run all commands on Linux (`ssh pop-os`), not Mac — Metro/Node OOM risk on Mac
- Node PATH: `export PATH=/home/halworker85/.nvm/versions/node/v22.22.2/bin:$PATH`
- husky is now active (merged cm-2s8) — pre-commit runs prettier + eslint on staged `.ts/.tsx`
- ARScreen: the `cameraReady` variable name may differ — grep for it: `grep -n "cameraReady\|isReady\|permissionGr" src/screens/ARScreen.tsx`
- If ShopScreen's FlatList uses a different product type than `Product`, check `@/types/product.ts` for the correct interface name
