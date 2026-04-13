# CFM Feature Roadmap — S33 Completion + S34 Planning

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete S33 in-flight work, close Phase 2 web-to-mobile ports, advance Phase 1 cross-platform unification, and address technical debt — all while maintaining 7400+ test coverage and Stilgar quality mandate.

**Architecture:** Hook-first pattern throughout: screens consume hooks, hooks own Wix Data / AsyncStorage / external API access. All new work follows TDD (tests first), try/catch on every async, WHY-comments, JSDoc, `[ModuleName]` error prefixes. No direct `@/data/` imports in screens.

**Tech Stack:** React Native (Expo 55), TypeScript, Wix Data SDK (`wixClient.queryData` / `upsertDataItem`), AsyncStorage, expo-secure-store, Jest + `@testing-library/react-native`, expo-haptics, expo-image-picker, Stripe (payments, mobile-only).

**Living document:** Updated 2026-04-13 with crew input from bishop, ripley, hicks. Melania response pending (ConsultationBookings schema blocker).

---

## Crew Input Summary (2026-04-13 21:15 MDT)

**bishop:** cm-xw4 price alerts already shipped under cm-pda (PR #424) — drop from roadmap. Bead hygiene broken (duplicates accumulating). Worktree pre-commit hook gap causing repeated prettier-only commits. Starting cm-3fd security now.

**hicks:** AR skeleton/loading feedback missing on 6 screens. cm-b3b cloud sync top pick. No perf telemetry — flying blind on real-device TTI/jank. Offline AR retry queue not wired.

**ripley:** P0 gap: no unified Image wrapper (caching/placeholder/retry). P1: no shared EmptyState or Skeleton primitives — every screen rolls its own. P2: no OfflineBanner — offline feature has no visible proof. These unblock multiple downstream features.

**New beads filed from crew input:**
- `cm-48e` P1 — Image wrapper (ripley, after hq-bzb) ← **P0 unblocked by ripley**
- `cm-2ts` P1 — EmptyState component (ripley queue)
- `cm-sxj` P1 — Skeleton primitives (hicks, after cm-b3b)
- `cm-049` P2 — OfflineBanner + queue status hook
- `cm-ox9` P2 — Perf telemetry + FlatList memo audit (hicks queue)
- `cm-2s8` P2 — Bead hygiene audit + worktree pre-commit fix (bishop)

---

## Baseline State (2026-04-13)

| Metric | Value |
|--------|-------|
| Screens | 40+ |
| Tests | 7,400+ |
| Core flows | Browse, AR preview, cart, checkout (Stripe), order history, gamification, push notifications, offline sync |
| Screen guide | S29 — **stale, rebuild in progress** |
| CI | Unblocked (lint baseline 220 pre-existing errors — separate cleanup bead needed) |

### Merged this session (S33)
- `cm-t6wl` — arLayoutSync wired to Wix ARLayouts collection (36 tests)
- `hq-1jcj` — useGamificationActions hook (11 tests)
- `cm-b0u` — CI unblocked (NPS test casing conflict)
- `010360e` — prettier auto-fix across 72 files

---

## Track 1: S33 In-Flight (Priority — unblock crew)

### Task 1.1: ProductRecommendationRow + PDP/Cart Integration
**Bead:** `hq-bzb` | **Owner:** ripley + furiosa polecat | **Convoy:** `hq-cv-9cpkr`

**Files:**
- Create: `src/components/ProductRecommendationRow.tsx`
- Create: `src/components/__tests__/ProductRecommendationRow.test.tsx`
- Modify: `src/screens/ProductDetailScreen.tsx` (add row below fabric selector)
- Modify: `src/screens/CartScreen.tsx` (add row at bottom)

- [ ] **Step 1: Write failing component tests**

```tsx
// src/components/__tests__/ProductRecommendationRow.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProductRecommendationRow } from '../ProductRecommendationRow';

const PRODUCTS = [
  { id: 'p1', name: 'Blue Ridge Sofa', price: 899, imageUrl: 'https://example.com/1.jpg' },
  { id: 'p2', name: 'Summit Loveseat', price: 649, imageUrl: 'https://example.com/2.jpg' },
];

it('renders all recommended products', () => {
  const { getByText } = render(<ProductRecommendationRow products={PRODUCTS} onPress={jest.fn()} />);
  expect(getByText('Blue Ridge Sofa')).toBeTruthy();
});

it('calls onPress with productId when card tapped', () => {
  const onPress = jest.fn();
  const { getAllByRole } = render(<ProductRecommendationRow products={PRODUCTS} onPress={onPress} />);
  fireEvent.press(getAllByRole('button')[0]);
  expect(onPress).toHaveBeenCalledWith('p1');
});

it('renders nothing when products array is empty', () => {
  const { queryByTestId } = render(<ProductRecommendationRow products={[]} onPress={jest.fn()} />);
  expect(queryByTestId('recommendation-row')).toBeNull();
});

it('shows loading skeleton when loading=true', () => {
  const { getByTestId } = render(
    <ProductRecommendationRow products={[]} loading onPress={jest.fn()} />
  );
  expect(getByTestId('recommendation-skeleton')).toBeTruthy();
});

it('each card has accessible label', () => {
  const { getAllByLabelText } = render(
    <ProductRecommendationRow products={PRODUCTS} onPress={jest.fn()} />
  );
  expect(getAllByLabelText(/Blue Ridge Sofa/)).toHaveLength(1);
});
```

- [ ] **Step 2: Run test — confirm FAIL**

```bash
cd ~/gt/cfutons_mobile && npx jest src/components/__tests__/ProductRecommendationRow.test.tsx --no-coverage
```
Expected: `Cannot find module '../ProductRecommendationRow'`

- [ ] **Step 3: Implement ProductRecommendationRow**

```tsx
// src/components/ProductRecommendationRow.tsx
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/theme';

export interface RecommendedProduct {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
}

interface Props {
  products: RecommendedProduct[];
  loading?: boolean;
  onPress: (productId: string) => void;
  title?: string;
}

/**
 * Horizontal strip of "you may also like" product cards.
 * @param products - list of recommended products to display
 * @param loading - when true, renders a loading skeleton instead of cards
 * @param onPress - called with productId when a card is tapped
 * @param title - section heading, defaults to "You May Also Like"
 */
export function ProductRecommendationRow({
  products,
  loading,
  onPress,
  title = 'You May Also Like',
}: Props) {
  const { colors, spacing, typography } = useTheme();
  // WHY: return null (not empty view) so parent layouts don't reserve space
  if (!loading && products.length === 0) return null;
  if (loading) return <View testID="recommendation-skeleton" style={{ height: 160 }} />;

  return (
    <View testID="recommendation-row">
      <Text style={[typography.subtitle, { paddingHorizontal: spacing.md, marginBottom: spacing.sm }]}>
        {title}
      </Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={products}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}
        renderItem={({ item }) => (
          <TouchableOpacity
            accessible
            accessibilityLabel={item.name}
            accessibilityRole="button"
            onPress={() => onPress(item.id)}
            style={styles.card}
          >
            <Image source={{ uri: item.imageUrl }} style={styles.image} />
            <Text style={typography.caption} numberOfLines={2}>{item.name}</Text>
            <Text style={[typography.price, { color: colors.sunsetCoral }]}>
              ${item.price.toFixed(2)}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: 130 },
  image: { width: 130, height: 100, borderRadius: 8 },
});
```

- [ ] **Step 4: Run tests — confirm pass**

```bash
npx jest src/components/__tests__/ProductRecommendationRow.test.tsx --no-coverage
```
Expected: 5/5 pass

- [ ] **Step 5: Wire into ProductDetailScreen**

In `src/screens/ProductDetailScreen.tsx`, after the fabric selector `</View>`:
```tsx
import { ProductRecommendationRow } from '@/components/ProductRecommendationRow';
import { useProductRecommendations } from '@/hooks/useProductRecommendations';

// Inside component body:
const { recommendations, loading: recsLoading } = useProductRecommendations(product.id);

// In JSX, after fabric selector:
<ProductRecommendationRow
  products={recommendations}
  loading={recsLoading}
  onPress={(id) => navigation.push('ProductDetail', { productId: id })}
/>
```

- [ ] **Step 6: Commit**

```bash
git add src/components/ProductRecommendationRow.tsx \
        src/components/__tests__/ProductRecommendationRow.test.tsx \
        src/screens/ProductDetailScreen.tsx
git commit -m "feat(hq-bzb): ProductRecommendationRow component + PDP integration"
```

**Convoy note:** Coordinate with nux (cm-0q4 CompleteTheLook) before final merge — both modify `ProductDetailScreen`. Layout order: rec row below fabric selector → CompleteTheLook CTA below that.

---

### Task 1.2: CompleteTheLook Screen
**Bead:** `cm-0q4` | **Owner:** nux | **Convoy:** `hq-cv-9cpkr`

**Files:**
- Create: `src/screens/CompleteTheLookScreen.tsx`
- Create: `src/screens/__tests__/CompleteTheLookScreen.test.tsx`
- Create: `src/hooks/useCompleteTheLook.ts` (if not exists — check first)
- Create: `src/hooks/__tests__/useCompleteTheLook.test.ts`
- Modify: `src/screens/ProductDetailScreen.tsx` (add CTA button)
- Modify: `src/navigation/AppNavigator.tsx` (add screen to stack)

**Data source:** `CompleteTheLook` Wix CMS collection (fields: `sourceProductId` Text, `items` JSON array of `{productId, name, price, imageUrl, isOptional}`, `roomPhotoUrl` Text)

- [ ] **Step 1: Write failing hook tests**

```ts
// src/hooks/__tests__/useCompleteTheLook.test.ts
import { renderHook } from '@testing-library/react-hooks';
import { useCompleteTheLook } from '../useCompleteTheLook';

const mockClient = { queryData: jest.fn() };
jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => mockClient,
}));

beforeEach(() => jest.clearAllMocks());

it('returns items for a given sourceProductId', async () => {
  const items = [{ productId: 'p1', name: 'Rug', price: 299, imageUrl: 'url', isOptional: false }];
  mockClient.queryData.mockResolvedValue({
    items: [{ data: { items: JSON.stringify(items), roomPhotoUrl: 'room.jpg' } }],
  });
  const { result, waitForNextUpdate } = renderHook(() =>
    useCompleteTheLook('source-123')
  );
  await waitForNextUpdate();
  expect(result.current.items).toEqual(items);
  expect(result.current.roomPhotoUrl).toBe('room.jpg');
});

it('returns empty items when no look configured for product', async () => {
  mockClient.queryData.mockResolvedValue({ items: [] });
  const { result, waitForNextUpdate } = renderHook(() =>
    useCompleteTheLook('source-999')
  );
  await waitForNextUpdate();
  expect(result.current.items).toEqual([]);
});

it('logs and returns empty on API error', async () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  mockClient.queryData.mockRejectedValue(new Error('network'));
  const { result, waitForNextUpdate } = renderHook(() =>
    useCompleteTheLook('source-123')
  );
  await waitForNextUpdate();
  expect(result.current.items).toEqual([]);
  expect(spy).toHaveBeenCalledWith(expect.stringContaining('[useCompleteTheLook]'), expect.anything());
  spy.mockRestore();
});
```

- [ ] **Step 2: Run test — confirm FAIL**

```bash
npx jest src/hooks/__tests__/useCompleteTheLook.test.ts --no-coverage
```

- [ ] **Step 3: Implement useCompleteTheLook**

```ts
// src/hooks/useCompleteTheLook.ts
import { useEffect, useState } from 'react';
import { useOptionalWixClient } from '@/services/wix/wixProvider';

export interface CompleteTheLookItem {
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  isOptional: boolean;
}

interface CompleteTheLookData {
  items: CompleteTheLookItem[];
  roomPhotoUrl: string | null;
  loading: boolean;
}

/**
 * Fetches the "Complete the Look" room set for a given source product.
 * @param sourceProductId - the product whose look we're completing
 * @returns items in the look, room hero photo URL, and loading state
 */
export function useCompleteTheLook(sourceProductId: string): CompleteTheLookData {
  const wixClient = useOptionalWixClient();
  const [items, setItems] = useState<CompleteTheLookItem[]>([]);
  const [roomPhotoUrl, setRoomPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!wixClient || !sourceProductId) return;
    setLoading(true);
    wixClient
      .queryData<{ items: string; roomPhotoUrl: string }>('CompleteTheLook', {
        filter: { sourceProductId },
      })
      .then(({ items: rows }) => {
        if (!rows.length) return;
        const parsed = JSON.parse(rows[0].data.items) as CompleteTheLookItem[];
        setItems(parsed);
        setRoomPhotoUrl(rows[0].data.roomPhotoUrl ?? null);
      })
      .catch((error) => {
        console.error('[useCompleteTheLook] fetch failed:', error);
        // WHY: non-fatal — PDP still usable without look data
      })
      .finally(() => setLoading(false));
  }, [wixClient, sourceProductId]);

  return { items, roomPhotoUrl, loading };
}
```

- [ ] **Step 4: Run tests — confirm pass**

```bash
npx jest src/hooks/__tests__/useCompleteTheLook.test.ts --no-coverage
```

- [ ] **Step 5: Implement CompleteTheLookScreen**

```tsx
// src/screens/CompleteTheLookScreen.tsx
import React, { useState } from 'react';
import {
  FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Image } from 'expo-image';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCompleteTheLook } from '@/hooks/useCompleteTheLook';
import { useCart } from '@/hooks/useCart';
import { useTheme } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CompleteTheLook'>;

/**
 * Displays a curated room set for a product — room photo hero + item list with toggles.
 * "Add All" adds only toggled items to cart.
 */
export function CompleteTheLookScreen({ route, navigation }: Props) {
  const { sourceProductId } = route.params;
  const { colors, spacing, typography } = useTheme();
  const { items, roomPhotoUrl, loading } = useCompleteTheLook(sourceProductId);
  const { addItem } = useCart();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleItem(productId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(productId) ? next.delete(productId) : next.add(productId);
      return next;
    });
  }

  async function handleAddAll() {
    const toAdd = items.filter((i) => selected.has(i.productId));
    for (const item of toAdd) {
      try {
        await addItem({ productId: item.productId, quantity: 1 });
      } catch (error) {
        console.error('[CompleteTheLookScreen] addItem failed:', error);
      }
    }
    navigation.goBack();
  }

  if (loading) return <View testID="ctl-loading" style={styles.loading} />;

  return (
    <SafeAreaView style={styles.container} testID="complete-the-look-screen">
      {roomPhotoUrl && (
        <Image source={{ uri: roomPhotoUrl }} style={styles.hero} testID="ctl-hero-photo" />
      )}
      <FlatList
        data={items}
        keyExtractor={(i) => i.productId}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, selected.has(item.productId) && styles.rowSelected]}
            onPress={() => toggleItem(item.productId)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected.has(item.productId) }}
            accessibilityLabel={`${item.name}, $${item.price}`}
            testID={`ctl-item-${item.productId}`}
          >
            <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
            <View style={styles.info}>
              <Text style={typography.body}>{item.name}</Text>
              <Text style={[typography.caption, { color: colors.sunsetCoral }]}>
                ${item.price.toFixed(2)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity
        style={[styles.cta, { backgroundColor: colors.sunsetCoral }]}
        onPress={handleAddAll}
        disabled={selected.size === 0}
        testID="ctl-add-all"
      >
        <Text style={[typography.button, { color: '#fff' }]}>
          Add {selected.size} Item{selected.size !== 1 ? 's' : ''} to Cart
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  loading: { flex: 1 },
  hero: { width: '100%', height: 220 },
  row: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#2a1f19' },
  rowSelected: { backgroundColor: '#1a1410' },
  thumb: { width: 64, height: 64, borderRadius: 6 },
  info: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  cta: { margin: 16, padding: 16, borderRadius: 8, alignItems: 'center' },
});
```

- [ ] **Step 6: Write screen tests**

```tsx
// src/screens/__tests__/CompleteTheLookScreen.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CompleteTheLookScreen } from '../CompleteTheLookScreen';

jest.mock('@/hooks/useCompleteTheLook', () => ({
  useCompleteTheLook: jest.fn(),
}));
jest.mock('@/hooks/useCart', () => ({ useCart: () => ({ addItem: mockAddItem }) }));
const mockAddItem = jest.fn().mockResolvedValue(undefined);

const ITEMS = [
  { productId: 'p1', name: 'Blue Rug', price: 299, imageUrl: 'u1', isOptional: false },
  { productId: 'p2', name: 'Throw Pillow', price: 49, imageUrl: 'u2', isOptional: true },
];
const mockNav = { goBack: jest.fn() };
const mockRoute = { params: { sourceProductId: 'src-1' } };

import { useCompleteTheLook } from '@/hooks/useCompleteTheLook';

beforeEach(() => {
  jest.clearAllMocks();
  (useCompleteTheLook as jest.Mock).mockReturnValue({
    items: ITEMS, roomPhotoUrl: 'room.jpg', loading: false,
  });
});

it('renders items from hook', () => {
  const { getByText } = render(
    <CompleteTheLookScreen route={mockRoute as any} navigation={mockNav as any} />
  );
  expect(getByText('Blue Rug')).toBeTruthy();
  expect(getByText('Throw Pillow')).toBeTruthy();
});

it('shows loading state', () => {
  (useCompleteTheLook as jest.Mock).mockReturnValue({ items: [], roomPhotoUrl: null, loading: true });
  const { getByTestId } = render(
    <CompleteTheLookScreen route={mockRoute as any} navigation={mockNav as any} />
  );
  expect(getByTestId('ctl-loading')).toBeTruthy();
});

it('toggles item selection and updates CTA count', () => {
  const { getByTestId, getByText } = render(
    <CompleteTheLookScreen route={mockRoute as any} navigation={mockNav as any} />
  );
  fireEvent.press(getByTestId('ctl-item-p1'));
  expect(getByText('Add 1 Item to Cart')).toBeTruthy();
  fireEvent.press(getByTestId('ctl-item-p2'));
  expect(getByText('Add 2 Items to Cart')).toBeTruthy();
});

it('calls addItem for each selected item on Add All', async () => {
  const { getByTestId } = render(
    <CompleteTheLookScreen route={mockRoute as any} navigation={mockNav as any} />
  );
  fireEvent.press(getByTestId('ctl-item-p1'));
  fireEvent.press(getByTestId('ctl-add-all'));
  await waitFor(() => expect(mockAddItem).toHaveBeenCalledWith({ productId: 'p1', quantity: 1 }));
  expect(mockAddItem).not.toHaveBeenCalledWith({ productId: 'p2', quantity: 1 });
});

it('Add All disabled when nothing selected', () => {
  const { getByTestId } = render(
    <CompleteTheLookScreen route={mockRoute as any} navigation={mockNav as any} />
  );
  expect(getByTestId('ctl-add-all').props.disabled).toBe(true);
});
```

- [ ] **Step 7: Run all CTL tests**

```bash
npx jest src/hooks/__tests__/useCompleteTheLook.test.ts \
         src/screens/__tests__/CompleteTheLookScreen.test.tsx --no-coverage
```
Expected: all pass

- [ ] **Step 8: Add CTA to ProductDetailScreen + register in navigator**

In `src/screens/ProductDetailScreen.tsx`:
```tsx
import { useCompleteTheLook } from '@/hooks/useCompleteTheLook';

// After ProductRecommendationRow:
const { items: lookItems } = useCompleteTheLook(product.id);
{lookItems.length > 0 && (
  <TouchableOpacity
    testID="pdp-complete-the-look-cta"
    style={ctaStyles.lookButton}
    onPress={() => navigation.navigate('CompleteTheLook', { sourceProductId: product.id })}
  >
    <Text>Complete the Look</Text>
  </TouchableOpacity>
)}
```

In `src/navigation/AppNavigator.tsx`, inside the Stack.Navigator:
```tsx
<Stack.Screen name="CompleteTheLook" component={CompleteTheLookScreen} />
```

- [ ] **Step 9: Commit**

```bash
git add src/hooks/useCompleteTheLook.ts src/hooks/__tests__/useCompleteTheLook.test.ts \
        src/screens/CompleteTheLookScreen.tsx src/screens/__tests__/CompleteTheLookScreen.test.tsx \
        src/screens/ProductDetailScreen.tsx src/navigation/AppNavigator.tsx
git commit -m "feat(cm-0q4): CompleteTheLook screen — room outfit builder with item toggles"
```

---

### Task 1.3: NPS Survey Post-Purchase Modal
**Bead:** `cm-to0` | **Owner:** burke

**Files:**
- Create: `src/components/NPSSurveyModal.tsx`
- Modify: `src/components/__tests__/npsSurveyModal.test.tsx` (add missing edge cases)
- Create: `src/hooks/useNPSTrigger.ts`
- Create: `src/hooks/__tests__/useNPSTrigger.test.ts`
- Modify: `src/screens/OrderHistoryScreen.tsx` (trigger 3-day check on mount)

**Wix collection:** `SurveyResponses` (fields: `npsScore` Number, `comment` Text, `orderId` Text, `memberId` Text, `respondedAt` DateTime)

- [ ] **Step 1: Write failing useNPSTrigger tests**

```ts
// src/hooks/__tests__/useNPSTrigger.test.ts
import { renderHook } from '@testing-library/react-hooks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNPSTrigger } from '../useNPSTrigger';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const ORDER = {
  id: 'order-1',
  deliveredAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
};

it('returns shouldShow=true when 3+ days post-delivery and not yet responded', async () => {
  const { result, waitForNextUpdate } = renderHook(() => useNPSTrigger(ORDER));
  await waitForNextUpdate();
  expect(result.current.shouldShow).toBe(true);
});

it('returns shouldShow=false when delivery is <3 days ago', async () => {
  const recentOrder = {
    id: 'order-2',
    deliveredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  };
  const { result, waitForNextUpdate } = renderHook(() => useNPSTrigger(recentOrder));
  await waitForNextUpdate();
  expect(result.current.shouldShow).toBe(false);
});

it('returns shouldShow=false when already responded (AsyncStorage key present)', async () => {
  await AsyncStorage.setItem('@nps_responded_order-1', 'true');
  const { result, waitForNextUpdate } = renderHook(() => useNPSTrigger(ORDER));
  await waitForNextUpdate();
  expect(result.current.shouldShow).toBe(false);
});

it('returns shouldShow=false when no deliveredAt on order', async () => {
  const { result, waitForNextUpdate } = renderHook(() =>
    useNPSTrigger({ id: 'order-3', deliveredAt: null })
  );
  await waitForNextUpdate();
  expect(result.current.shouldShow).toBe(false);
});
```

- [ ] **Step 2: Run test — confirm FAIL**

```bash
npx jest src/hooks/__tests__/useNPSTrigger.test.ts --no-coverage
```

- [ ] **Step 3: Implement useNPSTrigger**

```ts
// src/hooks/useNPSTrigger.ts
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

interface Order { id: string; deliveredAt: string | null; }

/**
 * Determines whether the NPS survey modal should be shown for a given order.
 * Trigger: 3+ days post-delivery, once per order, opt-out respected.
 * @param order - the order to check
 * @returns shouldShow boolean and markResponded callback
 */
export function useNPSTrigger(order: Order) {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (!order.deliveredAt) return;
    const deliveredMs = new Date(order.deliveredAt).getTime();
    if (Date.now() - deliveredMs < THREE_DAYS_MS) return;

    AsyncStorage.getItem(`@nps_responded_${order.id}`)
      .then((val) => { if (!val) setShouldShow(true); })
      .catch((e) => console.error('[useNPSTrigger] storage read failed:', e));
  }, [order.id, order.deliveredAt]);

  async function markResponded() {
    try {
      await AsyncStorage.setItem(`@nps_responded_${order.id}`, 'true');
      setShouldShow(false);
    } catch (e) {
      console.error('[useNPSTrigger] markResponded failed:', e);
    }
  }

  return { shouldShow, markResponded };
}
```

- [ ] **Step 4: Run tests — confirm pass, then commit**

```bash
npx jest src/hooks/__tests__/useNPSTrigger.test.ts --no-coverage
git add src/hooks/useNPSTrigger.ts src/hooks/__tests__/useNPSTrigger.test.ts
git commit -m "feat(cm-to0): useNPSTrigger — 3-day post-delivery NPS gate with AsyncStorage dedup"
```

- [ ] **Step 5: Implement NPSSurveyModal**

```tsx
// src/components/NPSSurveyModal.tsx
import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/theme';
import { useOptionalWixClient } from '@/services/wix/wixProvider';

interface Props {
  visible: boolean;
  orderId: string;
  memberId: string | null;
  onDismiss: () => void;
}

/**
 * Post-purchase NPS survey modal. 0-10 scale + optional comment.
 * Submits to SurveyResponses Wix collection. Non-blocking — errors logged only.
 */
export function NPSSurveyModal({ visible, orderId, memberId, onDismiss }: Props) {
  const { colors, typography, spacing } = useTheme();
  const wixClient = useOptionalWixClient();
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    try {
      if (wixClient && score !== null) {
        await wixClient.insertData('SurveyResponses', {
          npsScore: score,
          comment,
          orderId,
          memberId: memberId ?? 'guest',
          respondedAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error('[NPSSurveyModal] submit failed:', e);
      // WHY: non-fatal — dismiss regardless; data loss acceptable vs blocking UX
    }
    setSubmitted(true);
    setTimeout(onDismiss, 1200);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" testID="nps-modal">
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.cardBg }]}>
          {submitted ? (
            <Text style={[typography.h3, { textAlign: 'center' }]} testID="nps-thanks">
              Thanks for your feedback!
            </Text>
          ) : (
            <>
              <Text style={typography.h3}>How likely are you to recommend us?</Text>
              <View style={styles.scaleRow}>
                {Array.from({ length: 11 }, (_, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setScore(i)}
                    style={[styles.scoreBtn, score === i && { backgroundColor: colors.sunsetCoral }]}
                    accessibilityLabel={`Score ${i}`}
                    testID={`nps-score-${i}`}
                  >
                    <Text style={[typography.caption, score === i && { color: '#fff' }]}>{i}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                placeholder="Optional comment…"
                placeholderTextColor={colors.textMuted}
                value={comment}
                onChangeText={setComment}
                maxLength={500}
                testID="nps-comment"
              />
              <View style={styles.actions}>
                <TouchableOpacity onPress={onDismiss} testID="nps-dismiss">
                  <Text style={[typography.caption, { color: colors.textMuted }]}>Not now</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={score === null}
                  style={[styles.submitBtn, { backgroundColor: colors.sunsetCoral }]}
                  testID="nps-submit"
                >
                  <Text style={[typography.button, { color: '#fff' }]}>Submit</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  scaleRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 16 },
  scoreBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2a1f19' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16, minHeight: 80 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  submitBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
});
```

- [ ] **Step 6: Commit**

```bash
git add src/components/NPSSurveyModal.tsx
git commit -m "feat(cm-to0): NPSSurveyModal — 0-10 scale, comment, Wix SurveyResponses submit"
```

---

### Task 1.4: Security Hardening (Input Sanitization + Secure Storage)
**Bead:** `cm-3fd` | **Owner:** bishop | **Convoy:** `hq-cv-f1ilb`

**Files:**
- Create: `src/utils/sanitizeInput.ts`
- Create: `src/utils/__tests__/sanitizeInput.test.ts`
- Create: `src/services/secureStorage.ts`
- Create: `src/services/__tests__/secureStorage.test.ts`
- Modify: all `TextInput` components that accept user-facing text (audit pass)
- Modify: any AsyncStorage calls storing tokens/memberId/session → migrate to secureStorage

- [ ] **Step 1: Write failing sanitizeInput tests**

```ts
// src/utils/__tests__/sanitizeInput.test.ts
import { sanitizeInput } from '../sanitizeInput';

it('strips script tags', () => {
  expect(sanitizeInput('<script>alert(1)</script>hello')).toBe('hello');
});

it('strips html tags', () => {
  expect(sanitizeInput('<b>bold</b>')).toBe('bold');
});

it('rejects SQL injection patterns', () => {
  expect(sanitizeInput("'; DROP TABLE users; --")).not.toContain('DROP TABLE');
});

it('allows normal text', () => {
  expect(sanitizeInput("Nice sofa! 5 stars.")).toBe("Nice sofa! 5 stars.");
});

it('trims whitespace', () => {
  expect(sanitizeInput('  hello  ')).toBe('hello');
});

it('returns empty string for null/undefined', () => {
  expect(sanitizeInput(null as any)).toBe('');
  expect(sanitizeInput(undefined as any)).toBe('');
});

it('truncates to maxLength when provided', () => {
  expect(sanitizeInput('hello world', 5)).toBe('hello');
});
```

- [ ] **Step 2: Implement sanitizeInput**

```ts
// src/utils/sanitizeInput.ts
/**
 * Sanitizes user-facing text input — strips HTML/script tags, trims whitespace.
 * @param value - raw input string
 * @param maxLength - optional max character limit
 * @returns sanitized string safe for display and storage
 */
export function sanitizeInput(value: string | null | undefined, maxLength?: number): string {
  if (value == null) return '';
  // WHY: strip tags before any other processing to avoid encoded bypass vectors
  let clean = value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/['";\-]{2,}/g, '') // WHY: collapse SQL injection boilerplate
    .trim();
  if (maxLength !== undefined) clean = clean.slice(0, maxLength);
  return clean;
}
```

- [ ] **Step 3: Write secureStorage tests**

```ts
// src/services/__tests__/secureStorage.test.ts
import * as SecureStore from 'expo-secure-store';
import { saveSecure, loadSecure, deleteSecure } from '../secureStorage';

jest.mock('expo-secure-store');

it('saves via SecureStore.setItemAsync', async () => {
  (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
  await saveSecure('auth_token', 'tok123');
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_token', 'tok123');
});

it('loads via SecureStore.getItemAsync', async () => {
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('tok123');
  expect(await loadSecure('auth_token')).toBe('tok123');
});

it('returns null when key not found', async () => {
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
  expect(await loadSecure('missing')).toBeNull();
});

it('logs and returns null on read error', async () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('keychain'));
  expect(await loadSecure('key')).toBeNull();
  expect(spy).toHaveBeenCalledWith(expect.stringContaining('[secureStorage]'), expect.anything());
  spy.mockRestore();
});

it('deleteSecure removes the key', async () => {
  (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);
  await deleteSecure('auth_token');
  expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token');
});
```

- [ ] **Step 4: Implement secureStorage**

```ts
// src/services/secureStorage.ts
import * as SecureStore from 'expo-secure-store';

/**
 * Thin wrapper around expo-secure-store for sensitive key/value storage.
 * Prefer over AsyncStorage for tokens, memberId, session identifiers.
 */

export async function saveSecure(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error('[secureStorage] saveSecure failed:', error);
  }
}

export async function loadSecure(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error('[secureStorage] loadSecure failed:', error);
    return null;
  }
}

export async function deleteSecure(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error('[secureStorage] deleteSecure failed:', error);
  }
}
```

- [ ] **Step 5: Run all security tests**

```bash
npx jest src/utils/__tests__/sanitizeInput.test.ts \
         src/services/__tests__/secureStorage.test.ts --no-coverage
```
Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add src/utils/sanitizeInput.ts src/utils/__tests__/sanitizeInput.test.ts \
        src/services/secureStorage.ts src/services/__tests__/secureStorage.test.ts
git commit -m "feat(cm-3fd): sanitizeInput + secureStorage — CFM leg of security convoy hq-cv-f1ilb"
```

---

## Track 2: Phase 2 — Web-to-Mobile Ports (S34)

Priority order based on conversion impact and crew availability:

### ~~Task 2.1: Price Drop Push Notifications~~ ✓ ALREADY SHIPPED
**Bead:** `cm-xw4` CLOSED | **Shipped as:** `cm-pda` PR #424 (PriceAlertButton, usePriceAlertSubscription, 51 tests)

> **bishop confirmed 2026-04-13:** Feature complete. Track 2.1 dropped from roadmap. Bishop capacity reallocated to cm-3fd + cm-48e Image wrapper.

---

### Task 2.1b: Unified Image Wrapper *(new — from ripley P0)*
**Bead:** `cm-48e` | **Owner:** ripley (after hq-bzb)

**Files:**
- Create: `src/components/PriceAlertButton.tsx`
- Create: `src/components/__tests__/PriceAlertButton.test.tsx`
- Create: `src/hooks/usePriceAlerts.ts`
- Create: `src/hooks/__tests__/usePriceAlerts.test.ts`
- Modify: `src/screens/ProductDetailScreen.tsx` (add PriceAlertButton)

**Wix collection:** `PriceAlerts` (fields: `productId` Text, `memberId` Text, `deviceToken` Text, `targetPrice` Number optional, `active` Boolean)

**Webhook format (from melania):**
```json
{
  "productId": "string",
  "productName": "string",
  "oldPrice": "number",
  "newPrice": "number",
  "percentDrop": "number",
  "subscriberDeviceToken": "string"
}
```

- [ ] **Step 1: Write failing usePriceAlerts tests**

```ts
// src/hooks/__tests__/usePriceAlerts.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import { usePriceAlerts } from '../usePriceAlerts';

const mockClient = { insertData: jest.fn(), queryData: jest.fn(), updateDataItem: jest.fn() };
jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => mockClient,
}));
jest.mock('@/hooks/usePushToken', () => ({ usePushToken: () => 'device-tok-abc' }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'mem-1' } }) }));

