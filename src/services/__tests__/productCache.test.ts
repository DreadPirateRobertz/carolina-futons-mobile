import {
  isCacheValid,
  buildCacheMetadata,
  serializeCatalog,
  deserializeCatalog,
  getCacheKey,
  saveCatalog,
  loadCachedCatalog,
  clearCatalogCache,
  MAX_STORAGE_BYTES,
  type CacheMetadata,
  type CachedCatalog,
} from '../productCache';
import { PRODUCTS } from '@/data/products';

import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockRemoveItem = AsyncStorage.removeItem as jest.Mock;

describe('productCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
    mockRemoveItem.mockResolvedValue(undefined);
  });

  describe('isCacheValid', () => {
    it('returns true for fresh cache with correct version', () => {
      const meta: CacheMetadata = {
        lastFetched: new Date().toISOString(),
        version: '0.1.0',
        productCount: 4,
      };
      expect(isCacheValid(meta)).toBe(true);
    });

    it('returns false for wrong version', () => {
      const meta: CacheMetadata = {
        lastFetched: new Date().toISOString(),
        version: '0.0.1',
        productCount: 4,
      };
      expect(isCacheValid(meta)).toBe(false);
    });

    it('returns false for expired cache (>24h)', () => {
      const old = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      const meta: CacheMetadata = {
        lastFetched: old,
        version: '0.1.0',
        productCount: 4,
      };
      expect(isCacheValid(meta)).toBe(false);
    });

    it('returns true for cache just under 24h', () => {
      const recent = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString();
      const meta: CacheMetadata = {
        lastFetched: recent,
        version: '0.1.0',
        productCount: 4,
      };
      expect(isCacheValid(meta)).toBe(true);
    });
  });

  describe('buildCacheMetadata', () => {
    it('builds metadata with current timestamp', () => {
      const before = Date.now();
      const meta = buildCacheMetadata(4);
      const after = Date.now();
      const fetched = new Date(meta.lastFetched).getTime();
      expect(fetched).toBeGreaterThanOrEqual(before);
      expect(fetched).toBeLessThanOrEqual(after);
      expect(meta.productCount).toBe(4);
      expect(meta.version).toBe('0.1.0');
    });
  });

  describe('serializeCatalog / deserializeCatalog', () => {
    const catalog: CachedCatalog = {
      products: PRODUCTS.slice(0, 3),
      metadata: buildCacheMetadata(3),
    };

    it('round-trips correctly', () => {
      const serialized = serializeCatalog(catalog);
      const deserialized = deserializeCatalog(serialized);
      expect(deserialized).not.toBeNull();
      expect(deserialized!.products).toHaveLength(3);
      expect(deserialized!.metadata.productCount).toBe(3);
    });

    it('returns null for null input', () => {
      expect(deserializeCatalog(null)).toBeNull();
    });

    it('returns null for invalid JSON', () => {
      expect(deserializeCatalog('not json')).toBeNull();
    });

    it('returns null for JSON without required fields', () => {
      expect(deserializeCatalog('{"foo": "bar"}')).toBeNull();
    });
  });

  describe('getCacheKey', () => {
    it('returns a non-empty string', () => {
      expect(getCacheKey()).toBeTruthy();
      expect(typeof getCacheKey()).toBe('string');
    });
  });

  describe('saveCatalog', () => {
    it('stores products with metadata to AsyncStorage', async () => {
      const products = PRODUCTS.slice(0, 5);
      await saveCatalog(products);
      expect(mockSetItem).toHaveBeenCalledWith('cf_product_catalog', expect.any(String));
      const stored = JSON.parse(mockSetItem.mock.calls[0][1]);
      expect(stored.products).toHaveLength(5);
      expect(stored.metadata.productCount).toBe(5);
      expect(stored.metadata.version).toBe('0.1.0');
    });

    it('handles storage write errors gracefully', async () => {
      mockSetItem.mockRejectedValue(new Error('disk full'));
      await expect(saveCatalog(PRODUCTS.slice(0, 3))).resolves.not.toThrow();
    });
  });

  describe('loadCachedCatalog', () => {
    it('returns cached catalog when available', async () => {
      const catalog: CachedCatalog = {
        products: PRODUCTS.slice(0, 3),
        metadata: buildCacheMetadata(3),
      };
      mockGetItem.mockResolvedValue(serializeCatalog(catalog));
      const loaded = await loadCachedCatalog();
      expect(loaded).not.toBeNull();
      expect(loaded!.products).toHaveLength(3);
      expect(loaded!.metadata.productCount).toBe(3);
    });

    it('returns null when no cached data', async () => {
      mockGetItem.mockResolvedValue(null);
      const loaded = await loadCachedCatalog();
      expect(loaded).toBeNull();
    });

    it('returns null for corrupted data', async () => {
      mockGetItem.mockResolvedValue('not-valid-json{{{');
      const loaded = await loadCachedCatalog();
      expect(loaded).toBeNull();
    });

    it('handles storage read errors gracefully', async () => {
      mockGetItem.mockRejectedValue(new Error('read error'));
      const loaded = await loadCachedCatalog();
      expect(loaded).toBeNull();
    });
  });

  describe('clearCatalogCache', () => {
    it('removes cached data from AsyncStorage', async () => {
      await clearCatalogCache();
      expect(mockRemoveItem).toHaveBeenCalledWith('cf_product_catalog');
    });

    it('handles removal errors gracefully', async () => {
      mockRemoveItem.mockRejectedValue(new Error('fail'));
      await expect(clearCatalogCache()).resolves.not.toThrow();
    });
  });

  describe('MAX_STORAGE_BYTES', () => {
    it('is 50MB', () => {
      expect(MAX_STORAGE_BYTES).toBe(50 * 1024 * 1024);
    });
  });
});
