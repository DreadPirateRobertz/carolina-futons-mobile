/**
 * useLoyalty — cm-elo / cm-ds5 / deacon-cjv
 *
 * Fetches the current member's loyalty account from the Wix backend webMethod
 * (/_functions/getLoyaltyAccount). Uses the member's Wix session access token
 * for SiteMember-permissioned auth — server resolves identity from session
 * context (no IDOR risk; member can only read their own record).
 *
 * Falls back to Trail Blazer defaults when unauthenticated (no error thrown).
 *
 * Tier thresholds: Trail Blazer (0–499) → Mountain Guide (500–1499) →
 *                  Summit Master (1500–2999) → Blue Ridge Legend (3000+)
 */

import { useState, useCallback, useEffect } from 'react';
import { getWixClientSingleton } from '@/services/wix/wixClientSingleton';
import { getWixSdkClient } from '@/services/wix/wixSdkClient';
import { getTierForPoints, getNextTier, type LoyaltyTierConfig } from '@/data/loyaltyTiers';

export type LoyaltyTier = LoyaltyTierConfig; // backward compat alias
export type { LoyaltyTierConfig };

export interface LoyaltyTransaction {
  _id: string;
  memberId: string;
  delta: number;
  reason: string;
  createdDate: string;
}

export interface AwardPointsParams {
  action: string;
  points: number;
  productId?: string;
  photoId?: string;
}

export interface UseLoyaltyResult {
  points: number;
  tier: LoyaltyTierConfig;
  nextTier: LoyaltyTierConfig | null;
  pointsToNext: number;
  progress: number;
  loading: boolean;
  error: string | null;
  refreshPoints: () => Promise<void>;
  awardPoints: (params: AwardPointsParams) => Promise<void>;
}

function computeDerivedFields(points: number) {
  const tier = getTierForPoints(points);
  const nextTier = getNextTier(tier);
  const pointsToNext = nextTier ? Math.max(0, nextTier.minPoints - points) : 0;
  const progress = nextTier
    ? Math.min(
        100,
        Math.round(((points - tier.minPoints) / (nextTier.minPoints - tier.minPoints)) * 100),
      )
    : 100;
  return { tier, nextTier, pointsToNext, progress };
}

const TRAIL_BLAZER_DEFAULTS = computeDerivedFields(0);

export function useLoyalty(): UseLoyaltyResult {
  const [points, setPoints] = useState(0);
  const [tier, setTier] = useState<LoyaltyTierConfig>(TRAIL_BLAZER_DEFAULTS.tier);
  const [nextTier, setNextTier] = useState<LoyaltyTierConfig | null>(
    TRAIL_BLAZER_DEFAULTS.nextTier,
  );
  const [pointsToNext, setPointsToNext] = useState(TRAIL_BLAZER_DEFAULTS.pointsToNext);
  const [progress, setProgress] = useState(TRAIL_BLAZER_DEFAULTS.progress);
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
        // SDK not initialized or user not authenticated — use Trail Blazer defaults
      }

      if (!memberToken) {
        const d = TRAIL_BLAZER_DEFAULTS;
        setPoints(0);
        setTier(d.tier);
        setNextTier(d.nextTier);
        setPointsToNext(d.pointsToNext);
        setProgress(d.progress);
        return;
      }

      const wixClient = getWixClientSingleton();
      if (!wixClient) {
        setError('Wix service unavailable');
        return;
      }

      const data = await wixClient.getLoyaltyAccount(memberToken);
      const pts = data.points ?? 0;
      const derived = computeDerivedFields(pts);
      setPoints(pts);
      setTier(derived.tier);
      setNextTier(derived.nextTier);
      setPointsToNext(derived.pointsToNext);
      setProgress(derived.progress);
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

  const awardPoints = useCallback(async (params: AwardPointsParams): Promise<void> => {
    try {
      const wixClient = getWixClientSingleton();
      if (!wixClient) return;
      await wixClient.callFunction('/_functions/awardLoyaltyPoints', 'POST', params);
    } catch {
      // Best-effort — failures are non-fatal
    }
  }, []);

  return {
    points,
    tier,
    nextTier,
    pointsToNext,
    progress,
    loading,
    error,
    refreshPoints,
    awardPoints,
  };
}
