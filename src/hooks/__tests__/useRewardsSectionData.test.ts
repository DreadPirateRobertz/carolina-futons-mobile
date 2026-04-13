import { renderHook, act } from '@testing-library/react-native';

import { useRewardsSectionData } from '../useRewardsSectionData';

const mockLoyalty = {
  points: 0,
  tier: 'bronze' as const,
  nextTier: 'silver' as const,
  pointsToNext: 500,
  progress: 0,
  loading: true,
  error: null as string | null,
  refreshPoints: jest.fn(),
};
const mockBadges = {
  badges: [],
  loading: true,
  error: null as string | null,
  refreshBadges: jest.fn(),
};
const mockChallenges = {
  totalPointsEarned: 0,
  completedCount: 0,
  activeCount: 0,
  activeChallenges: [],
  recentlyCompleted: [],
  loading: true,
  error: null as string | null,
  refresh: jest.fn(),
};

jest.mock('@/hooks/useLoyalty', () => ({ useLoyalty: () => mockLoyalty }));
jest.mock('@/hooks/useMemberBadges', () => ({ useMemberBadges: () => mockBadges }));
jest.mock('@/hooks/useChallengeProgress', () => ({ useChallengeProgress: () => mockChallenges }));

beforeEach(() => jest.clearAllMocks());

it('returns per-section loading state', () => {
  const { result } = renderHook(() => useRewardsSectionData('member-1'));
  expect(result.current.points.isLoading).toBe(true);
  expect(result.current.badges.isLoading).toBe(true);
  expect(result.current.challenges.isLoading).toBe(true);
});

it('exposes loyalty data through points section', () => {
  mockLoyalty.loading = false;
  mockLoyalty.points = 500;
  const { result } = renderHook(() => useRewardsSectionData('member-1'));
  expect(result.current.points.data?.points).toBe(500);
  expect(result.current.points.isLoading).toBe(false);
  expect(result.current.points.error).toBeNull();
});

it('isolates errors per section — other sections still render', () => {
  mockLoyalty.loading = false;
  mockLoyalty.error = 'network error';
  mockBadges.loading = false;
  mockBadges.badges = [{ id: 'b1' }] as never;
  mockChallenges.loading = false;
  const { result } = renderHook(() => useRewardsSectionData('member-1'));
  expect(result.current.points.error).toBe('network error');
  expect(result.current.badges.data?.badges).toHaveLength(1);
  expect(result.current.badges.error).toBeNull();
});

it('exposes badges data through badges section', () => {
  mockBadges.loading = false;
  mockBadges.badges = [{ id: 'badge-1', name: 'First Purchase' }] as never;
  const { result } = renderHook(() => useRewardsSectionData('member-1'));
  expect(result.current.badges.data?.badges).toHaveLength(1);
});
