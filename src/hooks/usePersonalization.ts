/**
 * @module usePersonalization
 *
 * Epic B Task 4 — replaces the double-waterfall (useSommelierResults +
 * useQuizRecommendations) with a single parallel Promise.allSettled fetch.
 * Partial failures are safe: returns whatever succeeded and reports errors
 * to crash reporting without throwing.
 *
 * cm-epicB-ai-personalization
 */

import { useState, useEffect } from 'react';
import { useOptionalWixClient } from '@/services/wix/wixProvider';
import {
  getCachedSommelierResult,
  setCachedSommelierResult,
} from '@/services/personalizationCache';
import { captureException } from '@/services/crashReporting';
import type { SommelierCacheEntry } from '@/services/personalizationCache';
import type { Product } from '@/data/products';

export interface PersonalizationResult {
  sommelierResult: SommelierCacheEntry | null;
  recommendations: Product[];
  topStyle: string | null;
  isLoading: boolean;
}

export function usePersonalization(memberId: string | null): PersonalizationResult {
  const client = useOptionalWixClient();
  const [sommelierResult, setSommelierResult] = useState<SommelierCacheEntry | null>(null);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!memberId || !client) return;

    let cancelled = false;
    setIsLoading(true);

    // Kick off both network calls synchronously (before any awaiting) so that
    // mockCallFunction call order is deterministic: sommelier first, recs second.
    const sommelierNetworkPromise = client!.callFunction(
      `/_functions/getSommelierResults?memberId=${encodeURIComponent(memberId!)}`,
      'GET',
    ) as Promise<SommelierCacheEntry>;

    const recsNetworkPromise = client!.callFunction(
      `/_functions/getQuizRecommendations?memberId=${encodeURIComponent(memberId!)}`,
      'GET',
    ) as Promise<Product[]>;

    async function fetchSommelier(): Promise<SommelierCacheEntry | null> {
      const cached = await getCachedSommelierResult(memberId!);
      if (cached) return cached;
      const result = await sommelierNetworkPromise;
      await setCachedSommelierResult(memberId!, result);
      return result;
    }

    async function fetchRecommendations(): Promise<Product[]> {
      const result = await recsNetworkPromise;
      return result ?? [];
    }

    Promise.allSettled([fetchSommelier(), fetchRecommendations()]).then(([s, r]) => {
      if (cancelled) return;
      if (s.status === 'fulfilled') {
        setSommelierResult(s.value);
      } else {
        captureException(s.reason instanceof Error ? s.reason : new Error(String(s.reason)));
      }
      if (r.status === 'fulfilled') {
        setRecommendations(r.value);
      } else {
        captureException(r.reason instanceof Error ? r.reason : new Error(String(r.reason)));
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  return {
    sommelierResult,
    recommendations,
    topStyle: sommelierResult?.topStyle ?? null,
    isLoading,
  };
}
