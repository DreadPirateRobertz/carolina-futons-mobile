# AR-Led, Stability-Guaranteed Beta Sprint — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship a beta-quality mobile app with production infrastructure (Stripe, Sentry, analytics, push notifications) and feature-rich AR (measurement, fabric textures, multi-product staging, comparison mode).

**Architecture:** Stability-first — production infra (Week 1) provides the foundation. AR expansion (Week 2) builds on it. Every feature includes tests, error handling, and offline fallbacks. Existing service abstractions (analytics providers, crash reporting providers, offline queue) are wired to real backends.

**Tech Stack:** React Native (Expo SDK 52), TypeScript strict, Wix CMS/SDK, Stripe React Native, Sentry, Firebase Analytics, Mixpanel, expo-notifications, expo-camera, react-native-reanimated, react-native-gesture-handler, Jest + React Testing Library, Detox E2E.

---

## Week 1: Production Infrastructure + Stability

### Task 1: Sentry Crash Reporting Integration

**Files:**
- Modify: `src/services/providers/sentryCrashReporting.ts`
- Modify: `src/services/crashReportingInit.ts`
- Modify: `App.tsx`
- Modify: `.env.example`
- Create: `src/services/__tests__/crashReportingInit.test.ts`

**Step 1: Write the failing test for crash reporting initialization**

```typescript
// src/services/__tests__/crashReportingInit.test.ts
import { initCrashReporting, resetCrashReportingInit } from '../crashReportingInit';
import { crashReporting } from '../crashReporting';

beforeEach(() => {
  resetCrashReportingInit();
});

describe('initCrashReporting', () => {
  it('registers the Sentry provider when DSN is configured', () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://test@sentry.io/123';
    const spy = jest.spyOn(crashReporting, 'getProvider');
    initCrashReporting();
    expect(crashReporting.getProvider()).toBeDefined();
    spy.mockRestore();
  });

  it('skips registration when DSN is missing', () => {
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    initCrashReporting();
    // Should not throw, should log warning
  });

  it('is idempotent — second call is a no-op', () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://test@sentry.io/123';
    initCrashReporting();
    initCrashReporting(); // no-op
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/services/__tests__/crashReportingInit.test.ts --no-coverage`
Expected: FAIL — `resetCrashReportingInit` or `getProvider` not exported yet.

**Step 3: Implement crash reporting init with Sentry provider**

Update `src/services/crashReportingInit.ts` to:
- Read `EXPO_PUBLIC_SENTRY_DSN` from env
- If present, instantiate `SentryCrashReportingProvider` with DSN
- Call `crashReporting.registerProvider(provider)`
- Export `resetCrashReportingInit()` for testing
- Guard against double-init

Update `src/services/providers/sentryCrashReporting.ts` to accept DSN in constructor.

Add `EXPO_PUBLIC_SENTRY_DSN=` to `.env.example`.

**Step 4: Wire into App.tsx**

Add `initCrashReporting()` call in App.tsx useEffect (before analytics init).

**Step 5: Run test to verify it passes**

Run: `npx jest src/services/__tests__/crashReportingInit.test.ts --no-coverage`
Expected: PASS

**Step 6: Run full test suite**

Run: `npx jest --no-coverage`
Expected: All suites pass, no regressions.

**Step 7: Commit**

```bash
git add src/services/providers/sentryCrashReporting.ts src/services/crashReportingInit.ts src/services/__tests__/crashReportingInit.test.ts App.tsx .env.example
git commit -m "feat: wire Sentry crash reporting provider with env-based DSN

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Analytics Provider Registration (Firebase + Mixpanel)

**Files:**
- Modify: `src/services/analyticsInit.ts`
- Modify: `App.tsx`
- Modify: `.env.example`
- Create: `src/services/__tests__/analyticsInit.test.ts`

**Step 1: Write the failing test**

```typescript
// src/services/__tests__/analyticsInit.test.ts
import { initAnalytics, resetAnalyticsInit } from '../analyticsInit';
import * as analytics from '../analytics';

