/**
 * useLoyaltyEarnEstimate TDD tests — cm-2qq
 *
 * Tests written BEFORE implementation per CLAUDE.md mandate.
 *
 * Hook returns the estimated loyalty points a member earns on a given price,
 * factoring in their current tier's earnRate (multiplier on base 0.06 rate).
 *
 * Tier earn rates:
 *   Trail Blazer:    0.06  (1×)
 *   Mountain Guide:  0.09  (1.5×)
 *   Summit Master:   0.12  (2×)
 *   Blue Ridge Legend: 0.18 (3×)
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useLoyaltyEarnEstimate } from '../useLoyaltyEarnEstimate';
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

const MEMBER_TOKEN = 'test-token-abc';
const [TRAIL_BLAZER, MOUNTAIN_GUIDE, SUMMIT_MASTER, BLUE_RIDGE_LEGEND] = LOYALTY_TIERS;

function setupTier(points: number) {
  mockGetTokens.mockReturnValue({ accessToken: { value: MEMBER_TOKEN, expiresAt: 9999999999 } });
  mockGetWixClientSingleton.mockReturnValue({ getLoyaltyAccount: mockGetLoyaltyAccount });
  mockGetLoyaltyAccount.mockResolvedValue({ points, accountId: 'acct-1' });
}

beforeEach(() => {
  jest.clearAllMocks();
  setupTier(0);
});

// ---------------------------------------------------------------------------
// Tier-aware earn calculation
// ---------------------------------------------------------------------------

describe('useLoyaltyEarnEstimate', () => {
  it('returns Trail Blazer earn for a new member (0 pts, rate 0.06)', async () => {
    setupTier(0);
    const { result } = renderHook(() => useLoyaltyEarnEstimate(799));
    await waitFor(() => expect(result.current.loading).toBe(false));
    // floor(799 * 0.06) = 47
    expect(result.current.pts).toBe(47);
    expect(result.current.tier).toEqual(TRAIL_BLAZER);
  });

  it('returns Mountain Guide earn for 500-pt member (rate 0.09)', async () => {
    setupTier(500);
    const { result } = renderHook(() => useLoyaltyEarnEstimate(799));
    await waitFor(() => expect(result.current.loading).toBe(false));
    // floor(799 * 0.09) = 71
    expect(result.current.pts).toBe(71);
    expect(result.current.tier).toEqual(MOUNTAIN_GUIDE);
  });

  it('returns Summit Master earn for 1500-pt member (rate 0.12)', async () => {
    setupTier(1500);
    const { result } = renderHook(() => useLoyaltyEarnEstimate(799));
    await waitFor(() => expect(result.current.loading).toBe(false));
    // floor(799 * 0.12) = 95
    expect(result.current.pts).toBe(95);
    expect(result.current.tier).toEqual(SUMMIT_MASTER);
  });

  it('returns Blue Ridge Legend earn for 3000-pt member (rate 0.18)', async () => {
    setupTier(3000);
    const { result } = renderHook(() => useLoyaltyEarnEstimate(799));
    await waitFor(() => expect(result.current.loading).toBe(false));
    // floor(799 * 0.18) = 143
    expect(result.current.pts).toBe(143);
    expect(result.current.tier).toEqual(BLUE_RIDGE_LEGEND);
  });

  it('returns 120 pts for $2000 item at Trail Blazer rate (bead example)', async () => {
    setupTier(0);
    const { result } = renderHook(() => useLoyaltyEarnEstimate(2000));
    await waitFor(() => expect(result.current.loading).toBe(false));
    // floor(2000 * 0.06) = 120
    expect(result.current.pts).toBe(120);
  });

  it('floors fractional points (no rounding up)', async () => {
    setupTier(0);
    const { result } = renderHook(() => useLoyaltyEarnEstimate(50));
    await waitFor(() => expect(result.current.loading).toBe(false));
    // floor(50 * 0.06) = floor(3.0) = 3
    expect(result.current.pts).toBe(3);
  });

  it('returns 0 pts for price 0', async () => {
    setupTier(0);
    const { result } = renderHook(() => useLoyaltyEarnEstimate(0));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.pts).toBe(0);
  });

  it('recomputes when price changes', async () => {
    setupTier(500); // Mountain Guide
    const { result, rerender } = renderHook(({ price }) => useLoyaltyEarnEstimate(price), {
      initialProps: { price: 500 },
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    // floor(500 * 0.09) = 45
    expect(result.current.pts).toBe(45);

    rerender({ price: 1000 });
    // floor(1000 * 0.09) = 90
    expect(result.current.pts).toBe(90);
  });

  // ── Loading state ──────────────────────────────────────────────────────

  it('returns loading=true initially', () => {
    mockGetLoyaltyAccount.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useLoyaltyEarnEstimate(799));
    expect(result.current.loading).toBe(true);
    expect(result.current.pts).toBe(0);
  });

  // ── Error state ────────────────────────────────────────────────────────

  it('returns error string when account fetch fails', async () => {
    mockGetLoyaltyAccount.mockRejectedValue(new Error('Network timeout'));
    const { result } = renderHook(() => useLoyaltyEarnEstimate(799));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Network timeout');
    expect(result.current.pts).toBe(0);
  });

  // ── Unauthenticated ────────────────────────────────────────────────────

  it('falls back to Trail Blazer rate when unauthenticated', async () => {
    mockGetTokens.mockReturnValue({ accessToken: undefined });
    const { result } = renderHook(() => useLoyaltyEarnEstimate(799));
    await waitFor(() => expect(result.current.loading).toBe(false));
    // floor(799 * 0.06) = 47
    expect(result.current.pts).toBe(47);
    expect(result.current.tier).toEqual(TRAIL_BLAZER);
  });

  // ── Wix client unavailable ─────────────────────────────────────────────

  it('sets error when Wix client unavailable', async () => {
    mockGetWixClientSingleton.mockReturnValue(null);
    const { result } = renderHook(() => useLoyaltyEarnEstimate(799));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(result.current.pts).toBe(0);
  });
});
