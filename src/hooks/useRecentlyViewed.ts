/**
 * @module useRecentlyViewed
 *
 * Tracks recently viewed products (LRU, max 10) in AsyncStorage.
 * Surfaced on HomeScreen and ShopScreen as a "Recently Viewed" carousel.
 *
 * Accepts an injectable storage adapter for testability; falls back to
 * AsyncStorage in production.
 *
 * Bead: cfutons_mobile-c8h
 */

import { useState, useEffect, useCallback } from 'react';
import type { Product } from '@/data/products';
import { PRODUCTS } from '@/data/products';
import { captureException } from '@/services/crashReporting';

export interface ProductStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

const STORAGE_KEY = '@recently_viewed';
const MAX_ITEMS = 10;

async function resolveStorage(adapter?: ProductStorage): Promise<ProductStorage | null> {
  if (adapter) return adapter;
  try {
    const mod = await import('@react-native-async-storage/async-storage');
    return mod.default as ProductStorage;
  } catch {
    return null;
  }
}

export function useRecentlyViewed(storage?: ProductStorage) {
  const [recentIds, setRecentIds] = useState<string[]>([]);

  // Load from storage on mount
  useEffect(() => {
    (async () => {
      const s = await resolveStorage(storage);
      if (!s) return;
      try {
        const raw = await s.getItem(STORAGE_KEY);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setRecentIds((parsed as string[]).slice(0, MAX_ITEMS));
          }
        }
      } catch {
        // Corrupt data or read error — start empty
      }
    })();
    // storage identity is stable for the component lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addViewed = useCallback(
    async (productId: string) => {
      const trimmed = productId.trim();
      if (!trimmed) return;

      // Capture updated list synchronously via functional updater so that
      // rapid sequential calls each see the correct previous state.
      let updated: string[] = [];
      setRecentIds((prev) => {
        const filtered = prev.filter((id: string) => id !== trimmed);
        updated = [trimmed, ...filtered].slice(0, MAX_ITEMS);
        return updated;
      });

      const s = await resolveStorage(storage);
      if (!s) return;
      try {
        await s.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [storage],
  );

  const clearAll = useCallback(async () => {
    setRecentIds([]);
    const s = await resolveStorage(storage);
    if (!s) return;
    try {
      await s.removeItem(STORAGE_KEY);
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)));
    }
  }, [storage]);

  const recentProducts: Product[] = recentIds
    .map((id) => PRODUCTS.find((p) => p.id === id))
    .filter((p): p is Product => p != null);

  return { recentProducts, addViewed, clearAll, count: recentProducts.length };
}
