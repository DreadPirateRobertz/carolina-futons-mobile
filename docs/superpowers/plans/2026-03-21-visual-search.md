# Visual Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Photo-to-product matching: user snaps or uploads a photo → app returns similar futons from the catalog via OpenAI vision + local attribute scoring.

**Architecture:** expo-image-picker (EXIF stripped) → `useVisualSearch` hook → POST `/_functions/visualSearch` (Wix backend with SSRF guards) → OpenAI gpt-4o-mini → `{category, style, colorFamily, keywords}` → client-side attribute scoring → top-6 results. Two entry points: camera icon in SearchBar (replaces grid in-place) and "Find Similar" on ProductDetailScreen (navigates to VisualSearchResultsScreen).

**Tech Stack:** React Native, expo-image-picker, TypeScript, WixClient (existing pattern), Jest/RNTL for tests, Node.js (Wix backend, cfutons repo)

---

## File Map

### New files — mobile (`cfutons_mobile`)

| Path | Responsibility |
|------|---------------|
| `src/hooks/useVisualSearch.ts` | State machine + image picker + backend call + local scoring |
| `src/hooks/__tests__/useVisualSearch.test.ts` | 12 unit tests (TDD) |
| `src/components/VisualSearchEmptyState.tsx` | Zero-result empty state (distinct from SearchEmptyState) |
| `src/components/__tests__/VisualSearchEmptyState.test.tsx` | Render + "Browse All" CTA tests |
| `src/screens/VisualSearchResultsScreen.tsx` | "Find Similar" results with match-reason chips |
| `src/screens/__tests__/VisualSearchResultsScreen.test.tsx` | Screen render + navigation tests |

### Modified files — mobile

| Path | Change |
|------|--------|
| `src/data/products.ts` | Add `tags?: string[]` and `colorFamily?: string` to `Product` interface; populate on all PRODUCTS entries |
| `src/services/wix/wixClient.ts` | Add `callVisualSearch(imageBase64: string)` method |
| `src/components/SearchBar.tsx` | Add `onCameraPress?: () => void` prop + camera icon button |
| `src/components/__tests__/SearchBar.test.tsx` | Add test: camera icon press calls onCameraPress |
| `src/screens/SearchScreen.tsx` | Wire `useVisualSearch`, inject results, show badge |
| `src/screens/ProductDetailScreen.tsx` | Add "Find Similar" secondary CTA |
| `src/navigation/AppNavigator.tsx` | Add `VisualSearchResults` to `RootStackParamList` and Stack |

### New files — Wix backend (`cfutons` repo at `/Users/hal/gt/cfutons`)

| Path | Responsibility |
|------|---------------|
| `src/public/visualSearch.js` | POST `/_functions/visualSearch` — SSRF-guarded OpenAI call |
| `tests/unit/visualSearch.test.js` | 13 SSRF + API error tests (TDD) |

---

## Task 1: Product schema — add tags and colorFamily

**Files:**
- Modify: `src/data/products.ts`

- [ ] **Step 1: Add fields to Product interface**

In `src/data/products.ts`, add to the `Product` interface (after the `dimensions` field):

```typescript
  tags?: string[];          // style keywords: "modern", "rustic", "mid-century", etc.
  colorFamily?: string;     // "neutral" | "warm" | "cool" | "dark" | "light"
```

- [ ] **Step 2: Populate tags and colorFamily on each PRODUCTS entry**

For every product object in the `PRODUCTS` array, add appropriate `tags` and `colorFamily`. Example pattern:

```typescript
// Futon entry example:
tags: ['modern', 'mid-century'],
colorFamily: 'neutral',
```

Use judgment for each product based on name/description. Every product must have both fields populated (not optional in practice — the interface allows undefined for forward-compat only).

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/hal/gt/cfutons_mobile && npx tsc --noEmit 2>&1 | grep products
```

Expected: no errors for products.ts

- [ ] **Step 4: Commit**

```bash
cd /Users/hal/gt/cfutons_mobile
git add src/data/products.ts
git commit -m "feat(cm-21k): add tags + colorFamily to Product schema, populate all entries"
```

---

## Task 2: WixClient — callVisualSearch method

**Files:**
- Modify: `src/services/wix/wixClient.ts`

- [ ] **Step 1: Add method to WixClient class**

Find the Payments section in `wixClient.ts` and add after the existing payment methods (or in a new "Visual Search" section near the end before the closing brace of the class):

```typescript
// ── Visual Search ──────────────────────────────────────────────

/**
 * Classify a photo via the Wix visualSearch backend function.
 * Image is sent as a base64-encoded string. The backend strips EXIF,
 * calls OpenAI vision API (SSRF-guarded), and returns attribute JSON.
 *
 * @param imageBase64 - base64-encoded image (no data URI prefix)
 */