beforeEach(() => jest.clearAllMocks());

it('subscribeAlert inserts a PriceAlerts record', async () => {
  mockClient.insertData.mockResolvedValue({});
  const { result } = renderHook(() => usePriceAlerts('prod-1'));
  await act(() => result.current.subscribeAlert());
  expect(mockClient.insertData).toHaveBeenCalledWith('PriceAlerts', expect.objectContaining({
    productId: 'prod-1',
    memberId: 'mem-1',
    deviceToken: 'device-tok-abc',
    active: true,
  }));
});

it('isSubscribed=true when active record exists', async () => {
  mockClient.queryData.mockResolvedValue({
    items: [{ data: { active: true } }],
  });
  const { result, waitForNextUpdate } = renderHook(() => usePriceAlerts('prod-1'));
  await waitForNextUpdate();
  expect(result.current.isSubscribed).toBe(true);
});

it('unsubscribeAlert sets active=false on existing record', async () => {
  mockClient.queryData.mockResolvedValue({ items: [{ _id: 'rec-1', data: { active: true } }] });
  mockClient.updateDataItem.mockResolvedValue({});
  const { result, waitForNextUpdate } = renderHook(() => usePriceAlerts('prod-1'));
  await waitForNextUpdate();
  await act(() => result.current.unsubscribeAlert());
  expect(mockClient.updateDataItem).toHaveBeenCalledWith('PriceAlerts', 'rec-1', expect.objectContaining({ active: false }));
});

