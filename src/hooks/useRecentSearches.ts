/**
 * @module useRecentSearches
 *
 * Manages a bounded list of recent search queries with optional persistent
 * storage. Deduplicates case-insensitively, caps at MAX_RECENT entries,
 * and gracefully degrades to in-memory-only when storage is unavailable.
 */
import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'cfutons_recent_searches';
const MAX_RECENT = 8;

export interface SearchStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
}

/**
 * Hook for managing recent search queries with optional persistence.
 * Stores the most recent MAX_RECENT unique queries.
 * Pass a storage adapter for persistence (defaults to AsyncStorage).
 */
export function useRecentSearches(storage?: SearchStorage) {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Resolve storage adapter
  const getStorage = useCallback(async (): Promise<SearchStorage | null> => {
    if (storage) return storage;
    try {
      const mod = await import('@react-native-async-storage/async-storage');
      return mod.default;
    } catch {
      return null;
    }
  }, [storage]);

  // Load from storage on mount
  useEffect(() => {
    (async () => {
      const s = await getStorage();
      if (!s) return;
      try {
        const stored = await s.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setRecentSearches(parsed.slice(0, MAX_RECENT));
          }
        }
      } catch {
        // Storage read failed — operate in-memory
      }
    })();
  }, [getStorage]);

  const persist = useCallback(
    async (searches: string[]) => {
      const s = await getStorage();
      if (!s) return;
      try {
        await s.setItem(STORAGE_KEY, JSON.stringify(searches));
      } catch {
        // no-op
      }
    },
    [getStorage],
  );

  const addSearch = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;

      setRecentSearches((prev) => {
        const filtered = prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
        const next = [trimmed, ...filtered].slice(0, MAX_RECENT);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const removeSearch = useCallback(
    (query: string) => {
      setRecentSearches((prev) => {
        const next = prev.filter((s) => s !== query);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const clearAll = useCallback(() => {
    setRecentSearches([]);
    persist([]);
  }, [persist]);

  return {
    recentSearches,
    addSearch,
    removeSearch,
    clearAll,
  };
}