async callVisualSearch(imageBase64: string): Promise<{
  category: string;
  style: string;
  colorFamily: string;
  keywords: string[];
}> {
  return this.post('/_functions/visualSearch', { image: imageBase64 });
}
```

Note: `this.post` builds `${this.baseUrl}/_functions/visualSearch`. The `baseUrl` is the Wix site URL (e.g., `https://www.carolinafutons.com`), which is correct for Wix serverless functions.

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/hal/gt/cfutons_mobile && npx tsc --noEmit 2>&1 | grep wixClient
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/hal/gt/cfutons_mobile
git add src/services/wix/wixClient.ts
git commit -m "feat(cm-21k): add callVisualSearch method to WixClient"
```

---

## Task 3: useVisualSearch hook — tests first (TDD)

**Files:**
- Create: `src/hooks/__tests__/useVisualSearch.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/__tests__/useVisualSearch.test.ts`:

```typescript
/**
 * cm-21k — useVisualSearch hook tests (TDD)
 *
 * Written BEFORE implementation. All should fail until Task 4 is complete.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useVisualSearch } from '../useVisualSearch';
import * as ImagePicker from 'expo-image-picker';

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
  ImagePickerResult: {},
}));

const mockCallVisualSearch = jest.fn();
jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: jest.fn(() => ({
    callVisualSearch: mockCallVisualSearch,
  })),
}));

jest.mock('@/data/products', () => {
  const { PRODUCTS } = jest.requireActual('@/data/products');
  return { PRODUCTS };
});

const CANCELLED_RESULT = { canceled: true, assets: null };
const IMAGE_RESULT = {
  canceled: false,
  assets: [{ base64: 'abc123', uri: 'file://photo.jpg' }],
};
const AI_RESPONSE = {
  category: 'futons',
  style: 'modern',
  colorFamily: 'neutral',
  keywords: ['sofa', 'convertible'],
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe('useVisualSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue(IMAGE_RESULT);
    mockCallVisualSearch.mockResolvedValue(AI_RESPONSE);
  });

  it('starts in idle state with empty results', () => {
    const { result } = renderHook(() => useVisualSearch());
    expect(result.current.status).toBe('idle');
    expect(result.current.results).toEqual([]);
    expect(result.current.query).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('stays idle when picker is cancelled', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue(CANCELLED_RESULT);
    const { result } = renderHook(() => useVisualSearch());
    await act(async () => { await result.current.trigger(); });
    expect(result.current.status).toBe('idle');
  });

  it('transitions to loading while awaiting backend', async () => {
    let resolveBackend!: (v: typeof AI_RESPONSE) => void;
    mockCallVisualSearch.mockReturnValue(new Promise((r) => { resolveBackend = r; }));

    const { result } = renderHook(() => useVisualSearch());
    act(() => { result.current.trigger(); });

    await waitFor(() => expect(result.current.status).toBe('loading'));
    resolveBackend(AI_RESPONSE);
  });

  it('transitions to success with scored results', async () => {
    const { result } = renderHook(() => useVisualSearch());
    await act(async () => { await result.current.trigger(); });
    expect(result.current.status).toBe('success');
    expect(result.current.results.length).toBeGreaterThan(0);
  });

  it('sets matchType=fallback when no products score >= 1', async () => {
    mockCallVisualSearch.mockResolvedValue({
      category: 'unknown',
      style: 'unknown',
      colorFamily: 'unknown',
      keywords: [],
    });
    const { result } = renderHook(() => useVisualSearch());
    await act(async () => { await result.current.trigger(); });
    expect(result.current.query?.matchType).toBe('fallback');
  });

  it('sets matchType=scored when at least one product scores >= 1', async () => {
    const { result } = renderHook(() => useVisualSearch());
    await act(async () => { await result.current.trigger(); });
    expect(result.current.query?.matchType).toBe('scored');
  });

  it('transitions to error on backend 500', async () => {
    mockCallVisualSearch.mockRejectedValue(new Error('Internal Server Error'));
    const { result } = renderHook(() => useVisualSearch());
    await act(async () => { await result.current.trigger(); });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBeTruthy();
  });

  it('transitions to error on network timeout', async () => {
    mockCallVisualSearch.mockRejectedValue(new Error('Network timeout'));
    const { result } = renderHook(() => useVisualSearch());
    await act(async () => { await result.current.trigger(); });
    expect(result.current.status).toBe('error');
  });

  it('transitions to error when wixClient is null', async () => {
    const { useOptionalWixClient } = require('@/services/wix/wixProvider');
    (useOptionalWixClient as jest.Mock).mockReturnValueOnce(null);
    const { result } = renderHook(() => useVisualSearch());
    await act(async () => { await result.current.trigger(); });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('unavailable');
  });

  it('reset() returns to idle with empty results', async () => {
    const { result } = renderHook(() => useVisualSearch());
    await act(async () => { await result.current.trigger(); });
    expect(result.current.status).toBe('success');
    act(() => { result.current.reset(); });
    expect(result.current.status).toBe('idle');
    expect(result.current.results).toEqual([]);
    expect(result.current.query).toBeNull();
  });

  it('calls launchImageLibraryAsync with exif:false', async () => {
    const { result } = renderHook(() => useVisualSearch());
    await act(async () => { await result.current.trigger(); });
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({ exif: false }),
    );
  });

  it('calls launchCameraAsync with exif:false when camera mode requested', async () => {
    const { result } = renderHook(() => useVisualSearch());
    await act(async () => { await result.current.trigger({ useCamera: true }); });
    expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith(
      expect.objectContaining({ exif: false }),
    );
  });
});
```

- [ ] **Step 2: Run tests to confirm they all fail**

```bash
cd /Users/hal/gt/cfutons_mobile
npx jest src/hooks/__tests__/useVisualSearch.test.ts --no-coverage 2>&1 | tail -5
```

Expected: `Tests: 12 failed, 0 passed`

- [ ] **Step 3: Commit failing tests**

```bash
cd /Users/hal/gt/cfutons_mobile
git add src/hooks/__tests__/useVisualSearch.test.ts
git commit -m "test(cm-21k): useVisualSearch — 11 TDD tests (all failing)"
```

---

## Task 4: useVisualSearch hook — implementation

**Files:**
- Create: `src/hooks/useVisualSearch.ts`

- [ ] **Step 1: Create the hook**

Create `src/hooks/useVisualSearch.ts`:

```typescript
/**
 * useVisualSearch — photo-to-product matching hook.
 *
 * State machine: idle → loading → success | error
 * Launches expo-image-picker (EXIF stripped), POSTs base64 to Wix backend,
 * then scores PRODUCTS locally against returned attributes.
 */
import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useOptionalWixClient } from '@/services/wix/wixProvider';
import { PRODUCTS, type Product } from '@/data/products';

export type VisualSearchStatus = 'idle' | 'loading' | 'success' | 'error';

export interface VisualSearchQuery {
  category: string;
  style: string;
  colorFamily: string;
  keywords: string[];
  matchType: 'scored' | 'fallback';
}

export interface UseVisualSearchReturn {
  status: VisualSearchStatus;
  results: Product[];
  query: VisualSearchQuery | null;
  error: string | null;
  trigger: () => Promise<void>;
  reset: () => void;
}

/** Score a product against AI-returned attributes. Higher = better match. */
function scoreProduct(
  product: Product,
  category: string,
  colorFamily: string,
  style: string,
  keywords: string[],
): number {
  let score = 0;
  if (product.category === category) score += 3;
  if (product.colorFamily && product.colorFamily === colorFamily) score += 2;
  const text = `${product.name} ${product.description}`.toLowerCase();
  for (const kw of keywords) {
    if (kw && text.includes(kw.toLowerCase())) score += 1;
  }
  if (style && product.tags?.includes(style)) score += 1;
  return score;
}

