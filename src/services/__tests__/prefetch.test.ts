/**
 * Tests for splash-screen data race prefetch service.
 *
 * The prefetch service kicks off critical data loading in parallel with
 * font loading during splash, so data is ready when screens mount.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  prefetchCriticalData,
  getPrefetchStatus,
  resetPrefetchState,
  PREFETCH_CACHE_KEY,
  PREFETCH_COLLECTIONS_KEY,
} from '../prefetch';

// Must mock before importing prefetch module
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockCaptureException = jest.fn();
jest.mock('@/services/crashReporting', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
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

jest.mock('@/data/collections', () => ({
  COLLECTIONS: [
    {
      id: 'c1',
      slug: 'test-collection',
      title: 'Test Collection',
      subtitle: 'A test',
      description: 'Test collection',
      heroImage: { uri: 'test.jpg', alt: 'test' },
      mood: ['modern'],
      featured: true,
      productIds: ['p1'],
    },
  ],
}));

const mockGetItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
const mockSetItem = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;

beforeEach(() => {
  jest.clearAllMocks();
  mockCaptureException.mockClear();
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

  it('loads collection data and caches it in AsyncStorage', async () => {
    await prefetchCriticalData();

    expect(mockSetItem).toHaveBeenCalledWith(
      '@cfutons/cache/editorial-collections',
      expect.stringContaining('"data"'),
    );
  });

  it('prefetches products and collections in parallel', async () => {
    await prefetchCriticalData();

    // Both should be written
    expect(mockSetItem).toHaveBeenCalledTimes(2);
    const keys = mockSetItem.mock.calls.map(([key]) => key);
    expect(keys).toContain('@cfutons/cache/products');
    expect(keys).toContain('@cfutons/cache/editorial-collections');
  });

  it('returns a promise that resolves when prefetch completes', async () => {
    const result = await prefetchCriticalData();
    expect(result).toBeUndefined(); // resolves without error
  });

  it('deduplicates concurrent calls (only one fetch runs)', async () => {
    const p1 = prefetchCriticalData();
    const p2 = prefetchCriticalData();

    await Promise.all([p1, p2]);

    // setItem should be called twice (products + collections), not four times
    expect(mockSetItem).toHaveBeenCalledTimes(2);
  });

  it('sets status to "complete" after successful prefetch', async () => {
    expect(getPrefetchStatus()).toBe('idle');

    await prefetchCriticalData();

    expect(getPrefetchStatus()).toBe('complete');
  });

  it('sets status to "fetching" while in progress', async () => {
    // Use slow setItem calls to observe intermediate state
    const resolvers: (() => void)[] = [];
    mockSetItem.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolvers.push(resolve);
        }),
    );

    const promise = prefetchCriticalData();

    // Allow microtasks to run
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(getPrefetchStatus()).toBe('fetching');

    // Resolve all pending setItem calls
    resolvers.forEach((r) => r());
    await promise;
    expect(getPrefetchStatus()).toBe('complete');
  });

  it('sets status to "error" and reports to crash reporting when AsyncStorage write fails', async () => {
    mockSetItem.mockRejectedValue(new Error('Storage full'));

    await prefetchCriticalData();

    expect(getPrefetchStatus()).toBe('error');
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(Error),
      'warning',
      expect.objectContaining({ action: 'prefetch-cache-prime' }),
    );
  });

  it('does not throw when AsyncStorage write fails', async () => {
    jest.spyOn(console, 'warn').mockImplementation();
    mockSetItem.mockRejectedValue(new Error('Storage full'));

    // Should not throw — prefetch failures are non-fatal
    await expect(prefetchCriticalData()).resolves.toBeUndefined();
    jest.restoreAllMocks();
  });

  it('writes data in useDataCache-compatible format', async () => {
    await prefetchCriticalData();

    // Check products entry
    const productCall = mockSetItem.mock.calls.find(([key]) => key === '@cfutons/cache/products');
    expect(productCall).toBeDefined();
    const parsed = JSON.parse(productCall![1] as string);
    expect(parsed).toHaveProperty('data');
    expect(parsed).toHaveProperty('timestamp');
    expect(typeof parsed.timestamp).toBe('number');
    expect(Array.isArray(parsed.data)).toBe(true);

    // Check collections entry
    const collectionCall = mockSetItem.mock.calls.find(
      ([key]) => key === '@cfutons/cache/editorial-collections',
    );
    expect(collectionCall).toBeDefined();
    const parsedCol = JSON.parse(collectionCall![1] as string);
    expect(parsedCol).toHaveProperty('data');
    expect(parsedCol).toHaveProperty('timestamp');
    expect(Array.isArray(parsedCol.data)).toBe(true);
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

    expect(mockSetItem).toHaveBeenCalledTimes(2);
  });
});

describe('cache key constants', () => {
  it('PREFETCH_CACHE_KEY matches the useDataCache products key', () => {
    expect(PREFETCH_CACHE_KEY).toBe('@cfutons/cache/products');
  });

  it('PREFETCH_COLLECTIONS_KEY matches the useDataCache editorial-collections key', () => {
    expect(PREFETCH_COLLECTIONS_KEY).toBe('@cfutons/cache/editorial-collections');
  });
});
