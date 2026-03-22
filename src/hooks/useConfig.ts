/**
 * @module useConfig
 *
 * Fetches app-level configuration from the Wix CMS TrendingSearches collection
 * and caches it for the session. Falls back to empty values if the service is
 * unavailable — callers must handle empty gracefully (no hardcoded fallback here).
 *
 * Bead: hq-jc723
 * Cross-rig contract: CF-ts4n / melania PR #687
 *   collection = 'TrendingSearches', field = 'terms' (string[])
 */

import { useCallback } from 'react';
import { useDataCache } from '@/hooks/useDataCache';
import { useOptionalWixClient } from '@/services/wix';

/** CMS collection ID as agreed in the CF-ts4n cross-rig contract. */
const TRENDING_SEARCHES_COLLECTION = 'TrendingSearches';

/** Session-length cache — trending terms change infrequently. */
const CONFIG_CACHE_MAX_AGE = 60 * 60 * 1000; // 1 hour

interface RawTrendingRecord {
  terms?: unknown;
  [key: string]: unknown;
}

export interface ConfigResult {
  trendingSearches: string[];
  isLoading: boolean;
}

export function useConfig(): ConfigResult {
  const wixClient = useOptionalWixClient();

  const fetcher = useCallback(async (): Promise<string[]> => {
    if (!wixClient) return [];

    try {
      const result = await wixClient.queryData<RawTrendingRecord>(TRENDING_SEARCHES_COLLECTION, {
        limit: 1,
      });

      if (result.items.length === 0) return [];

      const terms = result.items[0].terms;
      if (!Array.isArray(terms)) return [];

      return terms.filter((t): t is string => typeof t === 'string');
    } catch {
      return [];
    }
  }, [wixClient]);

  const { data, isLoading } = useDataCache<string[]>('config-trending-searches', fetcher, {
    maxAge: CONFIG_CACHE_MAX_AGE,
  });

  return {
    trendingSearches: data ?? [],
    isLoading,
  };
}
