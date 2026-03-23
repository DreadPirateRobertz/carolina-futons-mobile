/**
 * useActivityFeed tests — cf-2h8
 *
 * TDD spec for the paginated activity feed hook. Covers: initial fetch,
 * filter types, load-more pagination, refresh, API error fallback, and
 * null-client (unauthenticated) path.
 */
import { renderHook, act } from '@testing-library/react-native';
import { useActivityFeed, type ActivityFilter } from '../useActivityFeed';

// ── Mocks ─────────────────────────────────────────────────────────────────

const mockCallFunction = jest.fn();
const mockUseOptionalWixClient = jest.fn();
jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => mockUseOptionalWixClient(),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────

const MOCK_PAGE_1 = {
  events: [
    { id: 'e1', type: 'purchase', description: 'Ordered Blue Ridge Sectional', points: 250, earnedAt: '2026-03-20T14:00:00Z' },
    { id: 'e2', type: 'review', description: 'Reviewed Asheville Loveseat', points: 50, earnedAt: '2026-03-18T09:30:00Z' },
    { id: 'e3', type: 'challenge_complete', description: 'Spring Refresh challenge', points: 500, earnedAt: '2026-03-15T16:00:00Z' },
  ],
  hasMore: true,
};

const MOCK_PAGE_2 = {
  events: [
    { id: 'e4', type: 'referral', description: 'Referred a friend', points: 100, earnedAt: '2026-03-10T10:00:00Z' },
    { id: 'e5', type: 'streak_milestone', description: '7-day streak', points: 75, earnedAt: '2026-03-07T08:00:00Z' },
  ],
  hasMore: false,
};

// ── Tests ─────────────────────────────────────────────────────────────────

