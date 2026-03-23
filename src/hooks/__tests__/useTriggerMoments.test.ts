/**
 * Tests for useTriggerMoments — Phase 5 + Phase 4 (hq-myhj5)
 * Verifies tier-change detection, AsyncStorage persistence, dismiss,
 * and challenge-completion toast queue.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTriggerMoments, type ChallengeCompletedItem } from '../useTriggerMoments';

// Mock useLoyalty so we can control the returned tier
const mockUseLoyalty = jest.fn();
jest.mock('@/hooks/useLoyalty', () => ({
  useLoyalty: () => mockUseLoyalty(),
}));

// Mock useStreak so we can control the returned streak
const mockUseStreak = jest.fn();
jest.mock('@/hooks/useStreak', () => ({
  useStreak: () => mockUseStreak(),
}));

function streakOf(streak: number, loading = false) {
  return { streak, loading };
}

function loyaltyOf(tier: string, loading = false) {
  return {
    tier,
    loading,
    points: 0,
    nextTier: null,
    pointsToNext: 0,
    progress: 0,
    error: null,
    refreshPoints: jest.fn(),
  };
}

const getItem = AsyncStorage.getItem as jest.Mock;
const setItem = AsyncStorage.setItem as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  getItem.mockResolvedValue(null);
  setItem.mockResolvedValue(undefined);
  // Default: streak=1 (below danger threshold), not loading
  mockUseStreak.mockReturnValue(streakOf(1));
});

describe('useTriggerMoments', () => {
  describe('initial state', () => {
    it('returns null tierChanged while loyalty is loading', () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf('bronze', true));
      const { result } = renderHook(() => useTriggerMoments());
      expect(result.current.triggers.tierChanged).toBeNull();
    });

    it('returns null tierChanged on first load with no stored tier (bronze baseline)', async () => {
      getItem.mockResolvedValue(null); // no stored tier
      mockUseLoyalty.mockReturnValue(loyaltyOf('bronze'));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(getItem).toHaveBeenCalled());
      expect(result.current.triggers.tierChanged).toBeNull();
    });

    it('returns null tierChanged when tier matches stored tier', async () => {
      getItem.mockResolvedValue('silver');
      mockUseLoyalty.mockReturnValue(loyaltyOf('silver'));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(getItem).toHaveBeenCalled());
      expect(result.current.triggers.tierChanged).toBeNull();
    });
  });

  describe('tier-up detection', () => {
    it('returns new tier when tier increases from stored bronze to silver', async () => {
      getItem.mockResolvedValue('bronze');
      mockUseLoyalty.mockReturnValue(loyaltyOf('silver'));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(result.current.triggers.tierChanged).toBe('silver'));
    });

    it('returns new tier when tier increases from stored silver to gold', async () => {
      getItem.mockResolvedValue('silver');
      mockUseLoyalty.mockReturnValue(loyaltyOf('gold'));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(result.current.triggers.tierChanged).toBe('gold'));
    });

    it('does NOT trigger when tier decreases (demotion is not celebrated)', async () => {
      getItem.mockResolvedValue('gold');
      mockUseLoyalty.mockReturnValue(loyaltyOf('silver'));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(getItem).toHaveBeenCalled());
      expect(result.current.triggers.tierChanged).toBeNull();
    });

    it('does NOT trigger on first-ever load with no stored tier', async () => {
      getItem.mockResolvedValue(null);
      mockUseLoyalty.mockReturnValue(loyaltyOf('bronze'));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(setItem).toHaveBeenCalledWith('@cf_last_known_tier', 'bronze'));
      expect(result.current.triggers.tierChanged).toBeNull();
    });
  });

  describe('dismiss', () => {
    it('dismiss("tierChanged") resets tierChanged to null', async () => {
      getItem.mockResolvedValue('bronze');
      mockUseLoyalty.mockReturnValue(loyaltyOf('silver'));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(result.current.triggers.tierChanged).toBe('silver'));

      act(() => {
        result.current.dismiss('tierChanged');
      });
      expect(result.current.triggers.tierChanged).toBeNull();
    });

    it('dismiss("tierChanged") writes new tier to storage', async () => {
      getItem.mockResolvedValue('bronze');
      mockUseLoyalty.mockReturnValue(loyaltyOf('silver'));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(result.current.triggers.tierChanged).toBe('silver'));

      act(() => {
        result.current.dismiss('tierChanged');
      });
      // setItem should be called with the new tier
      await waitFor(() => expect(setItem).toHaveBeenCalledWith('@cf_last_known_tier', 'silver'));
    });

    it('dismissing a null trigger is a no-op', async () => {
      getItem.mockResolvedValue(null);
      mockUseLoyalty.mockReturnValue(loyaltyOf('bronze'));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(getItem).toHaveBeenCalled());

      act(() => {
        result.current.dismiss('tierChanged');
      });
      expect(result.current.triggers.tierChanged).toBeNull();
    });
  });

  describe('streakDanger', () => {
    it('returns false while streak is loading', () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf('bronze'));
      mockUseStreak.mockReturnValue(streakOf(5, true)); // loading=true
      const { result } = renderHook(() => useTriggerMoments());
      expect(result.current.triggers.streakDanger).toBe(false);
    });

    it('returns false when streak is 1 (below threshold)', async () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf('bronze'));
      mockUseStreak.mockReturnValue(streakOf(1));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(getItem).toHaveBeenCalled());
      expect(result.current.triggers.streakDanger).toBe(false);
    });

    it('returns false when streak is 0', async () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf('bronze'));
      mockUseStreak.mockReturnValue(streakOf(0));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(getItem).toHaveBeenCalled());
      expect(result.current.triggers.streakDanger).toBe(false);
    });

    it('returns true when streak is 2', async () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf('bronze'));
      mockUseStreak.mockReturnValue(streakOf(2));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(result.current.triggers.streakDanger).toBe(true));
    });

    it('returns true when streak is 10', async () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf('bronze'));
      mockUseStreak.mockReturnValue(streakOf(10));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(result.current.triggers.streakDanger).toBe(true));
    });

    it('dismiss("streakDanger") sets streakDanger to false', async () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf('bronze'));
      mockUseStreak.mockReturnValue(streakOf(5));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(result.current.triggers.streakDanger).toBe(true));

      act(() => {
        result.current.dismiss('streakDanger');
      });
      expect(result.current.triggers.streakDanger).toBe(false);
    });

    it('dismiss("streakDanger") does NOT write to AsyncStorage', async () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf('bronze'));
      mockUseStreak.mockReturnValue(streakOf(5));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(result.current.triggers.streakDanger).toBe(true));

      act(() => {
        result.current.dismiss('streakDanger');
      });
      // setItem is only ever called for tier persistence, not streakDanger
      expect(setItem).not.toHaveBeenCalledWith(
        expect.stringContaining('streak_danger'),
        expect.anything(),
      );
    });

    it('dismissing when streakDanger is already false is a no-op', async () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf('bronze'));
      mockUseStreak.mockReturnValue(streakOf(1)); // below threshold
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(getItem).toHaveBeenCalled());

      act(() => {
        result.current.dismiss('streakDanger');
      });
      expect(result.current.triggers.streakDanger).toBe(false);
    });
  });

  describe('challengeCompleted queue', () => {
    const challenge1: ChallengeCompletedItem = {
      challengeId: 'spring-refresh',
      title: 'Spring Refresh',
      rewardPoints: 500,
    };
    const challenge2: ChallengeCompletedItem = {
      challengeId: 'flash-weekend',
      title: 'Flash Weekend',
      rewardPoints: 250,
    };

    it('returns null challengeCompleted in initial state', async () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf('bronze'));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(getItem).toHaveBeenCalled());
      expect(result.current.triggers.challengeCompleted).toBeNull();
    });

    it('surfaces first challenge after reportChallengesCompleted([item])', () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf('bronze'));
      const { result } = renderHook(() => useTriggerMoments());

      act(() => {
        result.current.reportChallengesCompleted([challenge1]);
      });

      expect(result.current.triggers.challengeCompleted).toEqual(challenge1);
    });

    it('surfaces first challenge when multiple are reported', () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf('bronze'));
      const { result } = renderHook(() => useTriggerMoments());

      act(() => {
        result.current.reportChallengesCompleted([challenge1, challenge2]);
      });

      expect(result.current.triggers.challengeCompleted).toEqual(challenge1);
    });

    it('dismiss("challengeCompleted") advances to the next queued challenge', () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf('bronze'));
      const { result } = renderHook(() => useTriggerMoments());

      act(() => {
        result.current.reportChallengesCompleted([challenge1, challenge2]);
      });
      expect(result.current.triggers.challengeCompleted).toEqual(challenge1);

      act(() => {
        result.current.dismiss('challengeCompleted');
      });
      expect(result.current.triggers.challengeCompleted).toEqual(challenge2);
    });

    it('dismiss("challengeCompleted") returns null when last item is dismissed', () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf('bronze'));
      const { result } = renderHook(() => useTriggerMoments());

      act(() => {
        result.current.reportChallengesCompleted([challenge1]);
      });

      act(() => {
        result.current.dismiss('challengeCompleted');
      });
      expect(result.current.triggers.challengeCompleted).toBeNull();
    });

    it('dismiss("challengeCompleted") with empty queue is a no-op', () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf('bronze'));
      const { result } = renderHook(() => useTriggerMoments());

      act(() => {
        result.current.dismiss('challengeCompleted');
      });
      expect(result.current.triggers.challengeCompleted).toBeNull();
    });

    it('reportChallengesCompleted([]) is a no-op', () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf('bronze'));
      const { result } = renderHook(() => useTriggerMoments());

      act(() => {
        result.current.reportChallengesCompleted([]);
      });
      expect(result.current.triggers.challengeCompleted).toBeNull();
    });

    it('successive reportChallengesCompleted calls append to the queue', () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf('bronze'));
      const { result } = renderHook(() => useTriggerMoments());

      act(() => {
        result.current.reportChallengesCompleted([challenge1]);
      });
      act(() => {
        result.current.reportChallengesCompleted([challenge2]);
      });

      // First challenge is still showing
      expect(result.current.triggers.challengeCompleted).toEqual(challenge1);

      act(() => {
        result.current.dismiss('challengeCompleted');
      });
      // Second challenge is now showing
      expect(result.current.triggers.challengeCompleted).toEqual(challenge2);
    });

    it('does not affect tierChanged when challenges are queued', async () => {
      getItem.mockResolvedValue('bronze');
      mockUseLoyalty.mockReturnValue(loyaltyOf('silver'));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(result.current.triggers.tierChanged).toBe('silver'));

      act(() => {
        result.current.reportChallengesCompleted([challenge1]);
      });

      expect(result.current.triggers.tierChanged).toBe('silver');
      expect(result.current.triggers.challengeCompleted).toEqual(challenge1);
    });
  });

  describe('storage error handling', () => {
    it('handles AsyncStorage.getItem failure gracefully (no throw)', async () => {
      getItem.mockRejectedValueOnce(new Error('storage failure'));
      mockUseLoyalty.mockReturnValue(loyaltyOf('silver'));
      const { result } = renderHook(() => useTriggerMoments());
      // Should settle without throwing — tierChanged stays null
      await waitFor(() => expect(getItem).toHaveBeenCalled());
      expect(result.current.triggers.tierChanged).toBeNull();
    });

    it('handles AsyncStorage.setItem failure gracefully on dismiss', async () => {
      getItem.mockResolvedValue('bronze');
      setItem.mockRejectedValueOnce(new Error('write failure'));
      mockUseLoyalty.mockReturnValue(loyaltyOf('silver'));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(result.current.triggers.tierChanged).toBe('silver'));

      // dismiss should still reset state even if storage write fails
      act(() => {
        result.current.dismiss('tierChanged');
      });
      expect(result.current.triggers.tierChanged).toBeNull();
    });
  });
});
