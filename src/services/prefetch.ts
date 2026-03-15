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

/** Must match the key used by useDataCache('products', ...) */
export const PREFETCH_CACHE_KEY = '@cfutons/cache/products';

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
 * Prefetch product catalog into AsyncStorage.
 *
 * - Safe to call multiple times (deduplicates).
 * - Never throws — prefetch failure is non-fatal (screens will fetch on mount).
 * - Writes in useDataCache-compatible format: { data: T, timestamp: number }
 */
export function prefetchCriticalData(): Promise<void> {
  if (inflightPromise) return inflightPromise;

  status = 'fetching';

  inflightPromise = (async () => {
    try {
      // In mock mode, PRODUCTS is available synchronously.
      // When Wix is wired up, this would become an API call.
      const products = PRODUCTS;

      const cacheEntry = {
        data: products,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(PREFETCH_CACHE_KEY, JSON.stringify(cacheEntry));
      status = 'complete';
    } catch {
      status = 'error';
    }
  })();

  return inflightPromise;
}
