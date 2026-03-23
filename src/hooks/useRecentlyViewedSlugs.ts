/**
 * @module useRecentlyViewedSlugs
 *
 * Tracks recently viewed product slugs in AsyncStorage (FIFO, max 10).
 * Used by the "Recently Viewed" rail on ProductDetailScreen.
 */
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const RECENTLY_VIEWED_SLUGS_KEY = 'recently_viewed_slugs';
const MAX_ITEMS = 10;

interface UseRecentlyViewedSlugsReturn {
  slugs: string[];
  addSlug: (slug: string) => Promise<void>;
}

export function useRecentlyViewedSlugs(): UseRecentlyViewedSlugsReturn {
  const [slugs, setSlugs] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(RECENTLY_VIEWED_SLUGS_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setSlugs(parsed);
      } catch {
        // corrupt storage — start fresh
      }
    });
  }, []);

  const addSlug = useCallback(async (slug: string) => {
    setSlugs((prev) => {
      const deduped = prev.filter((s) => s !== slug);
      const updated = [slug, ...deduped].slice(0, MAX_ITEMS);
      AsyncStorage.setItem(RECENTLY_VIEWED_SLUGS_KEY, JSON.stringify(updated)).catch((err) => {
        if (__DEV__) console.warn('[useRecentlyViewedSlugs] persist failed:', err);
      });
      return updated;
    });
  }, []);

  return { slugs, addSlug };
}
