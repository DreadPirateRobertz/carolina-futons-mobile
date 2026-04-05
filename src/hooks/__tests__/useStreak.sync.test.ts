/**
 * useStreak cross-device sync tests — cm-bti
 *
 * TDD spec for Wix-backed streak sync.
 *
 * Covers:
 *  - Remote wins when newer/higher
 *  - Local wins when newer/higher
 *  - Streak reset when remote confirms missed day
 *  - Offline graceful fallback (remote fetch fails → local)
 *  - New device (local empty, remote has streak) → restore from remote
 *  - Remote upsert failure doesn't crash hook
 *  - No memberId → no remote calls (backward-compatible)
 *  - Concurrent same-day visit: do not double-count
 */

import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStreak } from '../useStreak';
import type { RemoteStreakRecord } from '../useStreak';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

const TODAY = '2026-04-05';
const YESTERDAY = '2026-04-04';
const TWO_DAYS_AGO = '2026-04-03';

beforeAll(() => {
  jest.spyOn(Date, 'now').mockReturnValue(new Date(TODAY).getTime());
});

afterAll(() => {
  jest.restoreAllMocks();
});

function makeLocalRecord(lastVisit: string, streak: number, longestStreak = streak) {
  return JSON.stringify({ lastVisit, streak, longestStreak });
}

function makeRemote(
  lastActivityDate: string,
  currentStreak: number,
  longestStreak = currentStreak,
): RemoteStreakRecord {
  return { lastActivityDate, currentStreak, longestStreak };
}

