/**
 * TDD tests for useCartSessions hook.
 *
 * Covers:
 *  - On mount: loads cart from CartSessions by sessionToken (guest)
 *  - On mount: loads cart by memberId when authenticated
 *  - saveCart: upserts CartSessions with current items + sessionToken/memberId
 *  - mergeOnLogin: combines guest cart + member cart, dedup by productId+variantId,
 *    takes higher quantity, writes merged result keyed by memberId
 *  - mergeOnLogin: guest-only items are added to merged result
 *  - mergeOnLogin: member-only items are preserved in merged result
 *  - mergeOnLogin: conflict with same productId+variantId → higher qty wins
 *  - mergeOnLogin: quantities equal → either (use member qty)
 *  - No Wix client → returns empty items, saveCart/merge are no-ops
 *  - Network error on load → sets loadError, returns empty items
 *  - Network error on save → sets saveError
 *  - Empty CartSessions collection → items is empty array
 *  - items JSON round-trips correctly (parse error → treat as empty)
 *  - Second device: same memberId loads the merged cart
 *
 * @bead cm-lqw
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useCartSessions } from '../useCartSessions';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockQueryData = jest.fn();
const mockUpsertDataItem = jest.fn();
let mockWixClient: { queryData: jest.Mock; upsertDataItem: jest.Mock } | null = null;

jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => mockWixClient,
}));

const mockGetSessionToken = jest.fn();
jest.mock('@/services/sessionToken', () => ({
  getSessionToken: () => mockGetSessionToken(),
}));

jest.mock('@/services/crashReporting', () => ({ captureException: jest.fn() }));

// ── Helpers ───────────────────────────────────────────────────────────────────

const SESSION_TOKEN = 'test-session-uuid-1234';
const MEMBER_ID = 'member-abc-123';

type CartSessionItem = { productId: string; variantId: string; quantity: number };

function makeSessionRecord(
  items: CartSessionItem[],
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    sessionToken: SESSION_TOKEN,
    memberId: null,
    items: JSON.stringify(items),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function renderCartSessions(memberId: string | null = null) {
  return renderHook(() => useCartSessions({ memberId }));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useCartSessions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWixClient = { queryData: mockQueryData, upsertDataItem: mockUpsertDataItem };
    mockGetSessionToken.mockResolvedValue(SESSION_TOKEN);
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
    mockUpsertDataItem.mockResolvedValue({ id: 'doc-1', data: {} });
  });

  // ── Initial load — guest ───────────────────────────────────────────────────

  describe('guest cart load (no memberId)', () => {
    it('queries CartSessions by sessionToken on mount', async () => {
      const { result } = renderCartSessions(null);
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockQueryData).toHaveBeenCalledWith(
        'CartSessions',
        expect.objectContaining({
          filter: { sessionToken: { $eq: SESSION_TOKEN } },
        }),
      );
    });

    it('returns empty items when no session record exists', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
      const { result } = renderCartSessions(null);
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.items).toEqual([]);
    });

    it('parses and returns items from the session record', async () => {
      const cartItems = [{ productId: 'prod-1', variantId: 'var-a', quantity: 2 }];
      mockQueryData.mockResolvedValue({
        items: [makeSessionRecord(cartItems)],
        totalResults: 1,
      });
      const { result } = renderCartSessions(null);
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.items).toEqual(cartItems);
    });

    it('sets loadError and returns empty items on network failure', async () => {
      mockQueryData.mockRejectedValue(new Error('Network error'));
      const { result } = renderCartSessions(null);
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.loadError).not.toBeNull();
      expect(result.current.items).toEqual([]);
    });

    it('treats malformed items JSON as empty array', async () => {
      mockQueryData.mockResolvedValue({
        items: [{ ...makeSessionRecord([]), items: 'not-valid-json{{{' }],
        totalResults: 1,
      });
      const { result } = renderCartSessions(null);
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.items).toEqual([]);
    });
  });

  // ── Initial load — member ──────────────────────────────────────────────────

  describe('member cart load (memberId provided)', () => {
    it('queries CartSessions by memberId when authenticated', async () => {
      const { result } = renderCartSessions(MEMBER_ID);
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockQueryData).toHaveBeenCalledWith(
        'CartSessions',
        expect.objectContaining({
          filter: { memberId: { $eq: MEMBER_ID } },
        }),
      );
    });

    it('returns items from the member cart record', async () => {
      const cartItems = [{ productId: 'prod-2', variantId: 'var-b', quantity: 1 }];
      mockQueryData.mockResolvedValue({
        items: [makeSessionRecord(cartItems, { memberId: MEMBER_ID })],
        totalResults: 1,
      });
      const { result } = renderCartSessions(MEMBER_ID);
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.items).toEqual(cartItems);
    });

    it('same memberId on second device loads the same cart', async () => {
      const cartItems = [
        { productId: 'prod-1', variantId: 'var-a', quantity: 3 },
        { productId: 'prod-2', variantId: 'var-b', quantity: 1 },
      ];
      mockQueryData.mockResolvedValue({
        items: [makeSessionRecord(cartItems, { memberId: MEMBER_ID })],
        totalResults: 1,
      });
      const { result } = renderCartSessions(MEMBER_ID);
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.items).toHaveLength(2);
      expect(result.current.items).toEqual(cartItems);
    });
  });

  // ── saveCart ───────────────────────────────────────────────────────────────

  describe('saveCart', () => {
    it('upserts CartSessions with sessionToken when guest', async () => {
      const { result } = renderCartSessions(null);
      await waitFor(() => expect(result.current.loading).toBe(false));

      const newItems = [{ productId: 'prod-1', variantId: 'var-a', quantity: 2 }];
      await act(async () => result.current.saveCart(newItems));

      expect(mockUpsertDataItem).toHaveBeenCalledWith(
        'CartSessions',
        { sessionToken: { $eq: SESSION_TOKEN } },
        expect.objectContaining({
          sessionToken: SESSION_TOKEN,
          items: JSON.stringify(newItems),
        }),
      );
    });

    it('upserts CartSessions with memberId when authenticated', async () => {
      const { result } = renderCartSessions(MEMBER_ID);
      await waitFor(() => expect(result.current.loading).toBe(false));

      const newItems = [{ productId: 'prod-2', variantId: 'var-b', quantity: 1 }];
      await act(async () => result.current.saveCart(newItems));

      expect(mockUpsertDataItem).toHaveBeenCalledWith(
        'CartSessions',
        { memberId: { $eq: MEMBER_ID } },
        expect.objectContaining({
          memberId: MEMBER_ID,
          items: JSON.stringify(newItems),
        }),
      );
    });

    it('includes updatedAt ISO timestamp in the upserted record', async () => {
      const { result } = renderCartSessions(null);
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => result.current.saveCart([]));

      const upsertedData = mockUpsertDataItem.mock.calls[0][2];
      expect(typeof upsertedData.updatedAt).toBe('string');
      expect(new Date(upsertedData.updatedAt).getTime()).toBeGreaterThan(0);
    });

    it('sets saveError on upsert failure', async () => {
      mockUpsertDataItem.mockRejectedValue(new Error('Write failed'));
      const { result } = renderCartSessions(null);
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => result.current.saveCart([]));
      expect(result.current.saveError).not.toBeNull();
    });

    it('is a no-op when no Wix client', async () => {
      mockWixClient = null;
      const { result } = renderCartSessions(null);
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () =>
        result.current.saveCart([{ productId: 'p', variantId: 'v', quantity: 1 }]),
      );
      expect(mockUpsertDataItem).not.toHaveBeenCalled();
    });
  });

  // ── mergeOnLogin ───────────────────────────────────────────────────────────

  describe('mergeOnLogin', () => {
    const guestItems: CartSessionItem[] = [
      { productId: 'prod-1', variantId: 'var-a', quantity: 3 },
      { productId: 'prod-2', variantId: 'var-b', quantity: 1 },
    ];
    const memberItems: CartSessionItem[] = [
      { productId: 'prod-1', variantId: 'var-a', quantity: 1 }, // same as guest — guest qty higher
      { productId: 'prod-3', variantId: 'var-c', quantity: 2 }, // member-only
    ];

    function setupMergeQuery() {
      mockQueryData.mockImplementation(
        (_col: string, opts: { filter: Record<string, unknown> }) => {
          if ('sessionToken' in opts.filter) {
            return Promise.resolve({ items: [makeSessionRecord(guestItems)], totalResults: 1 });
          }
          if ('memberId' in opts.filter) {
            return Promise.resolve({
              items: [makeSessionRecord(memberItems, { memberId: MEMBER_ID })],
              totalResults: 1,
            });
          }
          return Promise.resolve({ items: [], totalResults: 0 });
        },
      );
    }

    it('returns merged items from both guest and member carts', async () => {
      setupMergeQuery();
      const { result } = renderCartSessions(null);
      await waitFor(() => expect(result.current.loading).toBe(false));

      let merged: CartSessionItem[] = [];
      await act(async () => {
        merged = await result.current.mergeOnLogin(MEMBER_ID);
      });

      expect(merged).toHaveLength(3); // prod-1, prod-2, prod-3
    });

    it('takes higher quantity when same productId+variantId exists in both', async () => {
      setupMergeQuery();
      const { result } = renderCartSessions(null);
      await waitFor(() => expect(result.current.loading).toBe(false));

      let merged: CartSessionItem[] = [];
      await act(async () => {
        merged = await result.current.mergeOnLogin(MEMBER_ID);
      });

      const prod1 = merged.find((i) => i.productId === 'prod-1');
      expect(prod1?.quantity).toBe(3); // guest had 3, member had 1
    });

    it('preserves guest-only items in merged result', async () => {
      setupMergeQuery();
      const { result } = renderCartSessions(null);
      await waitFor(() => expect(result.current.loading).toBe(false));

      let merged: CartSessionItem[] = [];
      await act(async () => {
        merged = await result.current.mergeOnLogin(MEMBER_ID);
      });

      expect(merged.find((i) => i.productId === 'prod-2')).toBeDefined();
    });

    it('preserves member-only items in merged result', async () => {
      setupMergeQuery();
      const { result } = renderCartSessions(null);
      await waitFor(() => expect(result.current.loading).toBe(false));

      let merged: CartSessionItem[] = [];
      await act(async () => {
        merged = await result.current.mergeOnLogin(MEMBER_ID);
      });

      expect(merged.find((i) => i.productId === 'prod-3')).toBeDefined();
    });

    it('when quantities equal, uses member quantity', async () => {
      const equalGuest = [{ productId: 'prod-1', variantId: 'var-a', quantity: 2 }];
      const equalMember = [{ productId: 'prod-1', variantId: 'var-a', quantity: 2 }];
      mockQueryData.mockImplementation(
        (_col: string, opts: { filter: Record<string, unknown> }) => {
          if ('sessionToken' in opts.filter)
            return Promise.resolve({ items: [makeSessionRecord(equalGuest)], totalResults: 1 });
          return Promise.resolve({
            items: [makeSessionRecord(equalMember, { memberId: MEMBER_ID })],
            totalResults: 1,
          });
        },
      );

      const { result } = renderCartSessions(null);
      await waitFor(() => expect(result.current.loading).toBe(false));

      let merged: CartSessionItem[] = [];
      await act(async () => {
        merged = await result.current.mergeOnLogin(MEMBER_ID);
      });
      expect(merged[0].quantity).toBe(2);
    });

    it('writes merged cart keyed by memberId', async () => {
      setupMergeQuery();
      const { result } = renderCartSessions(null);
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.mergeOnLogin(MEMBER_ID);
      });

      expect(mockUpsertDataItem).toHaveBeenCalledWith(
        'CartSessions',
        { memberId: { $eq: MEMBER_ID } },
        expect.objectContaining({ memberId: MEMBER_ID }),
      );
    });

    it('handles empty guest cart gracefully — returns member cart unchanged', async () => {
      mockQueryData.mockImplementation(
        (_col: string, opts: { filter: Record<string, unknown> }) => {
          if ('sessionToken' in opts.filter) return Promise.resolve({ items: [], totalResults: 0 });
          return Promise.resolve({
            items: [makeSessionRecord(memberItems, { memberId: MEMBER_ID })],
            totalResults: 1,
          });
        },
      );

      const { result } = renderCartSessions(null);
      await waitFor(() => expect(result.current.loading).toBe(false));

      let merged: CartSessionItem[] = [];
      await act(async () => {
        merged = await result.current.mergeOnLogin(MEMBER_ID);
      });
      expect(merged).toHaveLength(memberItems.length);
    });

    it('handles empty member cart gracefully — returns guest cart unchanged', async () => {
      mockQueryData.mockImplementation(
        (_col: string, opts: { filter: Record<string, unknown> }) => {
          if ('sessionToken' in opts.filter)
            return Promise.resolve({ items: [makeSessionRecord(guestItems)], totalResults: 1 });
          return Promise.resolve({ items: [], totalResults: 0 });
        },
      );

      const { result } = renderCartSessions(null);
      await waitFor(() => expect(result.current.loading).toBe(false));

      let merged: CartSessionItem[] = [];
      await act(async () => {
        merged = await result.current.mergeOnLogin(MEMBER_ID);
      });
      expect(merged).toHaveLength(guestItems.length);
    });

    it('returns empty array and sets loadError when merge query fails', async () => {
      mockQueryData.mockRejectedValue(new Error('Network error'));
      const { result } = renderCartSessions(null);
      await waitFor(() => expect(result.current.loading).toBe(false));

      let merged: CartSessionItem[] = [];
      await act(async () => {
        merged = await result.current.mergeOnLogin(MEMBER_ID);
      });
      expect(merged).toEqual([]);
      expect(result.current.loadError).not.toBeNull();
    });
  });

  // ── No Wix client ──────────────────────────────────────────────────────────

  describe('no Wix client', () => {
    beforeEach(() => {
      mockWixClient = null;
    });

    it('returns empty items without querying', async () => {
      const { result } = renderCartSessions(null);
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(mockQueryData).not.toHaveBeenCalled();
      expect(result.current.items).toEqual([]);
    });

    it('mergeOnLogin returns empty array without querying', async () => {
      const { result } = renderCartSessions(null);
      await waitFor(() => expect(result.current.loading).toBe(false));

      let merged: CartSessionItem[] = [];
      await act(async () => {
        merged = await result.current.mergeOnLogin(MEMBER_ID);
      });
      expect(merged).toEqual([]);
      expect(mockQueryData).not.toHaveBeenCalled();
    });
  });
});
