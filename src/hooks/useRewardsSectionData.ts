/**
 * @module useRewardsSectionData
 *
 * Aggregates all RewardsScreen data into a single hook with per-section
 * { data, isLoading, error } isolation. Each section can load and error
 * independently — a failure in points doesn't block badges or challenges.
 *
 * Data sources:
 *  - points: useLoyalty (points, tier, progress)
 *  - badges: useAchievements (streak milestones)
 *  - challenges: useDailyQuests (daily quests)
 *
 * Epic D Task 4
 */

import { useLoyalty, type LoyaltyTier } from '@/hooks/useLoyalty';
import { useAchievements, type Achievement } from '@/hooks/useAchievements';
import { useDailyQuests, type DailyQuest } from '@/hooks/useDailyQuests';

// --- Types ---

export interface SectionState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

export interface PointsData {
  total: number;
  tier: LoyaltyTier;
  nextTier: LoyaltyTier | null;
  pointsToNext: number;
  progress: number;
}

export interface UseRewardsSectionDataResult {
  points: SectionState<PointsData>;
  badges: SectionState<Achievement[]>;
  challenges: SectionState<DailyQuest[]>;
  refreshPoints: () => Promise<void>;
  refreshChallenges: () => void;
}

// --- Hook ---

export function useRewardsSectionData(): UseRewardsSectionDataResult {
  const loyalty = useLoyalty();
  const achievements = useAchievements();
  const quests = useDailyQuests();

  // Points section
  const points: SectionState<PointsData> = {
    data: loyalty.error
      ? null
      : {
          total: loyalty.points,
          tier: loyalty.tier,
          nextTier: loyalty.nextTier,
          pointsToNext: loyalty.pointsToNext,
          progress: loyalty.progress,
        },
    isLoading: loyalty.loading,
    error: loyalty.error,
  };

  // Badges section
  const badges: SectionState<Achievement[]> = {
    data: achievements.error ? null : achievements.achievements,
    isLoading: achievements.loading,
    error: achievements.error,
  };

  // Challenges section (useDailyQuests has no error state — falls back to mock quests)
  const challenges: SectionState<DailyQuest[]> = {
    data: quests.quests,
    isLoading: quests.loading,
    error: null,
  };

  return {
    points,
    badges,
    challenges,
    refreshPoints: loyalty.refreshPoints,
    refreshChallenges: quests.refresh,
  };
}
