/**
 * @module useChallengeCatalog
 *
 * Fetches the full challenge catalog from getChallengeCatalog webMethod
 * and groups challenges by status: inProgress, available, completed, expired.
 *
 * API contract (cf-1mp, merged):
 *   GET /_functions/getChallengeCatalog
 *   → { challenges: ApiCatalogChallenge[] }
 *
 * cf-rv9 / Phase 7
 */

import { useState, useEffect } from 'react';
import { useOptionalWixClient } from '@/services/wix';

export interface CatalogChallenge {
  id: string;
  title: string;
  description: string;
  goal: number;
  unit: string;
  pointReward: number;
  expiresAt: string;
  progress: number;
  progressRatio: number; // clamped 0–1
  completed: boolean;
  isExpired: boolean;
}

export interface GroupedChallenges {
  inProgress: CatalogChallenge[];
  available: CatalogChallenge[];
  completed: CatalogChallenge[];
  expired: CatalogChallenge[];
}

interface ApiChallenge {
  id: string;
  title: string;
  description: string;
  goal: number;
  unit: string;
  pointReward: number;
  expiresAt: string;
  progress: number;
  completed: boolean;
}

interface ApiResponse {
  challenges: ApiChallenge[] | null;
}

function mapChallenge(api: ApiChallenge): CatalogChallenge {
  const isExpired = new Date(api.expiresAt).getTime() < Date.now();
  const rawRatio = api.goal > 0 ? api.progress / api.goal : 0;
  return {
    id: api.id,
    title: api.title,
    description: api.description,
    goal: api.goal,
    unit: api.unit,
    pointReward: api.pointReward,
    expiresAt: api.expiresAt,
    progress: api.progress,
    progressRatio: Math.min(1, Math.max(0, rawRatio)),
    completed: api.completed,
    isExpired,
  };
}

function groupChallenges(challenges: CatalogChallenge[]): GroupedChallenges {
  const inProgress: CatalogChallenge[] = [];
  const available: CatalogChallenge[] = [];
  const completed: CatalogChallenge[] = [];
  const expired: CatalogChallenge[] = [];

  for (const c of challenges) {
    if (c.completed) {
      completed.push(c);
    } else if (c.isExpired) {
      expired.push(c);
    } else if (c.progress > 0) {
      inProgress.push(c);
    } else {
      available.push(c);
    }
  }

  return { inProgress, available, completed, expired };
}

export interface UseChallengeCatalogResult {
  challenges: CatalogChallenge[];
  grouped: GroupedChallenges;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useChallengeCatalog(): UseChallengeCatalogResult {
  const wixClient = useOptionalWixClient();
  const [challenges, setChallenges] = useState<CatalogChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!wixClient) {
      setChallenges([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    wixClient
      .callFunction<ApiResponse>('/_functions/getChallengeCatalog', 'GET')
      .then((res: unknown) => {
        if (cancelled) return;
        const data = res as ApiResponse;
        const raw = Array.isArray(data?.challenges) ? data.challenges : [];
        setChallenges(raw.map(mapChallenge));
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Unable to load challenges. Please try again.');
        setChallenges([]);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [wixClient, refreshToken]);

  const refresh = () => setRefreshToken((t) => t + 1);

  return {
    challenges,
    grouped: groupChallenges(challenges),
    loading,
    error,
    refresh,
  };
}