it('swallows error on subscribe failure', async () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  mockClient.insertData.mockRejectedValue(new Error('quota'));
  const { result } = renderHook(() => usePriceAlerts('prod-1'));
  await expect(act(() => result.current.subscribeAlert())).resolves.toBeUndefined();
  expect(spy).toHaveBeenCalledWith(expect.stringContaining('[usePriceAlerts]'), expect.anything());
  spy.mockRestore();
});
```

- [ ] **Step 2: Implement usePriceAlerts (run red → green cycle)**

```ts
// src/hooks/usePriceAlerts.ts
import { useCallback, useEffect, useState } from 'react';
import { useOptionalWixClient } from '@/services/wix/wixProvider';
import { usePushToken } from '@/hooks/usePushToken';
import { useAuth } from '@/hooks/useAuth';

/**
 * Manages price drop alert subscriptions for a product.
 * @param productId - product to watch for price drops
 */
export function usePriceAlerts(productId: string) {
  const wixClient = useOptionalWixClient();
  const { deviceToken } = usePushToken();
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);

  useEffect(() => {
    if (!wixClient || !user?.id) return;
    wixClient
      .queryData<{ active: boolean }>('PriceAlerts', {
        filter: { productId, memberId: user.id, active: true },
      })
      .then(({ items }) => {
        if (items.length) {
          setIsSubscribed(true);
          setRecordId((items[0] as any)._id ?? null);
        }
      })
      .catch((e) => console.error('[usePriceAlerts] load failed:', e));
  }, [wixClient, productId, user?.id]);

  const subscribeAlert = useCallback(async () => {
    if (!wixClient || !user?.id) return;
    try {
      await wixClient.insertData('PriceAlerts', {
        productId, memberId: user.id, deviceToken, active: true,
      });
      setIsSubscribed(true);
    } catch (e) {
      console.error('[usePriceAlerts] subscribeAlert failed:', e);
    }
  }, [wixClient, productId, user?.id, deviceToken]);

  const unsubscribeAlert = useCallback(async () => {
    if (!wixClient || !recordId) return;
    try {
      await wixClient.updateDataItem('PriceAlerts', recordId, { active: false });
      setIsSubscribed(false);
    } catch (e) {
      console.error('[usePriceAlerts] unsubscribeAlert failed:', e);
    }
  }, [wixClient, recordId]);

  return { isSubscribed, subscribeAlert, unsubscribeAlert };
}
```

- [ ] **Step 3: Run tests, commit**

```bash
npx jest src/hooks/__tests__/usePriceAlerts.test.ts --no-coverage
git add src/hooks/usePriceAlerts.ts src/hooks/__tests__/usePriceAlerts.test.ts
git commit -m "feat(cm-xw4): usePriceAlerts hook — subscribe/unsubscribe price drop alerts"
```

- [ ] **Step 4: Implement PriceAlertButton + wire to PDP**

```tsx
// src/components/PriceAlertButton.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { usePriceAlerts } from '@/hooks/usePriceAlerts';
import { useTheme } from '@/theme';

