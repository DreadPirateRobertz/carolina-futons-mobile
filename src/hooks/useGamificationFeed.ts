/**
 * @module useGamificationFeed
 *
 * Fetches in-app gamification notifications from the getMyNotifications webMethod.
 * Falls back to empty list when offline or the API call fails.
 *
 * API contract:
 *   GET /_functions/getMyNotifications?memberId=X
 *   → { notifications: ApiNotification[] }
 *   Auth: Wix member session, IDOR guard (403).
 *
 * cf-tuz
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useOptionalWixClient } from '@/services/wix';
import { useAuth } from '@/hooks/useAuth';

export type GamificationNotificationType =
  | 'streak_milestone'
  | 'daily_quest'
  | 'challenge_complete'
  | 'referral';

export interface GamificationNotification {
  id: string;
  type: GamificationNotificationType;
  message: string;
  createdAt: number;
  read: boolean;
}

export interface UseGamificationFeedResult {
  notifications: GamificationNotification[];
  loading: boolean;
  error: Error | null;
  markAllRead: () => void;
  refresh: () => void;
}

interface ApiNotification {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  read: boolean;
}

interface ApiResponse {
  notifications: ApiNotification[] | null;
}

const VALID_TYPES: GamificationNotificationType[] = [
  'streak_milestone',
  'daily_quest',
  'challenge_complete',
  'referral',
];

function isValidType(t: string): t is GamificationNotificationType {
  return VALID_TYPES.includes(t as GamificationNotificationType);
}

function mapApiNotification(api: ApiNotification): GamificationNotification {
  return {
    id: api.id,
    type: isValidType(api.type) ? api.type : 'daily_quest',
    message: api.message,
    createdAt: new Date(api.createdAt).getTime(),
    read: api.read,
  };
}

export function useGamificationFeed(): UseGamificationFeedResult {
  const wixClient = useOptionalWixClient();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<GamificationNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetchCount = useRef(0);

  const fetchNotifications = useCallback(async () => {
    const thisCall = ++fetchCount.current;
    setLoading(true);
    setError(null);
    try {
      if (!wixClient || !user?.id) {
        setNotifications([]);
        setLoading(false);
        return;
      }
      const resp = await wixClient.callFunction<ApiResponse>(
        `/_functions/getMyNotifications?memberId=${user.id}`,
        'GET',
      );
      if (thisCall !== fetchCount.current) return;
      const raw = resp?.notifications ?? [];
      setNotifications(raw.map(mapApiNotification));
    } catch (err) {
      if (thisCall !== fetchCount.current) return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (thisCall === fetchCount.current) {
        setLoading(false);
      }
    }
  }, [wixClient, user?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    // Fire-and-forget — best effort server sync
    if (wixClient && user?.id) {
      wixClient
        .callFunction(`/_functions/markAllNotificationsRead`, 'POST', { memberId: user.id })
        .catch(() => {
          // Non-critical — local state is already updated
        });
    }
  }, [wixClient, user?.id]);

  const refresh = useCallback(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return { notifications, loading, error, markAllRead, refresh };
}
