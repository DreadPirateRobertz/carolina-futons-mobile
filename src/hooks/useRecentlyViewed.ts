/**
 * @module useRecentlyViewed
 *
 * Tracks recently viewed products in AsyncStorage (LRU, max 20).
 * Used on HomeScreen to show a "Recently Viewed" carousel.
 */
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product } from '@/data/products';
import { PRODUCTS } from '@/data/products';

const STORAGE_KEY = '@recently_viewed';
const MAX_ITEMS = 20;

export function useRecentlyViewed() {
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setRecentIds(JSON.parse(raw));
        } catch {
          // corrupt data, ignore
        }
      }
    });
  }, []);

  const addViewed = useCallback(async (productId: string) => {
    setRecentIds((prev) => {
      const filtered = prev.filter((id) => id !== productId);
      const updated = [productId, ...filtered].slice(0, MAX_ITEMS);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearAll = useCallback(async () => {
    setRecentIds([]);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const recentProducts: Product[] = recentIds
    .map((id) => PRODUCTS.find((p) => p.id === id))
    .filter((p): p is Product => p != null);

  return { recentProducts, addViewed, clearAll, count: recentProducts.length };
}