interface Props { productId: string; }

/** Bell icon button on PDP to subscribe/unsubscribe from price drop push alerts. */
export function PriceAlertButton({ productId }: Props) {
  const { isSubscribed, subscribeAlert, unsubscribeAlert } = usePriceAlerts(productId);
  const { colors, typography } = useTheme();
  return (
    <TouchableOpacity
      onPress={isSubscribed ? unsubscribeAlert : subscribeAlert}
      accessibilityLabel={isSubscribed ? 'Unsubscribe from price alerts' : 'Alert me when price drops'}
      testID="price-alert-button"
      style={[styles.btn, isSubscribed && { borderColor: colors.sunsetCoral }]}
    >
      <Text style={[typography.caption, isSubscribed && { color: colors.sunsetCoral }]}>
        {isSubscribed ? '🔔 Price Alert On' : '🔕 Alert Me'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 8, borderWidth: 1, borderColor: '#3a2518', borderRadius: 8, alignSelf: 'flex-start' },
});
```

In `src/screens/ProductDetailScreen.tsx`, below the price display:
```tsx
import { PriceAlertButton } from '@/components/PriceAlertButton';
// ...
<PriceAlertButton productId={product.id} />
```

- [ ] **Step 5: Final commit**

```bash
git add src/components/PriceAlertButton.tsx src/screens/ProductDetailScreen.tsx
git commit -m "feat(cm-xw4): PriceAlertButton on PDP — subscribe to price drop push notifications"
```

---

### Task 2.2: Virtual Consultation Booking
**Bead:** `cm-4yk` | **Owner:** bishop | **BLOCKED:** requires melania to provide `ConsultationBookings` schema

> **Do not start this task until melania confirms schema.** Expected fields (pending confirmation): `memberId` Text, `slotId` Text, `scheduledAt` DateTime, `status` Text (pending/confirmed/cancelled), `notes` Text.

Once unblocked, implementation follows same pattern as Task 2.1: hook → screen → navigator registration → TDD throughout.

---

### Task 2.3: Product Q&A on PDP
**Bead:** Create `cm-qa` | **Owner:** ripley (after hq-bzb)

**Files:**
- Create: `src/components/ProductQASection.tsx`
- Create: `src/components/__tests__/ProductQASection.test.tsx`
- Create: `src/hooks/useProductQA.ts`
- Create: `src/hooks/__tests__/useProductQA.test.ts`
- Modify: `src/screens/ProductDetailScreen.tsx`

**Wix API (from melania):** `insertGuestQuestion`, `getApprovedQuestions`, `submitAnswer`
**Rate limit:** 3 questions/hr per user (match web behavior)

---

### Task 2.4: Bundle Deals on PDP + Cart
**Bead:** `cm-bw2` maps partially — Create `cm-bundle` | **Owner:** hicks (after cm-b3b)

**Wix API:** `getCompatibleItems`, `calculateBundlePrice`, `addBundleToCart`
**Coupon format:** Auto-generated `CF-BUNDLE-{8chars}`

---

### Task 2.5: Video Reviews on PDP
**Bead:** Create `cm-vid` | **Owner:** burke (after cm-to0)

**Wix collection:** `VideoReviews`
**UI:** Horizontal thumbnail scroll, full-screen playback, TikTok-style grid option

---

## Track 3: Phase 1 — Cross-Platform Unification (Ongoing)

### Task 3.1: Loyalty Unification
**Bead:** `cm-elo` | **Status:** spec LOCKED with melania, implementation pending crew capacity

**Scope:**
- Wire `LoyaltyScreen`, `PointsHistoryScreen`, `RewardsScreen` to Wix Members API
- Replace local mock points with shared `LoyaltyPoints` Wix collection
- Sync tier perks with web's `TierPerkDeliveries` collection
- Tiers: Trail Blazer → Mountain Guide → Summit Master → Blue Ridge Legend

### Task 3.2: UGC Photo Sharing
**Bead:** `cm-nw8` | **Owner:** ripley (queued)

**Scope:**
- `RoomGalleryScreen`: add photo submit (expo-image-picker)
- `ProductDetailScreen`: add UGC horizontal gallery section
- Vote/like functionality; show only `approved` + `featured` status
- Shared collection: `UGCPhotos`

### Task 3.3: BNPL Parity (Affirm)
**Bead:** `cm-1s7` | **Owner:** hicks (queued)

**Scope:** Align `FinancingCalculator` math with web's `financingCalc.web.js`

---

## Track 4: Technical Debt

### Task 4.1: Pre-existing Lint Debt
**220 errors on main** (pre-existing, not from recent PRs)

- [ ] **Audit:** `npx eslint src --format json | jq '[.[] | select(.errorCount > 0)]'`
- [ ] **Auto-fix pass:** `npx eslint src --fix` (handles prettier + safe rules)
- [ ] **Manual fixes:** remaining TS errors requiring judgment
- [ ] **Create bead:** `bd create --title "fix(lint): resolve 220 pre-existing lint errors on main" --priority=2`

### Task 4.2: Screen Reference Guide Rebuild
**Status:** S29 — two sessions stale. Emulator booting now.

- [ ] Boot emulator: `ssh pop-os "~/Android/Sdk/emulator/emulator -avd cfutons_pixel7 -no-snapshot-load -no-audio -gpu swiftshader_indirect -no-window &"`
- [ ] Start Metro: `ssh pop-os "DISPLAY=:99 npx expo start --android --no-dev"`
- [ ] Capture all 40+ screens: `adb exec-out screencap -p > /tmp/screenshots/screen-name.png`
- [ ] Update `docs/screen-reference.html` with new screenshots
- [ ] Commit: `git commit -m "docs: rebuild screen-reference.html — S33 screenshots"`

### Task 4.3: CartSessions Screen Wiring
**Hook complete (24 tests), UI not wired.**

In `src/screens/CartScreen.tsx`:
```tsx
const { saveCart, mergeOnLogin } = useCartSessions({ memberId: user?.id ?? null });

