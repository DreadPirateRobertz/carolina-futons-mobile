/**
 * @module visualSearch
 *
 * Service layer for cf-juq6 visual search catalog export API.
 * Fetches product catalog data (images + metadata) from Wix web method
 * visualSearchExport.getExportData() for downstream embedding generation
 * (hq-r1251 — Supabase + pgvector pending).
 *
 * Rate limit: 10 req/60s per clientId. Caches locally via AsyncStorage
 * using staleMinutes from the API to avoid unnecessary re-fetches.
 *
 * hq-8p0y8
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureException } from '@/services/crashReporting';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CatalogProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  category: string;
  price: number;
  images: string[];
}

export interface CatalogExportResult {
  success: boolean;
  products: CatalogProduct[];
  staleMinutes?: number;
  error?: string;
  fromCache?: boolean;
}

interface CachedExport {
  products: CatalogProduct[];
  staleMinutes: number;
  cachedAt: number;
}

interface WixClientLike {
  callFunction: (
    name: string,
    method: 'GET' | 'POST',
    body: Record<string, unknown>,
  ) => Promise<unknown>;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WIX_FN = 'visualSearchExport';
const CACHE_KEY = '@cf_visual_search_catalog';

// ── Cache ─────────────────────────────────────────────────────────────────────

async function loadCache(): Promise<CachedExport | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedExport;
  } catch {
    return null;
  }
}

async function saveCache(products: CatalogProduct[], staleMinutes: number): Promise<void> {
  try {
    const entry: CachedExport = { products, staleMinutes, cachedAt: Date.now() };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch (err) {
    captureException(err instanceof Error ? err : new Error(String(err)));
  }
}

function isCacheFresh(cached: CachedExport): boolean {
  const ageMs = Date.now() - cached.cachedAt;
  const staleMs = cached.staleMinutes * 60 * 1000;
  return ageMs < staleMs;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch the product catalog export for visual search.
 *
 * Checks AsyncStorage cache first — returns cached data if within staleMinutes.
 * On cache miss or stale cache, calls getExportData(clientId) via Wix web method.
 * Handles rate limiting (10 req/60s per clientId) gracefully.
 *
 * @param client  Wix client instance (null = return cache or error)
 * @param options.clientId  Stable device identifier for rate limiting
 * @param options.forceRefresh  Bypass cache and fetch fresh data
 */
export async function fetchCatalogExport(
  client: WixClientLike | null,
  options: { clientId?: string; forceRefresh?: boolean } = {},
): Promise<CatalogExportResult> {
  const empty: CatalogExportResult = { success: false, products: [] };

  // Check cache first (unless forced refresh)
  if (!options.forceRefresh) {
    const cached = await loadCache();
    if (cached && isCacheFresh(cached)) {
      return {
        success: true,
        products: cached.products,
        staleMinutes: cached.staleMinutes,
        fromCache: true,
      };
    }
  }

  if (!client) {
    // No client — try returning stale cache as fallback
    const staleCache = await loadCache();
    if (staleCache) {
      return {
        success: true,
        products: staleCache.products,
        staleMinutes: staleCache.staleMinutes,
        fromCache: true,
      };
    }
    return { ...empty, error: 'No client available' };
  }

  try {
    const body: Record<string, unknown> = {};
    if (options.clientId) body.clientId = options.clientId;

    const response = await client.callFunction(WIX_FN, 'POST', body);

    if (!response || typeof response !== 'object') {
      return { ...empty, error: 'Malformed API response' };
    }

    const res = response as Record<string, unknown>;

    if (res.success === false) {
      return {
        ...empty,
        error: (res.error as string) ?? 'API returned failure',
      };
    }

    const data = res.data as Record<string, unknown> | undefined;
    const products = Array.isArray(data?.products) ? (data.products as CatalogProduct[]) : [];
    const staleMinutes = typeof res.staleMinutes === 'number' ? res.staleMinutes : 60;

    // Cache the fresh response
    await saveCache(products, staleMinutes);

    return {
      success: true,
      products,
      staleMinutes,
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    captureException(error);

    // On network failure, try returning stale cache
    const staleCache = await loadCache();
    if (staleCache) {
      return {
        success: true,
        products: staleCache.products,
        staleMinutes: staleCache.staleMinutes,
        fromCache: true,
      };
    }

    return { ...empty, error: error.message };
  }
}

/**
 * Clear the cached catalog export.
 */
export async function clearCatalogCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch {
    // Best-effort clear
  }
}
