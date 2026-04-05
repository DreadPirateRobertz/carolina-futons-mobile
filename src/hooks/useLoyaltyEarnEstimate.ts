/**
 * useLoyaltyEarnEstimate — cm-2qq
 *
 * Returns the estimated loyalty points a member earns on a given purchase
 * price, factoring in their current tier's earnRate. Falls back to Trail
 * Blazer (0.06) when unauthenticated — same default as useLoyalty().
 *
 * Earn rates (pts per dollar, mirrors LoyaltyTiers Wix collection):
 *   Trail Blazer:      0.06  (1×)
 *   Mountain Guide:    0.09  (1.5×)
 *   Summit Master:     0.12  (2×)
 *   Blue Ridge Legend: 0.18  (3×)
 */

import { useMemo } from 'react';
import { useLoyalty } from './useLoyalty';
import { calcTieredPoints } from '@/data/loyaltyTiers';
import type { LoyaltyTierConfig } from '@/data/loyaltyTiers';

export interface UseLoyaltyEarnEstimateResult {
  /** Estimated points earned for the given price at the member's current tier. */
  pts: number;
  tier: LoyaltyTierConfig;
  loading: boolean;
  error: string | null;
}

export function useLoyaltyEarnEstimate(price: number): UseLoyaltyEarnEstimateResult {
  const { tier, loading, error } = useLoyalty();

  const pts = useMemo(() => {
    if (loading || error) return 0;
    return calcTieredPoints(price, tier.earnRate);
  }, [price, tier, loading, error]);

  return { pts, tier, loading, error };
}
