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

      // Prefetch products and collections in parallel.
      // In mock mode, data is available synchronously.
      // When Wix is wired up, these would become API calls.
      await Promise.all([
        AsyncStorage.setItem(
          PREFETCH_CACHE_KEY,
          JSON.stringify({ data: PRODUCTS, timestamp: now }),
        ),
        AsyncStorage.setItem(
          PREFETCH_COLLECTIONS_KEY,
          JSON.stringify({ data: COLLECTIONS, timestamp: now }),
        ),
      ]);

      status = 'complete';
    } catch (err) {
      console.warn('[prefetch] Failed to prime cache — screens will fetch on mount:', err);
      status = 'error';
    }
  })();

  return inflightPromise;
}
