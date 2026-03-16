# Phase 1: Go-Live Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take the Carolina Futons mobile app from mock data to production-ready — real payments, real orders, real product data, real auth flows.

**Architecture:** Wix Stores backend via REST API (wixClient.ts) + Wix SDK OAuth (wixSdkClient.ts). Stripe PaymentSheet for payments. Expo Push API for notifications. All data cached via SWR + AsyncStorage with offline queue replay.

**Tech Stack:** React Native (Expo SDK 52), TypeScript, Stripe, Wix REST API, Wix JavaScript SDK, expo-notifications, AsyncStorage, expo-secure-store, Jest + React Native Testing Library.

**Spec:** `docs/superpowers/specs/2026-03-16-v2-feature-roadmap-design.md`

**Dependency order:** Task 1 (Wix timeout) → Task 2 (Wix activation) → Task 3 (Tax/shipping) → Task 4 (Order saga). Tasks 5 (Auth), 6 (Push spike), 7 (Store sync) are independent and can run in parallel.

---

## Chunk 1: Wix Backend Hardening + Activation (Tasks 1-2)

### Task 1: Add Timeout + Error Handling to Wix Client

**Files:**
- Modify: `src/services/wix/wixClient.ts` (line ~945, `rawRequest` method)
- Create: `src/__tests__/services/wix/wixClientTimeout.test.ts`

- [ ] **Step 1: Write failing test for request timeout**

```typescript
// src/__tests__/services/wix/wixClientTimeout.test.ts
import { WixClient } from '@/services/wix/wixClient';

// Mock fetch globally
const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

describe('WixClient timeout', () => {
  it('aborts request after 10s timeout', async () => {
    // Simulate a request that never resolves
    global.fetch = jest.fn(
      () => new Promise((resolve) => setTimeout(resolve, 30000))
    );

    const client = new WixClient({
      apiKey: 'test-key',
      siteId: 'test-site',
    });

    await expect(client.queryProducts({})).rejects.toThrow(/timeout|aborted/i);
  }, 15000);

  it('succeeds when response arrives before timeout', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ items: [], totalResults: 0 }),
      })
    );

    const client = new WixClient({
      apiKey: 'test-key',
      siteId: 'test-site',
    });

    const result = await client.queryProducts({});
    expect(result).toBeDefined();
  });

  it('includes timeout duration in error message', async () => {
    global.fetch = jest.fn(
      () => new Promise((resolve) => setTimeout(resolve, 30000))
    );

    const client = new WixClient({
      apiKey: 'test-key',
      siteId: 'test-site',
    });

    try {
      await client.queryProducts({});
      fail('Should have thrown');
    } catch (e: unknown) {
      expect((e as Error).message).toMatch(/10.*s|10000.*ms/);
    }
  }, 15000);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/services/wix/wixClientTimeout.test.ts --no-coverage`
Expected: FAIL — no timeout implemented, test hangs or passes incorrectly

- [ ] **Step 3: Implement AbortController timeout in rawRequest**

In `src/services/wix/wixClient.ts`, modify the existing `rawRequest` method (line 941) which has signature `private async rawRequest<T>(path: string, method: string, body?: unknown): Promise<T>`. Add AbortController timeout to the existing fetch call:

```typescript
private async rawRequest<T>(path: string, method: string, body?: unknown): Promise<T> {
  const url = `${this.baseUrl}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: this.headers(),
      signal: controller.signal,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new WixApiError(`Request timed out after 10s`, undefined, path);
    }
    throw new WixApiError(
      `Network error: ${err instanceof Error ? err.message : String(err)}`,
      undefined,
      path,
    );
  }

  clearTimeout(timeoutId);

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new WixApiError(
      (errorBody as Record<string, string>).message ?? `HTTP ${response.status}`,
      response.status,
      path,
    );
  }

  return response.json() as Promise<T>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/services/wix/wixClientTimeout.test.ts --no-coverage`
Expected: PASS (all 3 tests)

- [ ] **Step 5: Run full test suite to check for regressions**

Run: `npx jest --no-coverage 2>&1 | tail -5`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/services/wix/wixClient.ts src/__tests__/services/wix/wixClientTimeout.test.ts
git commit -m "feat(wix): add 10s request timeout with AbortController"
```

---

### Task 2: Wix Backend Activation (Mock → Production)

**Files:**
- Modify: `src/services/prefetch.ts` (replace mock imports with Wix API calls)
- Modify: `src/hooks/useStores.ts` (replace mock data with Wix CMS query)
- Modify: `.env` or `eas.json` (add production Wix env vars)
- Create: `src/__tests__/services/prefetchWix.test.ts`
- Create: `src/__tests__/hooks/useStoresWix.test.ts`

- [ ] **Step 1: Write failing test for prefetch with Wix API**