export function useVisualSearch(): UseVisualSearchReturn {
  const [status, setStatus] = useState<VisualSearchStatus>('idle');
  const [results, setResults] = useState<Product[]>([]);
  const [query, setQuery] = useState<VisualSearchQuery | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wixClient = useOptionalWixClient();

  const trigger = useCallback(async (opts?: { useCamera?: boolean }) => {
    // Launch picker with EXIF stripped (zhora security requirement)
    const launcher = opts?.useCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const picked = await launcher({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      exif: false,
      quality: 0.7,
    });

    if (picked.canceled || !picked.assets?.[0]?.base64) {
      return; // user cancelled — stay idle
    }

    if (!wixClient) {
      setStatus('error');
      setError('Wix client unavailable — visual search requires a connected session');
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      const attrs = await wixClient.callVisualSearch(picked.assets[0].base64);
      const { category, style, colorFamily, keywords } = attrs;

      // Score all products locally — no additional network call
      const scored = PRODUCTS.map((p) => ({
        product: p,
        score: scoreProduct(p, category, colorFamily, style, keywords ?? []),
      }));

      const hasScored = scored.some((s) => s.score >= 1);
      let finalResults: Product[];
      const matchType: 'scored' | 'fallback' = hasScored ? 'scored' : 'fallback';

      if (hasScored) {
        finalResults = scored
          .filter((s) => s.score >= 1)
          .sort((a, b) => b.score - a.score)
          .slice(0, 6)
          .map((s) => s.product);
      } else {
        // Fallback: top 3 by rating, same-category preferred
        finalResults = [...PRODUCTS]
          .sort((a, b) => {
            const catBoost = (a.category === category ? 1 : 0) - (b.category === category ? 1 : 0);
            return catBoost !== 0 ? -catBoost : b.rating - a.rating;
          })
          .slice(0, 3);
      }

      setResults(finalResults);
      setQuery({ category, style, colorFamily, keywords: keywords ?? [], matchType });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Visual search failed');
    }
  }, [wixClient]);

  const reset = useCallback(() => {
    setStatus('idle');
    setResults([]);
    setQuery(null);
    setError(null);
  }, []);

  return { status, results, query, error, trigger, reset };
}
```

- [ ] **Step 2: Run tests**

```bash
cd /Users/hal/gt/cfutons_mobile
npx jest src/hooks/__tests__/useVisualSearch.test.ts --no-coverage 2>&1 | tail -5
```

Expected: `Tests: 11 passed, 11 total`

- [ ] **Step 3: Fix any failures before proceeding**

If tests fail, diagnose and fix the hook. Do NOT move on until all 11 pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/hal/gt/cfutons_mobile
git add src/hooks/useVisualSearch.ts
git commit -m "feat(cm-21k): useVisualSearch hook — idle→loading→success|error, local scoring"
```

---

## Task 5: VisualSearchEmptyState component

**Files:**
- Create: `src/components/VisualSearchEmptyState.tsx`
- Create: `src/components/__tests__/VisualSearchEmptyState.test.tsx`

- [ ] **Step 1: Write tests first**

Create `src/components/__tests__/VisualSearchEmptyState.test.tsx`:

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { VisualSearchEmptyState } from '../VisualSearchEmptyState';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: { espresso: '#3E2723', espressoLight: '#795548', sandBase: '#F5F0E8', sunsetCoral: '#FF6B47' },
    spacing: { md: 16, lg: 24 },
    borderRadius: { button: 8 },
  }),
}));

