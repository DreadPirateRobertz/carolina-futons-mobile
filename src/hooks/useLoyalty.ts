/**
 * useLoyalty — cm-elo
 *
 * Fetches the current member's loyalty points balance and transaction history
 * from Wix Data. memberId is resolved via WixAuthService.getCurrentMember()
 * (session-based — no IDOR risk; member can only read their own record).
 *
 * Collections:
 *   LoyaltyPoints       — { memberId, points, tier, totalEarned }
 *   LoyaltyTransactions — { _id, memberId, delta, reason, createdDate }
 *
 * Tier thresholds: bronze 0–499, silver 500–1499, gold 1500+
 */

import { useState, useCallback, useEffect } from 'react';
import { getWixClientSingleton } from '@/services/wix/wixClientSingleton';
import { WixAuthService } from '@/services/wix/wixAuth';

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
  totalEarned: number;
  transactions: LoyaltyTransaction[];
  loading: boolean;
  error: string | null;
  refreshPoints: () => Promise<void>;
}

function deriveTier(points: number): LoyaltyTier {
  if (points >= 1500) return 'gold';
  if (points >= 500) return 'silver';
  return 'bronze';
}

export function useLoyalty(): UseLoyaltyResult {
  const [points, setPoints] = useState(0);
  const [tier, setTier] = useState<LoyaltyTier>('bronze');
  const [totalEarned, setTotalEarned] = useState(0);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = new WixAuthService();
      const member = await auth.getCurrentMember();
      const memberId = member?.id;
      if (!memberId) {
        setPoints(0);
        setTier('bronze');
        setTotalEarned(0);
        setTransactions([]);
        return;
      }

      const wixClient = getWixClientSingleton();
      if (!wixClient) {
        setError('Wix service unavailable');
        return;
      }

      const filter = { memberId: { $eq: memberId } };

      const [pointsResult, txResult] = await Promise.all([
        wixClient.queryData('LoyaltyPoints', { filter, limit: 1 }),
        wixClient.queryData('LoyaltyTransactions', {
          filter,
          sort: [{ fieldName: 'createdDate', order: 'DESC' }],
          limit: 50,
        }),
      ]);

      if (pointsResult.items.length > 0) {
        const record = pointsResult.items[0] as Record<string, unknown>;
        const pts = (record.points as number) ?? 0;
        setPoints(pts);
        setTier(deriveTier(pts));
        setTotalEarned((record.totalEarned as number) ?? 0);
      } else {
        setPoints(0);
        setTier('bronze');
        setTotalEarned(0);
      }

      setTransactions((txResult.items ?? []) as unknown as LoyaltyTransaction[]);
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

  return { points, tier, totalEarned, transactions, loading, error, refreshPoints };
}