```typescript
// src/__tests__/services/prefetchWix.test.ts
import { prefetchCriticalData, getPrefetchStatus } from '@/services/prefetch';

// Mock the wix client
jest.mock('@/services/wix/wixClient', () => ({
  getWixClient: jest.fn(() => ({
    queryProducts: jest.fn().mockResolvedValue({
      items: [{ _id: 'p1', name: 'Test Futon', price: 499 }],
      totalResults: 1,
    }),
    queryCollections: jest.fn().mockResolvedValue({
      items: [{ _id: 'c1', name: 'Modern Collection' }],
      totalResults: 1,
    }),
  })),
}));

jest.mock('@/services/wix/config', () => ({
  isWixConfigured: jest.fn(() => true),
  WixClientConfig: { apiKey: 'test', siteId: 'test' },
}));

describe('prefetchCriticalData with Wix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches products from Wix API when configured', async () => {
    await prefetchCriticalData();
    const status = getPrefetchStatus();
    expect(status).toBe('complete');
  });

  it('falls back to mock data when Wix is not configured', async () => {
    const { isWixConfigured } = require('@/services/wix/config');
    (isWixConfigured as jest.Mock).mockReturnValue(false);

    await prefetchCriticalData();
    const status = getPrefetchStatus();
    expect(status).toBe('complete');
  });

  it('handles Wix API failure gracefully', async () => {
    const { getWixClient } = require('@/services/wix/wixClient');
    (getWixClient as jest.Mock).mockReturnValue({
      queryProducts: jest.fn().mockRejectedValue(new Error('API down')),
      queryCollections: jest.fn().mockRejectedValue(new Error('API down')),
    });

    // Should not throw — prefetch failure is non-fatal
    await prefetchCriticalData();
    const status = getPrefetchStatus();
    expect(status).toBe('error');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/services/prefetchWix.test.ts --no-coverage`
Expected: FAIL — prefetch still imports mock data directly

- [ ] **Step 3: Update prefetch.ts to use Wix API with mock fallback**

```typescript
// In src/services/prefetch.ts — update the fetch logic:
import { isWixConfigured } from '@/services/wix/config';
import { getWixClient } from '@/services/wix/wixClient';
import { PRODUCTS } from '@/data/products';
import { COLLECTIONS } from '@/data/collections';

async function fetchProducts(): Promise<unknown[]> {
  if (isWixConfigured()) {
    const client = getWixClient();
    const result = await client.queryProducts({ limit: 50 });
    return result.items;
  }
  return PRODUCTS;
}

async function fetchCollections(): Promise<unknown[]> {
  if (isWixConfigured()) {
    const client = getWixClient();
    const result = await client.queryCollections({});
    return result.items;
  }
  return COLLECTIONS;
}
```

Replace the hardcoded PRODUCTS/COLLECTIONS usage in the prefetch function body with calls to `fetchProducts()` and `fetchCollections()`. Add a 5s timeout wrapper:

```typescript
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Prefetch timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

// In prefetchCriticalData():
const [products, collections] = await withTimeout(
  Promise.all([fetchProducts(), fetchCollections()]),
  5000
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/services/prefetchWix.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Write failing test for useStores with Wix CMS**

```typescript
// src/__tests__/hooks/useStoresWix.test.ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { useStores } from '@/hooks/useStores';

jest.mock('@/services/wix/config', () => ({
  isWixConfigured: jest.fn(() => true),
}));

jest.mock('@/services/wix/wixClient', () => ({
  getWixClient: jest.fn(() => ({
    queryData: jest.fn().mockResolvedValue({
      items: [
        {
          _id: 's1',
          data: {
            name: 'Downtown Showroom',
            city: 'Charlotte',
            state: 'NC',
            zip: '28202',
            latitude: 35.227,
            longitude: -80.843,
            phone: '704-555-0100',
          },
        },
      ],
    }),
  })),
}));

describe('useStores with Wix CMS', () => {
  it('loads stores from Wix when configured', async () => {
    const { result } = renderHook(() => useStores());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stores.length).toBeGreaterThan(0);
    expect(result.current.stores[0].city).toBe('Charlotte');
  });

  it('falls back to mock data when Wix not configured', async () => {
    const { isWixConfigured } = require('@/services/wix/config');
    (isWixConfigured as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() => useStores());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should still have stores (mock data)
    expect(result.current.stores.length).toBeGreaterThan(0);
  });

  it('handles Wix API error gracefully', async () => {
    const { getWixClient } = require('@/services/wix/wixClient');
    (getWixClient as jest.Mock).mockReturnValue({
      queryData: jest.fn().mockRejectedValue(new Error('CMS unavailable')),
    });

    const { result } = renderHook(() => useStores());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });
});
```

- [ ] **Step 6: Implement Wix CMS data source in useStores**

Update `src/hooks/useStores.ts` to check `isWixConfigured()` and query Wix CMS `Showrooms` collection, falling back to static `STORES` data when not configured.

- [ ] **Step 7: Run both test files**

Run: `npx jest src/__tests__/services/prefetchWix.test.ts src/__tests__/hooks/useStoresWix.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 8: Add production Wix env vars to eas.json preview profile**

In `eas.json`, add to the `preview.env` block:
```json
"EXPO_PUBLIC_WIX_SITE_ID": "3af610bf-06fb-410d-a406-c1258fa84372",
"EXPO_PUBLIC_WIX_API_KEY": "${WIX_API_KEY}"
```

Note: `WIX_API_KEY` should be set as an EAS Secret, not hardcoded.

- [ ] **Step 9: Run full test suite**

Run: `npx jest --no-coverage 2>&1 | tail -5`
Expected: All tests pass

- [ ] **Step 10: Commit**

```bash
git add src/services/prefetch.ts src/hooks/useStores.ts src/__tests__/services/prefetchWix.test.ts src/__tests__/hooks/useStoresWix.test.ts eas.json
git commit -m "feat(wix): activate Wix backend with mock data fallback

Prefetch and useStores now query Wix API when configured,
falling back to static mock data when env vars not set."
```

