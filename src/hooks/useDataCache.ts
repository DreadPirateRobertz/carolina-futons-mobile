/**
 * @module useDataCache
 *
 * Stale-while-revalidate data cache backed by AsyncStorage. Serves
 * cached data instantly while fetching fresh data in the background.
 * Falls back to stale cache when offline or when fetch fails.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@cfutons/cache/';
const DEFAULT_MAX_AGE = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface Options {
  maxAge?: number;
}

interface CacheResult<T> {
  data: T | null;
  isLoading: boolean;
  isStale: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useDataCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: Options,
): CacheResult<T> {
  const maxAge = options?.maxAge ?? DEFAULT_MAX_AGE;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const cacheKey = `${CACHE_PREFIX}${key}`;

  const loadAndFetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Try loading from cache first
    let cachedData: T | null = null;
    try {
      const stored = await AsyncStorage.getItem(cacheKey);
      if (stored) {
        const entry: CacheEntry<T> = JSON.parse(stored);
        cachedData = entry.data;
        const age = Date.now() - entry.timestamp;
        setData(entry.data);
        setIsStale(age > maxAge);
      }
    } catch {
      // Cache read failed — continue to fetch
    }

    // Fetch fresh data
    try {
      const freshData = await fetcherRef.current();
      setData(freshData);
      setIsStale(false);
      const entry: CacheEntry<T> = { data: freshData, timestamp: Date.now() };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch (err) {
      const fetchError = err instanceof Error ? err : new Error(String(err));
      setError(fetchError);
      // If we have cached data, keep serving it
      if (!cachedData) {
        setData(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey, maxAge]);

  useEffect(() => {
    loadAndFetch();
  }, [loadAndFetch]);

  const refresh = useCallback(async () => {
    await loadAndFetch();
  }, [loadAndFetch]);

  return { data, isLoading, isStale, error, refresh };
}
