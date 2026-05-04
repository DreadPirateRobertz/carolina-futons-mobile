/**
 * Tests for useTriggerMoments — Phase 5 + Phase 4 (hq-myhj5)
 * Verifies tier-change detection, AsyncStorage persistence, dismiss,
 * and challenge-completion toast queue.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useTriggerMoments,
  type ChallengeCompletedItem,
  type ServerTriggers,
} from '../useTriggerMoments';
import { LOYALTY_TIERS } from '@/data/loyaltyTiers';
import type { LoyaltyTierConfig } from '@/data/loyaltyTiers';

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

function loyaltyOf(tier: LoyaltyTierConfig, loading = false) {
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

// Shorthand aliases
const TRAIL_BLAZER = LOYALTY_TIERS[0]; // 0 pts
const MOUNTAIN_GUIDE = LOYALTY_TIERS[1]; // 500 pts
const SUMMIT_MASTER = LOYALTY_TIERS[2]; // 1500 pts

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
      mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER, true));
      const { result } = renderHook(() => useTriggerMoments());
      expect(result.current.triggers.tierChanged).toBeNull();
    });

    it('returns null tierChanged on first load with no stored tier (baseline)', async () => {
      getItem.mockResolvedValue(null); // no stored tier
      mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(getItem).toHaveBeenCalled());
      expect(result.current.triggers.tierChanged).toBeNull();
    });

    it('returns null tierChanged when tier matches stored tier', async () => {
      getItem.mockResolvedValue('Mountain Guide');
      mockUseLoyalty.mockReturnValue(loyaltyOf(MOUNTAIN_GUIDE));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(getItem).toHaveBeenCalled());
      expect(result.current.triggers.tierChanged).toBeNull();
    });
  });

  describe('tier-up detection', () => {
    it('returns new tier when tier increases from stored Trail Blazer to Mountain Guide', async () => {
      getItem.mockResolvedValue('Trail Blazer');
      mockUseLoyalty.mockReturnValue(loyaltyOf(MOUNTAIN_GUIDE));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(result.current.triggers.tierChanged).toBe(MOUNTAIN_GUIDE));
    });

    it('returns new tier when tier increases from stored Mountain Guide to Summit Master', async () => {
      getItem.mockResolvedValue('Mountain Guide');
      mockUseLoyalty.mockReturnValue(loyaltyOf(SUMMIT_MASTER));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(result.current.triggers.tierChanged).toBe(SUMMIT_MASTER));
    });

    it('does NOT trigger when tier decreases (demotion is not celebrated)', async () => {
      getItem.mockResolvedValue('Summit Master');
      mockUseLoyalty.mockReturnValue(loyaltyOf(MOUNTAIN_GUIDE));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(getItem).toHaveBeenCalled());
      expect(result.current.triggers.tierChanged).toBeNull();
    });

    it('does NOT trigger on first-ever load with no stored tier', async () => {
      getItem.mockResolvedValue(null);
      mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() =>
        expect(setItem).toHaveBeenCalledWith('@cf_last_known_tier', 'Trail Blazer'),
      );
      expect(result.current.triggers.tierChanged).toBeNull();
    });
  });

  describe('dismiss', () => {
    it('dismiss("tierChanged") resets tierChanged to null', async () => {
      getItem.mockResolvedValue('Trail Blazer');
      mockUseLoyalty.mockReturnValue(loyaltyOf(MOUNTAIN_GUIDE));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(result.current.triggers.tierChanged).toBe(MOUNTAIN_GUIDE));

      await act(async () => {
        result.current.dismiss('tierChanged');
      });
      expect(result.current.triggers.tierChanged).toBeNull();
    });

    it('dismiss("tierChanged") writes new tier name to storage', async () => {
      getItem.mockResolvedValue('Trail Blazer');
      mockUseLoyalty.mockReturnValue(loyaltyOf(MOUNTAIN_GUIDE));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(result.current.triggers.tierChanged).toBe(MOUNTAIN_GUIDE));

      await act(async () => {
        result.current.dismiss('tierChanged');
      });
      // setItem should be called with the new tier name
      await waitFor(() =>
        expect(setItem).toHaveBeenCalledWith('@cf_last_known_tier', 'Mountain Guide'),
      );
    });

    it('dismissing a null trigger is a no-op', async () => {
      getItem.mockResolvedValue(null);
      mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(getItem).toHaveBeenCalled());

      await act(async () => {
        result.current.dismiss('tierChanged');
      });
      expect(result.current.triggers.tierChanged).toBeNull();
    });
  });

  describe('streakDanger', () => {
    it('returns false while streak is loading', () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
      mockUseStreak.mockReturnValue(streakOf(5, true)); // loading=true
      const { result } = renderHook(() => useTriggerMoments());
      expect(result.current.triggers.streakDanger).toBe(false);
    });

    it('returns false when streak is 1 (below threshold)', async () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
      mockUseStreak.mockReturnValue(streakOf(1));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(getItem).toHaveBeenCalled());
      expect(result.current.triggers.streakDanger).toBe(false);
    });

    it('returns false when streak is 0', async () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
      mockUseStreak.mockReturnValue(streakOf(0));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(getItem).toHaveBeenCalled());
      expect(result.current.triggers.streakDanger).toBe(false);
    });

    it('returns true when streak is 2', async () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
      mockUseStreak.mockReturnValue(streakOf(2));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(result.current.triggers.streakDanger).toBe(true));
    });

    it('returns true when streak is 10', async () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
      mockUseStreak.mockReturnValue(streakOf(10));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(result.current.triggers.streakDanger).toBe(true));
    });

    it('dismiss("streakDanger") sets streakDanger to false', async () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
      mockUseStreak.mockReturnValue(streakOf(5));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(result.current.triggers.streakDanger).toBe(true));

      await act(async () => {
        result.current.dismiss('streakDanger');
      });
      expect(result.current.triggers.streakDanger).toBe(false);
    });

    it('dismiss("streakDanger") does NOT write to AsyncStorage', async () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
      mockUseStreak.mockReturnValue(streakOf(5));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(result.current.triggers.streakDanger).toBe(true));

      await act(async () => {
        result.current.dismiss('streakDanger');
      });
      // setItem is only ever called for tier persistence, not streakDanger
      expect(setItem).not.toHaveBeenCalledWith(
        expect.stringContaining('streak_danger'),
        expect.anything(),
      );
    });

    it('dismissing when streakDanger is already false is a no-op', async () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
      mockUseStreak.mockReturnValue(streakOf(1)); // below threshold
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(getItem).toHaveBeenCalled());

      await act(async () => {
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
      mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(getItem).toHaveBeenCalled());
      expect(result.current.triggers.challengeCompleted).toBeNull();
    });

    it('surfaces first challenge after reportChallengesCompleted([item])', async () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
      const { result } = renderHook(() => useTriggerMoments());

      await act(async () => {
        result.current.reportChallengesCompleted([challenge1]);
      });

      expect(result.current.triggers.challengeCompleted).toEqual(challenge1);
    });

    it('surfaces first challenge when multiple are reported', async () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
      const { result } = renderHook(() => useTriggerMoments());

      await act(async () => {
        result.current.reportChallengesCompleted([challenge1, challenge2]);
      });

      expect(result.current.triggers.challengeCompleted).toEqual(challenge1);
    });

    it('dismiss("challengeCompleted") advances to the next queued challenge', async () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
      const { result } = renderHook(() => useTriggerMoments());

      await act(async () => {
        result.current.reportChallengesCompleted([challenge1, challenge2]);
      });
      expect(result.current.triggers.challengeCompleted).toEqual(challenge1);

      await act(async () => {
        result.current.dismiss('challengeCompleted');
      });
      expect(result.current.triggers.challengeCompleted).toEqual(challenge2);
    });

    it('dismiss("challengeCompleted") returns null when last item is dismissed', async () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
      const { result } = renderHook(() => useTriggerMoments());

      await act(async () => {
        result.current.reportChallengesCompleted([challenge1]);
      });

      await act(async () => {
        result.current.dismiss('challengeCompleted');
      });
      expect(result.current.triggers.challengeCompleted).toBeNull();
    });

    it('dismiss("challengeCompleted") with empty queue is a no-op', async () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
      const { result } = renderHook(() => useTriggerMoments());

      await act(async () => {
        result.current.dismiss('challengeCompleted');
      });
      expect(result.current.triggers.challengeCompleted).toBeNull();
    });

    it('reportChallengesCompleted([]) is a no-op', async () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
      const { result } = renderHook(() => useTriggerMoments());

      await act(async () => {
        result.current.reportChallengesCompleted([]);
      });
      expect(result.current.triggers.challengeCompleted).toBeNull();
    });

    it('successive reportChallengesCompleted calls append to the queue', async () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
      const { result } = renderHook(() => useTriggerMoments());

      await act(async () => {
        result.current.reportChallengesCompleted([challenge1]);
      });
      await act(async () => {
        result.current.reportChallengesCompleted([challenge2]);
      });

      // First challenge is still showing
      expect(result.current.triggers.challengeCompleted).toEqual(challenge1);

      await act(async () => {
        result.current.dismiss('challengeCompleted');
      });
      // Second challenge is now showing
      expect(result.current.triggers.challengeCompleted).toEqual(challenge2);
    });

    it('does not affect tierChanged when challenges are queued', async () => {
      getItem.mockResolvedValue('Trail Blazer');
      mockUseLoyalty.mockReturnValue(loyaltyOf(MOUNTAIN_GUIDE));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(result.current.triggers.tierChanged).toBe(MOUNTAIN_GUIDE));

      await act(async () => {
        result.current.reportChallengesCompleted([challenge1]);
      });

      expect(result.current.triggers.tierChanged).toBe(MOUNTAIN_GUIDE);
      expect(result.current.triggers.challengeCompleted).toEqual(challenge1);
    });
  });

  describe('storage error handling', () => {
    it('handles AsyncStorage.getItem failure gracefully (no throw)', async () => {
      getItem.mockRejectedValueOnce(new Error('storage failure'));
      mockUseLoyalty.mockReturnValue(loyaltyOf(MOUNTAIN_GUIDE));
      const { result } = renderHook(() => useTriggerMoments());
      // Should settle without throwing — tierChanged stays null
      await waitFor(() => expect(getItem).toHaveBeenCalled());
      expect(result.current.triggers.tierChanged).toBeNull();
    });

    it('handles AsyncStorage.setItem failure gracefully on dismiss', async () => {
      getItem.mockResolvedValue('Trail Blazer');
      setItem.mockRejectedValueOnce(new Error('write failure'));
      mockUseLoyalty.mockReturnValue(loyaltyOf(MOUNTAIN_GUIDE));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(result.current.triggers.tierChanged).toBe(MOUNTAIN_GUIDE));

      // dismiss should still reset state even if storage write fails
      await act(async () => {
        result.current.dismiss('tierChanged');
      });
      expect(result.current.triggers.tierChanged).toBeNull();
    });
  });

  describe('Phase 5 server triggers — reportTriggers (hq-rowwt)', () => {
    const badgeTrigger: ServerTriggers = {
      tierChanged: false,
      newTier: null,
      milestoneUnlocked: false,
      badgeUnlocked: 'streak_chip',
      challengeCompleted: [],
      streakDanger: false,
    };

    const milestoneTrigger: ServerTriggers = {
      tierChanged: false,
      newTier: null,
      milestoneUnlocked: true,
      badgeUnlocked: null,
      challengeCompleted: [],
      streakDanger: false,
    };

    const emptyTrigger: ServerTriggers = {
      tierChanged: false,
      newTier: null,
      milestoneUnlocked: false,
      badgeUnlocked: null,
      challengeCompleted: [],
      streakDanger: false,
    };

    describe('badgeUnlocked', () => {
      it('returns null badgeUnlocked in initial state', async () => {
        mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
        const { result } = renderHook(() => useTriggerMoments());
        await waitFor(() => expect(getItem).toHaveBeenCalled());
        expect(result.current.triggers.badgeUnlocked).toBeNull();
      });

      it('sets badgeUnlocked after reportTriggers with a badge key', async () => {
        mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
        const { result } = renderHook(() => useTriggerMoments());

        await act(async () => {
          result.current.reportTriggers(badgeTrigger);
        });

        expect(result.current.triggers.badgeUnlocked).toBe('streak_chip');
      });

      it('dismiss("badgeUnlocked") resets badgeUnlocked to null', async () => {
        mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
        const { result } = renderHook(() => useTriggerMoments());

        await act(async () => {
          result.current.reportTriggers(badgeTrigger);
        });
        expect(result.current.triggers.badgeUnlocked).toBe('streak_chip');

        await act(async () => {
          result.current.dismiss('badgeUnlocked');
        });
        expect(result.current.triggers.badgeUnlocked).toBeNull();
      });

      it('does not set badgeUnlocked when badgeUnlocked is null in server triggers', async () => {
        mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
        const { result } = renderHook(() => useTriggerMoments());

        await act(async () => {
          result.current.reportTriggers(emptyTrigger);
        });

        expect(result.current.triggers.badgeUnlocked).toBeNull();
      });

      it('overwrites previous badgeUnlocked when a new badge is reported', async () => {
        mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
        const { result } = renderHook(() => useTriggerMoments());

        await act(async () => {
          result.current.reportTriggers({ ...badgeTrigger, badgeUnlocked: 'week_wanderer' });
        });
        await act(async () => {
          result.current.reportTriggers({ ...badgeTrigger, badgeUnlocked: 'trail_regular' });
        });

        expect(result.current.triggers.badgeUnlocked).toBe('trail_regular');
      });
    });

    describe('milestoneUnlocked', () => {
      it('returns false milestoneUnlocked in initial state', async () => {
        mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
        const { result } = renderHook(() => useTriggerMoments());
        await waitFor(() => expect(getItem).toHaveBeenCalled());
        expect(result.current.triggers.milestoneUnlocked).toBe(false);
      });

      it('sets milestoneUnlocked to true after reportTriggers', async () => {
        mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
        const { result } = renderHook(() => useTriggerMoments());

        await act(async () => {
          result.current.reportTriggers(milestoneTrigger);
        });

        expect(result.current.triggers.milestoneUnlocked).toBe(true);
      });

      it('dismiss("milestoneUnlocked") resets milestoneUnlocked to false', async () => {
        mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
        const { result } = renderHook(() => useTriggerMoments());

        await act(async () => {
          result.current.reportTriggers(milestoneTrigger);
        });
        expect(result.current.triggers.milestoneUnlocked).toBe(true);

        await act(async () => {
          result.current.dismiss('milestoneUnlocked');
        });
        expect(result.current.triggers.milestoneUnlocked).toBe(false);
      });

      it('does not set milestoneUnlocked when false in server triggers', async () => {
        mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
        const { result } = renderHook(() => useTriggerMoments());

        await act(async () => {
          result.current.reportTriggers(emptyTrigger);
        });

        expect(result.current.triggers.milestoneUnlocked).toBe(false);
      });
    });

    describe('challengeCompleted via reportTriggers', () => {
      it('enqueues challenges from server triggers', async () => {
        mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
        const { result } = renderHook(() => useTriggerMoments());

        await act(async () => {
          result.current.reportTriggers({
            ...emptyTrigger,
            challengeCompleted: [{ challengeId: 'c1', title: 'Challenge One', rewardPoints: 100 }],
          });
        });

        expect(result.current.triggers.challengeCompleted).toEqual({
          challengeId: 'c1',
          title: 'Challenge One',
          rewardPoints: 100,
        });
      });

      it('does not enqueue when challengeCompleted is empty in server triggers', async () => {
        mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
        const { result } = renderHook(() => useTriggerMoments());

        await act(async () => {
          result.current.reportTriggers(emptyTrigger);
        });

        expect(result.current.triggers.challengeCompleted).toBeNull();
      });
    });

    describe('compound server triggers', () => {
      it('fires badge and milestone simultaneously', async () => {
        mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
        const { result } = renderHook(() => useTriggerMoments());

        await act(async () => {
          result.current.reportTriggers({
            ...emptyTrigger,
            badgeUnlocked: 'curator',
            milestoneUnlocked: true,
          });
        });

        expect(result.current.triggers.badgeUnlocked).toBe('curator');
        expect(result.current.triggers.milestoneUnlocked).toBe(true);
      });

      it('reportTriggers does not stomp existing tierChanged state', async () => {
        getItem.mockResolvedValue('Trail Blazer');
        mockUseLoyalty.mockReturnValue(loyaltyOf(MOUNTAIN_GUIDE));
        const { result } = renderHook(() => useTriggerMoments());
        await waitFor(() => expect(result.current.triggers.tierChanged).toBe(MOUNTAIN_GUIDE));

        await act(async () => {
          result.current.reportTriggers(badgeTrigger);
        });

        expect(result.current.triggers.tierChanged).toBe(MOUNTAIN_GUIDE);
        expect(result.current.triggers.badgeUnlocked).toBe('streak_chip');
      });
    });
  });

  describe('reportTierChanged (hq-1e63 push-driven tier upgrade)', () => {
    it('sets tierChanged to the matching LoyaltyTierConfig', async () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
      const { result } = renderHook(() => useTriggerMoments());

      await act(async () => {
        result.current.reportTierChanged('Mountain Guide');
      });

      expect(result.current.triggers.tierChanged).toBe(MOUNTAIN_GUIDE);
    });

    it('persists the new tier name to AsyncStorage', async () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
      const { result } = renderHook(() => useTriggerMoments());

      await act(async () => {
        result.current.reportTierChanged('Summit Master');
      });

      expect(setItem).toHaveBeenCalledWith('@cf_last_known_tier', 'Summit Master');
    });

    it('is a no-op for an unrecognised tier name', async () => {
      getItem.mockResolvedValue('Trail Blazer'); // skip baseline setItem call
      mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
      const { result } = renderHook(() => useTriggerMoments());
      await waitFor(() => expect(getItem).toHaveBeenCalled());

      await act(async () => {
        result.current.reportTierChanged('Diamond Elite');
      });

      expect(result.current.triggers.tierChanged).toBeNull();
      expect(setItem).not.toHaveBeenCalled();
    });

    it('dismiss("tierChanged") clears the push-set tier', async () => {
      mockUseLoyalty.mockReturnValue(loyaltyOf(TRAIL_BLAZER));
      const { result } = renderHook(() => useTriggerMoments());

      await act(async () => {
        result.current.reportTierChanged('Mountain Guide');
      });
      expect(result.current.triggers.tierChanged).toBe(MOUNTAIN_GUIDE);

      await act(async () => {
        result.current.dismiss('tierChanged');
      });
      expect(result.current.triggers.tierChanged).toBeNull();
    });
  });
});