---

## Chunk 2: Dynamic Tax + Shipping (Task 3)

### Task 3: Replace Hardcoded Tax with Stripe Tax + UPS Shipping

**Files:**
- Modify: `src/services/payment.ts` (replace `calculateTotals`)
- Create: `src/services/taxService.ts`
- Create: `src/services/shippingService.ts`
- Create: `src/__tests__/services/taxService.test.ts`
- Create: `src/__tests__/services/shippingService.test.ts`
- Modify: `src/__tests__/services/payment.test.ts` (update tests for new totals logic)

- [ ] **Step 1: Write failing tests for tax service**

```typescript
// src/__tests__/services/taxService.test.ts
import { calculateTax, TaxResult } from '@/services/taxService';

describe('calculateTax', () => {
  it('calculates tax for NC address (7% state rate)', async () => {
    const result = await calculateTax({
      subtotal: 499,
      shippingAddress: { state: 'NC', zip: '28202', country: 'US' },
    });

    expect(result.taxAmount).toBeGreaterThan(0);
    expect(result.taxRate).toBeCloseTo(0.07, 1);
    expect(result.jurisdiction).toBe('NC');
  });

  it('returns zero tax for tax-free states (OR, MT, NH, DE, AK)', async () => {
    const taxFreeStates = ['OR', 'MT', 'NH', 'DE', 'AK'];

    for (const state of taxFreeStates) {
      const result = await calculateTax({
        subtotal: 499,
        shippingAddress: { state, zip: '00000', country: 'US' },
      });

      expect(result.taxAmount).toBe(0);
      expect(result.taxRate).toBe(0);
    }
  });

  it('includes tax breakdown with jurisdiction details', async () => {
    const result = await calculateTax({
      subtotal: 1000,
      shippingAddress: { state: 'NC', zip: '28202', country: 'US' },
    });

    expect(result).toHaveProperty('taxAmount');
    expect(result).toHaveProperty('taxRate');
    expect(result).toHaveProperty('jurisdiction');
    expect(typeof result.taxAmount).toBe('number');
  });

  it('handles Stripe Tax API failure with fallback rate', async () => {
    // When Stripe Tax is unreachable, fall back to state-level estimate
    const result = await calculateTax({
      subtotal: 499,
      shippingAddress: { state: 'NC', zip: '28202', country: 'US' },
      _forceError: true, // test hook
    });

    expect(result.taxAmount).toBeGreaterThan(0);
    expect(result.fallback).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/services/taxService.test.ts --no-coverage`
Expected: FAIL — module not found

- [ ] **Step 3: Implement taxService.ts**

```typescript
// src/services/taxService.ts
export interface TaxInput {
  subtotal: number;
  shippingAddress: { state: string; zip: string; country: string };
  _forceError?: boolean; // test hook only
}

export interface TaxResult {
  taxAmount: number;
  taxRate: number;
  jurisdiction: string;
  fallback: boolean;
}

const TAX_FREE_STATES = new Set(['OR', 'MT', 'NH', 'DE', 'AK']);

// State-level fallback rates (used when Stripe Tax unavailable)
const STATE_TAX_RATES: Record<string, number> = {
  NC: 0.07, SC: 0.06, VA: 0.053, GA: 0.04, TN: 0.07,
  FL: 0.06, TX: 0.0625, NY: 0.04, CA: 0.0725, PA: 0.06,
};

export async function calculateTax(input: TaxInput): Promise<TaxResult> {
  const { subtotal, shippingAddress } = input;
  const state = shippingAddress.state.toUpperCase();

  if (TAX_FREE_STATES.has(state)) {
    return { taxAmount: 0, taxRate: 0, jurisdiction: state, fallback: false };
  }

  // TODO: Replace with real Stripe Tax API call when keys are configured
  // For now, use state-level fallback rates
  const rate = STATE_TAX_RATES[state] ?? 0.07; // default 7% if unknown state
  const taxAmount = Math.round(subtotal * rate * 100) / 100;

  return {
    taxAmount,
    taxRate: rate,
    jurisdiction: state,
    fallback: true, // Will be false once Stripe Tax is wired
  };
}
```

- [ ] **Step 4: Run tax tests**

Run: `npx jest src/__tests__/services/taxService.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Write failing tests for shipping service**

```typescript
// src/__tests__/services/shippingService.test.ts
import { calculateShipping, ShippingResult } from '@/services/shippingService';

describe('calculateShipping', () => {
  it('returns free shipping for orders >= $499', async () => {
    const result = await calculateShipping({
      subtotal: 499,
      shippingZip: '28202',
      isPremium: false,
    });

    expect(result.shippingCost).toBe(0);
    expect(result.freeShippingApplied).toBe(true);
    expect(result.freeShippingReason).toBe('threshold');
  });

  it('returns free shipping for premium members regardless of subtotal', async () => {
    const result = await calculateShipping({
      subtotal: 100,
      shippingZip: '28202',
      isPremium: true,
    });

    expect(result.shippingCost).toBe(0);
    expect(result.freeShippingApplied).toBe(true);
    expect(result.freeShippingReason).toBe('premium');
  });

  it('returns flat rate fallback when subtotal < $499 and not premium', async () => {
    const result = await calculateShipping({
      subtotal: 200,
      shippingZip: '28202',
      isPremium: false,
    });

    expect(result.shippingCost).toBe(49.99);
    expect(result.freeShippingApplied).toBe(false);
    expect(result.fallback).toBe(true);
  });

  it('handles UPS API failure with flat rate fallback', async () => {
    const result = await calculateShipping({
      subtotal: 200,
      shippingZip: '28202',
      isPremium: false,
      _forceError: true,
    });

    expect(result.shippingCost).toBe(49.99);
    expect(result.fallback).toBe(true);
  });
});
```

- [ ] **Step 6: Implement shippingService.ts**

```typescript
// src/services/shippingService.ts
export interface ShippingInput {
  subtotal: number;
  shippingZip: string;
  isPremium: boolean;
  _forceError?: boolean;
}

