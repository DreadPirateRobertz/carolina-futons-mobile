/**
 * @module useActiveChallenges.test
 *
 * Tests for useActiveChallenges hook — fetches active challenges from
 * getActiveChallenges webMethod and maps to Challenge data type.
 *
 * cm-f3872 / Phase 4
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useActiveChallenges } from '../useActiveChallenges';

// Mock wix provider — returns a client with callFunction
const mockCallFunction = jest.fn();
let mockWixClient: { callFunction: jest.Mock } | null = { callFunction: mockCallFunction };

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => mockWixClient,
}));

const MOCK_API_RESPONSE = {
  challenges: [
    {
      challengeId: 'ch-1',
      title: 'Spring Refresh',
      description: 'Browse 5 new arrivals',
      conditionType: 'browse_category',
      targetCount: 5,
      rewardPoints: 500,
      rewardBadgeId: null,
      expiresAt: '2026-04-01T00:00:00Z',
      progress: { progressValue: 2, completedAt: null },
    },
    {
      challengeId: 'ch-2',
      title: 'Weekend Warrior',
      description: 'Make a purchase this weekend',
      conditionType: 'purchase',
      targetCount: 1,
      rewardPoints: 200,
      rewardBadgeId: 'weekend-hero',
      expiresAt: '2026-03-24T00:00:00Z',
      progress: { progressValue: 0, completedAt: null },
    },
  ],
};

describe('useActiveChallenges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWixClient = { callFunction: mockCallFunction };
    mockCallFunction.mockResolvedValue(MOCK_API_RESPONSE);
  });

  it('returns loading=true initially', () => {
    const { result } = renderHook(() => useActiveChallenges());
    expect(result.current.loading).toBe(true);
  });

  it('fetches challenges and maps to Challenge type', async () => {
    const { result } = renderHook(() => useActiveChallenges());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.challenges).toHaveLength(2);
    expect(result.current.challenges[0]).toEqual(
      expect.objectContaining({
        id: 'ch-1',
        title: 'Spring Refresh',
        description: 'Browse 5 new arrivals',
        reward: '500 pts',
        progress: 0.4, // 2/5
        isActive: true,
      }),
    );
  });

  it('computes progress ratio correctly (progressValue / targetCount)', async () => {
    const { result } = renderHook(() => useActiveChallenges());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.challenges[0].progress).toBe(0.4);
    expect(result.current.challenges[1].progress).toBe(0);
  });

  it('returns empty challenges when API returns empty array', async () => {
    mockCallFunction.mockResolvedValue({ challenges: [] });
    const { result } = renderHook(() => useActiveChallenges());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.challenges).toEqual([]);
  });

  it('sets error when API fails', async () => {
    mockCallFunction.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useActiveChallenges());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.challenges).toEqual([]);
  });

  it('falls back to mock challenges when wix client is null', async () => {
    mockWixClient = null;
    const { result } = renderHook(() => useActiveChallenges());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.challenges.length).toBeGreaterThan(0);
    expect(result.current.error).toBeNull();
  });

  it('sets expiresAt as a unix timestamp', async () => {
    const { result } = renderHook(() => useActiveChallenges());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const expiresAt = result.current.challenges[0].expiresAt;
    expect(typeof expiresAt).toBe('number');
    expect(expiresAt).toBeGreaterThan(0);
  });

  it('clamps progress to 0-1 range', async () => {
    mockCallFunction.mockResolvedValue({
      challenges: [
        {
          ...MOCK_API_RESPONSE.challenges[0],
          progress: { progressValue: 10, completedAt: null },
          targetCount: 5,
        },
      ],
    });
    const { result } = renderHook(() => useActiveChallenges());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.challenges[0].progress).toBeLessThanOrEqual(1);
  });

  it('formats reward with points', async () => {
    const { result } = renderHook(() => useActiveChallenges());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.challenges[1].reward).toBe('200 pts');
  });

  it('handles malformed API response gracefully', async () => {
    mockCallFunction.mockResolvedValue({ challenges: null });
    const { result } = renderHook(() => useActiveChallenges());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.challenges).toEqual([]);
  });

  it('calls API with correct path and method', async () => {
    const { result } = renderHook(() => useActiveChallenges());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockCallFunction).toHaveBeenCalledWith(
      '/_functions/getActiveChallenges',
      'POST',
      {},
    );
  });
});
