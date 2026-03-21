/**
 * @module useLoyaltyCard
 *
 * Fetches the current member's loyalty data from GET /_functions/loyalty/{memberId}.
 * Used by LoyaltyCard to display tier, points, progress bar, and next-tier text.
 *
 * Tier thresholds (CF-yq80 Phase 2.3):
 *   Bronze  0–499 pts   → next threshold 500
 *   Silver  500–1499    → next threshold 1500
 *   Gold    1500+       → fully earned
 *
 * cm-a31
 */
import { useState, useEffect, useCallback } from 'react';
import { getWixClientSingleton } from '@/services/wix/wixClientSingleton';
import { WixAuthService } from '@/services/wix/wixAuth';
import type { LoyaltyTier } from '@/hooks/useLoyalty';

export interface LoyaltyCardData {
  points: number;
  tier: LoyaltyTier;
  nextTierThreshold: number;
  progressPercent: number;
  /** True when the member has had any activity (points earned, even if spent back to 0). */
  hasActivity: boolean;
}

export interface UseLoyaltyCardResult extends LoyaltyCardData {
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const SAFE_DEFAULTS: LoyaltyCardData = {
  points: 0,
  tier: 'bronze',
  nextTierThreshold: 500,
  progressPercent: 0,
  hasActivity: false,
};

function normalizeTier(raw: string): LoyaltyTier {
  const lower = raw?.toLowerCase() ?? 'bronze';
  if (lower === 'silver' || lower === 'gold') return lower;
  return 'bronze';
}

export function useLoyaltyCard(): UseLoyaltyCardResult {
  const [data, setData] = useState<LoyaltyCardData>(SAFE_DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const auth = new WixAuthService();
      const member = await auth.getCurrentMember();
      const memberId = member?.id;
      if (!memberId) {
        setData(SAFE_DEFAULTS);
        return;
      }

      const wixClient = getWixClientSingleton();
      if (!wixClient) {
        setError('[useLoyaltyCard] Wix service unavailable');
        setData(SAFE_DEFAULTS);
        return;
      }

      const raw = await wixClient.getLoyaltyData(memberId);
      const points = typeof raw.points === 'number' ? raw.points : 0;
      const totalEarned = typeof raw.totalEarned === 'number' ? raw.totalEarned : 0;
      const hasActivity = raw.hasActivity ?? (points > 0 || totalEarned > 0);

      setData({
        points,
        tier: normalizeTier(raw.tier),
        nextTierThreshold: typeof raw.nextTierThreshold === 'number' ? raw.nextTierThreshold : 500,
        progressPercent: typeof raw.progressPercent === 'number'
          ? Math.min(100, Math.max(0, raw.progressPercent))
          : 0,
        hasActivity,
      });
    } catch (err) {
      console.error('[useLoyaltyCard] Failed to fetch loyalty data:', err);
      setError(err instanceof Error ? err.message : String(err));
      setData(SAFE_DEFAULTS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return { ...data, isLoading, error, refresh };
}