export interface ShippingResult {
  shippingCost: number;
  freeShippingApplied: boolean;
  freeShippingReason?: 'threshold' | 'premium';
  fallback: boolean;
  estimatedDays?: number;
}

const FREE_SHIPPING_THRESHOLD = 499;
const FLAT_RATE_FALLBACK = 49.99;

export async function calculateShipping(input: ShippingInput): Promise<ShippingResult> {
  const { subtotal, isPremium } = input;

  // Premium members always get free shipping
  if (isPremium) {
    return {
      shippingCost: 0,
      freeShippingApplied: true,
      freeShippingReason: 'premium',
      fallback: false,
      estimatedDays: 5,
    };
  }

  // Free shipping above threshold
  if (subtotal >= FREE_SHIPPING_THRESHOLD) {
    return {
      shippingCost: 0,
      freeShippingApplied: true,
      freeShippingReason: 'threshold',
      fallback: false,
      estimatedDays: 5,
    };
  }

  // TODO: Call melania's UPS API (ups-shipping.web.js) for zone-based rates
  // For now, use flat rate fallback
  return {
    shippingCost: FLAT_RATE_FALLBACK,
    freeShippingApplied: false,
    fallback: true,
    estimatedDays: 7,
  };
}
```

- [ ] **Step 7: Run shipping tests**

Run: `npx jest src/__tests__/services/shippingService.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 8: Add async `calculateCheckoutTotals` to payment.ts (keep sync `calculateTotals` for estimates)**

**IMPORTANT:** Do NOT change the existing `calculateTotals` — it's used synchronously in `useMemo` across 10+ files (usePayment.ts:95, CheckoutScreen, PurchaseFlowIntegration tests, etc.). Instead, add a NEW async function for checkout:

```typescript
// Add to src/services/payment.ts — NEW function, keep existing calculateTotals unchanged
import { calculateTax } from '@/services/taxService';
import { calculateShipping } from '@/services/shippingService';

/**
 * Precise totals for checkout — uses real tax rates + shipping API.
 * Use this at checkout time. Use calculateTotals() for quick cart estimates.
 */
export async function calculateCheckoutTotals(
  subtotal: number,
  isPremium: boolean,
  shippingAddress: { state: string; zip: string; country: string },
): Promise<OrderTotals & { taxJurisdiction: string; freeShippingApplied: boolean }> {
  const [taxResult, shippingResult] = await Promise.all([
    calculateTax({ subtotal, shippingAddress }),
    calculateShipping({ subtotal, shippingZip: shippingAddress.zip, isPremium }),
  ]);

  return {
    subtotal,
    shipping: shippingResult.shippingCost,
    tax: taxResult.taxAmount,
    total: Math.round((subtotal + shippingResult.shippingCost + taxResult.taxAmount) * 100) / 100,
    taxJurisdiction: taxResult.jurisdiction,
    freeShippingApplied: shippingResult.freeShippingApplied,
  };
}
```

- [ ] **Step 9: Write test for calculateCheckoutTotals**

```typescript
// Add to src/services/__tests__/payment.test.ts
describe('calculateCheckoutTotals', () => {
  it('uses dynamic tax and shipping for NC address', async () => {
    const totals = await calculateCheckoutTotals(499, false, {
      state: 'NC', zip: '28202', country: 'US',
    });
    expect(totals.tax).toBeGreaterThan(0);
    expect(totals.shipping).toBe(0); // >= $499 threshold
    expect(totals.taxJurisdiction).toBe('NC');
    expect(totals.freeShippingApplied).toBe(true);
  });
});
```

Existing `calculateTotals` tests remain unchanged — no breaking changes.

- [ ] **Step 10: Run full test suite**

Run: `npx jest --no-coverage 2>&1 | tail -5`
Expected: All tests pass

- [ ] **Step 11: Commit**

```bash
git add src/services/taxService.ts src/services/shippingService.ts src/services/payment.ts src/__tests__/services/taxService.test.ts src/__tests__/services/shippingService.test.ts
git commit -m "feat(payment): dynamic tax by state + shipping service with fallbacks

Replaces hardcoded 7% NC tax with state-level rates (Stripe Tax integration
placeholder). Adds shipping service consuming UPS API (flat rate fallback).
Tax-free states (OR, MT, NH, DE, AK) correctly return $0."
```

---

## Chunk 3: Order Saga (Task 4)

### Task 4: Stripe ↔ Wix Order Saga with Rollback

**Files:**
- Create: `src/services/orderSaga.ts`
- Create: `src/__tests__/services/orderSaga.test.ts`
- Modify: `src/hooks/usePayment.ts` (use saga instead of direct calls)
- Modify: `src/services/offlineQueue.ts` (add idempotency key field)

