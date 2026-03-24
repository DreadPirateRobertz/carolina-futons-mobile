/**
 * @module useChallengeCatalog.test
 *
 * TDD tests for useChallengeCatalog hook.
 * cf-rv9 / Phase 7 gamification
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useChallengeCatalog } from '../useChallengeCatalog';

const mockCallFunction = jest.fn();
let mockWixClient: { callFunction: jest.Mock } | null = { callFunction: mockCallFunction };

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => mockWixClient,
}));

const FUTURE = '2027-01-01T00:00:00Z';
const PAST = '2020-01-01T00:00:00Z';

const MOCK_CHALLENGES = [
  {
    id: 'ch-1',
    title: 'Spring Refresh',
    description: 'Browse 5 new arrivals',
    goal: 5,
    unit: 'products',
    pointReward: 500,
    expiresAt: FUTURE,
    progress: 3,
    completed: false,
  },
  {
    id: 'ch-2',
    title: 'First Purchase',
    description: 'Make your first purchase',
    goal: 1,
    unit: 'purchase',
    pointReward: 200,
    expiresAt: FUTURE,
    progress: 0,
    completed: false,
  },
  {
    id: 'ch-3',
    title: 'Referral Hero',
    description: 'Refer 3 friends',
    goal: 3,
    unit: 'referrals',
    pointReward: 750,
    expiresAt: FUTURE,
    progress: 3,
    completed: true,
  },
  {
    id: 'ch-4',
    title: 'Old Challenge',
    description: 'Already expired',
    goal: 2,
    unit: 'actions',
    pointReward: 100,
    expiresAt: PAST,
    progress: 0,
    completed: false,
  },
];

describe('useChallengeCatalog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWixClient = { callFunction: mockCallFunction };
    mockCallFunction.mockResolvedValue({ challenges: MOCK_CHALLENGES });
  });

  it('returns loading=true initially', () => {
    const { result } = renderHook(() => useChallengeCatalog());
    expect(result.current.loading).toBe(true);
  });

  it('fetches and returns all challenges', async () => {
    const { result } = renderHook(() => useChallengeCatalog());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.challenges).toHaveLength(4);
    expect(result.current.error).toBeNull();
  });

  it('calls correct API endpoint', async () => {
    const { result } = renderHook(() => useChallengeCatalog());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockCallFunction).toHaveBeenCalledWith('/_functions/getChallengeCatalog', 'GET');
  });

  it('groups inProgress: challenges with progress > 0 and not completed', async () => {
    const { result } = renderHook(() => useChallengeCatalog());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.grouped.inProgress).toHaveLength(1);
    expect(result.current.grouped.inProgress[0].id).toBe('ch-1');
  });

  it('groups available: challenges with progress === 0, not completed, not expired', async () => {
    const { result } = renderHook(() => useChallengeCatalog());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.grouped.available).toHaveLength(1);
    expect(result.current.grouped.available[0].id).toBe('ch-2');
  });

  it('groups completed: challenges with completed === true', async () => {
    const { result } = renderHook(() => useChallengeCatalog());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.grouped.completed).toHaveLength(1);
    expect(result.current.grouped.completed[0].id).toBe('ch-3');
  });

  it('groups expired: not completed and expiresAt in the past', async () => {
    const { result } = renderHook(() => useChallengeCatalog());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.grouped.expired).toHaveLength(1);
    expect(result.current.grouped.expired[0].id).toBe('ch-4');
  });

  it('computes progressRatio correctly (progress / goal)', async () => {
    const { result } = renderHook(() => useChallengeCatalog());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const ch1 = result.current.challenges.find((c) => c.id === 'ch-1')!;
    expect(ch1.progressRatio).toBeCloseTo(0.6); // 3/5
  });

  it('clamps progressRatio to 1 when progress exceeds goal', async () => {
    mockCallFunction.mockResolvedValue({
      challenges: [{ ...MOCK_CHALLENGES[0], progress: 10, goal: 5 }],
    });
    const { result } = renderHook(() => useChallengeCatalog());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.challenges[0].progressRatio).toBe(1);
  });

  it('sets error when API fails', async () => {
    mockCallFunction.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useChallengeCatalog());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.challenges).toEqual([]);
  });

  it('falls back to empty challenges when wix client is null', async () => {
    mockWixClient = null;
    const { result } = renderHook(() => useChallengeCatalog());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.challenges).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('handles malformed response (challenges: null) gracefully', async () => {
    mockCallFunction.mockResolvedValue({ challenges: null });
    const { result } = renderHook(() => useChallengeCatalog());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.challenges).toEqual([]);
  });

  it('exposes refresh to re-trigger fetch', async () => {
    const { result } = renderHook(() => useChallengeCatalog());
    await waitFor(() => expect(result.current.loading).toBe(false));

    result.current.refresh();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockCallFunction).toHaveBeenCalledTimes(2);
  });

  describe('edge cases — cm-dfk', () => {
    it('expired challenge with progress > 0 goes to expired group, not inProgress', async () => {
      mockCallFunction.mockResolvedValue({
        challenges: [
          {
            id: 'ch-exp-prog',
            title: 'Expired with progress',
            description: 'Should not appear in inProgress',
            goal: 5,
            unit: 'actions',
            pointReward: 100,
            expiresAt: PAST,
            progress: 3,
            completed: false,
          },
        ],
      });
      const { result } = renderHook(() => useChallengeCatalog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.grouped.expired).toHaveLength(1);
      expect(result.current.grouped.expired[0].id).toBe('ch-exp-prog');
      expect(result.current.grouped.inProgress).toHaveLength(0);
    });

    it('expired completed challenge goes to completed group, not expired', async () => {
      mockCallFunction.mockResolvedValue({
        challenges: [
          {
            id: 'ch-exp-done',
            title: 'Expired and completed',
            description: 'completed takes precedence over expired',
            goal: 1,
            unit: 'actions',
            pointReward: 50,
            expiresAt: PAST,
            progress: 1,
            completed: true,
          },
        ],
      });
      const { result } = renderHook(() => useChallengeCatalog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.grouped.completed).toHaveLength(1);
      expect(result.current.grouped.expired).toHaveLength(0);
    });

    it('deduplicates challenges with the same id, keeping the first occurrence', async () => {
      mockCallFunction.mockResolvedValue({
        challenges: [
          {
            id: 'ch-dup',
            title: 'First',
            description: '',
            goal: 1,
            unit: 'x',
            pointReward: 100,
            expiresAt: FUTURE,
            progress: 0,
            completed: false,
          },
          {
            id: 'ch-dup',
            title: 'Second',
            description: '',
            goal: 1,
            unit: 'x',
            pointReward: 200,
            expiresAt: FUTURE,
            progress: 0,
            completed: false,
          },
        ],
      });
      const { result } = renderHook(() => useChallengeCatalog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.challenges).toHaveLength(1);
      expect(result.current.challenges[0].pointReward).toBe(100);
    });

    it('deduplicates three entries with the same id to one', async () => {
      const dupe = {
        id: 'ch-triple',
        title: 'Triple',
        description: '',
        goal: 1,
        unit: 'x',
        pointReward: 50,
        expiresAt: FUTURE,
        progress: 0,
        completed: false,
      };
      mockCallFunction.mockResolvedValue({ challenges: [dupe, dupe, dupe] });
      const { result } = renderHook(() => useChallengeCatalog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.challenges).toHaveLength(1);
    });

    it('treats null pointReward as 0', async () => {
      mockCallFunction.mockResolvedValue({
        challenges: [
          {
            id: 'ch-null-reward',
            title: 'No reward',
            description: '',
            goal: 1,
            unit: 'x',
            pointReward: null,
            expiresAt: FUTURE,
            progress: 0,
            completed: false,
          },
        ],
      });
      const { result } = renderHook(() => useChallengeCatalog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.challenges[0].pointReward).toBe(0);
    });

    it('treats undefined pointReward as 0', async () => {
      mockCallFunction.mockResolvedValue({
        challenges: [
          {
            id: 'ch-undef-reward',
            title: 'Missing reward field',
            description: '',
            goal: 1,
            unit: 'x',
            // pointReward intentionally omitted
            expiresAt: FUTURE,
            progress: 0,
            completed: false,
          },
        ],
      });
      const { result } = renderHook(() => useChallengeCatalog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.challenges[0].pointReward).toBe(0);
    });
  });
});
