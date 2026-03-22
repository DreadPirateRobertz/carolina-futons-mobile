/**
 * useLoyalty TDD tests — cm-elo / cm-ds5
 *
 * Updated to mock the webMethod (/_functions/getLoyaltyAccount) via
 * wixClient.getLoyaltyAccount() instead of direct Wix Data collection queries.
 * Member token comes from getWixSdkClient().auth.getTokens().accessToken.value.
 *
 * Falls back to Bronze defaults (no error) when unauthenticated.
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useLoyalty } from '../useLoyalty';

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

function makeApiResponse(overrides = {}) {
  return {
    points: 500,
    tier: 'Silver',
    tierDiscount: 5,
    nextTier: 'Gold',
    pointsToNext: 1000,
    progress: 33,
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
  it('returns 0 points and bronze tier for a new member with no account', async () => {
    mockGetLoyaltyAccount.mockResolvedValue(
      makeApiResponse({ points: 0, tier: 'Bronze', nextTier: 'Silver', pointsToNext: 500, progress: 0 }),
    );
    const { result } = renderHook(() => useLoyalty());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.points).toBe(0);
    expect(result.current.tier).toBe('bronze');
    expect(result.current.nextTier).toBe('silver');
    expect(result.current.pointsToNext).toBe(500);
    expect(result.current.error).toBeNull();
  });

  it('returns correct points, tier, and nextTier for an existing member', async () => {
    mockGetLoyaltyAccount.mockResolvedValue(
      makeApiResponse({ points: 1500, tier: 'Gold', nextTier: null, pointsToNext: 0, progress: 100 }),
    );
    const { result } = renderHook(() => useLoyalty());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.points).toBe(1500);
    expect(result.current.tier).toBe('gold');
    expect(result.current.nextTier).toBeNull();
    expect(result.current.pointsToNext).toBe(0);
  });

  it('normalizes capitalized tier names from API (Bronze/Silver/Gold → lowercase)', async () => {
    for (const [apiTier, expected] of [
      ['Bronze', 'bronze'],
      ['Silver', 'silver'],
      ['Gold', 'gold'],
    ] as const) {
      mockGetLoyaltyAccount.mockResolvedValue(makeApiResponse({ tier: apiTier }));
      const { result } = renderHook(() => useLoyalty());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.tier).toBe(expected);
    }
  });

  it('passes member access token to getLoyaltyAccount', async () => {
    mockGetLoyaltyAccount.mockResolvedValue(makeApiResponse());
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
    expect(result.current.error).not.toBeNull();
    expect(result.current.error).toContain('Wix API error');
  });

  it('shows error state on network failure (offline)', async () => {
    mockGetLoyaltyAccount.mockRejectedValue(new TypeError('Network request failed'));
    const { result } = renderHook(() => useLoyalty());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).not.toBeNull();
  });

  it('returns Bronze defaults when getTokens() returns no access token (unauthenticated)', async () => {
    mockGetTokens.mockReturnValue({ accessToken: null, refreshToken: { value: 'r', role: 'visitor' } });
    const { result } = renderHook(() => useLoyalty());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.points).toBe(0);
    expect(result.current.tier).toBe('bronze');
    expect(result.current.nextTier).toBe('silver');
    expect(result.current.pointsToNext).toBe(500);
    expect(result.current.error).toBeNull();
    expect(mockGetLoyaltyAccount).not.toHaveBeenCalled();
  });

  it('returns Bronze defaults when getTokens() throws (SDK not initialized)', async () => {
    mockGetTokens.mockImplementation(() => {
      throw new Error('SDK not ready');
    });
    const { result } = renderHook(() => useLoyalty());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tier).toBe('bronze');
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