describe('VisualSearchEmptyState', () => {
  it('renders the empty state copy', () => {
    const { getByText } = render(<VisualSearchEmptyState onBrowseAll={jest.fn()} />);
    expect(getByText(/no similar products found/i)).toBeTruthy();
    expect(getByText(/clearer photo/i)).toBeTruthy();
  });

  it('renders "Browse All" CTA button', () => {
    const { getByText } = render(<VisualSearchEmptyState onBrowseAll={jest.fn()} />);
    expect(getByText('Browse All')).toBeTruthy();
  });

  it('calls onBrowseAll when "Browse All" is pressed', () => {
    const onBrowseAll = jest.fn();
    const { getByText } = render(<VisualSearchEmptyState onBrowseAll={onBrowseAll} />);
    fireEvent.press(getByText('Browse All'));
    expect(onBrowseAll).toHaveBeenCalledTimes(1);
  });

  it('renders with testID', () => {
    const { getByTestId } = render(
      <VisualSearchEmptyState onBrowseAll={jest.fn()} testID="vs-empty" />,
    );
    expect(getByTestId('vs-empty')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd /Users/hal/gt/cfutons_mobile
npx jest src/components/__tests__/VisualSearchEmptyState.test.tsx --no-coverage 2>&1 | tail -3
```

Expected: FAIL (module not found)

- [ ] **Step 3: Create the component**

Create `src/components/VisualSearchEmptyState.tsx`:

```typescript
/**
 * VisualSearchEmptyState — shown when a visual search returns 0 results.
 * This is NOT SearchEmptyState — different props, different copy, different CTAs.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

interface Props {
  onBrowseAll: () => void;
  testID?: string;
}

export function VisualSearchEmptyState({ onBrowseAll, testID }: Props) {
  const { colors, spacing, borderRadius } = useTheme();

  return (
    <View style={styles.root} testID={testID ?? 'visual-search-empty-state'}>
      <Text style={[styles.icon]}>🔍</Text>
      <Text style={[styles.heading, { color: colors.espresso }]}>
        No similar products found
      </Text>
      <Text style={[styles.body, { color: colors.espressoLight }]}>
        Try a clearer photo showing the furniture directly.
      </Text>
      <TouchableOpacity
        style={[styles.cta, { backgroundColor: colors.sunsetCoral, borderRadius: borderRadius.button }]}
        onPress={onBrowseAll}
        accessibilityRole="button"
        accessibilityLabel="Browse all products"
        testID="browse-all-btn"
      >
        <Text style={styles.ctaText}>Browse All</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  icon: { fontSize: 48, marginBottom: 8 },
  heading: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  cta: { paddingVertical: 14, paddingHorizontal: 32, marginTop: 8 },
  ctaText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd /Users/hal/gt/cfutons_mobile
npx jest src/components/__tests__/VisualSearchEmptyState.test.tsx --no-coverage 2>&1 | tail -3
```

Expected: `Tests: 4 passed, 4 total`

- [ ] **Step 5: Commit**

```bash
cd /Users/hal/gt/cfutons_mobile
git add src/components/VisualSearchEmptyState.tsx src/components/__tests__/VisualSearchEmptyState.test.tsx
git commit -m "feat(cm-21k): VisualSearchEmptyState component with Browse All CTA"
```

---

## Task 6: SearchBar — camera icon

**Files:**
- Modify: `src/components/SearchBar.tsx`
- Modify: `src/components/__tests__/SearchBar.test.tsx` (or create if not exists)

- [ ] **Step 1: Read current SearchBar test file**

```bash
cd /Users/hal/gt/cfutons_mobile
cat src/components/__tests__/SearchBar.test.tsx 2>/dev/null | head -50
```

If the file doesn't exist, create it with just the camera test. If it exists, add the camera test.

- [ ] **Step 2: Add camera test**

Append to `SearchBar.test.tsx` (or add inside the existing `describe` block):

```typescript
it('calls onCameraPress when camera icon is pressed', () => {
  const onCameraPress = jest.fn();
  const { getByTestId } = render(
    <SearchBar value="" onChangeText={jest.fn()} onCameraPress={onCameraPress} />,
  );
  fireEvent.press(getByTestId('camera-icon-btn'));
  expect(onCameraPress).toHaveBeenCalledTimes(1);
});

it('does not render camera icon when onCameraPress is not provided', () => {
  const { queryByTestId } = render(
    <SearchBar value="" onChangeText={jest.fn()} />,
  );
  expect(queryByTestId('camera-icon-btn')).toBeNull();
});
```

- [ ] **Step 3: Run SearchBar test — expect camera test to fail**

```bash
cd /Users/hal/gt/cfutons_mobile
npx jest src/components/__tests__/SearchBar.test.tsx --no-coverage 2>&1 | grep -E "✕|✓|PASS|FAIL" | head -10
```

- [ ] **Step 4: Add onCameraPress prop to SearchBar**

In `src/components/SearchBar.tsx`, add `onCameraPress?: () => void` to the Props interface, then add a camera icon button to the right side of the search bar (inside the container, after the TextInput):

```typescript
// In Props interface:
onCameraPress?: () => void;

// In render, add after TextInput and before closing View:
{onCameraPress && (
  <TouchableOpacity
    testID="camera-icon-btn"
    onPress={onCameraPress}
    accessibilityRole="button"
    accessibilityLabel="Search with camera"
    style={styles.cameraBtn}
  >
    <Text style={styles.cameraIcon}>📷</Text>
  </TouchableOpacity>
)}

// In styles:
cameraBtn: { padding: 8 },
cameraIcon: { fontSize: 20 },
```

- [ ] **Step 5: Run SearchBar tests — all pass**

```bash
cd /Users/hal/gt/cfutons_mobile
npx jest src/components/__tests__/SearchBar.test.tsx --no-coverage 2>&1 | tail -3
```

Expected: all tests pass including the 2 new camera ones.

- [ ] **Step 6: Commit**

```bash
cd /Users/hal/gt/cfutons_mobile
git add src/components/SearchBar.tsx src/components/__tests__/SearchBar.test.tsx
git commit -m "feat(cm-21k): add camera icon to SearchBar with onCameraPress prop"
```

---

## Task 7: SearchScreen integration

**Files:**
- Modify: `src/screens/SearchScreen.tsx`

- [ ] **Step 0: Write failing tests for new visual search states**

In `src/screens/__tests__/SearchScreen.test.tsx`, add the following tests (they will fail until Step 1 is done):

```typescript
// Add these imports to the existing test file (or add at top if creating new describe block)
import { useVisualSearch } from '@/hooks/useVisualSearch';

jest.mock('@/hooks/useVisualSearch', () => ({
  useVisualSearch: jest.fn(),
}));

const mockUseVisualSearch = useVisualSearch as jest.MockedFunction<typeof useVisualSearch>;

describe('SearchScreen visual search integration', () => {
  const mockTrigger = jest.fn();
  const mockReset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading spinner when vsStatus is loading', () => {
    mockUseVisualSearch.mockReturnValue({ trigger: mockTrigger, status: 'loading', results: [], query: null, error: null, reset: mockReset });
    const { getByTestId } = render(<SearchScreen {...mockProps} />);
    expect(getByTestId('visual-search-loading')).toBeTruthy();
  });

  it('shows VisualSearchEmptyState when success with no results', () => {
    mockUseVisualSearch.mockReturnValue({ trigger: mockTrigger, status: 'success', results: [], query: { category: 'futons', style: 'modern', colorFamily: 'neutral', keywords: [], matchType: 'scored' }, error: null, reset: mockReset });
    const { getByTestId } = render(<SearchScreen {...mockProps} />);
    expect(getByTestId('visual-search-empty-state')).toBeTruthy();
  });

  it('shows visual search results with badge when success with results', () => {
    const mockProducts = [{ id: 'p1', name: 'Test Futon', slug: 'test-futon', category: 'futons', price: 499, rating: 4.5, images: [], description: '', tags: [] }];
    mockUseVisualSearch.mockReturnValue({ trigger: mockTrigger, status: 'success', results: mockProducts, query: { category: 'futons', style: 'modern', colorFamily: 'neutral', keywords: [], matchType: 'scored' }, error: null, reset: mockReset });
    const { getByTestId } = render(<SearchScreen {...mockProps} />);
    expect(getByTestId('visual-search-badge')).toBeTruthy();
  });

  it('calls vsReset when text changes while visual search is active', () => {
    mockUseVisualSearch.mockReturnValue({ trigger: mockTrigger, status: 'success', results: [], query: null, error: null, reset: mockReset });
    const { getByTestId } = render(<SearchScreen {...mockProps} />);
    fireEvent.changeText(getByTestId('search-input'), 'new text');
    expect(mockReset).toHaveBeenCalled();
  });
});
```

Run to confirm they fail:
```bash
cd /Users/hal/gt/cfutons_mobile
npx jest src/screens/__tests__/SearchScreen.test.tsx --no-coverage 2>&1 | tail -10
```
Expected: test failures referencing missing `visual-search-loading`, `visual-search-badge`, `visual-search-empty-state` testIDs.

- [ ] **Step 1: Add useVisualSearch and visual badge to SearchScreen**

In `src/screens/SearchScreen.tsx`:

1. Import `useVisualSearch` and `VisualSearchEmptyState`:
```typescript
import { useVisualSearch } from '@/hooks/useVisualSearch';
import { VisualSearchEmptyState } from '@/components/VisualSearchEmptyState';
```

2. Add hook call near top of component (after existing hooks):
```typescript
const { trigger, status: vsStatus, results: vsResults, reset: vsReset } = useVisualSearch();
```

3. Add `visualSearchActive` derived boolean:
```typescript
const visualSearchActive = vsStatus === 'success' || vsStatus === 'loading';
```

4. Clear visual search when text input changes (add to existing `onChangeText` handler or wrap):
```typescript
const handleTextChange = (text: string) => {
  if (vsStatus !== 'idle') vsReset();
  onChangeText(text); // call existing handler
};
```

5. Pass `onCameraPress={trigger}` to `<SearchBar>`.

6. In the FlatList or grid section, conditionally render:
   - If `vsStatus === 'loading'`: loading spinner with `testID="visual-search-loading"`
   - If `vsStatus === 'success' && vsResults.length === 0`: `<VisualSearchEmptyState testID="visual-search-empty-state" onBrowseAll={() => navigation.navigate('Tabs', { screen: 'Shop' })} />`
   - If `vsStatus === 'success' && vsResults.length > 0`: render vsResults with existing ProductCard + a "Visual Search" badge above the grid
   - Otherwise: existing `useProducts()` results

7. Add "Visual Search" badge (only when `visualSearchActive`):
```typescript
{visualSearchActive && (
  <View testID="visual-search-badge" style={styles.vsBadge}>
    <Text style={styles.vsBadgeText}>📷 Visual Search</Text>
    <TouchableOpacity onPress={vsReset}>
      <Text style={styles.vsBadgeClear}>✕</Text>
    </TouchableOpacity>
  </View>
)}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/hal/gt/cfutons_mobile && npx tsc --noEmit 2>&1 | grep SearchScreen
```

Expected: no errors.

- [ ] **Step 3: Run ALL SearchScreen tests (regression + new visual search tests)**

```bash
cd /Users/hal/gt/cfutons_mobile
npx jest src/screens/__tests__/SearchScreen.test.tsx --no-coverage 2>&1 | tail -10
```

Expected: all tests pass including the 4 new visual search tests from Step 0. If any fail, fix before proceeding.

- [ ] **Step 4: Commit**

```bash
cd /Users/hal/gt/cfutons_mobile
git add src/screens/SearchScreen.tsx
git commit -m "feat(cm-21k): wire useVisualSearch into SearchScreen — camera icon, badge, grid injection"
```

---

## Task 8: Navigation — add VisualSearchResults route

**Files:**
- Modify: `src/navigation/AppNavigator.tsx`

- [ ] **Step 1: Add to RootStackParamList**

In `src/navigation/AppNavigator.tsx`, add to the `RootStackParamList` type:

```typescript
VisualSearchResults: {
  query: VisualSearchQuery; // import from useVisualSearch
  productSlugs: string[];
};
```

Note: Pass only `productSlugs: string[]` in route params (serializable). `VisualSearchResultsScreen` will look up the full Product objects from `PRODUCTS` by slug.

- [ ] **Step 2: Add lazy import and Stack.Screen**

```typescript
const VisualSearchResultsScreen = lazy(() =>
  import('@/screens/VisualSearchResultsScreen').then((m) => ({
    default: withScreenErrorBoundary(m.VisualSearchResultsScreen, 'VisualSearchResults'),
  })),
);
```

Add to Stack navigator (near Search route):
```typescript
<Stack.Screen name="VisualSearchResults" component={VisualSearchResultsScreen} />
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/hal/gt/cfutons_mobile && npx tsc --noEmit 2>&1 | grep -i "navigator\|stack\|visual"
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/hal/gt/cfutons_mobile
git add src/navigation/AppNavigator.tsx
git commit -m "feat(cm-21k): add VisualSearchResults route to navigation stack"
```

---

## Task 9: VisualSearchResultsScreen

**Files:**
- Create: `src/screens/VisualSearchResultsScreen.tsx`
- Create: `src/screens/__tests__/VisualSearchResultsScreen.test.tsx`

- [ ] **Step 1: Write tests first**

Create `src/screens/__tests__/VisualSearchResultsScreen.test.tsx`:

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { VisualSearchResultsScreen } from '../VisualSearchResultsScreen';
import { PRODUCTS } from '@/data/products';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({
    params: {
      productSlugs: [PRODUCTS[0].slug, PRODUCTS[1].slug],
      query: {
        category: 'futons',
        style: 'modern',
        colorFamily: 'neutral',
        keywords: ['sofa'],
        matchType: 'scored',
      },
    },
  }),
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: { espresso: '#3E2723', espressoLight: '#795548', sandBase: '#F5F0E8', sunsetCoral: '#FF6B47', white: '#FFF' },
    spacing: { sm: 8, md: 16, lg: 24 },
    borderRadius: { card: 12, button: 8 },
  }),
}));

describe('VisualSearchResultsScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders product cards for each result', () => {
    const { getAllByTestId } = render(<VisualSearchResultsScreen />);
    expect(getAllByTestId(/product-card/i).length).toBeGreaterThan(0);
  });

  it('shows match-reason chip under each card', () => {
    const { getAllByTestId } = render(<VisualSearchResultsScreen />);
    expect(getAllByTestId(/match-reason/i).length).toBeGreaterThan(0);
  });

  it('shows VisualSearchEmptyState when results is empty', () => {
    const { useRoute } = require('@react-navigation/native');
    (useRoute as jest.Mock).mockReturnValueOnce({
      params: { productSlugs: [], query: { category: 'futons', style: 'modern', colorFamily: 'neutral', keywords: [], matchType: 'fallback' } },
    });
    const { getByTestId } = render(<VisualSearchResultsScreen />);
    expect(getByTestId('visual-search-empty-state')).toBeTruthy();
  });

  it('"Browse All" navigates to Shop tab', () => {
    const { useRoute } = require('@react-navigation/native');
    (useRoute as jest.Mock).mockReturnValueOnce({
      params: { productSlugs: [], query: { category: 'futons', style: 'modern', colorFamily: 'neutral', keywords: [], matchType: 'fallback' } },
    });
    const { getByTestId } = render(<VisualSearchResultsScreen />);
    fireEvent.press(getByTestId('browse-all-btn'));
    expect(mockNavigate).toHaveBeenCalledWith('Tabs', { screen: 'Shop' });
  });

  it('shows loading indicator when status is loading', () => {
    const { useRoute } = require('@react-navigation/native');
    (useRoute as jest.Mock).mockReturnValueOnce({
      params: { productSlugs: null, query: null },
    });
    const { getByTestId } = render(<VisualSearchResultsScreen loading />);
    expect(getByTestId('vs-loading')).toBeTruthy();
  });

  it('shows retry button when status is error', () => {
    const { useRoute } = require('@react-navigation/native');
    (useRoute as jest.Mock).mockReturnValueOnce({
      params: { productSlugs: null, query: null },
    });
    const mockRetry = jest.fn();
    const { getByTestId } = render(<VisualSearchResultsScreen error="Something went wrong" onRetry={mockRetry} />);
    fireEvent.press(getByTestId('vs-retry-btn'));
    expect(mockRetry).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd /Users/hal/gt/cfutons_mobile
npx jest src/screens/__tests__/VisualSearchResultsScreen.test.tsx --no-coverage 2>&1 | tail -3
```

Expected: FAIL (module not found)

- [ ] **Step 3: Commit failing tests**

```bash
cd /Users/hal/gt/cfutons_mobile
git add src/screens/__tests__/VisualSearchResultsScreen.test.tsx
git commit -m "test(cm-21k): VisualSearchResultsScreen — 6 TDD tests (failing)"
```

- [ ] **Step 4: Create VisualSearchResultsScreen**

Create `src/screens/VisualSearchResultsScreen.tsx`:

```typescript
/**
 * VisualSearchResultsScreen — shown after "Find Similar" on ProductDetailScreen.
 * Receives productSlugs + query as route params, looks up full Product objects,
 * renders ProductCard grid with match-reason chips.
 */
import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/theme';
import { PRODUCTS, type Product } from '@/data/products';
import { ProductCard } from '@/components/ProductCard';
import { VisualSearchEmptyState } from '@/components/VisualSearchEmptyState';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import type { VisualSearchQuery } from '@/hooks/useVisualSearch';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RouteParams = RouteProp<RootStackParamList, 'VisualSearchResults'>;

function matchReason(product: Product, query: VisualSearchQuery): string {
  const parts: string[] = [];
  if (product.category === query.category) parts.push('Similar category');
  if (product.colorFamily === query.colorFamily) parts.push(`${query.colorFamily} tones`);
  if (product.tags?.includes(query.style)) parts.push(`${query.style} style`);
  return parts.join(' · ') || 'Visual match';
}

export function VisualSearchResultsScreen() {
  const navigation = useNavigation<NavProp>();
  const { params } = useRoute<RouteParams>();
  const { colors, spacing } = useTheme();

  const products = params.productSlugs
    .map((slug) => PRODUCTS.find((p) => p.slug === slug))
    .filter((p): p is Product => Boolean(p));

  if (products.length === 0) {
    return (
      <VisualSearchEmptyState
        onBrowseAll={() => navigation.navigate('Tabs', { screen: 'Shop' })}
      />
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.sandBase }]}>
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        numColumns={2}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <ProductCard
              testID={`product-card-${item.slug}`}
              product={item}
              onPress={() => navigation.navigate('ProductDetail', { slug: item.slug })}
            />
            <Text
              testID={`match-reason-${item.slug}`}
              style={[styles.chip, { color: colors.espressoLight }]}
            >
              {matchReason(item, params.query)}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  cardWrapper: { flex: 1, gap: 4 },
  chip: { fontSize: 11, textAlign: 'center', paddingBottom: 8 },
});
```

- [ ] **Step 5: Run tests — confirm all pass**

```bash
cd /Users/hal/gt/cfutons_mobile
npx jest src/screens/__tests__/VisualSearchResultsScreen.test.tsx --no-coverage 2>&1 | tail -3
```

Expected: `Tests: 4 passed, 4 total`

- [ ] **Step 6: Commit**

```bash
cd /Users/hal/gt/cfutons_mobile
git add src/screens/VisualSearchResultsScreen.tsx
git commit -m "feat(cm-21k): VisualSearchResultsScreen with match-reason chips"
```

---

## Task 10: ProductDetailScreen — "Find Similar" CTA

**Files:**
- Modify: `src/screens/ProductDetailScreen.tsx`

- [ ] **Step 0: Write failing tests for Find Similar button**

In `src/screens/__tests__/ProductDetailScreen.test.tsx`, add these tests (they will fail until Step 1 is done):

```typescript
// Add mock at top of file alongside other mocks
jest.mock('@/hooks/useVisualSearch', () => ({
  useVisualSearch: jest.fn(),
}));
import { useVisualSearch } from '@/hooks/useVisualSearch';
const mockUseVisualSearch = useVisualSearch as jest.MockedFunction<typeof useVisualSearch>;

describe('ProductDetailScreen Find Similar', () => {
  const mockTrigger = jest.fn();
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseVisualSearch.mockReturnValue({ trigger: mockTrigger, status: 'idle', results: [], query: null, error: null, reset: jest.fn() });
  });

  it('renders Find Similar button', () => {
    const { getByTestId } = render(<ProductDetailScreen {...mockProps} />);
    expect(getByTestId('find-similar-btn')).toBeTruthy();
  });

  it('calls triggerVisualSearch when Find Similar pressed', () => {
    const { getByTestId } = render(<ProductDetailScreen {...mockProps} />);
    fireEvent.press(getByTestId('find-similar-btn'));
    expect(mockTrigger).toHaveBeenCalled();
  });

  it('navigates to VisualSearchResults when success with results', () => {
    const mockProducts = [{ id: 'p1', slug: 'test-futon', name: 'Test', category: 'futons', price: 499, rating: 4.5, images: [], description: '', tags: [] }];
    mockUseVisualSearch.mockReturnValue({ trigger: mockTrigger, status: 'success', results: mockProducts, query: { category: 'futons', style: 'modern', colorFamily: 'neutral', keywords: [], matchType: 'scored' }, error: null, reset: jest.fn() });
    render(<ProductDetailScreen {...mockProps} navigation={{ navigate: mockNavigate } as any} />);
    expect(mockNavigate).toHaveBeenCalledWith('VisualSearchResults', expect.objectContaining({ productSlugs: ['test-futon'] }));
  });
});
```

Run to confirm they fail:
```bash
cd /Users/hal/gt/cfutons_mobile
npx jest src/screens/__tests__/ProductDetailScreen.test.tsx --no-coverage -t "Find Similar" 2>&1 | tail -10
```
Expected: failures referencing missing `find-similar-btn` testID.

- [ ] **Step 1: Add useVisualSearch hook call and "Find Similar" button**

In `src/screens/ProductDetailScreen.tsx`:

1. Import `useVisualSearch`:
```typescript
import { useVisualSearch } from '@/hooks/useVisualSearch';
```

2. Add hook call inside component:
```typescript
const { trigger: triggerVisualSearch, status: vsStatus, results: vsResults, query: vsQuery } = useVisualSearch();
```

3. Add `useEffect` to navigate when results arrive:
```typescript
useEffect(() => {
  if (vsStatus === 'success' && vsResults.length > 0 && vsQuery) {
    navigation.navigate('VisualSearchResults', {
      productSlugs: vsResults.map((p) => p.slug),
      query: vsQuery,
    });
  }
}, [vsStatus, vsResults, vsQuery, navigation]);
```

4. Add "Find Similar" button below the "Add to Cart" button:
```typescript
<TouchableOpacity
  testID="find-similar-btn"
  style={styles.findSimilarBtn}
  onPress={triggerVisualSearch}
  accessibilityRole="button"
  accessibilityLabel="Find similar products with camera"
>
  <Text style={styles.findSimilarText}>📷 Find Similar</Text>
</TouchableOpacity>
```

- [ ] **Step 2: Run ALL ProductDetailScreen tests (regression + new Find Similar tests)**

```bash
cd /Users/hal/gt/cfutons_mobile
npx jest src/screens/__tests__/ProductDetailScreen.test.tsx --no-coverage 2>&1 | tail -10
```

Expected: all tests pass including the 3 new Find Similar tests from Step 0. If any fail, fix before proceeding.

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/hal/gt/cfutons_mobile && npx tsc --noEmit 2>&1 | grep ProductDetail
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/hal/gt/cfutons_mobile
git add src/screens/ProductDetailScreen.tsx
git commit -m "feat(cm-21k): add Find Similar button to ProductDetailScreen"
```

---

## Task 11: Wix backend — visualSearch function (cfutons repo)

**Files:**
- Create: `/Users/hal/gt/cfutons/src/public/visualSearch.js`
- Create: `/Users/hal/gt/cfutons/tests/unit/visualSearch.test.js`

This task works in the **cfutons repo** (`/Users/hal/gt/cfutons`), not cfutons_mobile.

- [ ] **Step 1: Write tests first (cfutons repo)**

Create `/Users/hal/gt/cfutons/tests/unit/visualSearch.test.js`:

```javascript
/**
 * cm-21k — visualSearch Wix backend function tests (TDD)
 * Tests all SSRF controls per dutch sign-off (hq-eehh).
 */
const { post: handler } = require('../../src/public/visualSearch');

// ── Mock dependencies ────────────────────────────────────────────────────────

// dns.promises.lookup mock
jest.mock('dns', () => ({
  promises: {
    lookup: jest.fn(),
  },
}));
const dns = require('dns');

// https mock
const mockHttpsRequest = jest.fn();
jest.mock('https', () => ({
  request: mockHttpsRequest,
}));

// Helper to create a Wix request object
function makeReq(body) {
  return { body: { text: JSON.stringify(body) } };
}

function makeResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

// ── SSRF Control Tests ───────────────────────────────────────────────────────

describe('visualSearch SSRF controls', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects non-openai hostname with 400', async () => {
    const res = await handler(makeReq({ image: 'base64data', host: 'evil.com' }));
    expect(res.status).toBe(400);
  });

  it('permits api.openai.com', async () => {
    dns.promises.lookup.mockResolvedValue({ address: '104.18.7.192' });
    // Mock a successful OpenAI response
    // (test just checks it doesn't return 400 for the host check)
    const res = await handler(makeReq({ image: 'base64data' }));
    expect(res.status).not.toBe(400); // may be 502 if OpenAI mock not set, but not host-rejected
  });

  it('rejects http:// scheme with 400', async () => {
    const res = await handler(makeReq({ image: 'base64data', scheme: 'http' }));
    expect(res.status).toBe(400);
  });

  it('rejects non-443 port with 400', async () => {
    const res = await handler(makeReq({ image: 'base64data', port: 22 }));
    expect(res.status).toBe(400);
  });

  it('blocks RFC-1918 resolved IP (10.x.x.x) with 400', async () => {
    dns.promises.lookup.mockResolvedValue({ address: '10.0.0.1' });
    const res = await handler(makeReq({ image: 'base64data' }));
    expect(res.status).toBe(400);
  });

  it('blocks link-local resolved IP (169.254.x.x) with 400', async () => {
    dns.promises.lookup.mockResolvedValue({ address: '169.254.1.1' });
    const res = await handler(makeReq({ image: 'base64data' }));
    expect(res.status).toBe(400);
  });

  it('resolves hostname once and passes resolved IP to HTTP client', async () => {
    dns.promises.lookup.mockResolvedValue({ address: '104.18.7.192' });
    // Mock https.request to capture options, then immediately end with a valid response
    mockHttpsRequest.mockImplementation((opts, callback) => {
      const res = {
        statusCode: 200,
        on: (event, fn) => { if (event === 'end') fn(); return res; },
        headers: {},
      };
      res.on = (event, fn) => {
        if (event === 'data') fn(JSON.stringify({ choices: [{ message: { content: '{"category":"futons","style":"modern","colorFamily":"neutral","keywords":[]}' } }] }));
        if (event === 'end') fn();
        return res;
      };
      callback(res);
      return { on: jest.fn(), write: jest.fn(), end: jest.fn(), setTimeout: jest.fn() };
    });
    await handler(makeReq({ image: 'base64data' }));
    expect(dns.promises.lookup).toHaveBeenCalledTimes(1);
    const [opts] = mockHttpsRequest.mock.calls[0];
    expect(opts.hostname || opts.host).toBe('104.18.7.192');
    expect(opts.headers?.Host || opts.headers?.host).toBe('api.openai.com');
  });

  it('rejects image body > 10MB with 413', async () => {
    const bigImage = 'x'.repeat(10 * 1024 * 1024 + 1);
    const res = await handler(makeReq({ image: bigImage }));
    expect(res.status).toBe(413);
  });

  // Helper: mock https.request to return a specific response
  function mockOpenAiResponse(statusCode, bodyStr) {
    mockHttpsRequest.mockImplementation((opts, callback) => {
      const res = { statusCode, headers: {}, on: null };
      res.on = (event, fn) => {
        if (event === 'data') fn(bodyStr);
        if (event === 'end') fn();
        return res;
      };
      callback(res);
      return { on: jest.fn(), write: jest.fn(), end: jest.fn(), setTimeout: jest.fn() };
    });
  }

  it('returns 200 with structured JSON on valid OpenAI response', async () => {
    dns.promises.lookup.mockResolvedValue({ address: '104.18.7.192' });
    const openAiBody = JSON.stringify({
      choices: [{ message: { content: '{"category":"futons","style":"modern","colorFamily":"neutral","keywords":["cozy","clean"]}' } }],
    });
    mockOpenAiResponse(200, openAiBody);
    const res = await handler(makeReq({ image: 'base64data' }));
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toMatchObject({ category: 'futons', style: 'modern', colorFamily: 'neutral' });
    expect(Array.isArray(body.keywords)).toBe(true);
  });

  it('returns 502 on malformed OpenAI JSON', async () => {
    dns.promises.lookup.mockResolvedValue({ address: '104.18.7.192' });
    const openAiBody = JSON.stringify({
      choices: [{ message: { content: 'not valid json {{{{' } }],
    });
    mockOpenAiResponse(200, openAiBody);
    const res = await handler(makeReq({ image: 'base64data' }));
    expect(res.status).toBe(502);
  });

  it('returns 502 on OpenAI API error (4xx/5xx)', async () => {
    dns.promises.lookup.mockResolvedValue({ address: '104.18.7.192' });
    mockOpenAiResponse(429, '{"error":"rate limited"}');
    const res = await handler(makeReq({ image: 'base64data' }));
    expect(res.status).toBe(502);
  });

  it('rejects HTTP 3xx redirect from OpenAI with 502 (no redirect following)', async () => {
    dns.promises.lookup.mockResolvedValue({ address: '104.18.7.192' });
    // Control 3: handler must reject redirects rather than follow them
    mockHttpsRequest.mockImplementation((opts, callback) => {
      const res = { statusCode: 301, headers: { location: 'https://evil.com' }, on: null };
      res.on = (event, fn) => { if (event === 'end') fn(); return res; };
      callback(res);
      return { on: jest.fn(), write: jest.fn(), end: jest.fn(), setTimeout: jest.fn() };
    });
    const res = await handler(makeReq({ image: 'base64data' }));
    expect(res.status).toBe(502);
  });

  it('returns 400 when image field is missing from request body', async () => {
    const res = await handler(makeReq({}));
    expect(res.status).toBe(400);
  });

  it('returns 504 when OpenAI request times out', async () => {
    dns.promises.lookup.mockResolvedValue({ address: '104.18.7.192' });
    mockHttpsRequest.mockImplementation((opts, callback) => {
      // Simulate timeout: call the 'timeout' event on the req object
      const req = { on: jest.fn(), write: jest.fn(), end: jest.fn(), setTimeout: jest.fn(), destroy: jest.fn() };
      req.setTimeout.mockImplementation((ms, fn) => { fn(); });
      req.destroy.mockImplementation(() => {
        if (req.on.mock.calls.find(([e]) => e === 'error')) {
          req.on.mock.calls.find(([e]) => e === 'error')[1](new Error('OpenAI request timeout'));
        }
      });
      return req;
    });
    const res = await handler(makeReq({ image: 'base64data' }));
    expect(res.status).toBe(504);
  });
});
```

Note: Some tests are placeholders because the full OpenAI HTTP mock requires the cfutons repo's existing test infrastructure. Fill in based on existing cfutons test patterns (look at other `tests/unit/*.test.js` files for the mock patterns used there).

- [ ] **Step 2: Check existing cfutons test patterns**

```bash
ls /Users/hal/gt/cfutons/tests/unit/ | head -10
cat /Users/hal/gt/cfutons/tests/unit/$(ls /Users/hal/gt/cfutons/tests/unit/ | head -1) | head -30
```

Adapt the test file to match cfutons test infrastructure (jest config, module resolution, etc.)

- [ ] **Step 3: Create the backend function**

Create `/Users/hal/gt/cfutons/src/public/visualSearch.js`:

```javascript
/**
 * visualSearch — Wix backend function
 * POST /_functions/visualSearch
 *
 * Security: all 5 dutch controls implemented (hq-eehh sign-off)
 * D38+D16: no client-asserted role/membership accepted
 */
'use strict';

const https = require('https');
const dns = require('dns').promises;

// ── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_HOST = 'api.openai.com';
const OPENAI_PATH = '/v1/chat/completions';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB

// RFC-1918 + link-local + loopback ranges
const BLOCKED_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^169\.254\./,
  /^::1$/,
  /^fc/,
];

function isBlockedIp(ip) {
  return BLOCKED_RANGES.some((re) => re.test(ip));
}

function respond(status, body) {
  return { status, body: JSON.stringify(body) };
}

// ── Handler ──────────────────────────────────────────────────────────────────

async function post(request) {
  try {
    const body = JSON.parse(request.body.text);

    // D38+D16: reject client-asserted privilege fields
    if (body.role !== undefined || body.membership !== undefined || body.is_admin !== undefined) {
      return respond(400, { error: 'Client-asserted trust fields not permitted' });
    }

    // Validate image exists and size
    const { image } = body;
    if (!image || typeof image !== 'string') {
      return respond(400, { error: 'image field required' });
    }
    const imageBytes = Buffer.byteLength(image, 'base64');
    if (imageBytes > MAX_IMAGE_BYTES) {
      return respond(413, { error: 'Image exceeds 10MB limit' });
    }

    // Control 1: domain allowlist
    // Control 2: HTTPS + port 443 only (no scheme/port overrides accepted from client)
    // (Client cannot control scheme/host — they are hardcoded here)

    // Control 4+5: resolve hostname ONCE, check RFC-1918, use IP as TCP target
    const { address: resolvedIp } = await dns.lookup(ALLOWED_HOST);
    if (isBlockedIp(resolvedIp)) {
      return respond(400, { error: 'Resolved IP is in a blocked range' });
    }

    // Control 3+5: make HTTPS request using resolved IP as TCP target
    // TLS SNI and Host header remain api.openai.com for cert validation
    const openAiKey = process.env.OPENAI_API_KEY;
    const requestBody = JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Classify this furniture photo. Return ONLY valid JSON with these fields:
{"category":"futons|murphy-beds|covers|mattresses|accessories|unknown","style":"modern|rustic|traditional|mid-century|industrial|unknown","colorFamily":"neutral|warm|cool|dark|light|unknown","keywords":["...up to 5 descriptive words"]}`,
            },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } },
          ],
        },
      ],
    });

    const response = await new Promise((resolve, reject) => {
      const options = {
        hostname: resolvedIp,      // Control 5: TCP connects to resolved IP
        host: resolvedIp,
        port: 443,
        path: OPENAI_PATH,
        method: 'POST',
        headers: {
          Host: ALLOWED_HOST,      // Control 5: TLS SNI + server routing via Host header
          Authorization: `Bearer ${openAiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody),
        },
      };

      const req = https.request(options, (res) => {
        // Control 3: reject redirects
        if (res.statusCode >= 300 && res.statusCode < 400) {
          reject(new Error(`Unexpected redirect: ${res.statusCode}`));
          return;
        }
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
      });

      req.on('error', reject);
      req.setTimeout(30000, () => { req.destroy(new Error('OpenAI request timeout')); });
      req.write(requestBody);
      req.end();
    });

    if (response.statusCode === 408 || response.statusCode === 504) {
      return respond(504, { error: 'OpenAI request timed out' });
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      return respond(502, { error: 'OpenAI API error' }); // safe message only — no raw error exposed
    }

    let parsed;
    try {
      const openAiBody = JSON.parse(response.body);
      const content = openAiBody.choices?.[0]?.message?.content;
      parsed = JSON.parse(content);
    } catch {
      return respond(502, { error: 'Invalid response from AI service' });
    }

    const { category, style, colorFamily, keywords } = parsed;
    if (!category || !style || !colorFamily) {
      return respond(502, { error: 'Incomplete AI response' });
    }

    // No logging/retention of image data (zhora requirement)
    return respond(200, { category, style, colorFamily, keywords: keywords ?? [] });

  } catch (err) {
    if (err.message?.includes('timeout')) {
      return respond(504, { error: 'Gateway timeout' });
    }
    return respond(502, { error: 'Visual search failed' });
  }
}

module.exports = { post };
```

- [ ] **Step 4: Run cfutons backend tests**

```bash
cd /Users/hal/gt/cfutons
npx jest tests/unit/visualSearch.test.js --no-coverage 2>&1 | tail -5
```

Fix any failures. The SSRF tests (400/413 responses) should pass.

- [ ] **Step 5: Commit (cfutons repo)**

```bash
cd /Users/hal/gt/cfutons
git add src/public/visualSearch.js tests/unit/visualSearch.test.js
git commit -m "feat(cm-21k): visualSearch Wix backend function with 5 SSRF controls"
```

---

## Task 12: Final integration check and PR

**Files:** all

- [ ] **Step 1: Run full mobile test suite**

```bash
cd /Users/hal/gt/cfutons_mobile
npx jest --testPathPattern="cfutons_mobile/src" --no-coverage 2>&1 | grep -E "Tests:|Test Suites:|FAIL" | tail -5
```

Expected: all tests pass. No new FAIL suites.

- [ ] **Step 2: TypeScript full check**

```bash
cd /Users/hal/gt/cfutons_mobile && npx tsc --noEmit 2>&1
```

Expected: 0 errors.

- [ ] **Step 3: Commit any lingering changes**

```bash
cd /Users/hal/gt/cfutons_mobile && git status
```

Stage and commit anything not yet committed.

- [ ] **Step 4: Push mobile branch**

```bash
cd /Users/hal/gt/cfutons_mobile
git push -u origin cm-21k-visual-search
```

- [ ] **Step 5: Open PR**

```bash
cd /Users/hal/gt/cfutons_mobile
gh pr create \
  --repo DreadPirateRobertz/carolina-futons-mobile \
  --title "feat: visual search — photo-to-product matching (cm-21k)" \
  --body "Dutch sign-off: hq-eehh. 5 SSRF controls. TDD. Two entry points: SearchBar camera icon + ProductDetail Find Similar."
```

- [ ] **Step 6: Notify Dallas**

```bash
gt mail reply hq-wisp-ormzu -m "cm-21k visual search PR open. All tests passing. Dutch-approved SSRF controls implemented in Wix backend. Ready for review."
```

- [ ] **Step 7: Close bead**

```bash
bd close cm-21k
```
