/**
 * useTierPerks — cm-jyl
 *
 * Fetches the authenticated member's delivered tier perks from the Wix
 * TierPerkDeliveries collection via getTierPerks webMethod.
 * Uses member session token for auth — server resolves identity from token
 * (no IDOR risk; member only sees their own perks).
 *
 * Returns empty perks without error when unauthenticated (Trail Blazer state).
 */

import { useState, useEffect } from 'react';
import { getWixClientSingleton } from '@/services/wix/wixClientSingleton';
import { getWixSdkClient } from '@/services/wix/wixSdkClient';

export interface TierPerk {
  perkType: string;
  tier: string;
  deliveredAt: string;
  couponCode?: string;
  bookingUrl?: string;
}

export interface UseTierPerksResult {
  perks: TierPerk[];
  loading: boolean;
  error: string | null;
}

export function useTierPerks(): UseTierPerksResult {
  const [perks, setPerks] = useState<TierPerk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        let memberToken: string | undefined;
        try {
          const tokens = getWixSdkClient().auth.getTokens();
          memberToken = tokens.accessToken?.value;
        } catch {
          // SDK not initialized or user not authenticated — return empty perks
        }

        if (!memberToken) {
          if (!cancelled) setPerks([]);
          return;
        }

        const wixClient = getWixClientSingleton();
        if (!wixClient) {
          if (!cancelled) setError('Wix service unavailable');
          return;
        }

        const data = await wixClient.getTierPerks(memberToken);
        if (cancelled) return;
        setPerks(Array.isArray(data?.perks) ? data.perks : []);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setPerks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { perks, loading, error };
}
