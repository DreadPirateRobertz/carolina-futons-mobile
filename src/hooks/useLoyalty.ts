/**
 * useLoyalty — cm-elo / cm-ds5
 *
 * Fetches the current member's loyalty account from the Wix backend webMethod
 * (/_functions/getLoyaltyAccount). Uses the member's Wix session access token
 * for SiteMember-permissioned auth — server resolves identity from session
 * context (no IDOR risk; member can only read their own record).
 *
 * Falls back to Bronze defaults when unauthenticated (no error thrown).
 *
 * Tier thresholds: Bronze(0–499) → Silver(500–1499) → Gold(1500+)
 */

import { useState, useCallback, useEffect } from 'react';
import { getWixClientSingleton } from '@/services/wix/wixClientSingleton';
import { getWixSdkClient } from '@/services/wix/wixSdkClient';

export type LoyaltyTier = 'bronze' | 'silver' | 'gold';

export interface LoyaltyTransaction {
  _id: string;
  memberId: string;
  delta: number;
  reason: string;
  createdDate: string;
}

export interface UseLoyaltyResult {
  points: number;
  tier: LoyaltyTier;
  nextTier: LoyaltyTier | null;
  pointsToNext: number;
  progress: number;
  loading: boolean;
  error: string | null;
  refreshPoints: () => Promise<void>;
}

function normalizeTier(raw: string): LoyaltyTier {
  const lower = raw.toLowerCase();
  if (lower === 'silver') return 'silver';
  if (lower === 'gold') return 'gold';
  return 'bronze';
}

const BRONZE_DEFAULTS = {
  points: 0,
  tier: 'bronze' as LoyaltyTier,
  nextTier: 'silver' as LoyaltyTier,
  pointsToNext: 500,
  progress: 0,
};

export function useLoyalty(): UseLoyaltyResult {
  const [points, setPoints] = useState(0);
  const [tier, setTier] = useState<LoyaltyTier>('bronze');
  const [nextTier, setNextTier] = useState<LoyaltyTier | null>('silver');
  const [pointsToNext, setPointsToNext] = useState(500);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let memberToken: string | undefined;
      try {
        const tokens = getWixSdkClient().auth.getTokens();
        memberToken = tokens.accessToken?.value;
      } catch {
        // SDK not initialized or user not authenticated — use Bronze defaults
      }

      if (!memberToken) {
        setPoints(BRONZE_DEFAULTS.points);
        setTier(BRONZE_DEFAULTS.tier);
        setNextTier(BRONZE_DEFAULTS.nextTier);
        setPointsToNext(BRONZE_DEFAULTS.pointsToNext);
        setProgress(BRONZE_DEFAULTS.progress);
        return;
      }

      const wixClient = getWixClientSingleton();
      if (!wixClient) {
        setError('Wix service unavailable');
        return;
      }

      const data = await wixClient.getLoyaltyAccount(memberToken);
      setPoints(data.points ?? 0);
      setTier(normalizeTier(data.tier));
      setNextTier(data.nextTier ? normalizeTier(data.nextTier) : null);
      setPointsToNext(data.pointsToNext ?? 0);
      setProgress(data.progress ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refreshPoints = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return { points, tier, nextTier, pointsToNext, progress, loading, error, refreshPoints };
}
