/**
 * useLoyalty TDD tests — cm-elo
 *
 * 11 tests for the useLoyalty hook.
 * memberId comes from WixAuthService.getCurrentMember() (session-based, no IDOR risk).
 * Wix Data pattern: wix.queryData<T>('CollectionName', { filter, limit })
 *
 * Spec: docs/superpowers/specs/2026-03-21-loyalty-points-design.md
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useLoyalty } from '../useLoyalty';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockQueryData = jest.fn();
const mockGetWixClientSingleton = jest.fn();

jest.mock('@/services/wix/wixClientSingleton', () => ({
  getWixClientSingleton: () => mockGetWixClientSingleton(),
}));

const mockGetCurrentMember = jest.fn();
const mockAuthInstance = { getCurrentMember: () => mockGetCurrentMember() };
jest.mock('@/services/wix/wixAuth', () => ({
  WixAuthService: jest.fn().mockImplementation(() => mockAuthInstance),
}));

// Default member fixture
const MEMBER_ID = 'test-member-abc';
const DEFAULT_MEMBER = { id: MEMBER_ID };

// Default empty responses
const EMPTY_POINTS = { items: [], totalResults: 0 };
const EMPTY_TX = { items: [], totalResults: 0 };

function makePointsRecord(overrides = {}) {
  return {
    memberId: MEMBER_ID,
    points: 500,
    tier: 'bronze',
    totalEarned: 500,
    ...overrides,
  };
}

function makeTxRecord(overrides = {}) {
  return {
    _id: 'tx-1',
    memberId: MEMBER_ID,
    delta: 100,
    reason: 'purchase',
    createdDate: '2026-03-01T00:00:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCurrentMember.mockResolvedValue(DEFAULT_MEMBER);
  mockGetWixClientSingleton.mockReturnValue({ queryData: mockQueryData });
  mockQueryData.mockImplementation((collection: string) => {
    if (collection === 'LoyaltyPoints') return Promise.resolve(EMPTY_POINTS);
    if (collection === 'LoyaltyTransactions') return Promise.resolve(EMPTY_TX);
    return Promise.resolve({ items: [], totalResults: 0 });
  });
});

// ---------------------------------------------------------------------------
// useLoyalty hook — 11 tests
// ---------------------------------------------------------------------------

describe('useLoyalty hook', () => {
  it('returns 0 points and bronze tier for a new member with no LoyaltyPoints record', async () => {
    mockQueryData.mockResolvedValue(EMPTY_POINTS);
    const { result } = renderHook(() => useLoyalty());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.points).toBe(0);
    expect(result.current.tier).toBe('bronze');
    expect(result.current.totalEarned).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('returns correct points and tier for an existing member', async () => {
    mockQueryData.mockImplementation((collection: string) => {
      if (collection === 'LoyaltyPoints')
        return Promise.resolve({
          items: [makePointsRecord({ points: 1500, tier: 'gold', totalEarned: 2200 })],
          totalResults: 1,
        });
      return Promise.resolve(EMPTY_TX);
    });
    const { result } = renderHook(() => useLoyalty());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.points).toBe(1500);
    expect(result.current.tier).toBe('gold');
    expect(result.current.totalEarned).toBe(2200);
  });

  it('derives tier from points: 0→bronze, 500→silver, 1500→gold', async () => {
    mockQueryData.mockImplementation((collection: string) => {
      if (collection === 'LoyaltyPoints')
        return Promise.resolve({ items: [makePointsRecord({ points: 499 })], totalResults: 1 });
      return Promise.resolve(EMPTY_TX);
    });
    const { result: bronze } = renderHook(() => useLoyalty());
    await waitFor(() => expect(bronze.current.loading).toBe(false));
    expect(bronze.current.tier).toBe('bronze');

    mockQueryData.mockImplementation((collection: string) => {
      if (collection === 'LoyaltyPoints')
        return Promise.resolve({
          items: [makePointsRecord({ points: 500, tier: 'silver' })],
          totalResults: 1,
        });
      return Promise.resolve(EMPTY_TX);
    });
    const { result: silver } = renderHook(() => useLoyalty());
    await waitFor(() => expect(silver.current.loading).toBe(false));
    expect(silver.current.tier).toBe('silver');

    mockQueryData.mockImplementation((collection: string) => {
      if (collection === 'LoyaltyPoints')
        return Promise.resolve({
          items: [makePointsRecord({ points: 1500, tier: 'gold' })],
          totalResults: 1,
        });
      return Promise.resolve(EMPTY_TX);
    });
    const { result: gold } = renderHook(() => useLoyalty());
    await waitFor(() => expect(gold.current.loading).toBe(false));
    expect(gold.current.tier).toBe('gold');
  });

  it('always derives tier client-side — ignores stale stored tier', async () => {
    // Stored tier says gold but points are only 200 (bronze). Must use deriveTier.
    mockQueryData.mockImplementation((collection: string) => {
      if (collection === 'LoyaltyPoints')
        return Promise.resolve({
          items: [makePointsRecord({ points: 200, tier: 'gold' })],
          totalResults: 1,
        });
      return Promise.resolve(EMPTY_TX);
    });
    const { result } = renderHook(() => useLoyalty());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tier).toBe('bronze');
  });

  it('shows loading state during fetch', () => {
    mockQueryData.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useLoyalty());
    expect(result.current.loading).toBe(true);
    expect(result.current.points).toBe(0);
  });

  it('shows error state on API failure', async () => {
    mockQueryData.mockRejectedValue(new Error('Wix API error'));
    const { result } = renderHook(() => useLoyalty());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).not.toBeNull();
    expect(result.current.error).toContain('Wix API error');
  });

  it('shows error state on network failure (offline)', async () => {
    mockQueryData.mockRejectedValue(new TypeError('Network request failed'));
    const { result } = renderHook(() => useLoyalty());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).not.toBeNull();
  });

  it('returns default state when getCurrentMember() returns null (unauthenticated)', async () => {
    mockGetCurrentMember.mockResolvedValue(null);
    const { result } = renderHook(() => useLoyalty());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.points).toBe(0);
    expect(result.current.tier).toBe('bronze');
    expect(result.current.totalEarned).toBe(0);
    expect(result.current.transactions).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });

  it('sets error when getWixClientSingleton() returns null', async () => {
    mockGetWixClientSingleton.mockReturnValue(null);
    const { result } = renderHook(() => useLoyalty());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Wix service unavailable');
  });

  it('refreshPoints re-fetches and updates state', async () => {
    let callCount = 0;
    mockQueryData.mockImplementation((collection: string) => {
      if (collection === 'LoyaltyPoints') {
        callCount++;
        const pts = callCount === 1 ? 500 : 600;
        return Promise.resolve({
          items: [makePointsRecord({ points: pts, totalEarned: pts })],
          totalResults: 1,
        });
      }
      return Promise.resolve(EMPTY_TX);
    });

    const { result } = renderHook(() => useLoyalty());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.points).toBe(500);

    await result.current.refreshPoints();
    await waitFor(() => expect(result.current.points).toBe(600));
  });

  it('returns transactions array for a member with transaction history', async () => {
    const tx = makeTxRecord({ _id: 'tx-1', delta: 100, reason: 'purchase' });
    mockQueryData.mockImplementation((collection: string) => {
      if (collection === 'LoyaltyPoints')
        return Promise.resolve({ items: [makePointsRecord()], totalResults: 1 });
      if (collection === 'LoyaltyTransactions')
        return Promise.resolve({ items: [tx], totalResults: 1 });
      return Promise.resolve({ items: [], totalResults: 0 });
    });
    const { result } = renderHook(() => useLoyalty());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.transactions).toHaveLength(1);
    expect(result.current.transactions[0]._id).toBe('tx-1');
    expect(result.current.transactions[0].delta).toBe(100);
  });
});
