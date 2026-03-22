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
      JSON.stringify({ lastVisit: TODAY, streak: 3 }),
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
});
