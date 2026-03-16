/**
 * @module useStores
 *
 * Provides showroom/store data for the store locator and detail screens.
 * Queries Wix CMS "Showrooms" collection when configured, falls back to
 * static mock data when Wix is not available.
 */
import { useMemo, useCallback, useState, useEffect } from 'react';
import { STORES, APPOINTMENT_TYPES, type Store, type AppointmentType } from '@/data/stores';
import { getWixClientSingleton } from '@/services/wix/wixClientSingleton';

// Re-export for screens — avoids direct src/data imports
export { APPOINTMENT_TYPES };
export type { Store, AppointmentType };

interface UseStoresReturn {
  stores: Store[];
  isLoading: boolean;
  error: Error | null;
  getStoreById: (id: string) => Store | undefined;
}

/**
 * Provides store/showroom data for locator and detail screens.
 * Queries Wix CMS when configured, falls back to static data.
 */
export function useStores(): UseStoresReturn {
  const wix = useMemo(() => getWixClientSingleton(), []);
  const [stores, setStores] = useState<Store[]>(wix ? [] : STORES);
  const [isLoading, setIsLoading] = useState(!!wix);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!wix) return;

    let cancelled = false;

    (async () => {
      try {
        const result = await wix.queryData<Store>('Showrooms', { limit: 100 });
        if (!cancelled) {
          setStores(result.items);
          setIsLoading(false);
        }
      } catch {
        // Non-fatal: fall back to static data
        if (!cancelled) {
          setStores(STORES);
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [wix]);

  const getStoreById = useCallback((id: string) => stores.find((s) => s.id === id), [stores]);

  return { stores, isLoading, error, getStoreById };
}

interface UseStoreByIdReturn {
  store: Store | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Looks up a single store by ID.
 */
export function useStoreById(storeId: string | undefined): UseStoreByIdReturn {
  const { stores, isLoading, error } = useStores();

  const store = useMemo(() => {
    if (!storeId) return null;
    return stores.find((s) => s.id === storeId) ?? null;
  }, [storeId, stores]);

  return { store, isLoading, error };
}
