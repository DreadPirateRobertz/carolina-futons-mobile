/**
 * @module useActiveChallenges
 *
 * Fetches active gamification challenges from the getActiveChallenges webMethod
 * and maps the API response to the app's Challenge data type.
 *
 * Falls back to static mock challenges when the Wix client is unavailable
 * (offline mode) or the API call fails.
 *
 * API contract (from melania, hq-wisp-rxmt):
 *   getActiveChallenges(memberId) → { challenges: ApiChallenge[] }
 *   Max 5 challenges, sorted expiresAt ASC, no expired.
 *
 * cm-f3872 / Phase 4
 */

import { useState, useEffect, useRef } from 'react';
import { useOptionalWixClient } from '@/services/wix';
import { CHALLENGES, type Challenge } from '@/data/challenges';

interface ApiChallengeProgress {
  progressValue: number;
  completedAt: string | null;
}

interface ApiChallenge {
  challengeId: string;
  title: string;
  description: string;
  conditionType: string;
  targetCount: number;
  rewardPoints: number;
  rewardBadgeId: string | null;
  expiresAt: string;
  progress: ApiChallengeProgress;
}

interface ApiResponse {
  challenges: ApiChallenge[] | null;
}

export interface UseActiveChallengesResult {
  challenges: Challenge[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

function mapApiChallenge(api: ApiChallenge): Challenge {
  const rawProgress = api.targetCount > 0 ? api.progress.progressValue / api.targetCount : 0;

  return {
    id: api.challengeId,
    title: api.title,
    description: api.description,
    reward: `${api.rewardPoints} pts`,
    progress: Math.min(1, Math.max(0, rawProgress)),
    expiresAt: new Date(api.expiresAt).getTime(),
    isActive: true,
    type: 'points',
  };
}

export function useActiveChallenges(): UseActiveChallengesResult {
  const wixClient = useOptionalWixClient();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!wixClient) {
      // No Wix client — fall back to mock data
      setChallenges(CHALLENGES);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    wixClient
      .callFunction<ApiResponse>('/_functions/getActiveChallenges', 'POST', {})
      .then((res: unknown) => {
        if (cancelled) return;
        const data = res as ApiResponse;
        const apiChallenges = Array.isArray(data?.challenges) ? data.challenges : [];
        setChallenges(apiChallenges.map(mapApiChallenge));
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const e = err instanceof Error ? err : new Error('Failed to fetch challenges');
        setError(e);
        // Fall back to empty on error — don't show stale mock data
        setChallenges([]);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [wixClient, refreshToken]);

  const refresh = () => setRefreshToken((t) => t + 1);

  return { challenges, loading, error, refresh };
}
