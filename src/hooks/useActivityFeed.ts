/**
 * @module useActivityFeed
 *
 * Paginated loyalty event feed. Fetches from getMyActivity webMethod
 * (POST /_functions/getMyActivity) with limit/offset pagination and
 * optional type filtering. Falls back to static mock data when the
 * Wix client is unavailable (unauthenticated / offline).
 *
 * cf-2h8
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useOptionalWixClient } from '@/services/wix';
import { MOCK_POINTS_EVENTS } from '@/data/pointsHistory';

export type ActivityEventType =
  | 'purchase'
  | 'review'
  | 'referral'
  | 'challenge_complete'
  | 'streak_milestone'
  | 'daily_quest';

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  description: string;
  points: number;
  earnedAt: string;
}

export type ActivityFilter = 'all' | 'points' | 'streaks' | 'quests' | 'challenges';

export interface UseActivityFeedResult {
  events: ActivityEvent[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
}

const PAGE_SIZE = 20;

const FILTER_TYPES: Record<Exclude<ActivityFilter, 'all'>, ActivityEventType[]> = {
  points: ['purchase', 'review', 'referral'],
  streaks: ['streak_milestone'],
  quests: ['daily_quest'],
  challenges: ['challenge_complete'],
};

interface ApiResponse {
  events: ActivityEvent[] | null;
  hasMore: boolean;
}

function applyMockFilter(filter: ActivityFilter): ActivityEvent[] {
  const events = MOCK_POINTS_EVENTS as ActivityEvent[];
  if (filter === 'all') return events;
  const types = FILTER_TYPES[filter];
  return events.filter((e) => types.includes(e.type as ActivityEventType));
}

export function useActivityFeed(filter: ActivityFilter): UseActivityFeedResult {
  const wixClient = useOptionalWixClient();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const offsetRef = useRef(0);
  const loadingRef = useRef(false);

  const fetch = useCallback(
    async (offset: number, replace: boolean) => {
      if (loadingRef.current && !replace) return;
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      if (!wixClient) {
        const mock = applyMockFilter(filter);
        setEvents(mock);
        setHasMore(false);
        setLoading(false);
        loadingRef.current = false;
        return;
      }

      try {
        const body: Record<string, unknown> = { limit: PAGE_SIZE, offset };
        if (filter !== 'all') {
          body.types = FILTER_TYPES[filter];
        }
        const res = await wixClient.callFunction<ApiResponse>(
          '/_functions/getMyActivity',
          'POST',
          body,
        );
        const incoming = Array.isArray(res?.events) ? res.events : [];
        setEvents((prev) => (replace ? incoming : [...prev, ...incoming]));
        setHasMore(res?.hasMore ?? false);
        offsetRef.current = offset + incoming.length;
      } catch {
        setError('Unable to load activity. Please try again.');
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [wixClient, filter],
  );

  // Reset and re-fetch when filter or client changes
  useEffect(() => {
    offsetRef.current = 0;
    fetch(0, true);
  }, [fetch]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingRef.current) return;
    fetch(offsetRef.current, false);
  }, [hasMore, fetch]);

  const refresh = useCallback(() => {
    offsetRef.current = 0;
    fetch(0, true);
  }, [fetch]);

  return { events, loading, error, hasMore, loadMore, refresh };
}