beforeEach(() => {
  resetAnalyticsInit();
});

describe('initAnalytics', () => {
  it('registers MultiProvider with Firebase when enabled', async () => {
    const spy = jest.spyOn(analytics, 'registerProvider');
    await initAnalytics({ enableFirebase: true, enableMixpanel: false });
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('registers both providers when Mixpanel token provided', async () => {
    const spy = jest.spyOn(analytics, 'registerProvider');
    await initAnalytics({ enableFirebase: true, enableMixpanel: true, mixpanelToken: 'test-token' });
    expect(spy).toHaveBeenCalledTimes(1);
    // MultiProvider wraps both
    spy.mockRestore();
  });

  it('is idempotent', async () => {
    const spy = jest.spyOn(analytics, 'registerProvider');
    await initAnalytics();
    await initAnalytics();
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/services/__tests__/analyticsInit.test.ts --no-coverage`

**Step 3: Implement — analyticsInit.ts already exists and is mostly complete**

The file already has the right structure. Verify it reads from env:
- `EXPO_PUBLIC_MIXPANEL_TOKEN`
- `EXPO_PUBLIC_ENABLE_FIREBASE` (default true)

Wire `initAnalytics()` call in App.tsx useEffect after crash reporting.

Add env vars to `.env.example`.

**Step 4: Run test to verify it passes**

Run: `npx jest src/services/__tests__/analyticsInit.test.ts --no-coverage`
Expected: PASS

**Step 5: Run full suite, commit**

```bash
git add src/services/analyticsInit.ts src/services/__tests__/analyticsInit.test.ts App.tsx .env.example
git commit -m "feat: wire Firebase + Mixpanel analytics providers with env config

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Stripe Payment Integration

**Files:**
- Modify: `src/services/payment.ts`
- Modify: `src/hooks/usePayment.ts`
- Modify: `src/screens/CheckoutScreen.tsx`
- Modify: `App.tsx`
- Create: `src/services/__tests__/payment.test.ts`
- Create: `src/hooks/__tests__/usePayment.test.tsx`

**Step 1: Write the failing test for payment intent creation**

```typescript
// src/services/__tests__/payment.test.ts
import { createPaymentIntent, calculateTotals } from '../payment';

// Mock fetch
global.fetch = jest.fn();

describe('createPaymentIntent', () => {
  it('calls backend API with cart items and returns client secret', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        clientSecret: 'pi_test_secret',
        paymentIntentId: 'pi_test',
        ephemeralKey: 'ek_test',
        customerId: 'cus_test',
      }),
    });

    const result = await createPaymentIntent([], 'card');
    expect(result.clientSecret).toBe('pi_test_secret');
  });

  it('throws PaymentError on API failure', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(createPaymentIntent([], 'card')).rejects.toThrow();
  });
});

describe('calculateTotals', () => {
  it('applies free shipping above $499', () => {
    const totals = calculateTotals(500);
    expect(totals.shipping).toBe(0);
  });

  it('charges $49 shipping below threshold', () => {
    const totals = calculateTotals(200);
    expect(totals.shipping).toBe(49);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/services/__tests__/payment.test.ts --no-coverage`

**Step 3: Implement createPaymentIntent in payment.ts**

Add `createPaymentIntent(items: CartItem[], method: PaymentMethod): Promise<PaymentIntentResponse>` that:
- POSTs to `${API_BASE}/payments/create-intent`
- Sends cart items, payment method, totals
- Returns PaymentIntentResponse
- Throws PaymentError on failure with descriptive message

**Step 4: Wire usePayment hook to Stripe SDK**

Update `src/hooks/usePayment.ts`:
- Call `createPaymentIntent` to get clientSecret
- Use `useStripe().initPaymentSheet()` + `presentPaymentSheet()`
- Handle success → navigate to OrderConfirmation
- Handle failure → show error, allow retry
- Handle cancellation → return to checkout

**Step 5: Add StripeProvider to App.tsx**

Wrap app with `<StripeProvider publishableKey={EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY}>`.
Already have the env var from previous work.

**Step 6: Run tests, verify, commit**

```bash
npx jest --no-coverage
git add src/services/payment.ts src/hooks/usePayment.ts src/screens/CheckoutScreen.tsx App.tsx src/services/__tests__/payment.test.ts src/hooks/__tests__/usePayment.test.tsx
git commit -m "feat: wire Stripe payment integration with PaymentSheet

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Push Notification Token Registration

**Files:**
- Modify: `src/services/notifications.ts`
- Modify: `src/hooks/useNotifications.tsx`
- Create: `src/services/__tests__/notificationRegistration.test.ts`

**Step 1: Write the failing test**

```typescript
// src/services/__tests__/notificationRegistration.test.ts
import { registerPushToken } from '../notifications';

global.fetch = jest.fn();

describe('registerPushToken', () => {
  it('sends token to backend', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
    await registerPushToken('ExponentPushToken[xxx]');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/push-tokens'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('retries on network failure', async () => {
    (fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('Network'))
      .mockResolvedValueOnce({ ok: true });
    await registerPushToken('ExponentPushToken[xxx]');
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/services/__tests__/notificationRegistration.test.ts --no-coverage`

**Step 3: Implement registerPushToken**

Add to `src/services/notifications.ts`:
- `registerPushToken(token: string): Promise<void>` — POSTs token to backend
- 3 retries with exponential backoff (reuse `src/services/wix/retry.ts` pattern)
- Stores last-registered token in AsyncStorage to avoid re-registering same token

Wire into `useNotifications.tsx`: call `registerPushToken()` after successful permission grant.

**Step 4: Run tests, verify, commit**

```bash
npx jest --no-coverage
git add src/services/notifications.ts src/hooks/useNotifications.tsx src/services/__tests__/notificationRegistration.test.ts
git commit -m "feat: push notification token registration with retry

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Offline Queue Replay Wiring

**Files:**
- Modify: `src/services/offlineQueue.ts`
- Modify: `src/hooks/useOfflineSync.tsx`
- Create: `src/services/__tests__/offlineQueueReplay.test.ts`

**Step 1: Write the failing test**

```typescript
// src/services/__tests__/offlineQueueReplay.test.ts
import { OfflineQueue } from '../offlineQueue';

describe('OfflineQueue replay', () => {
  it('replays queued mutations to real endpoints on reconnect', async () => {
    const queue = new OfflineQueue();
    const mockExecutor = jest.fn().mockResolvedValue(true);
    queue.registerExecutor('add_to_cart', mockExecutor);

    queue.enqueue({ type: 'add_to_cart', payload: { productId: 'p1', quantity: 1 } });
    await queue.replay();

    expect(mockExecutor).toHaveBeenCalledWith({ productId: 'p1', quantity: 1 });
  });

  it('retries failed replays with exponential backoff', async () => {
    const queue = new OfflineQueue();
    const mockExecutor = jest.fn()
      .mockRejectedValueOnce(new Error('Network'))
      .mockResolvedValueOnce(true);
    queue.registerExecutor('add_to_cart', mockExecutor);

    queue.enqueue({ type: 'add_to_cart', payload: {} });
    await queue.replay();

    expect(mockExecutor).toHaveBeenCalledTimes(2);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/services/__tests__/offlineQueueReplay.test.ts --no-coverage`

**Step 3: Implement executor registry and replay with backoff**

Update `src/services/offlineQueue.ts`:
- Add `registerExecutor(type: string, fn: (payload) => Promise<void>)` method
- Wire `replay()` to iterate queue, call registered executor per mutation type
- Exponential backoff: 1s → 2s → 4s, max 3 retries per mutation
- Failed mutations stay in queue for next replay cycle
- Successful mutations are removed

Wire `useOfflineSync.tsx` to register executors for cart/wishlist mutations on mount.

**Step 4: Run tests, verify, commit**

```bash
npx jest --no-coverage
git add src/services/offlineQueue.ts src/hooks/useOfflineSync.tsx src/services/__tests__/offlineQueueReplay.test.ts
git commit -m "feat: wire offline queue replay to real API executors with backoff

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Week 2: AR Feature Expansion

### Task 6: AR Room Measurement Tool

**Files:**
- Create: `src/hooks/useARMeasurement.ts`
- Create: `src/hooks/__tests__/useARMeasurement.test.ts`
- Create: `src/components/ARMeasurementOverlay.tsx`
- Create: `src/components/__tests__/ARMeasurementOverlay.test.tsx`
- Modify: `src/components/ARControls.tsx`
- Modify: `src/screens/ARScreen.tsx`

**Step 1: Write the failing test for measurement hook**

```typescript
// src/hooks/__tests__/useARMeasurement.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { useARMeasurement } from '../useARMeasurement';

describe('useARMeasurement', () => {
  it('starts in idle state', () => {
    const { result } = renderHook(() => useARMeasurement());
    expect(result.current.state).toBe('idle');
    expect(result.current.points).toHaveLength(0);
  });

  it('places first endpoint on tap', () => {
    const { result } = renderHook(() => useARMeasurement());
    act(() => result.current.activate());
    act(() => result.current.placePoint({ x: 0, y: 0, z: 0 }));
    expect(result.current.points).toHaveLength(1);
    expect(result.current.state).toBe('placing-second');
  });

  it('calculates distance after two points', () => {
    const { result } = renderHook(() => useARMeasurement());
    act(() => result.current.activate());
    act(() => result.current.placePoint({ x: 0, y: 0, z: 0 }));
    act(() => result.current.placePoint({ x: 1, y: 0, z: 0 }));
    expect(result.current.state).toBe('measured');
    expect(result.current.distanceMeters).toBeCloseTo(1.0);
    expect(result.current.distanceDisplay).toBe("3' 3\""); // ~39.37 inches
  });

  it('compares measurement to selected model and reports fit', () => {
    const { result } = renderHook(() => useARMeasurement());
    act(() => result.current.activate());
    act(() => result.current.placePoint({ x: 0, y: 0, z: 0 }));
    act(() => result.current.placePoint({ x: 2, y: 0, z: 0 })); // 2m = ~6.5 ft

    // A futon that's 1.6m wide should fit in 2m
    const fits = result.current.checkFit({ width: 1.6, depth: 0.8, height: 0.4 });
    expect(fits).toBe(true);
  });

  it('resets on deactivate', () => {
    const { result } = renderHook(() => useARMeasurement());
    act(() => result.current.activate());
    act(() => result.current.placePoint({ x: 0, y: 0, z: 0 }));
    act(() => result.current.deactivate());
    expect(result.current.state).toBe('idle');
    expect(result.current.points).toHaveLength(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/hooks/__tests__/useARMeasurement.test.ts --no-coverage`
Expected: FAIL — module not found.

**Step 3: Implement useARMeasurement hook**

```typescript
// src/hooks/useARMeasurement.ts
/**
 * @module useARMeasurement
 *
 * AR room measurement tool. Lets users tap two points on detected surfaces
 * to measure wall-to-wall distance, then compares against selected futon
 * dimensions to show "Fits!" or "Too large" feedback.
 */

type Point3D = { x: number; y: number; z: number };
type MeasurementState = 'idle' | 'placing-first' | 'placing-second' | 'measured';

export function useARMeasurement() {
  // State: points array, active flag, computed distance
  // placePoint: adds to points array, calculates distance after 2nd point
  // checkFit: compares distance to model dimensions.width
  // distanceDisplay: converts meters to feet/inches string
  // activate/deactivate: toggle measurement mode
}
```

**Step 4: Write ARMeasurementOverlay component test**

```typescript
// src/components/__tests__/ARMeasurementOverlay.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { ARMeasurementOverlay } from '../ARMeasurementOverlay';

describe('ARMeasurementOverlay', () => {
  it('renders nothing when inactive', () => {
    const { queryByTestId } = render(
      <ARMeasurementOverlay points={[]} state="idle" distanceDisplay="" />,
    );
    expect(queryByTestId('measurement-line')).toBeNull();
  });

  it('renders endpoint marker after first tap', () => {
    const { getByTestId } = render(
      <ARMeasurementOverlay
        points={[{ x: 100, y: 200, z: 0 }]}
        state="placing-second"
        distanceDisplay=""
      />,
    );
    expect(getByTestId('measurement-point-0')).toBeTruthy();
  });

  it('renders distance label after measurement', () => {
    const { getByText } = render(
      <ARMeasurementOverlay
        points={[{ x: 50, y: 200, z: 0 }, { x: 300, y: 200, z: 0 }]}
        state="measured"
        distanceDisplay="6' 2\""
        fits={true}
      />,
    );
    expect(getByText("6' 2\"")).toBeTruthy();
    expect(getByText('Fits!')).toBeTruthy();
  });
});
```

**Step 5: Implement ARMeasurementOverlay component**

Renders:
- Endpoint markers (pulsing circles) at tap locations
- Dashed line between two points
- Distance label centered on line
- "Fits!" (green) or "Too large" (red) indicator when model is selected

**Step 6: Integrate into ARScreen and ARControls**

Add measurement mode toggle button (📏) to ARControls share toolbar.
In ARScreen, when measurement mode active, tap places measurement points instead of furniture.

**Step 7: Run tests, verify, commit**

```bash
npx jest --no-coverage
git add src/hooks/useARMeasurement.ts src/hooks/__tests__/useARMeasurement.test.ts src/components/ARMeasurementOverlay.tsx src/components/__tests__/ARMeasurementOverlay.test.tsx src/components/ARControls.tsx src/screens/ARScreen.tsx
git commit -m "feat: AR room measurement tool with fit comparison

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 7: AR Fabric Texture Preview

**Files:**
- Create: `src/services/fabricTextureLoader.ts`
- Create: `src/services/__tests__/fabricTextureLoader.test.ts`
- Modify: `src/components/ARFutonOverlay.tsx`
- Modify: `src/components/ARControls.tsx`

**Step 1: Write the failing test**

```typescript
// src/services/__tests__/fabricTextureLoader.test.ts
import { FabricTextureLoader } from '../fabricTextureLoader';

describe('FabricTextureLoader', () => {
  it('returns cached texture URI on second request', async () => {
    const loader = new FabricTextureLoader();
    const uri1 = await loader.loadTexture('fabric-linen', 'https://cdn.example.com/linen.png');
    const uri2 = await loader.loadTexture('fabric-linen', 'https://cdn.example.com/linen.png');
    expect(uri1).toBe(uri2);
  });

  it('prefetches next likely fabric', async () => {
    const loader = new FabricTextureLoader();
    const prefetchSpy = jest.spyOn(loader, 'prefetch');
    await loader.loadTexture('fabric-linen', 'https://cdn.example.com/linen.png', {
      prefetchNext: ['https://cdn.example.com/velvet.png'],
    });
    expect(prefetchSpy).toHaveBeenCalledWith('https://cdn.example.com/velvet.png');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/services/__tests__/fabricTextureLoader.test.ts --no-coverage`

**Step 3: Implement FabricTextureLoader**

- Downloads fabric texture images to cache directory
- LRU cache (10 textures max — they're small PNGs)
- Prefetch hint: when user selects fabric A, start loading B and C
- Returns local file URI for Image component

**Step 4: Update ARFutonOverlay to show texture**

When `hasFabricVariants` is true for the model, overlay the fabric texture on the futon shape
using an `<Image>` with the texture URI instead of flat `backgroundColor`.

**Step 5: Update ARControls fabric swatches**

Show texture thumbnail (small circular image) instead of flat color circle when texture URL available.

**Step 6: Run tests, verify, commit**

```bash
npx jest --no-coverage
git add src/services/fabricTextureLoader.ts src/services/__tests__/fabricTextureLoader.test.ts src/components/ARFutonOverlay.tsx src/components/ARControls.tsx
git commit -m "feat: AR fabric texture preview with prefetch caching

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 8: AR Multi-Product Staging

**Files:**
- Create: `src/hooks/useARScene.ts`
- Create: `src/hooks/__tests__/useARScene.test.ts`
- Modify: `src/screens/ARScreen.tsx`
- Modify: `src/components/ARControls.tsx`

**Step 1: Write the failing test**

```typescript
// src/hooks/__tests__/useARScene.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { useARScene } from '../useARScene';

describe('useARScene', () => {
  const mockModel = { id: 'futon-1', name: 'Test', basePrice: 299, fabrics: [] };
  const mockFabric = { id: 'f1', name: 'Linen', color: '#ccc', price: 0 };

  it('starts with empty scene', () => {
    const { result } = renderHook(() => useARScene());
    expect(result.current.items).toHaveLength(0);
    expect(result.current.totalPrice).toBe(0);
  });

  it('adds item to scene', () => {
    const { result } = renderHook(() => useARScene());
    act(() => result.current.addItem(mockModel, mockFabric));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.totalPrice).toBe(299);
  });

  it('enforces max 3 items', () => {
    const { result } = renderHook(() => useARScene());
    act(() => result.current.addItem(mockModel, mockFabric));
    act(() => result.current.addItem(mockModel, mockFabric));
    act(() => result.current.addItem(mockModel, mockFabric));
    act(() => result.current.addItem(mockModel, mockFabric)); // should be rejected
    expect(result.current.items).toHaveLength(3);
  });

  it('removes item by index', () => {
    const { result } = renderHook(() => useARScene());
    act(() => result.current.addItem(mockModel, mockFabric));
    act(() => result.current.removeItem(0));
    expect(result.current.items).toHaveLength(0);
  });

  it('selects active item for editing', () => {
    const { result } = renderHook(() => useARScene());
    act(() => result.current.addItem(mockModel, mockFabric));
    act(() => result.current.setActiveIndex(0));
    expect(result.current.activeIndex).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/hooks/__tests__/useARScene.test.ts --no-coverage`

**Step 3: Implement useARScene hook**

- Manages array of `{ model, fabric, transform }` scene items
- `addItem()`: adds if under max (3), rejects with haptic warning otherwise
- `removeItem(index)`: removes by index
- `setActiveIndex()`: which item receives gesture input
- `totalPrice`: sum of all items' model.basePrice + fabric.price
- `updateTransform(index, transform)`: stores position/scale/rotation per item

**Step 4: Update ARScreen to render multiple overlays**

Map over `scene.items` to render an `<ARFutonOverlay>` per item.
Active item receives gesture input, others are static.
"Add another piece" button when items.length < 3.

**Step 5: Update ARControls**

- Show item count badge: "3/3 pieces"
- "Add piece" / "Remove piece" buttons
- Total price updates to reflect all staged items
- "Add All to Cart" button adds all items at once

**Step 6: Run tests, verify, commit**

```bash
npx jest --no-coverage
git add src/hooks/useARScene.ts src/hooks/__tests__/useARScene.test.ts src/screens/ARScreen.tsx src/components/ARControls.tsx
git commit -m "feat: AR multi-product staging (up to 3 pieces)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 9: AR Comparison Mode

**Files:**
- Create: `src/components/ARComparisonOverlay.tsx`
- Create: `src/components/__tests__/ARComparisonOverlay.test.tsx`
- Modify: `src/screens/ARScreen.tsx`
- Modify: `src/components/ARControls.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/__tests__/ARComparisonOverlay.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { ARComparisonOverlay } from '../ARComparisonOverlay';

const modelA = { id: 'a', name: 'Queen', dimensions: { width: 62, depth: 82, height: 14 } };
const modelB = { id: 'b', name: 'Full', dimensions: { width: 54, depth: 75, height: 14 } };

describe('ARComparisonOverlay', () => {
  it('renders both models side by side', () => {
    const { getByTestId } = render(
      <ARComparisonOverlay modelA={modelA} modelB={modelB} />,
    );
    expect(getByTestId('comparison-model-a')).toBeTruthy();
    expect(getByTestId('comparison-model-b')).toBeTruthy();
  });

  it('shows dimension comparison', () => {
    const { getByText } = render(
      <ARComparisonOverlay modelA={modelA} modelB={modelB} />,
    );
    expect(getByText('Queen')).toBeTruthy();
    expect(getByText('Full')).toBeTruthy();
    expect(getByText('+8" wider')).toBeTruthy(); // 62 - 54 = 8
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/__tests__/ARComparisonOverlay.test.tsx --no-coverage`

**Step 3: Implement ARComparisonOverlay**

- Renders two futon shapes at same scale for fair comparison
- Ghost overlay (semi-transparent) for model B on top of model A
- Swipe gesture toggles which model is solid vs ghost
- Dimension comparison labels: "+8 inches wider", "7 inches shorter", etc.
- Share comparison screenshot button

**Step 4: Wire into ARScreen**

Add comparison mode state. When active:
- ARControls shows two model pickers (A and B)
- ARComparisonOverlay replaces single ARFutonOverlay
- Share button generates comparison screenshot with both models

**Step 5: Run tests, verify, commit**

```bash
npx jest --no-coverage
git add src/components/ARComparisonOverlay.tsx src/components/__tests__/ARComparisonOverlay.test.tsx src/screens/ARScreen.tsx src/components/ARControls.tsx
git commit -m "feat: AR comparison mode — side-by-side size comparison

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 10: EAS Build Configuration + Beta Submission

**Files:**
- Create/Modify: `eas.json`
- Modify: `app.json` (version bump, bundle IDs)

**Step 1: Configure EAS profiles**

```json
// eas.json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false },
      "android": { "buildType": "apk" }
    },
    "production": {
      "ios": { "buildType": "archive" },
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "chrisdealglass@gmail.com", "ascAppId": "TBD" },
      "android": { "serviceAccountKeyPath": "./google-services.json" }
    }
  }
}
```

**Step 2: Update app.json**

- Bump version to `1.0.0-beta.1`
- Set `ios.bundleIdentifier`: `com.carolinafutons.mobile`
- Set `android.package`: `com.carolinafutons.mobile`

**Step 3: Build + submit**

```bash
npx eas build --profile preview --platform all
# After build completes:
npx eas submit --platform ios --latest
# Android: upload APK to Play Console internal track
```

**Step 4: Smoke test on physical devices**

- Verify all 19 screens load
- Test AR on physical device
- Test deep links
- Test push notification delivery
- Test offline mode

**Step 5: Commit config**

```bash
git add eas.json app.json
git commit -m "chore: configure EAS build profiles for beta submission

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Dependency Graph

```
Task 1 (Sentry) ──┐
Task 2 (Analytics) ┼── Week 1: No dependencies between tasks, can parallelize
Task 3 (Stripe) ───┤
Task 4 (Push) ─────┤
Task 5 (Offline) ──┘
                    │
                    ▼ Week 1 complete
                    │
Task 6 (Measurement) ──┐
Task 7 (Fabric Tex) ───┼── Week 2: Tasks 6-9 independent, can parallelize
Task 8 (Multi-Prod) ───┤   Task 10 depends on all others
Task 9 (Comparison) ───┘
                        │
                        ▼ All features merged
                        │
                   Task 10 (EAS Build) ── Final: depends on everything
```

---

## Beads to Create

After plan approval, create these beads:

| ID | Title | Priority | Depends On | Assignee |
|----|-------|----------|------------|----------|
| NEW | Sentry crash reporting integration | P1 | — | TBD |
| NEW | Firebase + Mixpanel analytics wiring | P1 | — | TBD |
| NEW | Stripe payment integration | P1 | — | TBD |
| NEW | Push notification token registration | P2 | — | TBD |
| NEW | Offline queue replay wiring | P2 | — | TBD |
| NEW | AR room measurement tool | P1 | — | TBD |
| NEW | AR fabric texture preview | P2 | — | TBD |
| NEW | AR multi-product staging | P1 | — | TBD |
| NEW | AR comparison mode | P2 | — | TBD |
| NEW | EAS build + beta submission | P1 | All above | TBD |