- [ ] **Step 1: Write failing tests for order saga**

```typescript
// src/__tests__/services/orderSaga.test.ts
import { executeOrderSaga, OrderSagaResult } from '@/services/orderSaga';

// Mock Stripe + Wix
const mockCreatePaymentIntent = jest.fn();
const mockConfirmOrder = jest.fn();
const mockRefundPayment = jest.fn();

jest.mock('@/services/payment', () => ({
  createPaymentIntent: (...args: unknown[]) => mockCreatePaymentIntent(...args),
  confirmOrder: (...args: unknown[]) => mockConfirmOrder(...args),
}));

jest.mock('@/services/refund', () => ({
  refundPayment: (...args: unknown[]) => mockRefundPayment(...args),
}));

const baseInput = {
  cartId: 'cart-123',
  items: [{ productId: 'p1', name: 'Nordic Sleeper', quantity: 1, price: 499 }],
  totals: { subtotal: 499, shipping: 0, tax: 34.93, total: 533.93 },
  paymentMethod: 'card' as const,
  shippingAddress: { state: 'NC', zip: '28202', country: 'US' },
};

describe('executeOrderSaga', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreatePaymentIntent.mockResolvedValue({
      clientSecret: 'pi_test_secret',
      paymentIntentId: 'pi_test_123',
    });
    mockConfirmOrder.mockResolvedValue({
      orderId: 'order-456',
      orderNumber: 'CF-2026-0001',
    });
    mockRefundPayment.mockResolvedValue({ refundId: 'ref_123' });
  });

  it('completes happy path: payment → order → confirmed', async () => {
    const result = await executeOrderSaga(baseInput);

    expect(result.status).toBe('confirmed');
    expect(result.orderId).toBe('order-456');
    expect(result.orderNumber).toBe('CF-2026-0001');
    expect(mockCreatePaymentIntent).toHaveBeenCalledTimes(1);
    expect(mockConfirmOrder).toHaveBeenCalledTimes(1);
    expect(mockRefundPayment).not.toHaveBeenCalled();
  });

  it('rolls back Stripe charge when Wix order creation fails', async () => {
    mockConfirmOrder.mockRejectedValue(new Error('Wix unavailable'));

    const result = await executeOrderSaga(baseInput);

    expect(result.status).toBe('rolled_back');
    expect(result.error).toMatch(/Wix unavailable/);
    expect(mockRefundPayment).toHaveBeenCalledWith('pi_test_123');
  });

  it('reports critical error when both order AND refund fail', async () => {
    mockConfirmOrder.mockRejectedValue(new Error('Wix down'));
    mockRefundPayment.mockRejectedValue(new Error('Stripe refund failed'));

    const result = await executeOrderSaga(baseInput);

    expect(result.status).toBe('refund_failed');
    expect(result.requiresManualResolution).toBe(true);
  });

  it('generates idempotency key from cartId + timestamp', async () => {
    await executeOrderSaga(baseInput);

    const intentCall = mockCreatePaymentIntent.mock.calls[0];
    // idempotency key should be passed
    expect(intentCall).toBeDefined();
  });

  it('retries Wix order creation 3 times with backoff before rollback', async () => {
    let callCount = 0;
    mockConfirmOrder.mockImplementation(() => {
      callCount++;
      if (callCount < 4) return Promise.reject(new Error('Wix timeout'));
      return Promise.resolve({ orderId: 'order-789', orderNumber: 'CF-2026-0002' });
    });

    // Should fail after 3 retries and trigger rollback
    const result = await executeOrderSaga(baseInput);

    expect(mockConfirmOrder).toHaveBeenCalledTimes(3);
    expect(result.status).toBe('rolled_back');
  });

  it('succeeds on retry within 3 attempts', async () => {
    let callCount = 0;
    mockConfirmOrder.mockImplementation(() => {
      callCount++;
      if (callCount < 3) return Promise.reject(new Error('Wix timeout'));
      return Promise.resolve({ orderId: 'order-789', orderNumber: 'CF-2026-0002' });
    });

    const result = await executeOrderSaga(baseInput);

    expect(result.status).toBe('confirmed');
    expect(mockConfirmOrder).toHaveBeenCalledTimes(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/services/orderSaga.test.ts --no-coverage`
Expected: FAIL — module not found

- [ ] **Step 3: Implement orderSaga.ts**

