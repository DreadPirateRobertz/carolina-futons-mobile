/**
 * @module useRewardsSectionData
 *
 * Centralizes per-section data fetching for RewardsScreen with isolated error
 * handling. Each section (points, badges, challenges) fails independently —
 * a network error on one section never blocks the others from rendering.
 *
 * epicD
 */
import { useState, useEffect } from 'react';
import {
  fetchPoints,
  fetchBadges,
  fetchChallenges,
  type PointsSummary,
  type MemberBadge,
  type ActiveChallenge,
} from '@/services/gamificationApi';
import { captureException } from '@/services/crashReporting';

interface SectionState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

function idle<T>(): SectionState<T> {
  return { data: null, isLoading: false, error: null };
}

function loading<T>(): SectionState<T> {
  return { data: null, isLoading: true, error: null };
}

function useSection<T>(
  fetcher: (id: string) => Promise<T>,
  memberId: string | null,
): SectionState<T> {
  const [state, setState] = useState<SectionState<T>>(memberId ? loading<T>() : idle<T>());

  useEffect(() => {
    if (!memberId) {
      setState(idle<T>());
      return;
    }
    let cancelled = false;
    setState(loading<T>());
    fetcher(memberId)
      .then((data) => {
        if (!cancelled) setState({ data, isLoading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setState({ data: null, isLoading: false, error: msg });
          captureException(err instanceof Error ? err : new Error(msg));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [memberId]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}

export interface RewardsSectionData {
  points: SectionState<PointsSummary>;
  badges: SectionState<MemberBadge[]>;
  challenges: SectionState<ActiveChallenge[]>;
}

export function useRewardsSectionData(memberId: string | null): RewardsSectionData {
  const points = useSection(fetchPoints, memberId);
  const badges = useSection(fetchBadges, memberId);
  const challenges = useSection(fetchChallenges, memberId);
  return { points, badges, challenges };
}
