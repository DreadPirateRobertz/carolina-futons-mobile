/**
 * @module useChallengeProgress
 *
 * Fetches member-specific challenge progress from the MemberChallengeProgress
 * CMS collection and computes summary stats (points earned, completed count,
 * active count).
 *
 * CMS collection: MemberChallengeProgress
 * Fields: challengeId, memberId, progressValue, goalValue, pointsEarned,
 *         completedAt, lastUpdated
 *
 * hq-elfso
 */

import { useState, useEffect } from 'react';
import { useOptionalWixClient } from '@/services/wix';
import { useAuth } from '@/hooks/useAuth';

export interface ChallengeProgressItem {
  challengeId: string;
  memberId: string;
  progressValue: number;
  goalValue: number;
  pointsEarned: number;
  completedAt: string | null;
  lastUpdated: string;
  progressRatio: number;
}

export interface ChallengeProgressSummary {
  totalPointsEarned: number;
  completedCount: number;
  activeCount: number;
}

export interface UseChallengeProgressResult {
  progressItems: ChallengeProgressItem[];
  summary: ChallengeProgressSummary;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

interface CmsProgressItem {
  challengeId: string;
  memberId: string;
  progressValue: number;
  goalValue: number;
  pointsEarned: number;
  completedAt: string | null;
  lastUpdated: string;
}

const EMPTY_SUMMARY: ChallengeProgressSummary = {
  totalPointsEarned: 0,
  completedCount: 0,
  activeCount: 0,
};

function mapItem(raw: CmsProgressItem): ChallengeProgressItem {
  const ratio = raw.goalValue > 0 ? raw.progressValue / raw.goalValue : 0;
  return {
    ...raw,
    progressRatio: Math.min(1, Math.max(0, ratio)),
  };
}

function computeSummary(items: ChallengeProgressItem[]): ChallengeProgressSummary {
  let totalPointsEarned = 0;
  let completedCount = 0;
  let activeCount = 0;

  for (const item of items) {
    totalPointsEarned += item.pointsEarned;
    if (item.completedAt) {
      completedCount++;
    } else {
      activeCount++;
    }
  }

  return { totalPointsEarned, completedCount, activeCount };
}

export function useChallengeProgress(): UseChallengeProgressResult {
  const wixClient = useOptionalWixClient();
  const { user } = useAuth();
  const [progressItems, setProgressItems] = useState<ChallengeProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!wixClient || !user?.id) {
      setProgressItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    wixClient
      .queryData<CmsProgressItem>('MemberChallengeProgress', {
        filter: { memberId: user.id },
        sort: [{ fieldName: 'lastUpdated', order: 'DESC' }],
        limit: 50,
      })
      .then((res) => {
        if (cancelled) return;
        const items = Array.isArray(res?.items) ? res.items : [];
        setProgressItems(items.map(mapItem));
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Unable to load challenge progress.');
        setProgressItems([]);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [wixClient, user?.id, refreshToken]);

  const refresh = () => setRefreshToken((t) => t + 1);

  return {
    progressItems,
    summary: progressItems.length > 0 ? computeSummary(progressItems) : EMPTY_SUMMARY,
    loading,
    error,
    refresh,
  };
}
