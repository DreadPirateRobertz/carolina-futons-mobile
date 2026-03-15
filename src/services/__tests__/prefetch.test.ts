/**
 * Tests for splash-screen data race prefetch service.
 *
 * The prefetch service kicks off critical data loading in parallel with
 * font loading during splash, so data is ready when screens mount.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// Must mock before importing prefetch module
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock the product fetcher
jest.mock('@/data/products', () => ({
  PRODUCTS: [
    {
      id: 'p1',
      name: 'Test Futon',
      slug: 'test-futon',
      category: 'futons',
      price: 299,
      description: 'A test futon',
      shortDescription: 'Test',
      images: [],
      rating: 4.5,
      reviewCount: 10,
      inStock: true,
      fabricOptions: [],
      dimensions: { width: 72, depth: 36, height: 32 },
      badge: null,
    },
  ],
}));

import {
  prefetchCriticalData,
  getPrefetchStatus,
  resetPrefetchState,
  PREFETCH_CACHE_KEY,
} from '../prefetch';

const mockGetItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
const mockSetItem = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;

beforeEach(() => {
  jest.clearAllMocks();
  resetPrefetchState();
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
});

describe('prefetchCriticalData', () => {
  it('loads product data and caches it in AsyncStorage', async () => {
    await prefetchCriticalData();

    expect(mockSetItem).toHaveBeenCalledWith(
      '@cfutons/cache/products',
      expect.stringContaining('"data"'),
    );
  });

  it('returns a promise that resolves when prefetch completes', async () => {
    const result = await prefetchCriticalData();
    expect(result).toBeUndefined(); // resolves without error
  });

  it('deduplicates concurrent calls (only one fetch runs)', async () => {
    const p1 = prefetchCriticalData();
    const p2 = prefetchCriticalData();

    await Promise.all([p1, p2]);

    // setItem should be called once, not twice
    expect(mockSetItem).toHaveBeenCalledTimes(1);
  });

  it('sets status to "complete" after successful prefetch', async () => {
    expect(getPrefetchStatus()).toBe('idle');

    await prefetchCriticalData();

    expect(getPrefetchStatus()).toBe('complete');
  });

  it('sets status to "fetching" while in progress', async () => {
    // Use a slow setItem to observe intermediate state
    let resolveSetItem: () => void;
    mockSetItem.mockImplementation(
      () => new Promise<void>((resolve) => { resolveSetItem = resolve; }),
    );

    const promise = prefetchCriticalData();

    // Allow microtasks to run
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(getPrefetchStatus()).toBe('fetching');

    resolveSetItem!();
    await promise;
    expect(getPrefetchStatus()).toBe('complete');
  });

  it('sets status to "error" when AsyncStorage write fails', async () => {
    mockSetItem.mockRejectedValue(new Error('Storage full'));

    await prefetchCriticalData();

    expect(getPrefetchStatus()).toBe('error');
  });

  it('does not throw when AsyncStorage write fails', async () => {
    mockSetItem.mockRejectedValue(new Error('Storage full'));

    // Should not throw — prefetch failures are non-fatal
    await expect(prefetchCriticalData()).resolves.toBeUndefined();
  });

  it('writes data in useDataCache-compatible format', async () => {
    await prefetchCriticalData();

    const [key, value] = mockSetItem.mock.calls[0];
    expect(key).toBe('@cfutons/cache/products');

    const parsed = JSON.parse(value as string);
    expect(parsed).toHaveProperty('data');
    expect(parsed).toHaveProperty('timestamp');
    expect(typeof parsed.timestamp).toBe('number');
    expect(Array.isArray(parsed.data)).toBe(true);
  });

  it('uses existing cache when available and fresh', async () => {
    const freshCache = JSON.stringify({
      data: [{ id: 'cached-product' }],
      timestamp: Date.now(), // fresh
    });
    mockGetItem.mockResolvedValue(freshCache);

    await prefetchCriticalData();

    // Should still write (revalidate), but status should be complete
    expect(getPrefetchStatus()).toBe('complete');
  });
});

describe('resetPrefetchState', () => {
  it('resets status back to idle', async () => {
    await prefetchCriticalData();
    expect(getPrefetchStatus()).toBe('complete');

    resetPrefetchState();
    expect(getPrefetchStatus()).toBe('idle');
  });

  it('allows prefetch to run again after reset', async () => {
    await prefetchCriticalData();
    mockSetItem.mockClear();

    resetPrefetchState();
    await prefetchCriticalData();

    expect(mockSetItem).toHaveBeenCalledTimes(1);
  });
});

describe('PREFETCH_CACHE_KEY', () => {
  it('matches the useDataCache products key', () => {
    // This ensures prefetch writes to the same cache useDataCache reads from
    expect(PREFETCH_CACHE_KEY).toBe('@cfutons/cache/products');
  });
});
