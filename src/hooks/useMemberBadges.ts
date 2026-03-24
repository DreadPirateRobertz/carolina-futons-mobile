/**
 * @module useMemberBadges
 *
 * Phase 8 social layer (cm-p8-social): fetch member badge showcase
 * from the Wix badges HTTP function.
 *
 * Endpoint (rennala CF-lac, 2026-03-23):
 *   GET /_functions/badges?memberId={userId}
 *   Response: { memberId: string, badges: BadgeObject[] }
 *
 * Public endpoint — no Authorization header needed.
 * Returns badges sorted newest-first by earnedAt.
 */

import { useCallback, useEffect, useState } from 'react';
import { captureException } from '@/services/crashReporting';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BadgeObject {
  badgeKey: string;
  name: string;
  tier: string;
  earnedAt: string;
  icon: string;
}

export interface UseMemberBadgesResult {
  badges: BadgeObject[];
  loading: boolean;
  error: string | null;
  refreshBadges: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WIX_SITE_URL = process.env.EXPO_PUBLIC_WIX_SITE_URL ?? 'https://www.carolinafutons.com';

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMemberBadges(memberId: string | null): UseMemberBadgesResult {
  const [badges, setBadges] = useState<BadgeObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refreshBadges = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!memberId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const url = `${WIX_SITE_URL}/_functions/badges?memberId=${encodeURIComponent(memberId)}`;

    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as { memberId: string; badges: BadgeObject[] };
        return data.badges ?? [];
      })
      .then((raw) => {
        if (cancelled) return;
        const sorted = [...raw].sort(
          (a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime(),
        );
        setBadges(sorted);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        captureException(err instanceof Error ? err : new Error(String(err)));
        setError(err instanceof Error ? err.message : 'Failed to load badges');
        setBadges([]);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [memberId, tick]);

  if (!memberId) {
    return { badges: [], loading: false, error: null, refreshBadges };
  }

  return { badges, loading, error, refreshBadges };
}
