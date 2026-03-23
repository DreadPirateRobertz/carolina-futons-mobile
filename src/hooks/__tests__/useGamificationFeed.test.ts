/**
 * @file useGamificationFeed.test.ts
 * @description TDD tests for cf-tuz useGamificationFeed hook.
 *
 * Covers:
 *  - starts with loading=true and empty notifications
 *  - fetches from getMyNotifications webMethod when client available
 *  - maps API response to GamificationNotification shape
 *  - handles API error — sets error, empty list
 *  - handles null notifications array in API response
 *  - markAllRead updates all notifications to read=true
 *  - markAllRead fires POST to server (best-effort)
 *  - markAllRead server failure does not crash the hook
 *  - refresh re-fetches
 *  - skips fetch when no wixClient
 *  - skips fetch when no memberId
 *  - coerces unknown type values to 'daily_quest'
 *  - calls correct URL with memberId query param
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useGamificationFeed } from '../useGamificationFeed';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockCallFunction = jest.fn();
const mockWixClient = { callFunction: mockCallFunction };

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: jest.fn(() => mockWixClient),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({ user: { id: 'member-001' } })),
}));

const { useOptionalWixClient } = jest.requireMock('@/services/wix') as {
  useOptionalWixClient: jest.Mock;
};
const { useAuth } = jest.requireMock('@/hooks/useAuth') as { useAuth: jest.Mock };

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const apiNotifications = [
  {
    id: 'n-001',
    type: 'streak_milestone',
    message: '7-day streak!',
    createdAt: '2026-03-23T05:00:00.000Z',
    read: false,
  },
  {
    id: 'n-002',
    type: 'daily_quest',
    message: 'Daily quest complete',
    createdAt: '2026-03-23T04:00:00.000Z',
    read: true,
  },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useGamificationFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useOptionalWixClient.mockReturnValue(mockWixClient);
    useAuth.mockReturnValue({ user: { id: 'member-001' } });
    mockCallFunction.mockResolvedValue({ notifications: apiNotifications });
  });

  it('starts with loading=true and empty notifications', async () => {
    mockCallFunction.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useGamificationFeed());
    expect(result.current.loading).toBe(true);
    expect(result.current.notifications).toEqual([]);
  });

  it('fetches and maps API notifications on mount', async () => {
    const { result } = renderHook(() => useGamificationFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.notifications[0].id).toBe('n-001');
    expect(result.current.notifications[0].type).toBe('streak_milestone');
    expect(result.current.notifications[0].read).toBe(false);
    expect(typeof result.current.notifications[0].createdAt).toBe('number');
  });

  it('sets error on API failure', async () => {
    mockCallFunction.mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useGamificationFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Network error');
    expect(result.current.notifications).toEqual([]);
  });

  it('handles null notifications array in API response', async () => {
    mockCallFunction.mockResolvedValueOnce({ notifications: null });
    const { result } = renderHook(() => useGamificationFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.notifications).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('returns empty list when wixClient is unavailable', async () => {
    useOptionalWixClient.mockReturnValue(null);
    const { result } = renderHook(() => useGamificationFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.notifications).toEqual([]);
    expect(mockCallFunction).not.toHaveBeenCalled();
  });

  it('returns empty list when user has no memberId', async () => {
    useAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useGamificationFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.notifications).toEqual([]);
    expect(mockCallFunction).not.toHaveBeenCalled();
  });

  it('coerces unknown notification type to daily_quest', async () => {
    mockCallFunction.mockResolvedValueOnce({
      notifications: [{ ...apiNotifications[0], type: 'unknown_type' }],
    });
    const { result } = renderHook(() => useGamificationFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.notifications[0].type).toBe('daily_quest');
  });

  it('calls getMyNotifications with memberId query param', async () => {
    const { result } = renderHook(() => useGamificationFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockCallFunction).toHaveBeenCalledWith(
      '/_functions/getMyNotifications?memberId=member-001',
      'GET',
    );
  });

  it('markAllRead sets all notifications to read=true', async () => {
    const { result } = renderHook(() => useGamificationFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.notifications[0].read).toBe(false);
    act(() => {
      result.current.markAllRead();
    });
    expect(result.current.notifications.every((n) => n.read)).toBe(true);
  });

  it('markAllRead fires a best-effort POST to the server', async () => {
    const { result } = renderHook(() => useGamificationFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => {
      result.current.markAllRead();
    });
    expect(mockCallFunction).toHaveBeenCalledWith('/_functions/markAllNotificationsRead', 'POST', {
      memberId: 'member-001',
    });
  });

  it('markAllRead server failure does not crash the hook', async () => {
    mockCallFunction
      .mockResolvedValueOnce({ notifications: apiNotifications })
      .mockRejectedValueOnce(new Error('Server error'));
    const { result } = renderHook(() => useGamificationFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await expect(
      act(() => {
        result.current.markAllRead();
      }),
    ).resolves.toBeUndefined();
    expect(result.current.notifications.every((n) => n.read)).toBe(true);
  });

  it('refresh re-fetches notifications', async () => {
    const { result } = renderHook(() => useGamificationFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const callsBefore = mockCallFunction.mock.calls.length;
    act(() => {
      result.current.refresh();
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockCallFunction.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});
