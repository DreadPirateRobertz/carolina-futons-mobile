/**
 * @module useRewardsSectionData
 *
 * Aggregates rewards screen data from three hooks into a unified
 * per-section shape with isolated loading/error state.
 * Each section fails independently — a badges error won't block points display.
 */
import { useLoyalty } from '@/hooks/useLoyalty';
import { useMemberBadges } from '@/hooks/useMemberBadges';
import { useChallengeProgress } from '@/hooks/useChallengeProgress';

interface SectionState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

export interface RewardsSectionData {
  points: SectionState<ReturnType<typeof useLoyalty>>;
  badges: SectionState<ReturnType<typeof useMemberBadges>>;
  challenges: SectionState<ReturnType<typeof useChallengeProgress>>;
}

export function useRewardsSectionData(_memberId: string | null): RewardsSectionData {
  const loyalty = useLoyalty();
  const memberBadges = useMemberBadges(_memberId);
  const challengeProgress = useChallengeProgress();

  return {
    points: {
      data: loyalty.error ? null : loyalty,
      isLoading: loyalty.loading,
      error: loyalty.error,
    },
    badges: {
      data: memberBadges.error ? null : memberBadges,
      isLoading: memberBadges.loading,
      error: memberBadges.error,
    },
    challenges: {
      data: challengeProgress.error ? null : challengeProgress,
      isLoading: challengeProgress.loading,
      error: challengeProgress.error,
    },
  };
}
