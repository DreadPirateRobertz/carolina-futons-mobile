/**
 * @file useGameProfile.test.ts
 * @description TDD tests for useGameProfile hook — hq-fxqj3
 *
 * Covers:
 *  - Returns correct aggregated shape on happy path
 *  - streakStartDate is null when streak is 0
 *  - streakStartDate is computed correctly for streak > 0
 *  - nextMilestoneDays returns first milestone above current streak
 *  - nextMilestoneDays clamps to last milestone when streak exceeds all
 *  - rank is null when leaderboard has no current user rank
 *  - error: pointsError takes priority over rankError
 *  - error: rankError used when pointsError is null
 *  - error: null when both sub-hooks have no error
 *  - streakLoading / rankLoading / pointsLoading forwarded from sub-hooks
 *  - tier forwarded from useLoyalty
 *  - totalPoints forwarded from useLoyalty
 */

import { renderHook } from '@testing-library/react-native';
import { useGameProfile } from '../useGameProfile';

// ─── Mock sub-hooks ───────────────────────────────────────────────────────────

const mockUseStreak = jest.fn();
const mockUseLoyalty = jest.fn();
const mockUseLeaderboard = jest.fn();

jest.mock('../useStreak', () => ({
  useStreak: () => mockUseStreak(),
}));
jest.mock('../useLoyalty', () => ({
  useLoyalty: () => mockUseLoyalty(),
}));
jest.mock('../useLeaderboard', () => ({
  useLeaderboard: () => mockUseLeaderboard(),
}));

// ─── Default happy-path returns ───────────────────────────────────────────────

const DEFAULT_STREAK = { streak: 10, loading: false };
const DEFAULT_LOYALTY = { points: 1200, tier: 'silver', loading: false, error: null };
const DEFAULT_LEADERBOARD = { currentUserRank: 5, loading: false, error: null };

beforeEach(() => {
  jest.clearAllMocks();
  mockUseStreak.mockReturnValue(DEFAULT_STREAK);
  mockUseLoyalty.mockReturnValue(DEFAULT_LOYALTY);
  mockUseLeaderboard.mockReturnValue(DEFAULT_LEADERBOARD);
});

// ─── Pin date so streakStartDate is deterministic ────────────────────────────

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-03-23T12:00:00Z'));
});

