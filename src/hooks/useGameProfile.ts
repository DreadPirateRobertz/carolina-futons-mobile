/**
 * @module useGameProfile
 *
 * Aggregates streak, rank, points, and tier data for GameProfileCard.
 * Composes useStreak + useLoyalty + useLeaderboard in parallel.
 *
 * cf-zlp
 */

import { useStreak } from './useStreak';
import { useLoyalty } from './useLoyalty';
import { useLeaderboard } from './useLeaderboard';
import type { LoyaltyTierConfig } from '@/data/loyaltyTiers';

const MILESTONES = [7, 14, 30, 60, 100, 365];

function computeStreakStartDate(streakDays: number): string | null {
  if (streakDays <= 0) return null;
  const d = new Date();
  d.setDate(d.getDate() - (streakDays - 1));
  return d.toISOString().split('T')[0];
}

function computeNextMilestone(streakDays: number): number {
  for (const m of MILESTONES) {
    if (m > streakDays) return m;
  }
  return MILESTONES[MILESTONES.length - 1];
}

export interface UseGameProfileResult {
  streakDays: number;
  streakStartDate: string | null;
  nextMilestoneDays: number;
  rank: number | null;
  totalPoints: number;
  tier: LoyaltyTierConfig;
  streakLoading: boolean;
  rankLoading: boolean;
  pointsLoading: boolean;
  error: string | null;
}

export function useGameProfile(): UseGameProfileResult {
  const { streak, loading: streakLoading } = useStreak();
  const { points, tier, loading: pointsLoading, error: pointsError } = useLoyalty();
  const { currentUserRank, loading: rankLoading, error: rankError } = useLeaderboard();

  return {
    streakDays: streak,
    streakStartDate: computeStreakStartDate(streak),
    nextMilestoneDays: computeNextMilestone(streak),
    rank: currentUserRank,
    totalPoints: points,
    tier,
    streakLoading,
    rankLoading,
    pointsLoading,
    error: pointsError ?? rankError ?? null,
  };
}
