/**
 * useTierPerks TDD tests — cm-jyl
 *
 * Fetches delivered tier perks from Wix TierPerkDeliveries collection via
 * getTierPerks webMethod. Uses member session token for auth (no IDOR —
 * server resolves identity from token).
 *
 * Covers:
 * - Happy path: returns delivered perks array
 * - Loading state during fetch
 * - Error: network failure, API error, null wixClient
 * - Unauthenticated: returns empty perks, no error, no API call
 * - Perks include couponCode when present
 * - Perks include bookingUrl for STYLING_CALL perk type
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useTierPerks } from '../useTierPerks';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetTierPerks = jest.fn();
const mockGetWixClientSingleton = jest.fn();

jest.mock('@/services/wix/wixClientSingleton', () => ({
  getWixClientSingleton: () => mockGetWixClientSingleton(),
}));

const mockGetTokens = jest.fn();
jest.mock('@/services/wix/wixSdkClient', () => ({
  getWixSdkClient: () => ({ auth: { getTokens: () => mockGetTokens() } }),
}));

const MEMBER_TOKEN = 'test-member-token-xyz';

function makeDelivery(overrides = {}) {
  return {
    perkType: 'FREE_WHITE_GLOVE',
    tier: 'Summit Master',
    deliveredAt: '2026-04-01T10:00:00Z',
    couponCode: undefined as string | undefined,
    bookingUrl: undefined as string | undefined,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetTokens.mockReturnValue({ accessToken: { value: MEMBER_TOKEN, expiresAt: 9999999999 } });
  mockGetWixClientSingleton.mockReturnValue({ getTierPerks: mockGetTierPerks });
  mockGetTierPerks.mockResolvedValue({ perks: [makeDelivery()] });
});

// ─── Happy path ───────────────────────────────────────────────────────────────

describe('useTierPerks — happy path', () => {
  it('returns delivered perks array on success', async () => {
    const { result } = renderHook(() => useTierPerks());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.perks).toHaveLength(1);
    expect(result.current.perks[0].perkType).toBe('FREE_WHITE_GLOVE');
    expect(result.current.error).toBeNull();
  });

  it('returns multiple perks when member has several unlocked', async () => {
    mockGetTierPerks.mockResolvedValue({
      perks: [
        makeDelivery({ perkType: 'FREE_WHITE_GLOVE', tier: 'Summit Master' }),
        makeDelivery({
          perkType: 'STYLING_CALL',
          tier: 'Summit Master',
          bookingUrl: 'https://calendly.com/test',
        }),
        makeDelivery({ perkType: 'EARLY_ACCESS', tier: 'Blue Ridge Legend' }),
      ],
    });
    const { result } = renderHook(() => useTierPerks());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.perks).toHaveLength(3);
  });

  it('calls getTierPerks with member access token', async () => {
    const { result } = renderHook(() => useTierPerks());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetTierPerks).toHaveBeenCalledWith(MEMBER_TOKEN);
  });

  it('perk with couponCode is returned correctly', async () => {
    mockGetTierPerks.mockResolvedValue({
      perks: [makeDelivery({ perkType: 'ACCESSORY_DISCOUNT', couponCode: 'CF-ABCD1234' })],
    });
    const { result } = renderHook(() => useTierPerks());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.perks[0].couponCode).toBe('CF-ABCD1234');
  });

  it('STYLING_CALL perk includes bookingUrl', async () => {
    mockGetTierPerks.mockResolvedValue({
      perks: [makeDelivery({ perkType: 'STYLING_CALL', bookingUrl: 'https://calendly.com/test' })],
    });
    const { result } = renderHook(() => useTierPerks());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.perks[0].bookingUrl).toBe('https://calendly.com/test');
  });

  it('returns empty perks array when member has no deliveries', async () => {
    mockGetTierPerks.mockResolvedValue({ perks: [] });
    const { result } = renderHook(() => useTierPerks());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.perks).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});

// ─── Loading state ────────────────────────────────────────────────────────────

describe('useTierPerks — loading state', () => {
  it('starts in loading state', () => {
    mockGetTierPerks.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useTierPerks());
    expect(result.current.loading).toBe(true);
    expect(result.current.perks).toEqual([]);
  });

  it('loading becomes false after fetch resolves', async () => {
    const { result } = renderHook(() => useTierPerks());
    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});

// ─── Error states ─────────────────────────────────────────────────────────────

describe('useTierPerks — error states', () => {
  it('sets error on network failure', async () => {
    mockGetTierPerks.mockRejectedValue(new Error('Network request failed'));
    const { result } = renderHook(() => useTierPerks());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).not.toBeNull();
    expect(result.current.perks).toEqual([]);
  });

  it('sets error on Wix API error', async () => {
    mockGetTierPerks.mockRejectedValue(new Error('getTierPerks failed: 500'));
    const { result } = renderHook(() => useTierPerks());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toContain('500');
  });

  it('sets error when getWixClientSingleton returns null', async () => {
    mockGetWixClientSingleton.mockReturnValue(null);
    const { result } = renderHook(() => useTierPerks());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).not.toBeNull();
    expect(result.current.perks).toEqual([]);
  });
});

// ─── Unauthenticated ──────────────────────────────────────────────────────────

describe('useTierPerks — unauthenticated', () => {
  it('returns empty perks without error when no access token', async () => {
    mockGetTokens.mockReturnValue({ accessToken: null });
    const { result } = renderHook(() => useTierPerks());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.perks).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(mockGetTierPerks).not.toHaveBeenCalled();
  });

  it('returns empty perks without error when SDK not initialized', async () => {
    mockGetTokens.mockImplementation(() => {
      throw new Error('SDK not ready');
    });
    const { result } = renderHook(() => useTierPerks());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.perks).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});

// ─── Race condition — unmount cancellation (cm-gdz) ──────────────────────────

describe('useTierPerks — unmount cancellation', () => {
  it('does not setState after unmount when fetch resolves later', async () => {
    let resolvePerks: (value: { perks: ReturnType<typeof makeDelivery>[] }) => void = () => {};
    mockGetTierPerks.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePerks = resolve;
        }),
    );
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { unmount } = renderHook(() => useTierPerks());
    unmount();
    resolvePerks({ perks: [makeDelivery()] });
    await new Promise((r) => setTimeout(r, 10));

    const stateUpdateWarning = errSpy.mock.calls.find((args) =>
      String(args[0]).includes("Can't perform a React state update on an unmounted component"),
    );
    expect(stateUpdateWarning).toBeUndefined();
    errSpy.mockRestore();
  });

  it('does not setState after unmount when fetch rejects later', async () => {
    let rejectPerks: (err: Error) => void = () => {};
    mockGetTierPerks.mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectPerks = reject;
        }),
    );
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { unmount } = renderHook(() => useTierPerks());
    unmount();
    rejectPerks(new Error('Late failure'));
    await new Promise((r) => setTimeout(r, 10));

    const stateUpdateWarning = errSpy.mock.calls.find((args) =>
      String(args[0]).includes("Can't perform a React state update on an unmounted component"),
    );
    expect(stateUpdateWarning).toBeUndefined();
    errSpy.mockRestore();
  });
});
