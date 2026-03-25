/**
 * @module useAchievements
 *
 * Returns streak achievement data for the current member.
 * Fetches from /_functions/getAchievements webMethod.
 * Results sorted by earnedAt descending (most recent first),
 * with unearned (null earnedAt) entries trailing.
 *
 * cf-ljq / cf-7sb
 */

import { useState, useEffect } from 'react';
import { useOptionalWixClient } from '@/services/wix';
import { captureException } from '@/services/crashReporting';

export interface Achievement {
  /** Streak milestone in days (7, 14, 30, 60, 100, 365) */
  milestone: number;
  /** Actual streak days at time of earning */
  streakDays: number;
  /** ISO date string when earned, null if not yet earned */
  earnedAt: string | null;
  /** Display label for the badge */
  badgeLabel: string;
  /** Remote icon URL, null if not set */
  iconUrl: string | null;
}

export interface UseAchievementsResult {
  achievements: Achievement[];
  loading: boolean;
  error: string | null;
}

interface ApiAchievement {
  milestone: number;
  streakDays: number;
  earnedAt: string | null;
  badgeLabel: string;
  iconUrl?: string | null;
}

interface ApiResponse {
  achievements: ApiAchievement[] | null;
}

function mapAchievement(api: ApiAchievement): Achievement {
  return {
    milestone: api.milestone,
    streakDays: api.streakDays,
    earnedAt: api.earnedAt ?? null,
    badgeLabel: api.badgeLabel,
    iconUrl: api.iconUrl ?? null,
  };
}

function sortByEarnedAtDesc(achievements: Achievement[]): Achievement[] {
  return [...achievements].sort((a, b) => {
    if (a.earnedAt === null && b.earnedAt === null) return 0;
    if (a.earnedAt === null) return 1;
    if (b.earnedAt === null) return -1;
    return new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime();
  });
}

export function useAchievements(): UseAchievementsResult {
  const wixClient = useOptionalWixClient();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!wixClient) {
      setAchievements([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    wixClient
      .callFunction<ApiResponse>('/_functions/getAchievements', 'GET')
      .then((data) => {
        if (cancelled) return;
        const raw = Array.isArray(data?.achievements) ? data.achievements : [];
        setAchievements(sortByEarnedAtDesc(raw.map(mapAchievement)));
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        captureException(err instanceof Error ? err : new Error(String(err)));
        setError('Unable to load achievements. Please try again.');
        setAchievements([]);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [wixClient]);

  return { achievements, loading, error };
}