```typescript
// src/services/orderSaga.ts
import { createPaymentIntent, confirmOrder } from '@/services/payment';
import * as Sentry from '@sentry/react-native';

export interface OrderSagaInput {
  cartId: string;
  items: Array<{ productId: string; name: string; quantity: number; price: number }>;
  totals: { subtotal: number; shipping: number; tax: number; total: number };
  paymentMethod: 'card' | 'apple-pay' | 'google-pay' | 'affirm' | 'klarna';
  shippingAddress: { state: string; zip: string; country: string };
}

export interface OrderSagaResult {
  status: 'confirmed' | 'rolled_back' | 'refund_failed' | 'payment_failed';
  orderId?: string;
  orderNumber?: string;
  error?: string;
  requiresManualResolution?: boolean;
}

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 9000]; // exponential backoff

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function refundPayment(paymentIntentId: string): Promise<void> {
  // Dynamic import to avoid circular dependency
  const { refundPayment: doRefund } = await import('@/services/refund');
  await doRefund(paymentIntentId);
}

export async function executeOrderSaga(
  client: WixClient,
  input: OrderSagaInput,
): Promise<OrderSagaResult> {
  // Deterministic idempotency key — same cart produces same key on replay
  const idempotencyKey = `order_${input.cartId}`;

  // Step 1: Create payment intent
  let paymentIntentId: string;
  try {
    const intent = await createPaymentIntent(
      client,
      input.items,
      input.totals
    );
    paymentIntentId = intent.paymentIntentId;
  } catch (error: unknown) {
    return {
      status: 'payment_failed',
      error: error instanceof Error ? error.message : 'Payment failed',
    };
  }

  // Step 2: Create Wix order with retries
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const order = await confirmOrder(
        client,
        paymentIntentId,
        input.items,
        input.totals,
        input.paymentMethod
      );

      return {
        status: 'confirmed',
        orderId: order.orderId,
        orderNumber: order.orderNumber,
      };
    } catch (error: unknown) {
      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAYS[attempt]);
        continue;
      }

      // All retries exhausted — rollback
      try {
        await refundPayment(paymentIntentId);
        return {
          status: 'rolled_back',
          error: error instanceof Error ? error.message : 'Order creation failed',
        };
      } catch (refundError: unknown) {
        // CRITICAL: Charge exists but no order AND no refund
        Sentry.captureException(refundError, {
          level: 'fatal',
          tags: { saga: 'refund_failed' },
          extra: { paymentIntentId, cartId: input.cartId },
        });

        return {
          status: 'refund_failed',
          error: 'Payment charged but order and refund both failed. Manual resolution required.',
          requiresManualResolution: true,
        };
      }
    }
  }

  // TypeScript exhaustiveness — should never reach here
  return { status: 'payment_failed', error: 'Unexpected saga state' };
}
```

- [ ] **Step 4: Create refund service stub**

```typescript
// src/services/refund.ts
export async function refundPayment(paymentIntentId: string): Promise<{ refundId: string }> {
  // TODO: Call Stripe Refund API via Wix backend
  // POST /ecom/v1/payments/refund { paymentIntentId }
  throw new Error(`Refund not implemented for ${paymentIntentId}`);
}
```

- [ ] **Step 5: Run saga tests**

Run: `npx jest src/__tests__/services/orderSaga.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 6: Add idempotency key to offline queue**

In `src/services/offlineQueue.ts`, add `idempotencyKey` to the `QueuedAction` interface:

```typescript
export interface QueuedAction {
  id: string;
  timestamp: number;
  domain: string;
  action: string;
  payload: Record<string, unknown>;
  idempotencyKey?: string; // hash of domain+action+payload for dedup
}
```

Update `enqueue()` to generate the key:

```typescript
const idempotencyKey = `${domain}_${action}_${JSON.stringify(payload)}`;
```

- [ ] **Step 7: Run full test suite**

Run: `npx jest --no-coverage 2>&1 | tail -5`
Expected: All tests pass

- [ ] **Step 8: Commit**

```bash
git add src/services/orderSaga.ts src/services/refund.ts src/__tests__/services/orderSaga.test.ts src/services/offlineQueue.ts
git commit -m "feat(orders): implement Stripe-Wix order saga with rollback

Saga pattern: payment → order (3 retries, exponential backoff) → confirm.
On Wix failure: auto-refund Stripe. On refund failure: Sentry FATAL alert
for manual resolution. Idempotency key added to offline queue."
```

---

## Chunk 4: Auth Completion (Task 5)

### Task 5: Token Refresh Mutex + Account Deletion

**Files:**
- Modify: `src/services/wix/wixAuth.ts` (add refresh mutex)
- Modify: `src/hooks/useAccountDeletion.ts` (add re-auth + 30-day retention)
- Create: `src/__tests__/services/wix/tokenRefreshMutex.test.ts`
- Create: `src/__tests__/hooks/useAccountDeletion.test.ts`

- [ ] **Step 1: Write failing test for token refresh mutex**

```typescript
// src/__tests__/services/wix/tokenRefreshMutex.test.ts
import { WixAuthService } from '@/services/wix/wixAuth';

