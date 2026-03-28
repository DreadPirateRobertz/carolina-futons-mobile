/**
 * Tests for useRewardsSectionData — Epic D Task 4
 *
 * Wraps useLoyalty, useAchievements, useDailyQuests into a single hook
 * with per-section { data, isLoading, error } isolation.
 *
 * AC:
 *  1. Each section has independent loading state
 *  2. Per-section error isolation — one failure doesn't block others
 *  3. Aggregates data from 3 existing hooks
 */

import { renderHook, act } from '@testing-library/react-native';
import { useRewardsSectionData } from '../useRewardsSectionData';

// --- Mocks ---

const mockLoyalty = {
  points: 750,
  tier: 'silver' as const,
  nextTier: 'gold' as const,
  pointsToNext: 750,
  progress: 50,
  loading: false,
  error: null,
  refreshPoints: jest.fn(),
};

const mockAchievements = {
  achievements: [
    { milestone: 7, streakDays: 7, earnedAt: '2026-03-20', badgeLabel: '7-Day Streak', iconUrl: null },
    { milestone: 14, streakDays: 0, earnedAt: null, badgeLabel: '14-Day Streak', iconUrl: null },
  ],
  loading: false,
  error: null,
};

const mockQuests = {
  quests: [
    { id: 'q1', title: 'Browse 3 products', action: 'purchase' as const, pointReward: 25, completed: false },
    { id: 'q2', title: 'Add to cart', action: 'cart' as const, pointReward: 15, completed: true },
  ],
  loading: false,
  refresh: jest.fn(),
};

jest.mock('@/hooks/useLoyalty', () => ({
  useLoyalty: () => mockLoyalty,
}));

jest.mock('@/hooks/useAchievements', () => ({
  useAchievements: () => mockAchievements,
}));

jest.mock('@/hooks/useDailyQuests', () => ({
  useDailyQuests: () => mockQuests,
}));

// --- Tests ---

