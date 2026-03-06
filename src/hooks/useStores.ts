import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { STORES, APPOINTMENT_TYPES, type Store, type AppointmentType } from '@/data/stores';
import { getWixClientInstance } from '@/services/wix/singleton';

// Re-export for screens
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
 * Tries Wix CMS API, falls back to static data.
 */
export function useStores(): UseStoresReturn {
  const [storeData, setStoreData] = useState<Store[]>(STORES);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    const client = getWixClientInstance();
    if (client) {
      (async () => {
        try {
          const result = await client.queryStores({ limit: 100 });
          if (mounted.current && result.stores.length > 0) {
            setStoreData(result.stores);
          }
        } catch (err) {
          if (mounted.current) {
            setError(err instanceof Error ? err : new Error(String(err)));
          }
        } finally {
          if (mounted.current) setIsLoading(false);
        }
      })();
    } else {
      setIsLoading(false);
    }

    return () => {
      mounted.current = false;
    };
  }, []);

  const getStoreById = useCallback(
    (id: string) => storeData.find((s) => s.id === id),
    [storeData],
  );

  return { stores: storeData, isLoading, error, getStoreById };
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
