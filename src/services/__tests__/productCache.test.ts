import {
  isCacheValid,
  buildCacheMetadata,
  serializeCatalog,
  deserializeCatalog,
  getCacheKey,
  MAX_STORAGE_BYTES,
  type CacheMetadata,
  type CachedCatalog,
} from '../productCache';
import { FUTON_MODELS } from '@/data/futons';

describe('productCache', () => {
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
      products: FUTON_MODELS,
      metadata: buildCacheMetadata(FUTON_MODELS.length),
    };

    it('round-trips correctly', () => {
      const serialized = serializeCatalog(catalog);
      const deserialized = deserializeCatalog(serialized);
      expect(deserialized).not.toBeNull();
      expect(deserialized!.products).toHaveLength(FUTON_MODELS.length);
      expect(deserialized!.metadata.productCount).toBe(FUTON_MODELS.length);
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

  describe('MAX_STORAGE_BYTES', () => {
    it('is 50MB', () => {
      expect(MAX_STORAGE_BYTES).toBe(50 * 1024 * 1024);
    });
  });
});
