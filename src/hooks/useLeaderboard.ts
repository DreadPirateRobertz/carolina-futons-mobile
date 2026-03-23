/**
 * useLeaderboard — cf-op6
 *
 * Fetches ranked loyalty leaderboard entries from the Wix backend
 * webMethod (/_functions/getLeaderboard). Supports weekly / all-time toggle.
 */

import { useState, useCallback, useEffect } from 'react';
import { getWixClientSingleton } from '@/services/wix/wixClientSingleton';
import type { LoyaltyTier } from './useLoyalty';

export type LeaderboardPeriod = 'allTime' | 'weekly';

export interface LeaderboardEntry {
  memberId: string;
  nickname: string;
  points: number;
  tier: LoyaltyTier;
  rank: number;
}

export interface UseLeaderboardResult {
  entries: LeaderboardEntry[];
  currentUserRank: number | null;
  period: LeaderboardPeriod;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setPeriod: (period: LeaderboardPeriod) => void;
}

const LIMIT = 20;

export function useLeaderboard(): UseLeaderboardResult {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [period, setPeriodState] = useState<LeaderboardPeriod>('allTime');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(
    async (p: LeaderboardPeriod) => {
      setLoading(true);
      setError(null);
      try {
        const client = getWixClientSingleton();
        if (!client) {
          setError('Leaderboard service unavailable');
          return;
        }
        const data = await client.getLeaderboard({ period: p, limit: LIMIT });
        setEntries((data.entries ?? []) as LeaderboardEntry[]);
        setCurrentUserRank(data.currentUserRank ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setEntries([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetch(period);
  }, [fetch, period]);

  const refresh = useCallback(async () => {
    await fetch(period);
  }, [fetch, period]);

  const setPeriod = useCallback((p: LeaderboardPeriod) => {
    setPeriodState(p);
  }, []);

  return { entries, currentUserRank, period, loading, error, refresh, setPeriod };
}