describe('useStreak — cross-device sync (cm-bti)', () => {
  let fetchRemote: jest.Mock;
  let upsertRemote: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
    fetchRemote = jest.fn();
    upsertRemote = jest.fn().mockResolvedValue(undefined);
  });

  // ── No memberId → no remote calls ────────────────────────────────────────

  it('does not call fetchRemote when memberId is omitted', async () => {
    mockGetItem.mockResolvedValue(makeLocalRecord(YESTERDAY, 3));
    renderHook(() => useStreak());
    await act(async () => {});
    expect(fetchRemote).not.toHaveBeenCalled();
    expect(upsertRemote).not.toHaveBeenCalled();
  });

  it('does not call fetchRemote when memberId is undefined', async () => {
    mockGetItem.mockResolvedValue(makeLocalRecord(YESTERDAY, 3));
    renderHook(() => useStreak({ memberId: undefined, fetchRemote, upsertRemote }));
    await act(async () => {});
    expect(fetchRemote).not.toHaveBeenCalled();
  });

  // ── New device: no local, remote has streak ────────────────────────────────

  it('restores streak from remote when local is empty (new device/reinstall)', async () => {
    mockGetItem.mockResolvedValue(null); // no local
    fetchRemote.mockResolvedValue(makeRemote(TODAY, 7, 14));
    const { result } = renderHook(() =>
      useStreak({ memberId: 'member-1', fetchRemote, upsertRemote }),
    );
    await act(async () => {});
    expect(result.current.streak).toBe(7);
    expect(result.current.longestStreak).toBe(14);
  });

  it('initialises streak=1 and syncs to remote when both local and remote are empty', async () => {
    mockGetItem.mockResolvedValue(null);
    fetchRemote.mockResolvedValue(null);
    const { result } = renderHook(() =>
      useStreak({ memberId: 'member-1', fetchRemote, upsertRemote }),
    );
    await act(async () => {});
    expect(result.current.streak).toBe(1);
    expect(upsertRemote).toHaveBeenCalledWith('member-1', {
      lastActivityDate: TODAY,
      currentStreak: 1,
      longestStreak: 1,
    });
  });

  // ── Remote wins ────────────────────────────────────────────────────────────

  it('uses remote streak when remote lastActivityDate is newer than local', async () => {
    // Local stale (missed sync), remote is up-to-date
    mockGetItem.mockResolvedValue(makeLocalRecord(TWO_DAYS_AGO, 3));
    fetchRemote.mockResolvedValue(makeRemote(YESTERDAY, 5, 5));
    const { result } = renderHook(() =>
      useStreak({ memberId: 'member-1', fetchRemote, upsertRemote }),
    );
    await act(async () => {});
    // Remote is newer → use remote as base, then apply today's logic
    // Remote lastActivity=yesterday → extend to 6
    expect(result.current.streak).toBe(6);
  });

  it('restores higher streak from remote when local was reset by reinstall', async () => {
    mockGetItem.mockResolvedValue(makeLocalRecord(YESTERDAY, 1)); // reinstall reset local
    fetchRemote.mockResolvedValue(makeRemote(YESTERDAY, 20, 25));
    const { result } = renderHook(() =>
      useStreak({ memberId: 'member-1', fetchRemote, upsertRemote }),
    );
    await act(async () => {});
    // Remote has the real streak for yesterday → extend to 21
    expect(result.current.streak).toBe(21);
    expect(result.current.longestStreak).toBe(25);
  });

  // ── Local wins ────────────────────────────────────────────────────────────

  it('uses local streak when local lastVisit is newer than remote', async () => {
    mockGetItem.mockResolvedValue(makeLocalRecord(YESTERDAY, 8, 8));
    fetchRemote.mockResolvedValue(makeRemote(TWO_DAYS_AGO, 5, 10));
    const { result } = renderHook(() =>
      useStreak({ memberId: 'member-1', fetchRemote, upsertRemote }),
    );
    await act(async () => {});
    // Local is newer → use local as base, extend yesterday→today = 9
    expect(result.current.streak).toBe(9);
  });

  it('uses local when both local and remote have same date (no double-count)', async () => {
    mockGetItem.mockResolvedValue(makeLocalRecord(TODAY, 5));
    fetchRemote.mockResolvedValue(makeRemote(TODAY, 5, 5));
    const { result } = renderHook(() =>
      useStreak({ memberId: 'member-1', fetchRemote, upsertRemote }),
    );
    await act(async () => {});
    // Already visited today → no change
    expect(result.current.streak).toBe(5);
    expect(upsertRemote).not.toHaveBeenCalled();
  });

  // ── Streak persists across sessions ───────────────────────────────────────

  it('streak persists across sessions: remote record survives between sessions', async () => {
    // Simulate: user opens app fresh (no local), remote has yesterday's streak
    mockGetItem.mockResolvedValue(null);
    fetchRemote.mockResolvedValue(makeRemote(YESTERDAY, 10, 10));
    const { result } = renderHook(() =>
      useStreak({ memberId: 'member-1', fetchRemote, upsertRemote }),
    );
    await act(async () => {});
    expect(result.current.streak).toBe(11);
    // And it should upsert the new value to remote
    expect(upsertRemote).toHaveBeenCalledWith('member-1', {
      lastActivityDate: TODAY,
      currentStreak: 11,
      longestStreak: 11,
    });
  });

  it('writes updated streak to both local and remote when streak advances', async () => {
    mockGetItem.mockResolvedValue(makeLocalRecord(YESTERDAY, 4, 10));
    fetchRemote.mockResolvedValue(null); // remote empty
    renderHook(() => useStreak({ memberId: 'member-1', fetchRemote, upsertRemote }));
    await act(async () => {});
    expect(mockSetItem).toHaveBeenCalledWith(
      '@carolina_futons_streak',
      JSON.stringify({ lastVisit: TODAY, streak: 5, longestStreak: 10 }),
    );
    expect(upsertRemote).toHaveBeenCalledWith('member-1', {
      lastActivityDate: TODAY,
      currentStreak: 5,
      longestStreak: 10,
    });
  });

  // ── Streak reset after missed day ─────────────────────────────────────────

  it('resets streak to 1 when both local and remote confirm missed day', async () => {
    mockGetItem.mockResolvedValue(makeLocalRecord(TWO_DAYS_AGO, 7));
    fetchRemote.mockResolvedValue(makeRemote(TWO_DAYS_AGO, 7, 7));
    const { result } = renderHook(() =>
      useStreak({ memberId: 'member-1', fetchRemote, upsertRemote }),
    );
    await act(async () => {});
    expect(result.current.streak).toBe(1);
  });

  it('syncs reset streak to remote after missed day', async () => {
    mockGetItem.mockResolvedValue(makeLocalRecord(TWO_DAYS_AGO, 7, 15));
    fetchRemote.mockResolvedValue(makeRemote(TWO_DAYS_AGO, 7, 15));
    renderHook(() => useStreak({ memberId: 'member-1', fetchRemote, upsertRemote }));
    await act(async () => {});
    expect(upsertRemote).toHaveBeenCalledWith('member-1', {
      lastActivityDate: TODAY,
      currentStreak: 1,
      longestStreak: 15,
    });
  });

  it('resets streak to 1 even when remote had higher streak but both are stale', async () => {
    mockGetItem.mockResolvedValue(makeLocalRecord(TWO_DAYS_AGO, 3));
    fetchRemote.mockResolvedValue(makeRemote(TWO_DAYS_AGO, 20, 20));
    const { result } = renderHook(() =>
      useStreak({ memberId: 'member-1', fetchRemote, upsertRemote }),
    );
    await act(async () => {});
    expect(result.current.streak).toBe(1);
    expect(result.current.longestStreak).toBe(20); // longest preserved
  });

  // ── Offline graceful fallback ─────────────────────────────────────────────

  it('falls back to local streak when fetchRemote throws (offline)', async () => {
    mockGetItem.mockResolvedValue(makeLocalRecord(YESTERDAY, 5, 5));
    fetchRemote.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() =>
      useStreak({ memberId: 'member-1', fetchRemote, upsertRemote }),
    );
    await act(async () => {});
    expect(result.current.streak).toBe(6);
    expect(result.current.loading).toBe(false);
  });

  it('does not throw when fetchRemote rejects (offline)', async () => {
    mockGetItem.mockResolvedValue(makeLocalRecord(YESTERDAY, 3));
    fetchRemote.mockRejectedValue(new Error('timeout'));
    const { result } = renderHook(() =>
      useStreak({ memberId: 'member-1', fetchRemote, upsertRemote }),
    );
    await act(async () => {});
    // No crash — hook resolves normally
    expect(result.current.loading).toBe(false);
    expect(result.current.streak).toBeGreaterThan(0);
  });

  it('falls back to streak=1 when both local and remote fail', async () => {
    mockGetItem.mockRejectedValue(new Error('Storage error'));
    fetchRemote.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() =>
      useStreak({ memberId: 'member-1', fetchRemote, upsertRemote }),
    );
    await act(async () => {});
    expect(result.current.streak).toBe(1);
    expect(result.current.loading).toBe(false);
  });

  it('does not crash when upsertRemote throws', async () => {
    mockGetItem.mockResolvedValue(makeLocalRecord(YESTERDAY, 2));
    fetchRemote.mockResolvedValue(null);
    upsertRemote.mockRejectedValue(new Error('Wix write failed'));
    const { result } = renderHook(() =>
      useStreak({ memberId: 'member-1', fetchRemote, upsertRemote }),
    );
    await act(async () => {});
    // Should not crash; streak still updates locally
    expect(result.current.streak).toBe(3);
    expect(result.current.loading).toBe(false);
  });

  it('does not call upsertRemote when streak is unchanged (already visited today)', async () => {
    mockGetItem.mockResolvedValue(makeLocalRecord(TODAY, 5));
    fetchRemote.mockResolvedValue(makeRemote(TODAY, 5));
    renderHook(() => useStreak({ memberId: 'member-1', fetchRemote, upsertRemote }));
    await act(async () => {});
    expect(upsertRemote).not.toHaveBeenCalled();
  });

  // ── Reconciliation: same day, mismatched streak counts ───────────────────

  it('uses higher streak when both local and remote have same date but different counts', async () => {
    // Edge case: both say today but counts differ (e.g. race on two devices)
    mockGetItem.mockResolvedValue(makeLocalRecord(TODAY, 5, 5));
    fetchRemote.mockResolvedValue(makeRemote(TODAY, 7, 8));
    const { result } = renderHook(() =>
      useStreak({ memberId: 'member-1', fetchRemote, upsertRemote }),
    );
    await act(async () => {});
    // Both today → already counted; use max streak
    expect(result.current.streak).toBe(7);
    expect(result.current.longestStreak).toBe(8);
  });
});
