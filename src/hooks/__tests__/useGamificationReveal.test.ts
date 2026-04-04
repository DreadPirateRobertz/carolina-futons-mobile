/**
 * Tests for useGamificationReveal hook — deacon-gia coverage gap-fill
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGamificationReveal, WELCOME_POINTS, CHALLENGE_TEASERS } from '../useGamificationReveal';
import { TIER_NAMES, TIER_THRESHOLDS } from '../../public/gamificationTokens.js';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockSetItem.mockResolvedValue(undefined);
});

describe('WELCOME_POINTS', () => {
  it('is 150', () => {
    expect(WELCOME_POINTS).toBe(150);
  });
});

describe('CHALLENGE_TEASERS', () => {
  it('has two teasers', () => {
    expect(CHALLENGE_TEASERS).toHaveLength(2);
  });

  it('first teaser is first purchase', () => {
    expect(CHALLENGE_TEASERS[0].title).toBe('Make your first purchase');
    expect(CHALLENGE_TEASERS[0].pointsLabel).toBe('+200 pts');
  });

  it('second teaser is style profile', () => {
    expect(CHALLENGE_TEASERS[1].title).toBe('Complete your style profile');
    expect(CHALLENGE_TEASERS[1].pointsLabel).toBe('+50 pts');
  });
});

describe('useGamificationReveal', () => {
  describe('initial loading state', () => {
    it('starts with isLoading=true and hasSeenReveal=false', () => {
      mockGetItem.mockImplementation(() => new Promise(() => {})); // never resolves
      const { result } = renderHook(() => useGamificationReveal());
      expect(result.current.isLoading).toBe(true);
      expect(result.current.hasSeenReveal).toBe(false);
    });
  });

  describe('AsyncStorage load — success paths', () => {
    it('sets hasSeenReveal=true when storage returns "true"', async () => {
      mockGetItem.mockResolvedValue('true');
      const { result } = renderHook(() => useGamificationReveal());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.hasSeenReveal).toBe(true);
    });

    it('sets hasSeenReveal=false when storage returns null', async () => {
      mockGetItem.mockResolvedValue(null);
      const { result } = renderHook(() => useGamificationReveal());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.hasSeenReveal).toBe(false);
    });

    it('sets hasSeenReveal=false when storage returns some other string', async () => {
      mockGetItem.mockResolvedValue('false');
      const { result } = renderHook(() => useGamificationReveal());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.hasSeenReveal).toBe(false);
    });

    it('sets isLoading=false after storage resolves', async () => {
      mockGetItem.mockResolvedValue(null);
      const { result } = renderHook(() => useGamificationReveal());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });
  });

  describe('AsyncStorage load — error path', () => {
    it('sets hasSeenReveal=false and isLoading=false when storage throws', async () => {
      mockGetItem.mockRejectedValue(new Error('Storage read failure'));
      const { result } = renderHook(() => useGamificationReveal());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.hasSeenReveal).toBe(false);
    });
  });

  describe('tierData (buildTierData with WELCOME_POINTS=150)', () => {
    beforeEach(() => {
      mockGetItem.mockResolvedValue(null);
    });

    it('returns tierData for Trail Blazer (150 pts)', async () => {
      const { result } = renderHook(() => useGamificationReveal());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.tierData.tierName).toBe(TIER_NAMES[0]); // Trail Blazer
      expect(result.current.tierData.points).toBe(150);
    });

    it('tierData has nextTierName of Mountain Guide', async () => {
      const { result } = renderHook(() => useGamificationReveal());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.tierData.nextTierName).toBe(TIER_NAMES[1]); // Mountain Guide
    });

    it('tierData pointsToNextTier is 350 (500 - 150)', async () => {
      const { result } = renderHook(() => useGamificationReveal());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.tierData.pointsToNextTier).toBe(
        TIER_THRESHOLDS[1] - WELCOME_POINTS, // 500 - 150 = 350
      );
    });

    it('tierData progressFraction is between 0 and 1', async () => {
      const { result } = renderHook(() => useGamificationReveal());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.tierData.progressFraction).toBeGreaterThan(0);
      expect(result.current.tierData.progressFraction).toBeLessThanOrEqual(1);
    });

    it('tierData progressFraction is 0.3 (150/500)', async () => {
      const { result } = renderHook(() => useGamificationReveal());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.tierData.progressFraction).toBeCloseTo(0.3, 5);
    });
  });

  describe('challengeTeasers', () => {
    it('returns the two static challenge teasers', async () => {
      mockGetItem.mockResolvedValue(null);
      const { result } = renderHook(() => useGamificationReveal());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.challengeTeasers).toBe(CHALLENGE_TEASERS);
    });
  });

  describe('markRevealShown', () => {
    it('calls AsyncStorage.setItem with "true"', async () => {
      mockGetItem.mockResolvedValue(null);
      const { result } = renderHook(() => useGamificationReveal());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.markRevealShown();
      });

      expect(mockSetItem).toHaveBeenCalledWith('@cf_gamification_reveal_shown', 'true');
    });

    it('sets hasSeenReveal=true after marking shown', async () => {
      mockGetItem.mockResolvedValue(null);
      const { result } = renderHook(() => useGamificationReveal());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.hasSeenReveal).toBe(false);

      await act(async () => {
        await result.current.markRevealShown();
      });

      expect(result.current.hasSeenReveal).toBe(true);
    });

    it('sets hasSeenReveal=true even when AsyncStorage.setItem throws (best-effort)', async () => {
      mockGetItem.mockResolvedValue(null);
      mockSetItem.mockRejectedValueOnce(new Error('Storage write failure'));
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useGamificationReveal());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.markRevealShown();
      });

      // Best-effort: even if storage write fails, in-memory state updates
      expect(result.current.hasSeenReveal).toBe(true);
      jest.restoreAllMocks();
    });

    it('is stable across re-renders (useCallback)', async () => {
      mockGetItem.mockResolvedValue(null);
      const { result, rerender } = renderHook(() => useGamificationReveal());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      const fn1 = result.current.markRevealShown;
      rerender({});
      expect(result.current.markRevealShown).toBe(fn1);
    });
  });
});
