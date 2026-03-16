/**
 * Tests for Wix-aware prefetch (mock → production path).
 *
 * Verifies that prefetchCriticalData:
 * - Uses WixClient API when configured
 * - Falls back to static mock data when not configured
 * - Handles Wix API failures gracefully (non-fatal)
 * - Respects the dedupe/one-shot semantics
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  prefetchCriticalData,
  getPrefetchStatus,
  resetPrefetchState,
  PREFETCH_CACHE_KEY,
  PREFETCH_COLLECTIONS_KEY,
} from '../prefetch';
import { PRODUCTS } from '@/data/products';
import { COLLECTIONS } from '@/data/collections';

// ── Mocks ────────────────────────────────────────────────────

const mockQueryProducts = jest.fn();
const mockQueryCollections = jest.fn();

let mockConfigured = false;

jest.mock('../wix/wixClientSingleton', () => ({
  getWixClientSingleton: () =>
    mockConfigured
      ? { queryProducts: mockQueryProducts, queryCollections: mockQueryCollections }
      : null,
}));

jest.mock('../wix/config', () => ({
  isWixConfigured: () => mockConfigured,
  getWixConfig: () => ({ apiKey: 'k', siteId: 's' }),
}));

const mockCaptureException = jest.fn();
jest.mock('../crashReporting', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

// ── Setup ────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  resetPrefetchState();
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  mockConfigured = false;
});

// ── Tests ────────────────────────────────────────────────────

describe('prefetchCriticalData — mock fallback', () => {
  it('uses static PRODUCTS when Wix is not configured', async () => {
    mockConfigured = false;
    await prefetchCriticalData();

    expect(getPrefetchStatus()).toBe('complete');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      PREFETCH_CACHE_KEY,
      expect.stringContaining(JSON.stringify(PRODUCTS).slice(0, 40)),
    );
  });

  it('uses static COLLECTIONS when Wix is not configured', async () => {
    mockConfigured = false;
    await prefetchCriticalData();

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      PREFETCH_COLLECTIONS_KEY,
      expect.stringContaining(JSON.stringify(COLLECTIONS).slice(0, 40)),
    );
  });
});

describe('prefetchCriticalData — Wix API', () => {
  const wixProducts = [
    {
      id: 'wix-p1',
      name: 'Gemini Futon',
      slug: 'gemini-futon',
      price: 599,
      images: [],
      inStock: true,
    },
  ];
  const wixCollections = [{ id: 'col-1', name: 'Futons', slug: 'futons', productCount: 10 }];

  beforeEach(() => {
    mockConfigured = true;
    mockQueryProducts.mockResolvedValue({ products: wixProducts, totalResults: 1 });
    mockQueryCollections.mockResolvedValue({ collections: wixCollections, totalResults: 1 });
  });

  it('fetches products from Wix API when configured', async () => {
    await prefetchCriticalData();

    expect(getPrefetchStatus()).toBe('complete');
    expect(mockQueryProducts).toHaveBeenCalledWith({ limit: 100 });

    const storedCall = (AsyncStorage.setItem as jest.Mock).mock.calls.find(
      (c: unknown[]) => c[0] === PREFETCH_CACHE_KEY,
    );
    expect(storedCall).toBeDefined();
    const parsed = JSON.parse(storedCall![1]);
    expect(parsed.data).toEqual(wixProducts);
  });

  it('fetches collections from Wix API when configured', async () => {
    await prefetchCriticalData();

    expect(mockQueryCollections).toHaveBeenCalledWith({ limit: 100 });

    const storedCall = (AsyncStorage.setItem as jest.Mock).mock.calls.find(
      (c: unknown[]) => c[0] === PREFETCH_COLLECTIONS_KEY,
    );
    expect(storedCall).toBeDefined();
    const parsed = JSON.parse(storedCall![1]);
    expect(parsed.data).toEqual(wixCollections);
  });

  it('falls back to mock data when Wix API call fails', async () => {
    mockQueryProducts.mockRejectedValue(new Error('Network error'));
    mockQueryCollections.mockRejectedValue(new Error('Network error'));

    await prefetchCriticalData();

    // Should still complete with fallback data — not error status
    expect(getPrefetchStatus()).toBe('complete');
    expect(mockCaptureException).not.toHaveBeenCalled();

    // Should have stored mock products as fallback
    const storedCall = (AsyncStorage.setItem as jest.Mock).mock.calls.find(
      (c: unknown[]) => c[0] === PREFETCH_CACHE_KEY,
    );
    const parsed = JSON.parse(storedCall![1]);
    expect(parsed.data).toEqual(PRODUCTS);
  });

  it('deduplicates concurrent calls', async () => {
    const p1 = prefetchCriticalData();
    const p2 = prefetchCriticalData();
    await Promise.all([p1, p2]);

    // queryProducts should only be called once
    expect(mockQueryProducts).toHaveBeenCalledTimes(1);
  });
});

describe('prefetchCriticalData — AsyncStorage failure', () => {
  it('captures exception when storage write fails', async () => {
    mockConfigured = false;
    (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage full'));

    await prefetchCriticalData();

    expect(getPrefetchStatus()).toBe('error');
    expect(mockCaptureException).toHaveBeenCalled();
  });
});