describe('useActivityFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOptionalWixClient.mockReturnValue({ callFunction: mockCallFunction });
    mockCallFunction.mockResolvedValue(MOCK_PAGE_1);
  });

  // ── Initial load ─────────────────────────────────────────────────────────

  it('starts with loading=true and empty events', () => {
    const { result } = renderHook(() => useActivityFeed('all'));
    expect(result.current.loading).toBe(true);
    expect(result.current.events).toEqual([]);
  });

  it('fetches events on mount', async () => {
    const { result } = renderHook(() => useActivityFeed('all'));
    await act(async () => {});
    expect(result.current.loading).toBe(false);
    expect(result.current.events).toHaveLength(3);
    expect(result.current.events[0].id).toBe('e1');
  });

  it('calls API with limit=20 and offset=0 on first load', async () => {
    renderHook(() => useActivityFeed('all'));
    await act(async () => {});
    expect(mockCallFunction).toHaveBeenCalledWith(
      '/_functions/getMyActivity',
      'POST',
      { limit: 20, offset: 0 },
    );
  });

  it('hasMore reflects API response', async () => {
    const { result } = renderHook(() => useActivityFeed('all'));
    await act(async () => {});
    expect(result.current.hasMore).toBe(true);
  });

  it('hasMore is false when API reports no more pages', async () => {
    mockCallFunction.mockResolvedValue({ events: [], hasMore: false });
    const { result } = renderHook(() => useActivityFeed('all'));
    await act(async () => {});
    expect(result.current.hasMore).toBe(false);
  });

  // ── Pagination ───────────────────────────────────────────────────────────

  it('loadMore appends events and increments offset', async () => {
    mockCallFunction
      .mockResolvedValueOnce(MOCK_PAGE_1)
      .mockResolvedValueOnce(MOCK_PAGE_2);

    const { result } = renderHook(() => useActivityFeed('all'));
    await act(async () => {});
    expect(result.current.events).toHaveLength(3);

    await act(async () => {
      result.current.loadMore();
    });
    expect(result.current.events).toHaveLength(5);
    expect(result.current.events[3].id).toBe('e4');
  });

  it('loadMore calls API with correct offset', async () => {
    mockCallFunction
      .mockResolvedValueOnce(MOCK_PAGE_1)
      .mockResolvedValueOnce(MOCK_PAGE_2);

    const { result } = renderHook(() => useActivityFeed('all'));
    await act(async () => {});
    await act(async () => { result.current.loadMore(); });

    expect(mockCallFunction).toHaveBeenNthCalledWith(2,
      '/_functions/getMyActivity',
      'POST',
      { limit: 20, offset: 3 },
    );
  });

  it('loadMore does nothing when hasMore is false', async () => {
    mockCallFunction.mockResolvedValue({ events: [], hasMore: false });
    const { result } = renderHook(() => useActivityFeed('all'));
    await act(async () => {});

    await act(async () => { result.current.loadMore(); });
    expect(mockCallFunction).toHaveBeenCalledTimes(1);
  });

  it('loadMore does nothing while already loading', async () => {
    let resolve!: (v: unknown) => void;
    mockCallFunction.mockReturnValueOnce(new Promise((r) => { resolve = r; }));

    const { result } = renderHook(() => useActivityFeed('all'));
    // Don't resolve yet — hook is loading
    await act(async () => { result.current.loadMore(); });
    expect(mockCallFunction).toHaveBeenCalledTimes(1);

    // Clean up
    resolve(MOCK_PAGE_1);
    await act(async () => {});
  });

  it('hasMore becomes false when last page loaded', async () => {
    mockCallFunction
      .mockResolvedValueOnce(MOCK_PAGE_1)
      .mockResolvedValueOnce(MOCK_PAGE_2);
    const { result } = renderHook(() => useActivityFeed('all'));
    await act(async () => {});
    await act(async () => { result.current.loadMore(); });
    expect(result.current.hasMore).toBe(false);
  });

  // ── Filters ──────────────────────────────────────────────────────────────

  it('passes types=[] (all) to API when filter is "all"', async () => {
    renderHook(() => useActivityFeed('all'));
    await act(async () => {});
    const body = mockCallFunction.mock.calls[0][2];
    // No types restriction when filter is 'all'
    expect(body.types).toBeUndefined();
  });

  it('passes types for "points" filter', async () => {
    renderHook(() => useActivityFeed('points'));
    await act(async () => {});
    const body = mockCallFunction.mock.calls[0][2];
    expect(body.types).toEqual(
      expect.arrayContaining(['purchase', 'review', 'referral']),
    );
  });

  it('passes types for "streaks" filter', async () => {
    renderHook(() => useActivityFeed('streaks'));
    await act(async () => {});
    const body = mockCallFunction.mock.calls[0][2];
    expect(body.types).toEqual(['streak_milestone']);
  });

  it('passes types for "quests" filter', async () => {
    renderHook(() => useActivityFeed('quests'));
    await act(async () => {});
    const body = mockCallFunction.mock.calls[0][2];
    expect(body.types).toEqual(['daily_quest']);
  });

  it('passes types for "challenges" filter', async () => {
    renderHook(() => useActivityFeed('challenges'));
    await act(async () => {});
    const body = mockCallFunction.mock.calls[0][2];
    expect(body.types).toEqual(['challenge_complete']);
  });

  it('resets events and re-fetches when filter changes', async () => {
    const { result, rerender } = renderHook(
      ({ filter }: { filter: ActivityFilter }) => useActivityFeed(filter),
      { initialProps: { filter: 'all' as ActivityFilter } },
    );
    await act(async () => {});
    expect(result.current.events).toHaveLength(3);

    mockCallFunction.mockResolvedValue({ events: [MOCK_PAGE_1.events[0]], hasMore: false });
    rerender({ filter: 'points' });
    await act(async () => {});
    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].id).toBe('e1');
  });

  // ── Refresh ──────────────────────────────────────────────────────────────

  it('refresh() resets to page 0 and re-fetches', async () => {
    mockCallFunction
      .mockResolvedValueOnce(MOCK_PAGE_1)
      .mockResolvedValueOnce(MOCK_PAGE_2)
      .mockResolvedValueOnce(MOCK_PAGE_1);

    const { result } = renderHook(() => useActivityFeed('all'));
    await act(async () => {});
    await act(async () => { result.current.loadMore(); });
    expect(result.current.events).toHaveLength(5);

    await act(async () => { result.current.refresh(); });
    expect(result.current.events).toHaveLength(3);
    expect(result.current.events[0].id).toBe('e1');
  });

  it('refresh() calls API with offset=0', async () => {
    mockCallFunction
      .mockResolvedValueOnce(MOCK_PAGE_1)
      .mockResolvedValueOnce(MOCK_PAGE_1);
    const { result } = renderHook(() => useActivityFeed('all'));
    await act(async () => {});
    await act(async () => { result.current.refresh(); });
    expect(mockCallFunction).toHaveBeenLastCalledWith(
      '/_functions/getMyActivity',
      'POST',
      { limit: 20, offset: 0 },
    );
  });

  // ── Error states ─────────────────────────────────────────────────────────

  it('sets error when API throws', async () => {
    mockCallFunction.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useActivityFeed('all'));
    await act(async () => {});
    expect(result.current.error).toBeTruthy();
    expect(result.current.loading).toBe(false);
  });

  it('error is null on successful fetch', async () => {
    const { result } = renderHook(() => useActivityFeed('all'));
    await act(async () => {});
    expect(result.current.error).toBeNull();
  });

  it('clears error on refresh after failure', async () => {
    mockCallFunction
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(MOCK_PAGE_1);
    const { result } = renderHook(() => useActivityFeed('all'));
    await act(async () => {});
    expect(result.current.error).toBeTruthy();

    await act(async () => { result.current.refresh(); });
    expect(result.current.error).toBeNull();
  });

  it('returns empty events and no error when API returns null events', async () => {
    mockCallFunction.mockResolvedValue({ events: null, hasMore: false });
    const { result } = renderHook(() => useActivityFeed('all'));
    await act(async () => {});
    expect(result.current.events).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  // ── No client (unauthenticated) ──────────────────────────────────────────

  it('falls back to mock events when wix client is unavailable', async () => {
    mockUseOptionalWixClient.mockReturnValue(null);
    const { result } = renderHook(() => useActivityFeed('all'));
    await act(async () => {});
    expect(result.current.loading).toBe(false);
    expect(result.current.events.length).toBeGreaterThan(0);
    expect(result.current.error).toBeNull();
  });

  it('does not call API when wix client is null', async () => {
    mockUseOptionalWixClient.mockReturnValue(null);
    renderHook(() => useActivityFeed('all'));
    await act(async () => {});
    expect(mockCallFunction).not.toHaveBeenCalled();
  });

  it('filters mock events client-side when filter is applied without client', async () => {
    mockUseOptionalWixClient.mockReturnValue(null);
    const { result } = renderHook(() => useActivityFeed('streaks'));
    await act(async () => {});
    expect(result.current.events.every((e) => e.type === 'streak_milestone')).toBe(true);
  });
});
