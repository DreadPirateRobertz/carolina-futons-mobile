/**
 * @module useStores
 *
 * Provides showroom/store data for the store locator and detail screens.
 * Static data today; shaped for a drop-in replacement with the Wix CMS
 * (Content Management System) API when the backend integration lands.
 */
import { useMemo, useCallback } from 'react';
import { STORES, APPOINTMENT_TYPES, type Store, type AppointmentType } from '@/data/stores';

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
 * Uses static data now; designed for drop-in Wix CMS API replacement.
 */
export function useStores(): UseStoresReturn {
  const stores = useMemo(() => STORES, []);

  const getStoreById = useCallback((id: string) => stores.find((s) => s.id === id), [stores]);

  return { stores, isLoading: false, error: null, getStoreById };
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
  const store = useMemo(() => {
    if (!storeId) return null;
    return STORES.find((s) => s.id === storeId) ?? null;
  }, [storeId]);

  return { store, isLoading: false, error: null };
}