describe('useRewardsSectionData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to defaults
    mockLoyalty.points = 750;
    mockLoyalty.tier = 'silver';
    mockLoyalty.loading = false;
    mockLoyalty.error = null;
    mockAchievements.achievements = [
      { milestone: 7, streakDays: 7, earnedAt: '2026-03-20', badgeLabel: '7-Day Streak', iconUrl: null },
    ];
    mockAchievements.loading = false;
    mockAchievements.error = null;
    mockQuests.quests = [
      { id: 'q1', title: 'Browse 3 products', action: 'purchase' as const, pointReward: 25, completed: false },
    ];
    mockQuests.loading = false;
  });

  // --- AC 1: Independent loading states ---

  describe('loading states', () => {
    it('points section reflects useLoyalty loading', () => {
      mockLoyalty.loading = true;
      const { result } = renderHook(() => useRewardsSectionData());

      expect(result.current.points.isLoading).toBe(true);
    });

    it('badges section reflects useAchievements loading', () => {
      mockAchievements.loading = true;
      const { result } = renderHook(() => useRewardsSectionData());

      expect(result.current.badges.isLoading).toBe(true);
    });

    it('challenges section reflects useDailyQuests loading', () => {
      mockQuests.loading = true;
      const { result } = renderHook(() => useRewardsSectionData());

      expect(result.current.challenges.isLoading).toBe(true);
    });

    it('all sections done loading when sources are loaded', () => {
      const { result } = renderHook(() => useRewardsSectionData());

      expect(result.current.points.isLoading).toBe(false);
      expect(result.current.badges.isLoading).toBe(false);
      expect(result.current.challenges.isLoading).toBe(false);
    });

    it('sections can load independently — points loading, badges done', () => {
      mockLoyalty.loading = true;
      mockAchievements.loading = false;
      const { result } = renderHook(() => useRewardsSectionData());

      expect(result.current.points.isLoading).toBe(true);
      expect(result.current.badges.isLoading).toBe(false);
      expect(result.current.badges.data).toHaveLength(1);
    });
  });

  // --- AC 2: Per-section error isolation ---

  describe('error isolation', () => {
    it('points error does not affect badges or challenges', () => {
      mockLoyalty.error = 'Network timeout';
      const { result } = renderHook(() => useRewardsSectionData());

      expect(result.current.points.error).toBe('Network timeout');
      expect(result.current.badges.error).toBeNull();
      expect(result.current.badges.data).toHaveLength(1);
      expect(result.current.challenges.error).toBeNull();
      expect(result.current.challenges.data).toHaveLength(1);
    });

    it('badges error does not affect points or challenges', () => {
      mockAchievements.error = 'Unable to load achievements. Please try again.';
      const { result } = renderHook(() => useRewardsSectionData());

      expect(result.current.badges.error).toBeTruthy();
      expect(result.current.points.error).toBeNull();
      expect(result.current.points.data?.total).toBe(750);
      expect(result.current.challenges.error).toBeNull();
    });

    it('all sections can error independently', () => {
      mockLoyalty.error = 'points fail';
      mockAchievements.error = 'badges fail';
      // useDailyQuests doesn't expose error — it falls back to mock quests
      const { result } = renderHook(() => useRewardsSectionData());

      expect(result.current.points.error).toBe('points fail');
      expect(result.current.badges.error).toBe('badges fail');
      expect(result.current.challenges.error).toBeNull();
    });
  });

  // --- AC 3: Data aggregation ---

  describe('data aggregation', () => {
    it('points section contains total, tier, progress', () => {
      const { result } = renderHook(() => useRewardsSectionData());

      expect(result.current.points.data).toEqual({
        total: 750,
        tier: 'silver',
        nextTier: 'gold',
        pointsToNext: 750,
        progress: 50,
      });
    });

    it('badges section contains achievements array', () => {
      const { result } = renderHook(() => useRewardsSectionData());

      expect(result.current.badges.data).toHaveLength(1);
      expect(result.current.badges.data![0].badgeLabel).toBe('7-Day Streak');
    });

    it('challenges section contains quests array', () => {
      const { result } = renderHook(() => useRewardsSectionData());

      expect(result.current.challenges.data).toHaveLength(1);
      expect(result.current.challenges.data![0].title).toBe('Browse 3 products');
    });

    it('points data is null when loyalty has error', () => {
      mockLoyalty.error = 'fail';
      const { result } = renderHook(() => useRewardsSectionData());

      expect(result.current.points.data).toBeNull();
    });

    it('badges data is null when achievements has error', () => {
      mockAchievements.error = 'fail';
      const { result } = renderHook(() => useRewardsSectionData());

      expect(result.current.badges.data).toBeNull();
    });
  });

  // --- Refresh ---

  describe('refresh', () => {
    it('exposes refreshPoints from useLoyalty', () => {
      const { result } = renderHook(() => useRewardsSectionData());

      expect(typeof result.current.refreshPoints).toBe('function');
    });

    it('exposes refreshChallenges from useDailyQuests', () => {
      const { result } = renderHook(() => useRewardsSectionData());

      expect(typeof result.current.refreshChallenges).toBe('function');
    });
  });

  // --- Edge cases ---

  describe('edge cases', () => {
    it('handles zero points gracefully', () => {
      mockLoyalty.points = 0;
      mockLoyalty.tier = 'bronze';
      const { result } = renderHook(() => useRewardsSectionData());

      expect(result.current.points.data?.total).toBe(0);
      expect(result.current.points.data?.tier).toBe('bronze');
    });

    it('handles empty achievements array', () => {
      mockAchievements.achievements = [];
      const { result } = renderHook(() => useRewardsSectionData());

      expect(result.current.badges.data).toEqual([]);
    });

    it('handles empty quests array', () => {
      mockQuests.quests = [];
      const { result } = renderHook(() => useRewardsSectionData());

      expect(result.current.challenges.data).toEqual([]);
    });
  });
});