afterAll(() => {
  jest.useRealTimers();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useGameProfile', () => {
  it('returns correct aggregated shape on happy path', () => {
    const { result } = renderHook(() => useGameProfile());
    expect(result.current.streakDays).toBe(10);
    expect(result.current.totalPoints).toBe(1200);
    expect(result.current.tier).toBe('silver');
    expect(result.current.rank).toBe(5);
    expect(result.current.streakLoading).toBe(false);
    expect(result.current.rankLoading).toBe(false);
    expect(result.current.pointsLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('streakStartDate is null when streak is 0', () => {
    mockUseStreak.mockReturnValue({ streak: 0, loading: false });
    const { result } = renderHook(() => useGameProfile());
    expect(result.current.streakStartDate).toBeNull();
  });

  it('streakStartDate is null when streak is negative', () => {
    mockUseStreak.mockReturnValue({ streak: -5, loading: false });
    const { result } = renderHook(() => useGameProfile());
    expect(result.current.streakStartDate).toBeNull();
  });

  it('streakStartDate is a valid ISO date string for streak > 0', () => {
    mockUseStreak.mockReturnValue({ streak: 5, loading: false });
    const { result } = renderHook(() => useGameProfile());
    expect(typeof result.current.streakStartDate).toBe('string');
    expect(result.current.streakStartDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('streakStartDate for streak=1 equals today', () => {
    mockUseStreak.mockReturnValue({ streak: 1, loading: false });
    const { result } = renderHook(() => useGameProfile());
    expect(result.current.streakStartDate).toBe('2026-03-23');
  });

  // nextMilestoneDays — MILESTONES = [7, 14, 30, 60, 100, 365]

  it('nextMilestoneDays returns 7 for streak of 0', () => {
    mockUseStreak.mockReturnValue({ streak: 0, loading: false });
    const { result } = renderHook(() => useGameProfile());
    expect(result.current.nextMilestoneDays).toBe(7);
  });

  it('nextMilestoneDays returns 7 for streak of 5', () => {
    mockUseStreak.mockReturnValue({ streak: 5, loading: false });
    const { result } = renderHook(() => useGameProfile());
    expect(result.current.nextMilestoneDays).toBe(7);
  });

  it('nextMilestoneDays returns 14 for streak of 7 (on milestone)', () => {
    mockUseStreak.mockReturnValue({ streak: 7, loading: false });
    const { result } = renderHook(() => useGameProfile());
    expect(result.current.nextMilestoneDays).toBe(14);
  });

  it('nextMilestoneDays returns 30 for streak of 15', () => {
    mockUseStreak.mockReturnValue({ streak: 15, loading: false });
    const { result } = renderHook(() => useGameProfile());
    expect(result.current.nextMilestoneDays).toBe(30);
  });

  it('nextMilestoneDays clamps to 365 when streak exceeds all milestones', () => {
    mockUseStreak.mockReturnValue({ streak: 400, loading: false });
    const { result } = renderHook(() => useGameProfile());
    expect(result.current.nextMilestoneDays).toBe(365);
  });

  it('nextMilestoneDays clamps to 365 for streak exactly 365', () => {
    mockUseStreak.mockReturnValue({ streak: 365, loading: false });
    const { result } = renderHook(() => useGameProfile());
    expect(result.current.nextMilestoneDays).toBe(365);
  });

  // rank

  it('rank is null when leaderboard currentUserRank is null', () => {
    mockUseLeaderboard.mockReturnValue({ currentUserRank: null, loading: false, error: null });
    const { result } = renderHook(() => useGameProfile());
    expect(result.current.rank).toBeNull();
  });

  it('rank forwards numeric value from useLeaderboard', () => {
    mockUseLeaderboard.mockReturnValue({ currentUserRank: 3, loading: false, error: null });
    const { result } = renderHook(() => useGameProfile());
    expect(result.current.rank).toBe(3);
  });

  // error priority

  it('error is null when both sub-hooks have no error', () => {
    const { result } = renderHook(() => useGameProfile());
    expect(result.current.error).toBeNull();
  });

  it('error uses pointsError when both have errors', () => {
    mockUseLoyalty.mockReturnValue({
      points: 0,
      tier: 'bronze',
      loading: false,
      error: 'points failed',
    });
    mockUseLeaderboard.mockReturnValue({
      currentUserRank: null,
      loading: false,
      error: 'rank failed',
    });
    const { result } = renderHook(() => useGameProfile());
    expect(result.current.error).toBe('points failed');
  });

  it('error uses rankError when pointsError is null', () => {
    mockUseLeaderboard.mockReturnValue({
      currentUserRank: null,
      loading: false,
      error: 'rank failed',
    });
    const { result } = renderHook(() => useGameProfile());
    expect(result.current.error).toBe('rank failed');
  });

  it('error is null when only pointsError is null and rankError is null', () => {
    mockUseLoyalty.mockReturnValue({ points: 0, tier: 'bronze', loading: false, error: null });
    mockUseLeaderboard.mockReturnValue({ currentUserRank: null, loading: false, error: null });
    const { result } = renderHook(() => useGameProfile());
    expect(result.current.error).toBeNull();
  });

  // loading states forwarded

  it('streakLoading is true when useStreak is loading', () => {
    mockUseStreak.mockReturnValue({ streak: 0, loading: true });
    const { result } = renderHook(() => useGameProfile());
    expect(result.current.streakLoading).toBe(true);
  });

  it('pointsLoading is true when useLoyalty is loading', () => {
    mockUseLoyalty.mockReturnValue({ points: 0, tier: 'bronze', loading: true, error: null });
    const { result } = renderHook(() => useGameProfile());
    expect(result.current.pointsLoading).toBe(true);
  });

  it('rankLoading is true when useLeaderboard is loading', () => {
    mockUseLeaderboard.mockReturnValue({ currentUserRank: null, loading: true, error: null });
    const { result } = renderHook(() => useGameProfile());
    expect(result.current.rankLoading).toBe(true);
  });

  it('all loading flags can be true simultaneously', () => {
    mockUseStreak.mockReturnValue({ streak: 0, loading: true });
    mockUseLoyalty.mockReturnValue({ points: 0, tier: 'bronze', loading: true, error: null });
    mockUseLeaderboard.mockReturnValue({ currentUserRank: null, loading: true, error: null });
    const { result } = renderHook(() => useGameProfile());
    expect(result.current.streakLoading).toBe(true);
    expect(result.current.pointsLoading).toBe(true);
    expect(result.current.rankLoading).toBe(true);
  });

  // tier forwarded

  it('tier is bronze by default', () => {
    mockUseLoyalty.mockReturnValue({ points: 0, tier: 'bronze', loading: false, error: null });
    const { result } = renderHook(() => useGameProfile());
    expect(result.current.tier).toBe('bronze');
  });

  it('tier is gold when useLoyalty returns gold', () => {
    mockUseLoyalty.mockReturnValue({ points: 5000, tier: 'gold', loading: false, error: null });
    const { result } = renderHook(() => useGameProfile());
    expect(result.current.tier).toBe('gold');
  });

  // totalPoints

  it('totalPoints is 0 when useLoyalty returns 0', () => {
    mockUseLoyalty.mockReturnValue({ points: 0, tier: 'bronze', loading: false, error: null });
    const { result } = renderHook(() => useGameProfile());
    expect(result.current.totalPoints).toBe(0);
  });

  it('totalPoints forwards large values correctly', () => {
    mockUseLoyalty.mockReturnValue({ points: 99999, tier: 'gold', loading: false, error: null });
    const { result } = renderHook(() => useGameProfile());
    expect(result.current.totalPoints).toBe(99999);
  });
});
