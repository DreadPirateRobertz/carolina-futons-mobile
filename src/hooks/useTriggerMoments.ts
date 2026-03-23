/**
 * @module useTriggerMoments
 *
 * Phase 5 — Detects gamification trigger moments and surfaces them for
 * celebration UX. Tracks tier upgrades, streak danger, and challenge completions.
 *
 * Tier changes are detected by comparing the current `tier` from `useLoyalty`
 * against the last-known tier stored in AsyncStorage. A trigger fires only
 * when the new tier is strictly higher (bronze < silver < gold) — demotions
 * are never celebrated. First-ever sessions (no stored tier) are silent to
 * avoid spurious celebrations.
 *
 * Challenge completions are fed in via `reportChallengesCompleted()` (called
 * by screens that process gamification event responses). Items are queued and
 * surfaced one at a time; `dismiss('challengeCompleted')` advances the queue.
 *
 * cm-r02ce / Phase 5 | cm-a7bqj / Phase 5 | hq-myhj5 / Phase 4
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLoyalty, type LoyaltyTier } from '@/hooks/useLoyalty';
import { useStreak } from '@/hooks/useStreak';

const STORAGE_KEY = '@cf_last_known_tier';

const TIER_RANK: Record<LoyaltyTier, number> = {
  bronze: 0,
  silver: 1,
  gold: 2,
};

export interface ChallengeCompletedItem {
  challengeId: string;
  title: string;
  rewardPoints: number;
}

export interface TriggerMoments {
  tierChanged: LoyaltyTier | null;
  /** True when the user has a multi-day streak (≥2) worth protecting. Session-only dismiss. */
  streakDanger: boolean;
  challengeCompleted: ChallengeCompletedItem | null;
}

export interface UseTriggerMomentsResult {
  triggers: TriggerMoments;
  dismiss: (trigger: keyof TriggerMoments) => void;
  /** Enqueue completed challenges from a gamification event response. */
  reportChallengesCompleted: (items: ChallengeCompletedItem[]) => void;
}

export function useTriggerMoments(): UseTriggerMomentsResult {
  const { tier, loading } = useLoyalty();
  const { streak, loading: streakLoading } = useStreak();
  const [tierChanged, setTierChanged] = useState<LoyaltyTier | null>(null);
  const [streakDangerDismissed, setStreakDangerDismissed] = useState(false);
  const [challengeQueue, setChallengeQueue] = useState<ChallengeCompletedItem[]>([]);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (loading || initializedRef.current) return;

    async function checkTier() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);

        if (!stored) {
          // First-ever session — silently baseline without firing a trigger
          await AsyncStorage.setItem(STORAGE_KEY, tier);
          initializedRef.current = true;
          return;
        }

        const storedTier = stored as LoyaltyTier;
        initializedRef.current = true;

        if (TIER_RANK[tier] > TIER_RANK[storedTier]) {
          setTierChanged(tier);
        }
      } catch {
        // Storage failure — skip silently; don't surface false triggers
        initializedRef.current = true;
      }
    }

    checkTier();
  }, [tier, loading]);

  const streakDanger = !streakLoading && streak >= 2 && !streakDangerDismissed;

  const dismiss = useCallback(
    (trigger: keyof TriggerMoments) => {
      if (trigger === 'tierChanged') {
        const dismissedTier = tierChanged;
        setTierChanged(null);
        if (dismissedTier) {
          AsyncStorage.setItem(STORAGE_KEY, dismissedTier).catch(() => {
            // Storage write failure — state already reset, acceptable
          });
        }
      } else if (trigger === 'streakDanger') {
        setStreakDangerDismissed(true);
      } else if (trigger === 'challengeCompleted') {
        setChallengeQueue((prev) => prev.slice(1));
      }
    },
    [tierChanged],
  );

  const reportChallengesCompleted = useCallback((items: ChallengeCompletedItem[]) => {
    if (!items || items.length === 0) return;
    setChallengeQueue((prev) => [...prev, ...items]);
  }, []);

  return {
    triggers: {
      tierChanged,
      streakDanger,
      challengeCompleted: challengeQueue[0] ?? null,
    },
    dismiss,
    reportChallengesCompleted,
  };
}
