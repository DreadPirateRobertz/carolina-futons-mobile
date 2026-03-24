/**
 * useLeaderboard tests — cf-op6
 *
 * TDD spec for the leaderboard data hook.
 */

import { renderHook, act } from '@testing-library/react-native';
import { useLeaderboard } from '../useLeaderboard';

const mockGetLeaderboard = jest.fn();
// undefined = "use default client"; null = "simulate unavailable client"
let mockClientOverride: { getLeaderboard: jest.Mock } | null | undefined = undefined;

jest.mock('@/services/wix/wixClientSingleton', () => ({
  getWixClientSingleton: () =>
    mockClientOverride === undefined ? { getLeaderboard: mockGetLeaderboard } : mockClientOverride,
}));

// Server response shape (nickname field)
const SAMPLE_ENTRIES = [
  { memberId: 'm1', nickname: 'Alice', points: 2500, tier: 'gold', rank: 1 },
  { memberId: 'm2', nickname: 'Bob', points: 800, tier: 'silver', rank: 2 },
  { memberId: 'm3', nickname: 'Carol', points: 200, tier: 'bronze', rank: 3 },
];

const SAMPLE_WEEKLY = [
  { memberId: 'm2', nickname: 'Bob', points: 150, tier: 'silver', rank: 1 },
  { memberId: 'm1', nickname: 'Alice', points: 100, tier: 'gold', rank: 2 },
];

// Mapped hook output shape (displayName field)
const MAPPED_ENTRIES = [
  { memberId: 'm1', displayName: 'Alice', points: 2500, tier: 'gold', rank: 1 },
  { memberId: 'm2', displayName: 'Bob', points: 800, tier: 'silver', rank: 2 },
  { memberId: 'm3', displayName: 'Carol', points: 200, tier: 'bronze', rank: 3 },
];

const MAPPED_WEEKLY = [
  { memberId: 'm2', displayName: 'Bob', points: 150, tier: 'silver', rank: 1 },
  { memberId: 'm1', displayName: 'Alice', points: 100, tier: 'gold', rank: 2 },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockClientOverride = undefined;
  mockGetLeaderboard.mockResolvedValue({ entries: SAMPLE_ENTRIES, currentUserRank: 2 });
});

describe('useLeaderboard', () => {
  it('starts in loading state', () => {
    mockGetLeaderboard.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useLeaderboard());
    expect(result.current.loading).toBe(true);
    expect(result.current.entries).toEqual([]);
  });

  it('fetches all-time leaderboard on mount', async () => {
    const { result } = renderHook(() => useLeaderboard());
    await act(async () => {});
    expect(mockGetLeaderboard).toHaveBeenCalledWith({ period: 'allTime', limit: 20 });
    expect(result.current.entries).toEqual(MAPPED_ENTRIES);
    expect(result.current.loading).toBe(false);
  });

  it('exposes currentUserRank from response', async () => {
    const { result } = renderHook(() => useLeaderboard());
    await act(async () => {});
    expect(result.current.currentUserRank).toBe(2);
  });

  it('defaults period to allTime', async () => {
    const { result } = renderHook(() => useLeaderboard());
    await act(async () => {});
    expect(result.current.period).toBe('allTime');
  });

  it('setPeriod to weekly refetches with correct param', async () => {
    mockGetLeaderboard
      .mockResolvedValueOnce({ entries: SAMPLE_ENTRIES, currentUserRank: 2 })
      .mockResolvedValueOnce({ entries: SAMPLE_WEEKLY, currentUserRank: 1 });

    const { result } = renderHook(() => useLeaderboard());
    await act(async () => {});

    await act(async () => {
      result.current.setPeriod('weekly');
    });

    expect(mockGetLeaderboard).toHaveBeenCalledWith({ period: 'weekly', limit: 20 });
    expect(result.current.entries).toEqual(MAPPED_WEEKLY);
    expect(result.current.period).toBe('weekly');
  });

  it('refresh re-fetches with current period', async () => {
    const { result } = renderHook(() => useLeaderboard());
    await act(async () => {});

    mockGetLeaderboard.mockResolvedValueOnce({ entries: SAMPLE_ENTRIES, currentUserRank: 3 });
    await act(async () => {
      await result.current.refresh();
    });

    expect(mockGetLeaderboard).toHaveBeenCalledTimes(2);
    expect(result.current.currentUserRank).toBe(3);
  });

  it('sets error on fetch failure', async () => {
    mockGetLeaderboard.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useLeaderboard());
    await act(async () => {});
    expect(result.current.error).toBe('Network error');
    expect(result.current.loading).toBe(false);
    expect(result.current.entries).toEqual([]);
  });

  it('clears error on successful retry', async () => {
    mockGetLeaderboard
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce({ entries: SAMPLE_ENTRIES, currentUserRank: 2 });

    const { result } = renderHook(() => useLeaderboard());
    await act(async () => {});
    expect(result.current.error).toBe('fail');

    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.error).toBeNull();
    expect(result.current.entries).toEqual(MAPPED_ENTRIES);
  });

  it('handles wix client unavailable (null) gracefully', async () => {
    mockClientOverride = null;
    const { result } = renderHook(() => useLeaderboard());
    await act(async () => {});
    expect(result.current.error).toBe('Leaderboard service unavailable');
    expect(result.current.loading).toBe(false);
  });

  it('handles non-Error rejection gracefully', async () => {
    mockGetLeaderboard.mockRejectedValue('string error');
    const { result } = renderHook(() => useLeaderboard());
    await act(async () => {});
    expect(result.current.error).toBe('string error');
  });
});
