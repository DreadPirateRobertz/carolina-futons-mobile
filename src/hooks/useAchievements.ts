/**
 * @module useAchievements
 *
 * Returns streak achievement data for the current member.
 * Uses mock data while cf-7sb (backend) is in-flight.
 *
 * cf-ljq
 */

export interface Achievement {
  /** Streak milestone in days (7, 14, 30, 60, 100, 365) */
  milestone: number;
  /** Actual streak days at time of earning */
  streakDays: number;
  /** ISO date string when earned, null if not yet earned */
  earnedAt: string | null;
  /** Display label for the badge */
  badgeLabel: string;
}

export interface UseAchievementsResult {
  achievements: Achievement[];
  loading: boolean;
  error: string | null;
}

// Mock data — replaced when cf-7sb ships
const MOCK_ACHIEVEMENTS: Achievement[] = [
  { milestone: 7, streakDays: 7, earnedAt: '2026-02-14T09:00:00Z', badgeLabel: 'Week Warrior' },
  {
    milestone: 14,
    streakDays: 14,
    earnedAt: '2026-02-21T09:00:00Z',
    badgeLabel: 'Fortnight Fighter',
  },
  { milestone: 30, streakDays: 30, earnedAt: null, badgeLabel: 'Monthly Master' },
  { milestone: 60, streakDays: 0, earnedAt: null, badgeLabel: 'Two Month Titan' },
  { milestone: 100, streakDays: 0, earnedAt: null, badgeLabel: 'Century Club' },
  { milestone: 365, streakDays: 0, earnedAt: null, badgeLabel: 'Year-Round Legend' },
];

export function useAchievements(): UseAchievementsResult {
  return {
    achievements: MOCK_ACHIEVEMENTS,
    loading: false,
    error: null,
  };
}
