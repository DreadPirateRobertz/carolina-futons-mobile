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
import { useState, useEffect, useCallback, useRef } from 'react';
import { getWixClientSingleton } from '@/services/wix/wixClientSingleton';
import { WixAuthService } from '@/services/wix/wixAuth';
import { captureException } from '@/services/crashReporting';
import { getTierForPoints, LOYALTY_TIERS } from '@/data/loyaltyTiers';
import type { LoyaltyTierConfig } from '@/data/loyaltyTiers';

export interface LoyaltyCardData {
  points: number;
  tier: LoyaltyTierConfig;
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

export interface UseLoyaltyCardOptions {
  onTierUp?: (event: { from: LoyaltyTierConfig; to: LoyaltyTierConfig }) => void;
}

const SAFE_DEFAULTS: LoyaltyCardData = {
  points: 0,
  tier: getTierForPoints(0),
  nextTierThreshold: 500,
  progressPercent: 0,
  hasActivity: false,
};

export function useLoyaltyCard(options?: UseLoyaltyCardOptions): UseLoyaltyCardResult {
  const [data, setData] = useState<LoyaltyCardData>(SAFE_DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onTierUpRef = useRef(options?.onTierUp);
  onTierUpRef.current = options?.onTierUp;
  const prevTierRef = useRef<LoyaltyTierConfig | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    let memberId: string | undefined;
    try {
      const auth = new WixAuthService();
      const member = await auth.getCurrentMember();
      memberId = member?.id;
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
      const newTier = getTierForPoints(points);

      const prevTier = prevTierRef.current;
      prevTierRef.current = newTier;
      if (
        prevTier !== null &&
        onTierUpRef.current &&
        LOYALTY_TIERS.indexOf(newTier) > LOYALTY_TIERS.indexOf(prevTier)
      ) {
        onTierUpRef.current({ from: prevTier, to: newTier });
      }

      setData({
        points,
        tier: newTier,
        nextTierThreshold: typeof raw.nextTierThreshold === 'number' ? raw.nextTierThreshold : 500,
        progressPercent:
          typeof raw.progressPercent === 'number'
            ? Math.min(100, Math.max(0, raw.progressPercent))
            : 0,
        hasActivity,
      });
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), 'error', {
        action: 'useLoyaltyCard-fetch',
        memberId,
      });
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