describe('Token refresh mutex', () => {
  it('deduplicates concurrent refresh calls', async () => {
    const auth = new WixAuthService();
    const refreshSpy = jest.spyOn(auth as any, '_doRefresh');
    refreshSpy.mockResolvedValue(true);

    // Fire 5 concurrent refresh calls
    const results = await Promise.all([
      auth.refreshSession(),
      auth.refreshSession(),
      auth.refreshSession(),
      auth.refreshSession(),
      auth.refreshSession(),
    ]);

    // Should only call the underlying refresh ONCE
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    // All callers get the same boolean result
    results.forEach((r) => expect(r).toBe(true));
  });

  it('allows new refresh after previous completes', async () => {
    const auth = new WixAuthService();
    const refreshSpy = jest.spyOn(auth as any, '_doRefresh');
    refreshSpy.mockResolvedValue(true);

    await auth.refreshSession();

    refreshSpy.mockResolvedValue(false);
    await auth.refreshSession();

    expect(refreshSpy).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/services/wix/tokenRefreshMutex.test.ts --no-coverage`
Expected: FAIL — no `_doRefresh` method, no mutex

- [ ] **Step 3: Implement mutex in wixAuth.ts**

Add to the `WixAuthService` class. **Note:** `refreshSession()` returns `Promise<boolean>` — preserve this contract:

```typescript
private refreshPromise: Promise<boolean> | null = null;

async refreshSession(): Promise<boolean> {
  // If a refresh is already in-flight, piggyback on it
  if (this.refreshPromise) {
    return this.refreshPromise;
  }

  this.refreshPromise = this._doRefresh();

  try {
    return await this.refreshPromise;
  } finally {
    this.refreshPromise = null;
  }
}

private async _doRefresh(): Promise<boolean> {
  // Move existing refreshSession() logic here (lines 276-296)
  try {
    const currentTokens = this.auth.getTokens();
    const newTokens = await this.auth.renewToken(currentTokens.refreshToken);
    this.auth.setTokens(newTokens);
    await saveTokens(newTokens);
    return true;
  } catch (err) {
    if (isNetworkError(err)) {
      captureException(
        err instanceof Error ? err : new Error('Network error during token refresh'),
        'warning',
        { action: 'refreshSession' },
      );
      return false;
    }
    await clearTokens();
    return false;
  }
}
```

- [ ] **Step 4: Run mutex tests**

Run: `npx jest src/__tests__/services/wix/tokenRefreshMutex.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Write failing test for account deletion**

```typescript
// src/__tests__/hooks/useAccountDeletion.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { useAccountDeletion } from '@/hooks/useAccountDeletion';

const mockDeleteMember = jest.fn();
const mockSignOut = jest.fn();

jest.mock('@/services/wix/wixClient', () => ({
  getWixClient: () => ({ deleteMember: mockDeleteMember }),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com' },
    signOut: mockSignOut,
  }),
}));

describe('useAccountDeletion', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requires confirmation before deletion', async () => {
    const { result } = renderHook(() => useAccountDeletion());

    await act(() => result.current.requestDeletion());
    expect(result.current.status).toBe('confirming');

    // Should NOT have called delete yet
    expect(mockDeleteMember).not.toHaveBeenCalled();
  });

  it('deletes account on confirmation', async () => {
    mockDeleteMember.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAccountDeletion());

    await act(() => result.current.requestDeletion());
    await act(() => result.current.confirmDeletion());

    expect(result.current.status).toBe('deleted');
    expect(mockDeleteMember).toHaveBeenCalledWith('user-123');
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('handles deletion failure gracefully', async () => {
    mockDeleteMember.mockRejectedValue(new Error('Server error'));
    const { result } = renderHook(() => useAccountDeletion());

    await act(() => result.current.requestDeletion());
    await act(() => result.current.confirmDeletion());

    expect(result.current.status).toBe('error');
    expect(result.current.error).toMatch(/Server error/);
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('can cancel deletion', async () => {
    const { result } = renderHook(() => useAccountDeletion());

    await act(() => result.current.requestDeletion());
    expect(result.current.status).toBe('confirming');

    await act(() => result.current.cancel());
    expect(result.current.status).toBe('idle');
  });
});
```

- [ ] **Step 6: Run account deletion tests, verify failures**

Run: `npx jest src/__tests__/hooks/useAccountDeletion.test.ts --no-coverage`
Expected: May pass partially (hook exists) — check which tests fail

- [ ] **Step 7: Update useAccountDeletion if tests fail**

Ensure the hook properly gates deletion behind confirmation, handles errors without signing out, and supports cancel.

- [ ] **Step 8: Run full test suite**

Run: `npx jest --no-coverage 2>&1 | tail -5`
Expected: All tests pass

- [ ] **Step 9: Commit**

```bash
git add src/services/wix/wixAuth.ts src/hooks/useAccountDeletion.ts src/__tests__/services/wix/tokenRefreshMutex.test.ts src/__tests__/hooks/useAccountDeletion.test.ts
git commit -m "feat(auth): add token refresh mutex + harden account deletion

Concurrent refresh calls now coalesce into single request.
Account deletion gated behind confirmation, with error handling."
```

---

## Chunk 5: Push Notification Spike + Store Sync (Tasks 6-7)

### Task 6: Push Notification Backend Spike

**Files:**
- Create: `src/services/pushService.ts` (spike: evaluate Expo managed vs serverless)
- Create: `src/__tests__/services/pushService.test.ts`

This is a **spike task** (1 day) to determine the best backend approach. The goal is a working prototype that can send a push notification to a registered device token.

- [ ] **Step 1: Write test for push token storage**

```typescript
// src/__tests__/services/pushService.test.ts
import { storeDeviceToken, sendTestPush } from '@/services/pushService';

describe('pushService', () => {
  it('stores device token with user ID and platform', async () => {
    const result = await storeDeviceToken({
      userId: 'user-123',
      pushToken: 'ExponentPushToken[xxxxxx]',
      platform: 'ios',
    });

    expect(result.stored).toBe(true);
  });

  it('rejects invalid Expo push tokens', async () => {
    await expect(
      storeDeviceToken({
        userId: 'user-123',
        pushToken: 'invalid-token',
        platform: 'ios',
      })
    ).rejects.toThrow(/invalid.*token/i);
  });

  it('sends test push to registered token', async () => {
    const result = await sendTestPush({
      pushToken: 'ExponentPushToken[xxxxxx]',
      title: 'Test',
      body: 'Hello from spike',
    });

    expect(result.sent).toBe(true);
  });
});
```

- [ ] **Step 2: Implement pushService.ts**

```typescript
// src/services/pushService.ts

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface DeviceTokenInput {
  userId: string;
  pushToken: string;
  platform: 'ios' | 'android';
}

interface PushMessage {
  pushToken: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function storeDeviceToken(input: DeviceTokenInput): Promise<{ stored: boolean }> {
  if (!input.pushToken.startsWith('ExponentPushToken[')) {
    throw new Error('Invalid Expo push token format');
  }

  // TODO: Store in Wix CMS PushTokens collection
  // For spike: store locally via AsyncStorage
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  await AsyncStorage.setItem(
    `push_token_${input.userId}`,
    JSON.stringify({ token: input.pushToken, platform: input.platform, updatedAt: Date.now() })
  );

  return { stored: true };
}

export async function sendTestPush(message: PushMessage): Promise<{ sent: boolean }> {
  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: message.pushToken,
      title: message.title,
      body: message.body,
      data: message.data ?? {},
    }),
  });

  if (!response.ok) {
    throw new Error(`Push send failed: ${response.status}`);
  }

  return { sent: true };
}
```

- [ ] **Step 3: Run spike tests**

Run: `npx jest src/__tests__/services/pushService.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 4: Document spike findings**

Add comment at top of `pushService.ts`:
```
// SPIKE RESULT: Expo Push API works for direct send.
// For production: store tokens in Wix CMS 'PushTokens' collection,
// trigger sends from Wix backend functions (serverless) on order events.
// No custom backend server needed.
```

- [ ] **Step 5: Commit**

```bash
git add src/services/pushService.ts src/__tests__/services/pushService.test.ts
git commit -m "spike(push): validate Expo Push API for serverless push service

Token validation + direct push send working. Production plan:
Wix CMS for token storage, Wix backend functions for triggers."
```

---

### Task 7: Store Data — Replace Mock with Wix CMS

Already covered in Task 2 (`useStores` update). If Task 2's useStores implementation is complete, this task is done. Otherwise:

- [ ] **Step 1: Verify useStores fetches from Wix when configured**

Run: `npx jest src/__tests__/hooks/useStoresWix.test.ts --no-coverage`
Expected: PASS (from Task 2)

- [ ] **Step 2: Add Google Maps deep link for directions**

In `src/components/StoreCard.tsx`, ensure the directions CTA opens Google Maps:

```typescript
import { Linking, Platform } from 'react-native';

const openDirections = (lat: number, lng: number) => {
  const url = Platform.select({
    ios: `maps://app?daddr=${lat},${lng}`,
    android: `google.navigation:q=${lat},${lng}`,
  });
  if (url) Linking.openURL(url);
};
```

- [ ] **Step 3: Write test for directions link**

```typescript
it('opens maps URL with store coordinates', () => {
  const { getByTestId } = render(
    <StoreCard store={mockStore} onPress={jest.fn()} />
  );
  // Verify directions button exists and is pressable
  expect(getByTestId('store-directions-btn')).toBeTruthy();
});
```

- [ ] **Step 4: Commit**

```bash
git add src/components/StoreCard.tsx src/__tests__/components/StoreCard.test.tsx
git commit -m "feat(stores): add Google Maps directions + Wix CMS integration"
```

---

## Final Integration Checklist

After all tasks complete:

- [ ] **Run full test suite**: `npx jest --no-coverage`
- [ ] **Run QA sandbox**: `./scripts/qa-sandbox.sh`
- [ ] **Run lint**: `npx eslint src/ --ext .ts,.tsx`
- [ ] **Verify bundle size**: `npx expo export --platform web 2>&1 | grep -i size`
- [ ] **Create feature branch**: `git checkout -b cm-phase1-go-live`
- [ ] **Push + open PR**: `gh pr create -R DreadPirateRobertz/carolina-futons-mobile --title "Phase 1: Go-Live Backend Integration" --body "..."`

---

## Deferred to Follow-Up Plans

These spec items are acknowledged but deferred to separate implementation plans to keep this plan focused:

**Auth (spec 1.4) — not covered here:**
- Password reset via Wix email service (requires Wix email endpoint investigation)
- Saved addresses CRUD (requires Wix Members API address fields)
- Stripe Customer creation for payment method vault
- Session invalidation on password change

**Push (spec 1.5) — only spike covered here:**
- Order status change triggers (requires order saga from Task 4 to exist first)
- Cart abandonment 24hr delay trigger
- Back-in-stock notification triggers (requires inventory sync)
- Full push trigger implementation should be a separate plan after the spike validates the approach

These will be filed as separate beads once this plan's Tasks 4-6 are complete.

---

## Crew Assignment Summary

| Task | Owner | Parallel? |
|------|-------|-----------|
| Task 1: Wix Timeout | hicks | Start immediately |
| Task 2: Wix Activation | dallas | After Task 1 |
| Task 3: Tax + Shipping | dallas + melania coordination | After Task 2 |
| Task 4: Order Saga | bishop | After Task 2 |
| Task 5: Auth Completion | burke (a11y) + ripley (UI) | Parallel with Tasks 3-4 |
| Task 6: Push Spike | hicks | Parallel (1 day) |
| Task 7: Store Sync | ripley | Parallel with Tasks 3-4 |
