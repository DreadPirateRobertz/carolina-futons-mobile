/**
 * useAvatarState TDD tests — hq-xfib1 / Phase 6
 *
 * Tests written BEFORE implementation per CLAUDE.md mandate.
 * Consumes getAvatarState(memberId) webMethod via wixClient.
 *
 * API contract (melania hq-wisp-q1m8):
 *   getAvatarState(memberToken) →
 *     { equippedAccessoryId, unlockedAccessoryIds, lottieAnimationId, bonusPointsDayActive }
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useAvatarState } from '../useAvatarState';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetAvatarState = jest.fn();
const mockGetWixClientSingleton = jest.fn();

jest.mock('@/services/wix/wixClientSingleton', () => ({
  getWixClientSingleton: () => mockGetWixClientSingleton(),
}));

const mockGetTokens = jest.fn();
jest.mock('@/services/wix/wixSdkClient', () => ({
  getWixSdkClient: () => ({ auth: { getTokens: () => mockGetTokens() } }),
}));

const MEMBER_TOKEN = 'test-avatar-token-xyz';

function makeApiResponse(overrides = {}) {
  return {
    equippedAccessoryId: 'hat-001',
    unlockedAccessoryIds: ['hat-001', 'scarf-002'],
    lottieAnimationId: 'chibi-idle-v1',
    bonusPointsDayActive: false,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetTokens.mockReturnValue({ accessToken: { value: MEMBER_TOKEN, expiresAt: 9999999999 } });
  mockGetWixClientSingleton.mockReturnValue({ getAvatarState: mockGetAvatarState });
  mockGetAvatarState.mockResolvedValue(makeApiResponse());
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useAvatarState hook', () => {
  it('returns avatar state from API on success', async () => {
    const { result } = renderHook(() => useAvatarState());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.equippedAccessoryId).toBe('hat-001');
    expect(result.current.unlockedAccessoryIds).toEqual(['hat-001', 'scarf-002']);
    expect(result.current.lottieAnimationId).toBe('chibi-idle-v1');
    expect(result.current.bonusPointsDayActive).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns bonusPointsDayActive: true when API signals bonus day', async () => {
    mockGetAvatarState.mockResolvedValue(makeApiResponse({ bonusPointsDayActive: true }));
    const { result } = renderHook(() => useAvatarState());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.bonusPointsDayActive).toBe(true);
  });

  it('returns guest defaults when no member token (unauthenticated)', async () => {
    mockGetTokens.mockReturnValue({ accessToken: null });
    const { result } = renderHook(() => useAvatarState());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.equippedAccessoryId).toBeNull();
    expect(result.current.unlockedAccessoryIds).toEqual([]);
    expect(result.current.lottieAnimationId).toBeNull();
    expect(result.current.bonusPointsDayActive).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockGetAvatarState).not.toHaveBeenCalled();
  });

  it('returns guest defaults when SDK throws (token not initialized)', async () => {
    mockGetTokens.mockImplementation(() => {
      throw new Error('SDK not initialized');
    });
    const { result } = renderHook(() => useAvatarState());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.bonusPointsDayActive).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockGetAvatarState).not.toHaveBeenCalled();
  });

  it('sets error when Wix client unavailable', async () => {
    mockGetWixClientSingleton.mockReturnValue(null);
    const { result } = renderHook(() => useAvatarState());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Wix service unavailable');
  });

  it('sets error on API failure', async () => {
    mockGetAvatarState.mockRejectedValue(new Error('network timeout'));
    const { result } = renderHook(() => useAvatarState());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('network timeout');
    expect(result.current.bonusPointsDayActive).toBe(false);
  });

  it('handles missing/null fields gracefully (partial API response)', async () => {
    mockGetAvatarState.mockResolvedValue({
      bonusPointsDayActive: true,
      // equippedAccessoryId, unlockedAccessoryIds, lottieAnimationId intentionally missing
    });
    const { result } = renderHook(() => useAvatarState());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.equippedAccessoryId).toBeNull();
    expect(result.current.unlockedAccessoryIds).toEqual([]);
    expect(result.current.lottieAnimationId).toBeNull();
    expect(result.current.bonusPointsDayActive).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('starts in loading state', () => {
    mockGetAvatarState.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useAvatarState());
    expect(result.current.loading).toBe(true);
  });

  it('refreshAvatarState re-fetches from API', async () => {
    const { result } = renderHook(() => useAvatarState());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetAvatarState).toHaveBeenCalledTimes(1);

    await result.current.refreshAvatarState();
    expect(mockGetAvatarState).toHaveBeenCalledTimes(2);
  });
});
