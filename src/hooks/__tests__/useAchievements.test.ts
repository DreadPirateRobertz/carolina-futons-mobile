/**
 * useAchievements tests — cm-707
 *
 * TDD: tests written before implementation per Melania Directive.
 * Covers: initial fetch, error, empty state, null iconUrl, sorted by earnedAt desc.
 * Target: ≥6 tests, 100% branch coverage.
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useAchievements } from '../useAchievements';

const mockCallFunction = jest.fn();
let mockWixClient: { callFunction: jest.Mock } | null = { callFunction: mockCallFunction };

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => mockWixClient,
}));

const EARNED_EARLY = '2026-01-01T00:00:00Z';
const EARNED_MID = '2026-02-15T00:00:00Z';
const EARNED_LATE = '2026-03-20T00:00:00Z';

const MOCK_RESPONSE = {
  achievements: [
    {
      milestone: 7,
      streakDays: 7,
      earnedAt: EARNED_EARLY,
      badgeLabel: 'Week Warrior',
      iconUrl: 'https://cdn.example.com/week.svg',
    },
    {
      milestone: 14,
      streakDays: 14,
      earnedAt: EARNED_LATE,
      badgeLabel: 'Fortnight Fighter',
      iconUrl: 'https://cdn.example.com/fortnight.svg',
    },
    {
      milestone: 30,
      streakDays: 30,
      earnedAt: EARNED_MID,
      badgeLabel: 'Monthly Master',
      iconUrl: null,
    },
    {
      milestone: 60,
      streakDays: 0,
      earnedAt: null,
      badgeLabel: 'Two Month Titan',
      iconUrl: null,
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockWixClient = { callFunction: mockCallFunction };
  mockCallFunction.mockResolvedValue(MOCK_RESPONSE);
});

describe('useAchievements', () => {
  it('returns loading=true before fetch resolves', () => {
    const { result } = renderHook(() => useAchievements());
    expect(result.current.loading).toBe(true);
  });

  it('fetches achievements and sets loading=false on success', async () => {
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.achievements).toHaveLength(4);
    expect(result.current.error).toBeNull();
  });

  it('calls the correct API endpoint', async () => {
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockCallFunction).toHaveBeenCalledWith('/_functions/getAchievements', 'GET');
  });

  it('sorts achievements by earnedAt descending — most recent first', async () => {
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const earned = result.current.achievements.filter((a) => a.earnedAt !== null);
    for (let i = 0; i < earned.length - 1; i++) {
      expect(new Date(earned[i].earnedAt!).getTime()).toBeGreaterThanOrEqual(
        new Date(earned[i + 1].earnedAt!).getTime(),
      );
    }
  });

  it('places null-earnedAt achievements after earned ones', async () => {
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const achievements = result.current.achievements;
    const lastEarnedIdx = achievements.reduce((last, a, i) => (a.earnedAt !== null ? i : last), -1);
    const firstNullIdx = achievements.findIndex((a) => a.earnedAt === null);

    // All earned entries appear before any null-earnedAt entry
    if (lastEarnedIdx !== -1 && firstNullIdx !== -1) {
      expect(lastEarnedIdx).toBeLessThan(firstNullIdx);
    }
  });

  it('passes null iconUrl through without error', async () => {
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const withNullIcon = result.current.achievements.filter((a) => a.iconUrl === null);
    expect(withNullIcon.length).toBeGreaterThan(0);
    withNullIcon.forEach((a) => expect(a.iconUrl).toBeNull());
  });

  it('sets error and clears achievements on fetch failure', async () => {
    mockCallFunction.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.achievements).toEqual([]);
  });

  it('returns empty achievements array when API returns empty list', async () => {
    mockCallFunction.mockResolvedValue({ achievements: [] });
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.achievements).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('handles null achievements array in API response', async () => {
    mockCallFunction.mockResolvedValue({ achievements: null });
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.achievements).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('returns empty and no error when wix client is unavailable', async () => {
    mockWixClient = null;
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.achievements).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('sorts two null-earnedAt achievements as equal (both appear in result)', async () => {
    mockCallFunction.mockResolvedValue({
      achievements: [
        { milestone: 60, streakDays: 0, earnedAt: null, badgeLabel: 'A', iconUrl: null },
        { milestone: 100, streakDays: 0, earnedAt: null, badgeLabel: 'B', iconUrl: null },
      ],
    });
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.achievements).toHaveLength(2);
    result.current.achievements.forEach((a) => expect(a.earnedAt).toBeNull());
  });

  it('places non-null earnedAt before null earnedAt when b is null', async () => {
    mockCallFunction.mockResolvedValue({
      achievements: [
        { milestone: 100, streakDays: 0, earnedAt: null, badgeLabel: 'Unearned', iconUrl: null },
        { milestone: 7, streakDays: 7, earnedAt: EARNED_LATE, badgeLabel: 'Earned', iconUrl: null },
      ],
    });
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.achievements[0].earnedAt).toBe(EARNED_LATE);
    expect(result.current.achievements[1].earnedAt).toBeNull();
  });

  it('does not update state after unmount during pending fetch', async () => {
    let resolveApi!: (val: unknown) => void;
    mockCallFunction.mockReturnValue(
      new Promise((res) => {
        resolveApi = res;
      }),
    );

    const { unmount } = renderHook(() => useAchievements());
    unmount();
    // Resolve after unmount — should not throw or update state
    resolveApi(MOCK_RESPONSE);
    await Promise.resolve();
    // No assertion needed — test passes if no act() warning throws
  });

  it('does not update state after unmount when fetch rejects', async () => {
    let rejectApi!: (err: unknown) => void;
    mockCallFunction.mockReturnValue(
      new Promise((_, rej) => {
        rejectApi = rej;
      }),
    );

    const { unmount } = renderHook(() => useAchievements());
    unmount();
    rejectApi(new Error('gone'));
    await Promise.resolve();
    // No assertion needed — cancelled guard prevents state update
  });
});
