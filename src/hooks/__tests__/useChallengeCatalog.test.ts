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
});
