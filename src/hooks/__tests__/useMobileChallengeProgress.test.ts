/**
 * @module useMobileChallengeProgress.test
 *
 * TDD tests for useMobileChallengeProgress — wraps getMobileChallengeProgress()
 * and listens for crossRigEventReceiver push events to auto-refresh.
 *
 * cm-1we
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';

import { useMobileChallengeProgress } from '../useMobileChallengeProgress';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockCallFunction = jest.fn();
const mockWixClient = { callFunction: mockCallFunction };

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: jest.fn(() => mockWixClient),
}));

const mockUseAuth = jest.fn((): { user: { id: string } | null } => ({
  user: { id: 'member-1' },
}));
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Notification listener shim
const listeners: ((n: any) => void)[] = [];
const mockRemoveListener = jest.fn();
jest.mock('expo-notifications', () => ({
  addNotificationReceivedListener: jest.fn((cb: (n: any) => void) => {
    listeners.push(cb);
    return { remove: mockRemoveListener };
  }),
}));

// Spy crossRigSync.syncMobilePoints to verify sync call on push-driven refresh
jest.mock('@/services/crossRigSync', () => {
  const actual = jest.requireActual('@/services/crossRigSync');
  return {
    ...actual,
    syncMobilePoints: jest.fn(() => Promise.resolve()),
  };
});

const { useOptionalWixClient } = require('@/services/wix');
const crossRigSync = require('@/services/crossRigSync');

// ── Fixtures ─────────────────────────────────────────────────────────────────

const PROGRESS_RESPONSE = {
  success: true,
  counts: {
    ar_discovery: 2,
    quiz_completion: 5,
    social_share: 1,
  },
};

const EMPTY_RESPONSE = {
  success: true,
  counts: { ar_discovery: 0, quiz_completion: 0, social_share: 0 },
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useMobileChallengeProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listeners.length = 0;
    (useOptionalWixClient as jest.Mock).mockReturnValue(mockWixClient);
    mockUseAuth.mockReturnValue({ user: { id: 'member-1' } });
    mockCallFunction.mockResolvedValue(PROGRESS_RESPONSE);
  });

  it('fetches progress on mount and exposes counts', async () => {
    const { result } = renderHook(() => useMobileChallengeProgress());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.counts).toEqual(PROGRESS_RESPONSE.counts);
    expect(result.current.error).toBeNull();
    expect(mockCallFunction).toHaveBeenCalledWith(
      'getMobileChallengeProgress',
      'GET',
      expect.objectContaining({ memberId: 'member-1' }),
    );
  });

  it('returns empty counts with loading=false when no wix client', async () => {
    (useOptionalWixClient as jest.Mock).mockReturnValue(null);
    const { result } = renderHook(() => useMobileChallengeProgress());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.counts).toEqual({
      ar_discovery: 0,
      quiz_completion: 0,
      social_share: 0,
    });
  });

  it('returns empty counts with loading=false when no authenticated user', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useMobileChallengeProgress());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockCallFunction).not.toHaveBeenCalled();
    expect(result.current.counts.ar_discovery).toBe(0);
  });

  it('surfaces error string when callFunction rejects', async () => {
    mockCallFunction.mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => useMobileChallengeProgress());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toMatch(/unable to load/i);
    expect(result.current.counts.ar_discovery).toBe(0);
  });

  it('refresh() re-fetches counts', async () => {
    const { result } = renderHook(() => useMobileChallengeProgress());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockCallFunction).toHaveBeenCalledTimes(1);

    mockCallFunction.mockResolvedValueOnce({
      success: true,
      counts: { ar_discovery: 9, quiz_completion: 9, social_share: 9 },
    });

    await act(async () => {
      result.current.refresh();
    });
    await waitFor(() =>
      expect(result.current.counts).toEqual({
        ar_discovery: 9,
        quiz_completion: 9,
        social_share: 9,
      }),
    );
    expect(mockCallFunction).toHaveBeenCalledTimes(2);
  });

  it('refreshes on push notification matching a challenge completion event', async () => {
    const { result } = renderHook(() => useMobileChallengeProgress());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(listeners.length).toBe(1);
    expect(mockCallFunction).toHaveBeenCalledTimes(1);

    mockCallFunction.mockResolvedValueOnce({
      success: true,
      counts: { ar_discovery: 3, quiz_completion: 5, social_share: 1 },
    });

    await act(async () => {
      listeners[0]({
        request: {
          content: {
            data: { event: 'ar_discovery_completed', points: 75 },
          },
        },
      });
    });

    await waitFor(() => expect(mockCallFunction).toHaveBeenCalledTimes(2));
    expect(result.current.counts.ar_discovery).toBe(3);
  });

  it('calls syncMobilePoints when push event includes points', async () => {
    renderHook(() => useMobileChallengeProgress());
    await waitFor(() => expect(listeners.length).toBe(1));

    await act(async () => {
      listeners[0]({
        request: {
          content: {
            data: { event: 'quiz_completed', points: 50 },
          },
        },
      });
    });

    await waitFor(() =>
      expect(crossRigSync.syncMobilePoints).toHaveBeenCalledWith(
        mockWixClient,
        'member-1',
        50,
        'quiz_completed',
      ),
    );
  });

  it('does not refresh on irrelevant push events', async () => {
    renderHook(() => useMobileChallengeProgress());
    await waitFor(() => expect(mockCallFunction).toHaveBeenCalledTimes(1));

    await act(async () => {
      listeners[0]({
        request: { content: { data: { event: 'order_shipped' } } },
      });
    });

    // Still only the initial mount call
    expect(mockCallFunction).toHaveBeenCalledTimes(1);
    expect(crossRigSync.syncMobilePoints).not.toHaveBeenCalled();
  });

  it('handles malformed notification payload without crashing', async () => {
    renderHook(() => useMobileChallengeProgress());
    await waitFor(() => expect(listeners.length).toBe(1));

    await act(async () => {
      listeners[0]({ request: { content: { data: null } } });
      listeners[0]({ request: { content: {} } });
      listeners[0]({});
    });

    // Only the mount call — all malformed events ignored
    expect(mockCallFunction).toHaveBeenCalledTimes(1);
  });

  it('swallows syncMobilePoints failure without breaking refresh', async () => {
    (crossRigSync.syncMobilePoints as jest.Mock).mockRejectedValueOnce(new Error('sync down'));
    const { result } = renderHook(() => useMobileChallengeProgress());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      listeners[0]({
        request: {
          content: {
            data: { event: 'social_share_completed', points: 100 },
          },
        },
      });
    });

    // Refresh still fires even though sync throws
    await waitFor(() => expect(mockCallFunction).toHaveBeenCalledTimes(2));
    expect(result.current.error).toBeNull();
  });

  it('removes notification listener on unmount', async () => {
    const { unmount } = renderHook(() => useMobileChallengeProgress());
    await waitFor(() => expect(listeners.length).toBe(1));
    unmount();
    expect(mockRemoveListener).toHaveBeenCalled();
  });

  it('returns empty counts when API response success is false', async () => {
    mockCallFunction.mockResolvedValueOnce({ success: false, counts: EMPTY_RESPONSE.counts });
    const { result } = renderHook(() => useMobileChallengeProgress());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toMatch(/unable to load/i);
  });
});
