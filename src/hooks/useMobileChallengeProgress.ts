/**
 * @module useMobileChallengeProgress
 *
 * Fetches MobileChallengeCompletions progress counts for the authenticated
 * member via `getMobileChallengeProgress` and keeps them in sync with incoming
 * cross-rig completion push events (ar_discovery_completed, quiz_completed,
 * social_share_completed).
 *
 * When a push arrives carrying `points`, also calls {@link syncMobilePoints}
 * so the web-side loyalty ledger stays in lockstep with mobile completions.
 *
 * cm-1we
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { useOptionalWixClient } from '@/services/wix';
import { useAuth } from '@/hooks/useAuth';
import {
  getMobileChallengeProgress,
  syncMobilePoints,
  type CrossRigEventType,
  type MobileChallengeProgress,
} from '@/services/crossRigSync';

export type ChallengeCounts = MobileChallengeProgress['counts'];

export interface UseMobileChallengeProgressResult {
  counts: ChallengeCounts;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const EMPTY_COUNTS: ChallengeCounts = {
  ar_discovery: 0,
  quiz_completion: 0,
  social_share: 0,
};

/** Cross-rig completion events that should trigger a progress re-fetch. */
const COMPLETION_EVENTS: ReadonlySet<CrossRigEventType> = new Set<CrossRigEventType>([
  'ar_discovery_completed',
  'quiz_completed',
  'social_share_completed',
]);

function isCompletionEvent(value: unknown): value is CrossRigEventType {
  return typeof value === 'string' && COMPLETION_EVENTS.has(value as CrossRigEventType);
}

export function useMobileChallengeProgress(): UseMobileChallengeProgressResult {
  const wixClient = useOptionalWixClient();
  const { user } = useAuth();
  const memberId = user?.id ?? '';

  const [counts, setCounts] = useState<ChallengeCounts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  // Latest client/member captured for the notification listener closure
  const ctxRef = useRef({ wixClient, memberId });
  ctxRef.current = { wixClient, memberId };

  const refresh = useCallback(() => {
    setRefreshToken((t) => t + 1);
  }, []);

  // Fetch on mount + on refresh token change
  useEffect(() => {
    if (!wixClient || !memberId) {
      setCounts(EMPTY_COUNTS);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getMobileChallengeProgress(wixClient, memberId)
      .then((res) => {
        if (cancelled) return;
        if (!res?.success) {
          setCounts(EMPTY_COUNTS);
          setError('Unable to load challenge progress.');
          setLoading(false);
          return;
        }
        setCounts(res.counts ?? EMPTY_COUNTS);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setCounts(EMPTY_COUNTS);
        setError('Unable to load challenge progress.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [wixClient, memberId, refreshToken]);

  // Wire push notifications → refresh (+ ledger sync when points present)
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((n) => {
      const data = n?.request?.content?.data as Record<string, unknown> | null | undefined;
      if (!data) return;

      const event = data.event;
      if (!isCompletionEvent(event)) return;

      const { wixClient: client, memberId: mid } = ctxRef.current;
      const rawPoints = data.points;
      const points = typeof rawPoints === 'number' && rawPoints >= 0 ? rawPoints : null;

      if (client && mid && points !== null) {
        // Fire-and-forget; don't let a sync failure prevent refresh.
        Promise.resolve()
          .then(() => syncMobilePoints(client, mid, points, event))
          .catch(() => {
            // Intentionally swallowed — progress refresh below is the user-visible path.
          });
      }

      refresh();
    });

    return () => {
      subscription.remove();
    };
  }, [refresh]);

  return { counts, loading, error, refresh };
}
