/**
 * Product catalog cache service.
 *
 * Strategy: stale-while-revalidate
 * - On app open: serve cached data immediately, fetch fresh in background
 * - On network loss: serve cached data, show offline banner
 * - Storage: AsyncStorage for structured product data
 * - Image caching: delegated to expo-image (built-in disk cache)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product } from '@/data/products';

export interface CacheMetadata {
  lastFetched: string; // ISO timestamp
  version: string; // app version for cache invalidation
  productCount: number;
}

export interface CachedCatalog {
  products: Product[];
  metadata: CacheMetadata;
}

const CACHE_KEY = 'cf_product_catalog';
const CACHE_VERSION = '0.1.0';
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Check if cached data is still valid */
export function isCacheValid(metadata: CacheMetadata): boolean {
  if (metadata.version !== CACHE_VERSION) return false;
  const age = Date.now() - new Date(metadata.lastFetched).getTime();
  return age < MAX_CACHE_AGE_MS;
}

/** Build cache metadata */
export function buildCacheMetadata(productCount: number): CacheMetadata {
  return {
    lastFetched: new Date().toISOString(),
    version: CACHE_VERSION,
    productCount,
  };
}

/** Serialize catalog for storage */
export function serializeCatalog(catalog: CachedCatalog): string {
  return JSON.stringify(catalog);
}

/** Deserialize catalog from storage, returns null if invalid */
export function deserializeCatalog(data: string | null): CachedCatalog | null {
  if (!data) return null;
  try {
    const parsed = JSON.parse(data);
    if (!parsed.products || !parsed.metadata) return null;
    return parsed as CachedCatalog;
  } catch {
    return null;
  }
}

/** Get storage key */
export function getCacheKey(): string {
  return CACHE_KEY;
}

/** Save catalog to AsyncStorage */
export async function saveCatalog(products: Product[]): Promise<void> {
  try {
    const catalog: CachedCatalog = {
      products,
      metadata: buildCacheMetadata(products.length),
    };
    await AsyncStorage.setItem(CACHE_KEY, serializeCatalog(catalog));
  } catch {
    // Storage write failed — silent
  }
}

/** Load cached catalog from AsyncStorage */
export async function loadCachedCatalog(): Promise<CachedCatalog | null> {
  try {
    const stored = await AsyncStorage.getItem(CACHE_KEY);
    return deserializeCatalog(stored);
  } catch {
    return null;
  }
}

/** Clear the product catalog cache */
export async function clearCatalogCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch {
    // no-op
  }
}

/** Max storage budget: 50MB as specified in requirements */
export const MAX_STORAGE_BYTES = 50 * 1024 * 1024;
