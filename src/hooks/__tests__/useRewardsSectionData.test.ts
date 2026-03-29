/**
 * Tests for useRewardsSectionData — epicD
 *
 * Covers:
 * - Per-section loading state
 * - Per-section data
 * - Error isolation — one section failure doesn't break others
 */
import { renderHook, act } from '@testing-library/react-native';

jest.mock('@/services/gamificationApi', () => ({
  fetchPoints: jest.fn(),
  fetchBadges: jest.fn(),
  fetchChallenges: jest.fn(),
}));

import { useRewardsSectionData } from '../useRewardsSectionData';
import * as gamificationApi from '@/services/gamificationApi';

const mockFetchers = gamificationApi as jest.Mocked<typeof gamificationApi>;

beforeEach(() => jest.clearAllMocks());

it('returns per-section loading state', async () => {
  mockFetchers.fetchPoints.mockResolvedValue({ total: 500, tier: 'bronze', nextTierThreshold: 1000, progressPercent: 50 });
  mockFetchers.fetchBadges.mockResolvedValue([]);
  mockFetchers.fetchChallenges.mockResolvedValue([]);

  const { result } = renderHook(() => useRewardsSectionData('member-1'));
  expect(result.current.points.isLoading).toBe(true);
  await act(async () => {});
  expect(result.current.points.isLoading).toBe(false);
  expect(result.current.points.data?.total).toBe(500);
});

it('isolates errors per section — other sections still render', async () => {
  mockFetchers.fetchPoints.mockRejectedValue(new Error('network'));
  mockFetchers.fetchBadges.mockResolvedValue([{ id: 'b1', label: 'Trendsetter', earnedAt: '2026-01-01' }]);
  mockFetchers.fetchChallenges.mockResolvedValue([]);

  const { result } = renderHook(() => useRewardsSectionData('member-1'));
  await act(async () => {});
  expect(result.current.points.error).toBeTruthy();
  expect(result.current.badges.data).toHaveLength(1);
  expect(result.current.badges.error).toBeNull();
});

it('returns null data and no error on null memberId', async () => {
  const { result } = renderHook(() => useRewardsSectionData(null));
  await act(async () => {});
  expect(result.current.points.isLoading).toBe(false);
  expect(result.current.points.data).toBeNull();
  expect(result.current.points.error).toBeNull();
});

it('refetches when memberId changes', async () => {
  mockFetchers.fetchPoints.mockResolvedValue({ total: 100, tier: 'bronze', nextTierThreshold: 1000, progressPercent: 10 });
  mockFetchers.fetchBadges.mockResolvedValue([]);
  mockFetchers.fetchChallenges.mockResolvedValue([]);

  const { result, rerender } = renderHook(({ id }) => useRewardsSectionData(id), {
    initialProps: { id: 'member-1' as string | null },
  });
  await act(async () => {});
  expect(mockFetchers.fetchPoints).toHaveBeenCalledWith('member-1');

  mockFetchers.fetchPoints.mockResolvedValue({ total: 200, tier: 'bronze', nextTierThreshold: 1000, progressPercent: 20 });
  rerender({ id: 'member-2' });
  await act(async () => {});
  expect(mockFetchers.fetchPoints).toHaveBeenCalledWith('member-2');
  expect(result.current.points.data?.total).toBe(200);
});
