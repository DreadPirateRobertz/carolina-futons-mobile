/**
 * Splash-screen data race: prefetch critical data in parallel with font loading.
 *
 * Called at module level in App.tsx (alongside SplashScreen.preventAutoHideAsync)
 * so that product data is already in AsyncStorage by the time useDataCache mounts.
 * This eliminates the loading spinner on first screen render.
 *
 * Writes directly to the useDataCache storage format so the hook picks it up
 * without re-fetching.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PRODUCTS } from '@/data/products';
import { COLLECTIONS } from '@/data/collections';
import { captureException } from '@/services/crashReporting';
import { getWixClientSingleton } from '@/services/wix/wixClientSingleton';

/** Must match the keys used by useDataCache('products', ...) and useDataCache('editorial-collections', ...) */
export const PREFETCH_CACHE_KEY = '@cfutons/cache/products';
export const PREFETCH_COLLECTIONS_KEY = '@cfutons/cache/editorial-collections';

type PrefetchStatus = 'idle' | 'fetching' | 'complete' | 'error';

let status: PrefetchStatus = 'idle';
let inflightPromise: Promise<void> | null = null;

export function getPrefetchStatus(): PrefetchStatus {
  return status;
}

export function resetPrefetchState(): void {
  status = 'idle';
  inflightPromise = null;
}

/**
 * Prefetch product catalog and collections into AsyncStorage.
 *
 * - Safe to call multiple times (deduplicates via inflightPromise).
 * - One-shot: after the first call completes (or fails), subsequent calls
 *   return the same resolved promise. Call resetPrefetchState() to allow
 *   re-prefetching (e.g., in tests or after a cache clear).
 * - Never throws — prefetch failure is non-fatal (screens will fetch on mount).
 * - Writes in useDataCache-compatible format: { data: T, timestamp: number }
 */
export function prefetchCriticalData(): Promise<void> {
  if (inflightPromise) return inflightPromise;

  status = 'fetching';

  inflightPromise = (async () => {
    try {
      const now = Date.now();
      const wix = getWixClientSingleton();

      let products: unknown = PRODUCTS;
      let collections: unknown = COLLECTIONS;

      if (wix) {
        // Wix configured — fetch live data, fall back to mock on failure
        try {
          const [prodResult, colResult] = await Promise.all([
            wix.queryProducts({ limit: 100 }),
            wix.queryCollections({ limit: 100 }),
          ]);
          products = prodResult.products;
          collections = colResult.collections;
        } catch {
          // Non-fatal: fall back to static mock data
          products = PRODUCTS;
          collections = COLLECTIONS;
        }
      }

      await Promise.all([
        AsyncStorage.setItem(
          PREFETCH_CACHE_KEY,
          JSON.stringify({ data: products, timestamp: now }),
        ),
        AsyncStorage.setItem(
          PREFETCH_COLLECTIONS_KEY,
          JSON.stringify({ data: collections, timestamp: now }),
        ),
      ]);

      status = 'complete';
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), 'warning', {
        action: 'prefetch-cache-prime',
      });
      status = 'error';
    }
  })();

  return inflightPromise;
}
