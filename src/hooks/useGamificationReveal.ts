/**
 * @module useGamificationReveal
 *
 * Tracks whether the one-time gamification reveal slide has been shown to a
 * new member at the end of the onboarding quiz. Backed by AsyncStorage so the
 * reveal fires exactly once across sessions.
 *
 * The reveal awards WELCOME_POINTS (150) and shows the member their starting
 * tier, progress toward the next tier, and two challenge teasers — giving them
 * an endowed-progress feeling before they've even browsed.
 */
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TIER_THRESHOLDS, TIER_NAMES, getTierIndex } from '../public/gamificationTokens.js';

const STORAGE_KEY = '@cf_gamification_reveal_shown';

export const WELCOME_POINTS = 150;

export interface TierRevealData {
  tierName: string;
  points: number;
  nextTierName: string | null;
  pointsToNextTier: number | null;
  progressFraction: number; // 0–1 within current tier band
}

export interface ChallengeTeaser {
  title: string;
  pointsLabel: string;
}

/** Two static challenge teasers shown on the reveal slide. */
export const CHALLENGE_TEASERS: ChallengeTeaser[] = [
  { title: 'Make your first purchase', pointsLabel: '+200 pts' },
  { title: 'Complete your style profile', pointsLabel: '+50 pts' },
];

function buildTierData(points: number): TierRevealData {
  const tierIndex = getTierIndex(points);
  const tierName = TIER_NAMES[tierIndex];
  const tierFloor = TIER_THRESHOLDS[tierIndex];
  const nextTierIndex = tierIndex + 1;
  const hasNextTier = nextTierIndex < TIER_NAMES.length;
  const nextTierName = hasNextTier ? TIER_NAMES[nextTierIndex] : null;
  const nextTierThreshold = hasNextTier ? TIER_THRESHOLDS[nextTierIndex] : null;
  const pointsToNextTier = nextTierThreshold != null ? nextTierThreshold - points : null;
  const bandSize = nextTierThreshold != null ? nextTierThreshold - tierFloor : 1;
  const progressFraction = Math.min((points - tierFloor) / bandSize, 1);

  return { tierName, points, nextTierName, pointsToNextTier, progressFraction };
}

export interface GamificationRevealState {
  hasSeenReveal: boolean;
  isLoading: boolean;
  tierData: TierRevealData;
  challengeTeasers: ChallengeTeaser[];
  markRevealShown: () => Promise<void>;
}

export function useGamificationReveal(): GamificationRevealState {
  const [hasSeenReveal, setHasSeenReveal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(v => setHasSeenReveal(v === 'true'))
      .catch(() => setHasSeenReveal(false))
      .finally(() => setIsLoading(false));
  }, []);

  const markRevealShown = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // best-effort — reveal will re-show next session if write fails, acceptable
    }
    setHasSeenReveal(true);
  }, []);

  return {
    hasSeenReveal,
    isLoading,
    tierData: buildTierData(WELCOME_POINTS),
    challengeTeasers: CHALLENGE_TEASERS,
    markRevealShown,
  };
}
