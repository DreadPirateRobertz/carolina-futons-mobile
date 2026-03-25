/**
 * useStreak tests — cm-ihz
 *
 * TDD spec for the streak tracking hook.
 */

import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStreak } from '../useStreak';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

const TODAY = '2026-03-22';
const YESTERDAY = '2026-03-21';
const TWO_DAYS_AGO = '2026-03-20';

// Pin Date.now so streak logic is deterministic
beforeAll(() => {
  jest.spyOn(Date, 'now').mockReturnValue(new Date(TODAY).getTime());
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('useStreak', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Restore default implementations so a never-resolving mock from one test
    // cannot bleed into the next (clearAllMocks resets calls but not impls).
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
  });

  it('returns streak of 1 on first ever visit', async () => {
    mockGetItem.mockResolvedValue(null);
    const { result } = renderHook(() => useStreak());
    await act(async () => {});
    expect(result.current.streak).toBe(1);
  });

  it('increments streak when last visit was yesterday', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ lastVisit: YESTERDAY, streak: 3 }));
    const { result } = renderHook(() => useStreak());
    await act(async () => {});
    expect(result.current.streak).toBe(4);
  });

  it('preserves streak when last visit was today (no double count)', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ lastVisit: TODAY, streak: 7 }));
    const { result } = renderHook(() => useStreak());
    await act(async () => {});
    expect(result.current.streak).toBe(7);
  });

  it('resets streak to 1 when gap is more than 1 day', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ lastVisit: TWO_DAYS_AGO, streak: 10 }));
    const { result } = renderHook(() => useStreak());
    await act(async () => {});
    expect(result.current.streak).toBe(1);
  });

  it('persists updated streak to AsyncStorage', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ lastVisit: YESTERDAY, streak: 2 }));
    renderHook(() => useStreak());
    await act(async () => {});
    expect(mockSetItem).toHaveBeenCalledWith(
      '@carolina_futons_streak',
      JSON.stringify({ lastVisit: TODAY, streak: 3, longestStreak: 3 }),
    );
  });

  it('does not write storage when last visit was already today', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ lastVisit: TODAY, streak: 5 }));
    renderHook(() => useStreak());
    await act(async () => {});
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  it('returns loading=true initially', () => {
    mockGetItem.mockImplementation(() => new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useStreak());
    expect(result.current.loading).toBe(true);
  });

  it('returns loading=false after data loads', async () => {
    mockGetItem.mockResolvedValue(null);
    const { result } = renderHook(() => useStreak());
    await act(async () => {});
    expect(result.current.loading).toBe(false);
  });

  it('handles AsyncStorage read error gracefully (streak stays at 1)', async () => {
    mockGetItem.mockRejectedValue(new Error('Storage error'));
    const { result } = renderHook(() => useStreak());
    await act(async () => {});
    expect(result.current.streak).toBe(1);
    expect(result.current.loading).toBe(false);
  });

  // cm-jest-coverage: cancelled guard branches (lines 45, 71, 73)
  // Unmount while getItem is pending so cancelled=true before the async path resumes.

  it('does not update state when unmounted before getItem resolves (line 45)', async () => {
    let resolveGetItem!: (val: string | null) => void;
    mockGetItem.mockImplementation(
      () =>
        new Promise<string | null>((resolve) => {
          resolveGetItem = resolve;
        }),
    );
    const { unmount } = renderHook(() => useStreak());
    unmount(); // sets cancelled = true
    await act(async () => {
      resolveGetItem(null);
    }); // resolves after cancel
    // cancelled guard fires at line 45 — setItem should NOT be called
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  it('does not update state when unmounted before getItem rejects (lines 71, 73)', async () => {
    let rejectGetItem!: (err: Error) => void;
    mockGetItem.mockImplementation(
      () =>
        new Promise<string | null>((_, reject) => {
          rejectGetItem = reject;
        }),
    );
    const { result, unmount } = renderHook(() => useStreak());
    unmount(); // sets cancelled = true
    await act(async () => {
      rejectGetItem(new Error('Storage error'));
    });
    // catch fires with cancelled=true — streak stays at initial 1, loading stays true
    expect(result.current.streak).toBe(1);
  });
  // ── wasExtendedToday ──────────────────────────────────────────────────────

  it('wasExtendedToday is true when last visit was yesterday (gap === 1)', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ lastVisit: YESTERDAY, streak: 3 }));
    const { result } = renderHook(() => useStreak());
    await act(async () => {});
    expect(result.current.wasExtendedToday).toBe(true);
  });

  it('wasExtendedToday is false on first ever visit', async () => {
    mockGetItem.mockResolvedValue(null);
    const { result } = renderHook(() => useStreak());
    await act(async () => {});
    expect(result.current.wasExtendedToday).toBe(false);
  });

  it('wasExtendedToday is false when already visited today', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ lastVisit: TODAY, streak: 7 }));
    const { result } = renderHook(() => useStreak());
    await act(async () => {});
    expect(result.current.wasExtendedToday).toBe(false);
  });

  it('wasExtendedToday is false when streak was reset (gap > 1)', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ lastVisit: TWO_DAYS_AGO, streak: 10 }));
    const { result } = renderHook(() => useStreak());
    await act(async () => {});
    expect(result.current.wasExtendedToday).toBe(false);
  });

  // ── longestStreak — cf-qsxp ─────────────────────────────────────────────

  it('longestStreak equals current streak on first visit', async () => {
    mockGetItem.mockResolvedValue(null);
    const { result } = renderHook(() => useStreak());
    await act(async () => {});
    expect(result.current.longestStreak).toBe(1);
  });

  it('longestStreak updates when current streak exceeds it', async () => {
    mockGetItem.mockResolvedValue(
      JSON.stringify({ lastVisit: YESTERDAY, streak: 5, longestStreak: 5 }),
    );
    const { result } = renderHook(() => useStreak());
    await act(async () => {});
    expect(result.current.streak).toBe(6);
    expect(result.current.longestStreak).toBe(6);
  });

  it('longestStreak preserved when streak resets after a break', async () => {
    mockGetItem.mockResolvedValue(
      JSON.stringify({ lastVisit: TWO_DAYS_AGO, streak: 10, longestStreak: 30 }),
    );
    const { result } = renderHook(() => useStreak());
    await act(async () => {});
    expect(result.current.streak).toBe(1);
    expect(result.current.longestStreak).toBe(30);
  });

  it('longestStreak preserved when already visited today', async () => {
    mockGetItem.mockResolvedValue(
      JSON.stringify({ lastVisit: TODAY, streak: 3, longestStreak: 15 }),
    );
    const { result } = renderHook(() => useStreak());
    await act(async () => {});
    expect(result.current.streak).toBe(3);
    expect(result.current.longestStreak).toBe(15);
  });

  it('persists longestStreak to AsyncStorage when streak extends', async () => {
    mockGetItem.mockResolvedValue(
      JSON.stringify({ lastVisit: YESTERDAY, streak: 7, longestStreak: 7 }),
    );
    renderHook(() => useStreak());
    await act(async () => {});
    expect(mockSetItem).toHaveBeenCalledWith(
      '@carolina_futons_streak',
      JSON.stringify({ lastVisit: TODAY, streak: 8, longestStreak: 8 }),
    );
  });

  it('persists longestStreak to AsyncStorage when streak resets', async () => {
    mockGetItem.mockResolvedValue(
      JSON.stringify({ lastVisit: TWO_DAYS_AGO, streak: 5, longestStreak: 20 }),
    );
    renderHook(() => useStreak());
    await act(async () => {});
    expect(mockSetItem).toHaveBeenCalledWith(
      '@carolina_futons_streak',
      JSON.stringify({ lastVisit: TODAY, streak: 1, longestStreak: 20 }),
    );
  });

  it('migrates legacy record without longestStreak field', async () => {
    // Old records have no longestStreak — should default to current streak
    mockGetItem.mockResolvedValue(JSON.stringify({ lastVisit: YESTERDAY, streak: 12 }));
    const { result } = renderHook(() => useStreak());
    await act(async () => {});
    expect(result.current.streak).toBe(13);
    expect(result.current.longestStreak).toBe(13);
  });

  it('migrates legacy record: longestStreak defaults to streak on reset', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ lastVisit: TWO_DAYS_AGO, streak: 8 }));
    const { result } = renderHook(() => useStreak());
    await act(async () => {});
    expect(result.current.streak).toBe(1);
    // Legacy record had no longestStreak — use the old streak as longest
    expect(result.current.longestStreak).toBe(8);
  });

  it('longestStreak defaults to 1 on storage error', async () => {
    mockGetItem.mockRejectedValue(new Error('Storage error'));
    const { result } = renderHook(() => useStreak());
    await act(async () => {});
    expect(result.current.longestStreak).toBe(1);
  });
});
