/**
 * @module useChallengeProgress.test
 *
 * TDD tests for useChallengeProgress hook.
 * Fetches member-specific challenge progress from MemberChallengeProgress CMS.
 *
 * hq-elfso
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useChallengeProgress } from '../useChallengeProgress';

// ── Mocks ──────────────────────────────────────────────────────────────

const mockQueryData = jest.fn();
const mockWixClient = { queryData: mockQueryData } as unknown;

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: jest.fn(() => mockWixClient),
}));

const mockUseAuth = jest.fn((): { user: { id: string } | null } => ({ user: { id: 'member-1' } }));
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

const { useOptionalWixClient } = require('@/services/wix');

// ── Fixtures ────────────────────────────────────────────────────────────

const PROGRESS_ITEMS = [
  {
    challengeId: 'ch-spring',
    memberId: 'member-1',
    progressValue: 3,
    goalValue: 5,
    pointsEarned: 0,
    completedAt: null,
    lastUpdated: '2026-03-20T12:00:00Z',
  },
  {
    challengeId: 'ch-streak',
    memberId: 'member-1',
    progressValue: 7,
    goalValue: 7,
    pointsEarned: 100,
    completedAt: '2026-03-19T08:00:00Z',
    lastUpdated: '2026-03-19T08:00:00Z',
  },
  {
    challengeId: 'ch-flash',
    memberId: 'member-1',
    progressValue: 1,
    goalValue: 3,
    pointsEarned: 0,
    completedAt: null,
    lastUpdated: '2026-03-18T10:00:00Z',
  },
];

// ── Tests ───────────────────────────────────────────────────────────────

describe('useChallengeProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useOptionalWixClient as jest.Mock).mockReturnValue(mockWixClient);
    mockUseAuth.mockReturnValue({ user: { id: 'member-1' } });
    mockQueryData.mockResolvedValue({ items: PROGRESS_ITEMS, totalResults: 3 });
  });

  it('fetches progress from MemberChallengeProgress CMS collection', async () => {
    renderHook(() => useChallengeProgress());

    await waitFor(() => {
      expect(mockQueryData).toHaveBeenCalledWith(
        'MemberChallengeProgress',
        expect.objectContaining({
          filter: expect.objectContaining({ memberId: 'member-1' }),
        }),
      );
    });
  });

  it('returns loading=true initially', () => {
    mockQueryData.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useChallengeProgress());
    expect(result.current.loading).toBe(true);
  });

  it('returns progress items after fetch', async () => {
    const { result } = renderHook(() => useChallengeProgress());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.progressItems).toHaveLength(3);
    expect(result.current.progressItems[0].challengeId).toBe('ch-spring');
  });

  it('calculates summary stats: totalPointsEarned', async () => {
    const { result } = renderHook(() => useChallengeProgress());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.summary.totalPointsEarned).toBe(100);
  });

  it('calculates summary stats: completedCount', async () => {
    const { result } = renderHook(() => useChallengeProgress());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.summary.completedCount).toBe(1);
  });

  it('calculates summary stats: activeCount', async () => {
    const { result } = renderHook(() => useChallengeProgress());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.summary.activeCount).toBe(2);
  });

  it('returns error state on API failure', async () => {
    mockQueryData.mockRejectedValue(new Error('CMS unavailable'));

    const { result } = renderHook(() => useChallengeProgress());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Unable to load challenge progress.');
    expect(result.current.progressItems).toHaveLength(0);
  });

  it('returns empty state when no wixClient', async () => {
    (useOptionalWixClient as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => useChallengeProgress());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.progressItems).toHaveLength(0);
    expect(result.current.summary.totalPointsEarned).toBe(0);
    expect(mockQueryData).not.toHaveBeenCalled();
  });

  it('returns empty state when no user', async () => {
    mockUseAuth.mockReturnValue({ user: null });

    const { result } = renderHook(() => useChallengeProgress());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.progressItems).toHaveLength(0);
    expect(mockQueryData).not.toHaveBeenCalled();
  });

  it('provides refresh function that re-fetches', async () => {
    const { result } = renderHook(() => useChallengeProgress());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockQueryData).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(mockQueryData).toHaveBeenCalledTimes(2);
    });
  });

  it('handles empty CMS response gracefully', async () => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });

    const { result } = renderHook(() => useChallengeProgress());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.progressItems).toHaveLength(0);
    expect(result.current.summary.totalPointsEarned).toBe(0);
    expect(result.current.summary.completedCount).toBe(0);
    expect(result.current.summary.activeCount).toBe(0);
  });

  it('handles null items in CMS response', async () => {
    mockQueryData.mockResolvedValue({ items: null, totalResults: 0 });

    const { result } = renderHook(() => useChallengeProgress());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.progressItems).toHaveLength(0);
  });

  it('clamps progressRatio between 0 and 1', async () => {
    mockQueryData.mockResolvedValue({
      items: [
        {
          challengeId: 'ch-over',
          memberId: 'member-1',
          progressValue: 10,
          goalValue: 5,
          pointsEarned: 0,
          completedAt: null,
          lastUpdated: '2026-03-20T12:00:00Z',
        },
      ],
      totalResults: 1,
    });

    const { result } = renderHook(() => useChallengeProgress());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.progressItems[0].progressRatio).toBe(1);
  });

  it('handles zero goalValue without division error', async () => {
    mockQueryData.mockResolvedValue({
      items: [
        {
          challengeId: 'ch-zero',
          memberId: 'member-1',
          progressValue: 3,
          goalValue: 0,
          pointsEarned: 0,
          completedAt: null,
          lastUpdated: '2026-03-20T12:00:00Z',
        },
      ],
      totalResults: 1,
    });

    const { result } = renderHook(() => useChallengeProgress());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.progressItems[0].progressRatio).toBe(0);
    expect(Number.isFinite(result.current.progressItems[0].progressRatio)).toBe(true);
  });
});
