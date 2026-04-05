/**
 * @module useNPSSummary
 *
 * Staff-only NPS summary dashboard hook (hq-9dq).
 *
 * Queries the Wix `SurveyResponses` collection (sorted newest-first) and
 * computes aggregate stats for display on NPSSummaryScreen:
 *   - avgScore: mean score across all responses, rounded to 1 decimal (null if empty)
 *   - responseCount: total number of responses
 *   - recentComments: up to 5 most recent responses that have a non-empty comment
 *
 * Staff gate: only users with a @carolinafutons.com email are permitted.
 * Non-staff and unauthenticated callers receive isStaff=false, no fetch.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOptionalWixClient } from '@/services/wix';
import { captureException } from '@/services/crashReporting';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NpsResponseItem {
  id: string;
  memberId?: string;
  orderId: string;
  score: number;
  comment?: string;
  createdAt: string;
}

export interface NpsSummaryData {
  avgScore: number | null;
  responseCount: number;
  recentComments: NpsResponseItem[];
}

export interface UseNPSSummaryReturn {
  summary: NpsSummaryData | null;
  loading: boolean;
  error: string | null;
  isStaff: boolean;
  refresh: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COLLECTION = 'SurveyResponses';
const STAFF_DOMAIN = '@carolinafutons.com';
const FETCH_LIMIT = 100;
const MAX_COMMENTS = 5;

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeSummary(items: NpsResponseItem[]): NpsSummaryData {
  const responseCount = items.length;

  const avgScore =
    responseCount === 0
      ? null
      : Math.round((items.reduce((sum, r) => sum + r.score, 0) / responseCount) * 10) / 10;

  const recentComments = items
    .filter((r) => r.comment != null && r.comment.trim().length > 0)
    .slice(0, MAX_COMMENTS);

  return { avgScore, responseCount, recentComments };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useNPSSummary(): UseNPSSummaryReturn {
  const { user } = useAuth();
  const wixClient = useOptionalWixClient();

  const isStaff = Boolean(user?.email?.endsWith(STAFF_DOMAIN));

  const [summary, setSummary] = useState<NpsSummaryData | null>(null);
  const [loading, setLoading] = useState(isStaff);
  const [error, setError] = useState<string | null>(null);
  const [fetchCount, setFetchCount] = useState(0);

  useEffect(() => {
    if (!isStaff) {
      setLoading(false);
      return;
    }

    if (!wixClient) {
      setError('Service unavailable. Please try again later.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const result = await wixClient.queryData<NpsResponseItem>(COLLECTION, {
          sort: [{ fieldName: 'createdAt', order: 'DESC' }],
          limit: FETCH_LIMIT,
        });

        if (!cancelled) {
          setSummary(computeSummary(result.items));
          setLoading(false);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        captureException(error);
        if (!cancelled) {
          setError(error.message);
          setSummary(null);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // fetchCount is the refresh trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStaff, wixClient, fetchCount]);

  const refresh = useCallback(() => {
    setFetchCount((n) => n + 1);
  }, []);

  return { summary, loading, error, isStaff, refresh };
}
