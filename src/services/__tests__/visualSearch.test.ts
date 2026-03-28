/**
 * @module visualSearch.test
 *
 * Service layer for cf-juq6 visual search catalog export API.
 * Fetches product catalog (images + metadata) from Wix web method
 * visualSearchExport.getExportData() for downstream embedding generation.
 *
 * TDD: tests written before implementation per PM quality gate.
 * hq-8p0y8
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchCatalogExport, clearCatalogCache, type CatalogProduct } from '../visualSearch';

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@/services/crashReporting', () => ({
  captureException: jest.fn(),
}));

type WixClientLike = {
  callFunction: jest.Mock;
};

function mockClient(
  response: unknown = { success: true, staleMinutes: 30, data: { products: [] } },
  shouldThrow?: Error,
): WixClientLike {
  return {
    callFunction: jest.fn(async () => {
      if (shouldThrow) throw shouldThrow;
      return response;
    }),
  };
}

// ── Fixtures ───────────────────────────────────────────────────────────────

const sampleProducts: CatalogProduct[] = [
  {
    id: 'prod-001',
    name: 'Monterey Futon Frame',
    slug: 'monterey-futon-frame',
    sku: 'MFF-001',
    category: 'futons',
    price: 299.99,
    images: ['https://example.com/monterey-1.jpg', 'https://example.com/monterey-2.jpg'],
  },
  {
    id: 'prod-002',
    name: 'Kodiak Futon Cover',
    slug: 'kodiak-futon-cover',
    sku: 'KFC-002',
    category: 'covers',
    price: 89.99,
    images: ['https://example.com/kodiak-1.jpg'],
  },
];

// ── Tests ──────────────────────────────────────────────────────────────────

describe('fetchCatalogExport', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  // ── Happy path ─────────────────────────────────────────────────────────

  it('returns products on successful API response', async () => {
    const client = mockClient({
      success: true,
      staleMinutes: 30,
      data: { products: sampleProducts },
    });

    const result = await fetchCatalogExport(client);

    expect(result.success).toBe(true);
    expect(result.products).toHaveLength(2);
    expect(result.products[0].id).toBe('prod-001');
    expect(result.products[0].name).toBe('Monterey Futon Frame');
    expect(result.products[0].images).toHaveLength(2);
  });

  it('calls the correct Wix web method with POST', async () => {
    const client = mockClient();

    await fetchCatalogExport(client);

    expect(client.callFunction).toHaveBeenCalledTimes(1);
    expect(client.callFunction).toHaveBeenCalledWith(
      'visualSearchExport',
      'POST',
      expect.any(Object),
    );
  });

  it('passes clientId for rate limiting', async () => {
    const client = mockClient();

    await fetchCatalogExport(client, { clientId: 'device-uuid-123' });

    expect(client.callFunction).toHaveBeenCalledWith(
      'visualSearchExport',
      'POST',
      expect.objectContaining({ clientId: 'device-uuid-123' }),
    );
  });

  it('returns empty products array when API returns empty catalog', async () => {
    const client = mockClient({
      success: true,
      staleMinutes: 60,
      data: { products: [] },
    });

    const result = await fetchCatalogExport(client);

    expect(result.success).toBe(true);
    expect(result.products).toEqual([]);
  });

  it('returns staleMinutes from API response', async () => {
    const client = mockClient({
      success: true,
      staleMinutes: 45,
      data: { products: sampleProducts },
    });

    const result = await fetchCatalogExport(client);

    expect(result.staleMinutes).toBe(45);
  });

  // ── Error handling ─────────────────────────────────────────────────────

  it('returns error result on API 500', async () => {
    const serverError = new Error('Internal Server Error') as Error & { status?: number };
    serverError.status = 500;
    const client = mockClient(undefined, serverError);

    const result = await fetchCatalogExport(client);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns error result on network timeout', async () => {
    const timeoutError = new Error('Network request timed out');
    timeoutError.name = 'AbortError';
    const client = mockClient(undefined, timeoutError);

    const result = await fetchCatalogExport(client);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns error when client is null and no cache', async () => {
    const result = await fetchCatalogExport(null);

    expect(result.success).toBe(false);
    expect(result.error).toBe('No client available');
    expect(result.products).toEqual([]);
  });

  it('captures exception on API failure', async () => {
    const { captureException } = require('@/services/crashReporting');
    captureException.mockClear();
    const client = mockClient(undefined, new Error('Server error'));

    await fetchCatalogExport(client);

    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it('handles malformed API response gracefully', async () => {
    const client = mockClient('not an object');

    const result = await fetchCatalogExport(client);

    expect(result.success).toBe(false);
    expect(result.products).toEqual([]);
  });

  // ── Rate limiting ──────────────────────────────────────────────────────

  it('returns rate limit error from API', async () => {
    const client = mockClient({
      success: false,
      error: 'Too many requests. Please wait before trying again.',
    });

    const result = await fetchCatalogExport(client);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Too many requests');
  });

  // ── Timeout ─────────────────────────────────────────────────────────

  it('times out on slow first export (post-cache-clear)', async () => {
    const client: WixClientLike = {
      callFunction: jest.fn(() => new Promise((resolve) => setTimeout(resolve, 60_000))),
    };

    const result = await fetchCatalogExport(client, { timeoutMs: 50 });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Export request timed out');
  });

  it('returns stale cache on timeout when cache exists', async () => {
    const cachedData = {
      products: sampleProducts,
      staleMinutes: 0,
      cachedAt: Date.now() - 120_000,
    };
    await AsyncStorage.setItem('@cf_visual_search_catalog', JSON.stringify(cachedData));

    const client: WixClientLike = {
      callFunction: jest.fn(() => new Promise((resolve) => setTimeout(resolve, 60_000))),
    };

    const result = await fetchCatalogExport(client, { timeoutMs: 50 });

    expect(result.success).toBe(true);
    expect(result.fromCache).toBe(true);
  });

  // ── Caching ────────────────────────────────────────────────────────────

  it('caches API response to AsyncStorage', async () => {
    const client = mockClient({
      success: true,
      staleMinutes: 30,
      data: { products: sampleProducts },
    });

    await fetchCatalogExport(client);

    const cached = await AsyncStorage.getItem('@cf_visual_search_catalog');
    expect(cached).not.toBeNull();
    const parsed = JSON.parse(cached!);
    expect(parsed.products).toHaveLength(2);
    expect(parsed.staleMinutes).toBe(30);
    expect(typeof parsed.cachedAt).toBe('number');
  });

  it('returns cached data when cache is fresh (within staleMinutes)', async () => {
    const client = mockClient({
      success: true,
      staleMinutes: 30,
      data: { products: sampleProducts },
    });

    // First call — populates cache
    await fetchCatalogExport(client);

    // Second call — should use cache
    const result = await fetchCatalogExport(client);

    expect(result.success).toBe(true);
    expect(result.fromCache).toBe(true);
    expect(result.products).toHaveLength(2);
    expect(client.callFunction).toHaveBeenCalledTimes(1); // Only first call hit API
  });

  it('fetches fresh data when cache is stale', async () => {
    // Seed cache with staleMinutes: 0 (immediately stale)
    const staleCache = {
      products: [sampleProducts[0]],
      staleMinutes: 0,
      cachedAt: Date.now() - 1000, // 1 second ago, stale at 0 minutes
    };
    await AsyncStorage.setItem('@cf_visual_search_catalog', JSON.stringify(staleCache));

    const client = mockClient({
      success: true,
      staleMinutes: 30,
      data: { products: sampleProducts },
    });

    const result = await fetchCatalogExport(client);

    expect(result.fromCache).toBeUndefined();
    expect(result.products).toHaveLength(2);
    expect(client.callFunction).toHaveBeenCalledTimes(1);
  });

  it('bypasses cache when forceRefresh is true', async () => {
    const client = mockClient({
      success: true,
      staleMinutes: 30,
      data: { products: sampleProducts },
    });

    // First call — populates cache
    await fetchCatalogExport(client);

    // Second call with forceRefresh
    const result = await fetchCatalogExport(client, { forceRefresh: true });

    expect(result.fromCache).toBeUndefined();
    expect(client.callFunction).toHaveBeenCalledTimes(2);
  });

  it('returns stale cache as fallback when client is null', async () => {
    // Seed stale cache
    const staleCache = {
      products: sampleProducts,
      staleMinutes: 0,
      cachedAt: Date.now() - 120_000,
    };
    await AsyncStorage.setItem('@cf_visual_search_catalog', JSON.stringify(staleCache));

    const result = await fetchCatalogExport(null);

    expect(result.success).toBe(true);
    expect(result.fromCache).toBe(true);
    expect(result.products).toHaveLength(2);
  });

  it('returns stale cache as fallback on network error', async () => {
    // Seed cache
    const cachedData = {
      products: sampleProducts,
      staleMinutes: 0,
      cachedAt: Date.now() - 120_000,
    };
    await AsyncStorage.setItem('@cf_visual_search_catalog', JSON.stringify(cachedData));

    const client = mockClient(undefined, new Error('Network error'));

    const result = await fetchCatalogExport(client);

    expect(result.success).toBe(true);
    expect(result.fromCache).toBe(true);
    expect(result.products).toHaveLength(2);
  });

  it('defaults staleMinutes to 60 when not in API response', async () => {
    const client = mockClient({
      success: true,
      data: { products: sampleProducts },
    });

    const result = await fetchCatalogExport(client);

    expect(result.staleMinutes).toBe(60);
  });
});

describe('clearCatalogCache', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('removes cached catalog from AsyncStorage', async () => {
    await AsyncStorage.setItem(
      '@cf_visual_search_catalog',
      JSON.stringify({ products: [], staleMinutes: 30, cachedAt: Date.now() }),
    );

    await clearCatalogCache();

    const cached = await AsyncStorage.getItem('@cf_visual_search_catalog');
    expect(cached).toBeNull();
  });
});
