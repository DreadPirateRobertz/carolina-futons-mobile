/**
 * @module usePointsHistory
 *
 * Fetches recent points events from the getMyActivity webMethod.
 * Falls back to static mock data when wix client is unavailable.
 *
 * API contract (cf-backend-activity, in-flight):
 *   GET /_functions/getMyActivity → { events: ApiPointsEvent[] }
 *
 * cf-g4r / Phase 7
 */

import { useState, useEffect } from 'react';
import { useOptionalWixClient } from '@/services/wix';
import { MOCK_POINTS_EVENTS } from '@/data/pointsHistory';

export interface PointsEvent {
  id: string;
  type:
    | 'purchase'
    | 'review'
    | 'referral'
    | 'challenge_complete'
    | 'streak_milestone'
    | 'daily_quest';
  description: string;
  points: number;
  earnedAt: string;
}

interface ApiResponse {
  events: PointsEvent[] | null;
}

export interface UsePointsHistoryResult {
  events: PointsEvent[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function usePointsHistory(): UsePointsHistoryResult {
  const wixClient = useOptionalWixClient();
  const [events, setEvents] = useState<PointsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!wixClient) {
      setEvents(MOCK_POINTS_EVENTS);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    wixClient
      .callFunction<ApiResponse>('/_functions/getMyActivity', 'GET')
      .then((res: unknown) => {
        if (cancelled) return;
        const data = res as ApiResponse;
        setEvents(Array.isArray(data?.events) ? data.events : []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Unable to load points history. Please try again.');
        setEvents([]);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [wixClient, refreshToken]);

  const refresh = () => setRefreshToken((t) => t + 1);

  return { events, loading, error, refresh };
}