// On cart items change — best-effort sync
useEffect(() => {
  saveCart(cartItems.map((i) => ({ productId: i.id, variantId: i.variantId, quantity: i.quantity })))
    .catch((e) => console.error('[CartScreen] saveCart failed:', e));
}, [cartItems, saveCart]);

// On login — merge remote cart
useEffect(() => {
  if (!user?.id) return;
  mergeOnLogin(user.id)
    .then((merged) => { if (merged.length) dispatch(setCartItems(merged)); })
    .catch((e) => console.error('[CartScreen] mergeOnLogin failed:', e));
}, [user?.id, mergeOnLogin, dispatch]);
```

---

## Crew Assignments — S34 Queue

| Crew | Current (S33) | Next (S34) |
|------|---------------|------------|
| bishop | cm-3fd security | cm-xw4 price alerts → cm-4yk consultation (blocked) |
| ripley | hq-bzb ProductRec | cm-nw8 UGC photo sharing |
| nux | cm-0q4 CompleteTheLook | cm-qa Product Q&A |
| burke | cm-to0 NPS survey | cm-vid Video Reviews |
| hicks | cm-b3b AR sync | cm-bundle Bundle Deals → cm-1s7 BNPL parity |

---

## Acceptance Criteria (All Tasks)

Per Stilgar mandate — every PR must demonstrate:

- [ ] TDD: tests written first, committed alongside or before implementation
- [ ] Edge cases: API failure, null/empty input, network drop, corruption, offline
- [ ] `try/catch` on every `await`
- [ ] `console.error('[ModuleName] action:', error)` in every catch
- [ ] WHY-comments on non-obvious branches
- [ ] JSDoc `@param`/`@returns` on all exported functions
- [ ] No `console.error` calls silenced in tests without `spy.mockRestore()`
- [ ] Screen guide updated at epic boundaries

---

## Open Questions

- **melania:** ConsultationBookings schema for cm-4yk — still blocking (requested 2026-04-13)
- **melania:** Priority ranking on Phase 2 ports — which converts best on web?
- **melania:** Is cm-to0 NPS a duplicate of cm-5cp/hq-9dq already shipped? (bishop flag — bead hygiene audit cm-2s8)

## Crew Assignments — Updated

| Crew | Now (S33) | Next | Queue |
|------|-----------|------|-------|
| bishop | cm-3fd security | cm-2s8 bead hygiene | cm-4yk (blocked on melania) |
| ripley | hq-bzb ProductRec | cm-48e Image wrapper | cm-2ts EmptyState, cm-nw8 UGC |
| nux | cm-0q4 CompleteTheLook | cm-qa Product Q&A | — |
| burke | cm-to0 NPS survey | cm-vid Video Reviews | cm-049 OfflineBanner |
| hicks | cm-b3b AR sync | cm-sxj Skeleton primitives | cm-ox9 Perf telemetry |
