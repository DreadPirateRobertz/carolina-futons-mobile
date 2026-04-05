/**
 * useLoyalty TDD tests — cm-elo / cm-ds5 / deacon-cjv
 *
 * Updated for 4-tier system (Trail Blazer/Mountain Guide/Summit Master/Blue Ridge Legend).
 * Tier is now LoyaltyTierConfig — computed from points, not from API tier string.
 * Falls back to Trail Blazer defaults when unauthenticated.
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useLoyalty } from '../useLoyalty';
import { LOYALTY_TIERS } from '@/data/loyaltyTiers';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetLoyaltyAccount = jest.fn();
const mockGetWixClientSingleton = jest.fn();

jest.mock('@/services/wix/wixClientSingleton', () => ({
  getWixClientSingleton: () => mockGetWixClientSingleton(),
}));

const mockGetTokens = jest.fn();
jest.mock('@/services/wix/wixSdkClient', () => ({
  getWixSdkClient: () => ({ auth: { getTokens: () => mockGetTokens() } }),
}));

const MEMBER_TOKEN = 'test-access-token-abc';

const [TRAIL_BLAZER, MOUNTAIN_GUIDE, SUMMIT_MASTER, BLUE_RIDGE_LEGEND] = LOYALTY_TIERS;

function makeApiResponse(overrides = {}) {
  return {
    points: 500,
    accountId: 'acct-1',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetTokens.mockReturnValue({ accessToken: { value: MEMBER_TOKEN, expiresAt: 9999999999 } });
  mockGetWixClientSingleton.mockReturnValue({ getLoyaltyAccount: mockGetLoyaltyAccount });
  mockGetLoyaltyAccount.mockResolvedValue(makeApiResponse());
});

// ---------------------------------------------------------------------------
// useLoyalty hook — 11 tests
// ---------------------------------------------------------------------------

describe('useLoyalty hook', () => {
  it('returns Trail Blazer tier for a new member with 0 points', async () => {
    mockGetLoyaltyAccount.mockResolvedValue(makeApiResponse({ points: 0 }));
    const { result } = renderHook(() => useLoyalty());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.points).toBe(0);
    expect(result.current.tier).toBe(TRAIL_BLAZER);
    expect(result.current.nextTier).toBe(MOUNTAIN_GUIDE);
    expect(result.current.pointsToNext).toBe(500);
    expect(result.current.error).toBeNull();
  });

  it('returns Mountain Guide tier at 500 points', async () => {
    mockGetLoyaltyAccount.mockResolvedValue(makeApiResponse({ points: 500 }));
    const { result } = renderHook(() => useLoyalty());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tier).toBe(MOUNTAIN_GUIDE);
    expect(result.current.nextTier).toBe(SUMMIT_MASTER);
    expect(result.current.pointsToNext).toBe(1000); // 1500 - 500
  });

  it('returns Summit Master tier at 1500 points', async () => {
    mockGetLoyaltyAccount.mockResolvedValue(makeApiResponse({ points: 1500 }));
    const { result } = renderHook(() => useLoyalty());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tier).toBe(SUMMIT_MASTER);
    expect(result.current.nextTier).toBe(BLUE_RIDGE_LEGEND);
    expect(result.current.pointsToNext).toBe(1500); // 3000 - 1500
  });

  it('returns Blue Ridge Legend tier at 3000+ points with no nextTier', async () => {
    mockGetLoyaltyAccount.mockResolvedValue(makeApiResponse({ points: 3000 }));
    const { result } = renderHook(() => useLoyalty());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tier).toBe(BLUE_RIDGE_LEGEND);
    expect(result.current.nextTier).toBeNull();
    expect(result.current.pointsToNext).toBe(0);
  });

  it('passes member access token to getLoyaltyAccount', async () => {
    const { result } = renderHook(() => useLoyalty());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetLoyaltyAccount).toHaveBeenCalledWith(MEMBER_TOKEN);
  });

  it('shows loading state during fetch', () => {
    mockGetLoyaltyAccount.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useLoyalty());
    expect(result.current.loading).toBe(true);
    expect(result.current.points).toBe(0);
  });

  it('shows error state on API failure', async () => {
    mockGetLoyaltyAccount.mockRejectedValue(new Error('Wix API error'));
    const { result } = renderHook(() => useLoyalty());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toContain('Wix API error');
  });

  it('shows error state on network failure (offline)', async () => {
    mockGetLoyaltyAccount.mockRejectedValue(new TypeError('Network request failed'));
    const { result } = renderHook(() => useLoyalty());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).not.toBeNull();
  });

  it('returns Trail Blazer defaults when unauthenticated (no access token)', async () => {
    mockGetTokens.mockReturnValue({
      accessToken: null,
      refreshToken: { value: 'r', role: 'visitor' },
    });
    const { result } = renderHook(() => useLoyalty());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.points).toBe(0);
    expect(result.current.tier).toBe(TRAIL_BLAZER);
    expect(result.current.nextTier).toBe(MOUNTAIN_GUIDE);
    expect(result.current.pointsToNext).toBe(500);
    expect(result.current.error).toBeNull();
    expect(mockGetLoyaltyAccount).not.toHaveBeenCalled();
  });

  it('returns Trail Blazer defaults when SDK not initialized', async () => {
    mockGetTokens.mockImplementation(() => {
      throw new Error('SDK not ready');
    });
    const { result } = renderHook(() => useLoyalty());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tier).toBe(TRAIL_BLAZER);
    expect(result.current.error).toBeNull();
    expect(mockGetLoyaltyAccount).not.toHaveBeenCalled();
  });

  it('sets error when getWixClientSingleton() returns null', async () => {
    mockGetWixClientSingleton.mockReturnValue(null);
    const { result } = renderHook(() => useLoyalty());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Wix service unavailable');
  });

  it('refreshPoints re-fetches and updates state', async () => {
    let callCount = 0;
    mockGetLoyaltyAccount.mockImplementation(() => {
      callCount++;
      return Promise.resolve(makeApiResponse({ points: callCount === 1 ? 500 : 600 }));
    });
    const { result } = renderHook(() => useLoyalty());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.points).toBe(500);
    await result.current.refreshPoints();
    await waitFor(() => expect(result.current.points).toBe(600));
  });
});
