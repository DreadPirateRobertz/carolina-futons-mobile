import { CartSessionService, type CartSessionItem } from '../cartSessionService';
import { WixClient, type WixClientConfig, WixApiError } from '../wix/wixClient';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const TEST_CONFIG: WixClientConfig = {
  apiKey: 'test-api-key',
  siteId: 'test-site-id',
};

const SESSION_TOKEN = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const MEMBER_ID = 'member-42';
const SERVER_TIME = '2026-03-10T10:00:00.000Z';
const SERVER_TIME_MS = new Date(SERVER_TIME).getTime();
const OLDER_SERVER_TIME = '2026-03-10T09:00:00.000Z';
const OLDER_SERVER_TIME_MS = new Date(OLDER_SERVER_TIME).getTime();

const ITEM_A: CartSessionItem = { productId: 'prod-1', variantId: 'var-1', quantity: 2 };
const ITEM_B: CartSessionItem = { productId: 'prod-2', variantId: 'var-2', quantity: 1 };

function mockQueryEmpty() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ dataItems: [], pagingMetadata: { total: 0 } }),
  });
}

function mockQueryWithSession(
  items: CartSessionItem[],
  sessionToken: string,
  memberId: string | null,
  serverTime: string,
  mergedAt: number | null = null,
  docId = 'doc-1',
) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () =>
      Promise.resolve({
        dataItems: [
          {
            id: docId,
            data: {
              sessionToken,
              memberId,
              items,
              lastUpdated: new Date(serverTime).getTime(),
              mergedAt,
            },
            _updatedDate: serverTime,
          },
        ],
        pagingMetadata: { total: 1 },
      }),
  });
}

function mockMutationSuccess(id = 'doc-1', serverTime = SERVER_TIME) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ dataItem: { id, data: {}, _updatedDate: serverTime } }),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('CartSessionService', () => {
  const client = new WixClient(TEST_CONFIG);
  const service = new CartSessionService(client);

  // ── loadGuestSession ──────────────────────────────────────────

  describe('loadGuestSession', () => {
    it('returns null when no session exists for token', async () => {
      mockQueryEmpty();
      const result = await service.loadGuestSession(SESSION_TOKEN);
      expect(result).toBeNull();
    });

    it('returns session with items when found by sessionToken', async () => {
      mockQueryWithSession([ITEM_A], SESSION_TOKEN, null, SERVER_TIME);
      const result = await service.loadGuestSession(SESSION_TOKEN);
      expect(result).not.toBeNull();
      expect(result!.items).toHaveLength(1);
      expect(result!.items[0].productId).toBe('prod-1');
      expect(result!.lastUpdated).toBe(SERVER_TIME_MS);
    });

    it('queries CartSessions collection with sessionToken filter', async () => {
      mockQueryEmpty();
      await service.loadGuestSession(SESSION_TOKEN);
      const [, opts] = mockFetch.mock.calls[0];
      const body = JSON.parse(opts.body);
      expect(body.dataCollectionId).toBe('CartSessions');
      expect(body.query.filter).toEqual({ sessionToken: { $eq: SESSION_TOKEN } });
    });

    it('returns null for empty sessionToken', async () => {
      const result = await service.loadGuestSession('');
      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('throws on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      await expect(service.loadGuestSession(SESSION_TOKEN)).rejects.toThrow();
    });

    it('returns empty items array when session has no items', async () => {
      mockQueryWithSession([], SESSION_TOKEN, null, SERVER_TIME);
      const result = await service.loadGuestSession(SESSION_TOKEN);
      expect(result!.items).toEqual([]);
    });
  });

  // ── loadMemberSession ─────────────────────────────────────────

  describe('loadMemberSession', () => {
    it('returns null when no session exists for memberId', async () => {
      mockQueryEmpty();
      const result = await service.loadMemberSession(MEMBER_ID);
      expect(result).toBeNull();
    });

    it('returns session with items when found by memberId', async () => {
      mockQueryWithSession([ITEM_B], SESSION_TOKEN, MEMBER_ID, SERVER_TIME);
      const result = await service.loadMemberSession(MEMBER_ID);
      expect(result).not.toBeNull();
      expect(result!.items).toHaveLength(1);
      expect(result!.items[0].productId).toBe('prod-2');
    });

    it('queries CartSessions collection with memberId filter', async () => {
      mockQueryEmpty();
      await service.loadMemberSession(MEMBER_ID);
      const [, opts] = mockFetch.mock.calls[0];
      const body = JSON.parse(opts.body);
      expect(body.dataCollectionId).toBe('CartSessions');
      expect(body.query.filter).toEqual({ memberId: { $eq: MEMBER_ID } });
    });

    it('returns null for empty memberId', async () => {
      const result = await service.loadMemberSession('');
      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('picks the most recently updated session when multiple exist (last-write-wins)', async () => {
      // In practice Wix returns one, but service should sort/pick latest
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            dataItems: [
              {
                id: 'doc-old',
                data: {
                  sessionToken: 'tok-1',
                  memberId: MEMBER_ID,
                  items: [ITEM_A],
                  lastUpdated: OLDER_SERVER_TIME_MS,
                  mergedAt: null,
                },
                _updatedDate: OLDER_SERVER_TIME,
              },
              {
                id: 'doc-new',
                data: {
                  sessionToken: 'tok-2',
                  memberId: MEMBER_ID,
                  items: [ITEM_B],
                  lastUpdated: SERVER_TIME_MS,
                  mergedAt: null,
                },
                _updatedDate: SERVER_TIME,
              },
            ],
            pagingMetadata: { total: 2 },
          }),
      });
      const result = await service.loadMemberSession(MEMBER_ID);
      expect(result!.items[0].productId).toBe('prod-2');
    });
  });

  // ── saveSession ───────────────────────────────────────────────

  describe('saveSession', () => {
    it('inserts a new session when none exists for sessionToken', async () => {
      mockQueryEmpty(); // upsert query
      mockMutationSuccess('new-doc');

      await service.saveSession(SESSION_TOKEN, null, [ITEM_A]);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      const [, opts] = mockFetch.mock.calls[1];
      const body = JSON.parse(opts.body);
      expect(body.dataItem.data.sessionToken).toBe(SESSION_TOKEN);
      expect(body.dataItem.data.memberId).toBeNull();
      expect(body.dataItem.data.items).toHaveLength(1);
      expect(body.dataItem.data.lastUpdated).toBeDefined();
      expect(body.dataItem.data.mergedAt).toBeNull();
    });

    it('updates an existing session when found', async () => {
      mockQueryWithSession([ITEM_A], SESSION_TOKEN, null, OLDER_SERVER_TIME, null, 'existing-doc');
      mockMutationSuccess('existing-doc');

      await service.saveSession(SESSION_TOKEN, MEMBER_ID, [ITEM_A, ITEM_B]);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      const [url, opts] = mockFetch.mock.calls[1];
      expect(url).toContain('/wix-data/v2/items/existing-doc');
      expect(opts.method).toBe('PUT');
      const body = JSON.parse(opts.body);
      expect(body.dataItem.data.memberId).toBe(MEMBER_ID);
      expect(body.dataItem.data.items).toHaveLength(2);
    });

    it('returns the server timestamp from the response', async () => {
      mockQueryEmpty();
      mockMutationSuccess('doc-1', '2026-03-10T12:00:00.000Z');

      const ts = await service.saveSession(SESSION_TOKEN, null, []);
      expect(ts).toBe(new Date('2026-03-10T12:00:00.000Z').getTime());
    });

    it('throws on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      await expect(service.saveSession(SESSION_TOKEN, null, [])).rejects.toThrow();
    });

    it('does not include mergedAt when not provided', async () => {
      mockQueryEmpty();
      mockMutationSuccess();

      await service.saveSession(SESSION_TOKEN, null, []);
      const [, opts] = mockFetch.mock.calls[1];
      const body = JSON.parse(opts.body);
      expect(body.dataItem.data.mergedAt).toBeNull();
    });
  });

  // ── mergeOnLogin ──────────────────────────────────────────────

  describe('mergeOnLogin', () => {
    it('saves guest items to member session when no member session exists', async () => {
      // loadGuestSession
      mockQueryWithSession([ITEM_A], SESSION_TOKEN, null, SERVER_TIME);
      // loadMemberSession
      mockQueryEmpty();
      // saveSession (upsert query + insert)
      mockQueryEmpty();
      mockMutationSuccess('merged-doc');

      const result = await service.mergeOnLogin(SESSION_TOKEN, MEMBER_ID);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].productId).toBe('prod-1');
    });

    it('uses member session when no guest session exists', async () => {
      // loadGuestSession
      mockQueryEmpty();
      // loadMemberSession
      mockQueryWithSession([ITEM_B], SESSION_TOKEN, MEMBER_ID, SERVER_TIME);
      // saveSession (upsert query + update)
      mockQueryWithSession([ITEM_B], SESSION_TOKEN, MEMBER_ID, SERVER_TIME, null, 'member-doc');
      mockMutationSuccess('member-doc');

      const result = await service.mergeOnLogin(SESSION_TOKEN, MEMBER_ID);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].productId).toBe('prod-2');
    });

    it('unions items from both sessions when both exist', async () => {
      // loadGuestSession: has ITEM_A
      mockQueryWithSession([ITEM_A], SESSION_TOKEN, null, SERVER_TIME);
      // loadMemberSession: has ITEM_B
      mockQueryWithSession([ITEM_B], 'other-token', MEMBER_ID, OLDER_SERVER_TIME);
      // saveSession (upsert query + update)
      mockQueryWithSession(
        [ITEM_B],
        'other-token',
        MEMBER_ID,
        OLDER_SERVER_TIME,
        null,
        'member-doc',
      );
      mockMutationSuccess('member-doc');

      const result = await service.mergeOnLogin(SESSION_TOKEN, MEMBER_ID);

      // Union: both items present
      expect(result.items).toHaveLength(2);
      const productIds = result.items.map((i) => i.productId);
      expect(productIds).toContain('prod-1');
      expect(productIds).toContain('prod-2');
    });

    it('resolves duplicate product+variant with last-write-wins quantity', async () => {
      // Guest has ITEM_A (qty 2, newer)
      const guestItem: CartSessionItem = { productId: 'prod-1', variantId: 'var-1', quantity: 2 };
      // Member has same product+variant with qty 5 (older)
      const memberItem: CartSessionItem = { productId: 'prod-1', variantId: 'var-1', quantity: 5 };

      mockQueryWithSession([guestItem], SESSION_TOKEN, null, SERVER_TIME); // guest newer
      mockQueryWithSession([memberItem], 'other-token', MEMBER_ID, OLDER_SERVER_TIME); // member older
      mockQueryWithSession(
        [memberItem],
        'other-token',
        MEMBER_ID,
        OLDER_SERVER_TIME,
        null,
        'member-doc',
      );
      mockMutationSuccess('member-doc');

      const result = await service.mergeOnLogin(SESSION_TOKEN, MEMBER_ID);

      // Should have one item (deduplicated) with guest quantity (guest is newer)
      expect(result.items).toHaveLength(1);
      expect(result.items[0].quantity).toBe(2);
    });

    it('resolves duplicate product+variant: member wins when member is newer', async () => {
      const guestItem: CartSessionItem = { productId: 'prod-1', variantId: 'var-1', quantity: 2 };
      const memberItem: CartSessionItem = { productId: 'prod-1', variantId: 'var-1', quantity: 7 };

      mockQueryWithSession([guestItem], SESSION_TOKEN, null, OLDER_SERVER_TIME); // guest older
      mockQueryWithSession([memberItem], 'other-token', MEMBER_ID, SERVER_TIME); // member newer
      mockQueryWithSession([memberItem], 'other-token', MEMBER_ID, SERVER_TIME, null, 'member-doc');
      mockMutationSuccess('member-doc');

      const result = await service.mergeOnLogin(SESSION_TOKEN, MEMBER_ID);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].quantity).toBe(7);
    });

    it('stamps mergedAt on the saved session', async () => {
      mockQueryWithSession([ITEM_A], SESSION_TOKEN, null, SERVER_TIME);
      mockQueryEmpty();
      mockQueryEmpty();
      mockMutationSuccess();

      await service.mergeOnLogin(SESSION_TOKEN, MEMBER_ID);

      // Find the insert call body
      const insertCallOpts = mockFetch.mock.calls[mockFetch.mock.calls.length - 1][1];
      const body = JSON.parse(insertCallOpts.body);
      expect(body.dataItem.data.mergedAt).toBeGreaterThan(0);
    });

    it('returns empty items when both sessions are empty', async () => {
      mockQueryEmpty(); // guest
      mockQueryEmpty(); // member
      mockQueryEmpty(); // save upsert
      mockMutationSuccess();

      const result = await service.mergeOnLogin(SESSION_TOKEN, MEMBER_ID);
      expect(result.items).toEqual([]);
    });

    it('throws when sessionToken is empty', async () => {
      await expect(service.mergeOnLogin('', MEMBER_ID)).rejects.toThrow();
    });

    it('throws when memberId is empty', async () => {
      await expect(service.mergeOnLogin(SESSION_TOKEN, '')).rejects.toThrow();
    });
  });

  // ── unionItems ────────────────────────────────────────────────

  describe('unionItems (static helper)', () => {
    it('returns items from a when b is empty', () => {
      const result = CartSessionService.unionItems([ITEM_A], [], SERVER_TIME_MS, 0);
      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe('prod-1');
    });

    it('returns items from b when a is empty', () => {
      const result = CartSessionService.unionItems([], [ITEM_B], 0, SERVER_TIME_MS);
      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe('prod-2');
    });

    it('unions distinct items from both lists', () => {
      const result = CartSessionService.unionItems(
        [ITEM_A],
        [ITEM_B],
        SERVER_TIME_MS,
        SERVER_TIME_MS,
      );
      expect(result).toHaveLength(2);
    });

    it('keeps newer quantity on duplicate product+variant (a newer)', () => {
      const aItem: CartSessionItem = { productId: 'prod-1', variantId: 'var-1', quantity: 3 };
      const bItem: CartSessionItem = { productId: 'prod-1', variantId: 'var-1', quantity: 9 };
      const result = CartSessionService.unionItems(
        [aItem],
        [bItem],
        SERVER_TIME_MS,
        OLDER_SERVER_TIME_MS,
      );
      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBe(3); // a is newer
    });

    it('keeps newer quantity on duplicate product+variant (b newer)', () => {
      const aItem: CartSessionItem = { productId: 'prod-1', variantId: 'var-1', quantity: 3 };
      const bItem: CartSessionItem = { productId: 'prod-1', variantId: 'var-1', quantity: 9 };
      const result = CartSessionService.unionItems(
        [aItem],
        [bItem],
        OLDER_SERVER_TIME_MS,
        SERVER_TIME_MS,
      );
      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBe(9); // b is newer
    });

    it('a wins on timestamp tie', () => {
      const aItem: CartSessionItem = { productId: 'prod-1', variantId: 'var-1', quantity: 4 };
      const bItem: CartSessionItem = { productId: 'prod-1', variantId: 'var-1', quantity: 6 };
      const result = CartSessionService.unionItems(
        [aItem],
        [bItem],
        SERVER_TIME_MS,
        SERVER_TIME_MS,
      );
      expect(result[0].quantity).toBe(4); // a wins tie
    });

    it('handles multiple duplicates and distinct items together', () => {
      const a: CartSessionItem[] = [
        { productId: 'prod-1', variantId: 'var-1', quantity: 2 },
        { productId: 'prod-3', variantId: 'var-3', quantity: 1 },
      ];
      const b: CartSessionItem[] = [
        { productId: 'prod-1', variantId: 'var-1', quantity: 5 },
        { productId: 'prod-2', variantId: 'var-2', quantity: 3 },
      ];
      // a is newer: prod-1 keeps qty 2; prod-3 from a; prod-2 from b
      const result = CartSessionService.unionItems(a, b, SERVER_TIME_MS, OLDER_SERVER_TIME_MS);
      expect(result).toHaveLength(3);
      const byId = Object.fromEntries(result.map((i) => [`${i.productId}:${i.variantId}`, i]));
      expect(byId['prod-1:var-1'].quantity).toBe(2);
      expect(byId['prod-2:var-2'].quantity).toBe(3);
      expect(byId['prod-3:var-3'].quantity).toBe(1);
    });
  });

  // ── item validation ───────────────────────────────────────────

  describe('item validation', () => {
    it('filters out items with invalid productId on load', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            dataItems: [
              {
                id: 'doc-1',
                data: {
                  sessionToken: SESSION_TOKEN,
                  memberId: null,
                  items: [
                    { productId: '', variantId: 'var-1', quantity: 1 }, // invalid
                    ITEM_A,
                  ],
                  lastUpdated: SERVER_TIME_MS,
                  mergedAt: null,
                },
                _updatedDate: SERVER_TIME,
              },
            ],
            pagingMetadata: { total: 1 },
          }),
      });
      const result = await service.loadGuestSession(SESSION_TOKEN);
      expect(result!.items).toHaveLength(1);
      expect(result!.items[0].productId).toBe('prod-1');
    });

    it('filters out items with quantity <= 0', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            dataItems: [
              {
                id: 'doc-1',
                data: {
                  sessionToken: SESSION_TOKEN,
                  memberId: null,
                  items: [
                    { productId: 'prod-x', variantId: 'var-x', quantity: 0 }, // invalid
                    { productId: 'prod-y', variantId: 'var-y', quantity: -1 }, // invalid
                    ITEM_B,
                  ],
                  lastUpdated: SERVER_TIME_MS,
                  mergedAt: null,
                },
                _updatedDate: SERVER_TIME,
              },
            ],
            pagingMetadata: { total: 1 },
          }),
      });
      const result = await service.loadGuestSession(SESSION_TOKEN);
      expect(result!.items).toHaveLength(1);
      expect(result!.items[0].productId).toBe('prod-2');
    });

    it('filters out items with quantity > 10', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            dataItems: [
              {
                id: 'doc-1',
                data: {
                  sessionToken: SESSION_TOKEN,
                  memberId: null,
                  items: [
                    { productId: 'prod-x', variantId: 'var-x', quantity: 11 }, // exceeds max
                    ITEM_A,
                  ],
                  lastUpdated: SERVER_TIME_MS,
                  mergedAt: null,
                },
                _updatedDate: SERVER_TIME,
              },
            ],
            pagingMetadata: { total: 1 },
          }),
      });
      const result = await service.loadGuestSession(SESSION_TOKEN);
      expect(result!.items).toHaveLength(1);
    });

    it('filters out items with non-string productId', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            dataItems: [
              {
                id: 'doc-1',
                data: {
                  sessionToken: SESSION_TOKEN,
                  memberId: null,
                  items: [
                    { productId: 123, variantId: 'var-x', quantity: 1 }, // invalid type
                    ITEM_A,
                  ],
                  lastUpdated: SERVER_TIME_MS,
                  mergedAt: null,
                },
                _updatedDate: SERVER_TIME,
              },
            ],
            pagingMetadata: { total: 1 },
          }),
      });
      const result = await service.loadGuestSession(SESSION_TOKEN);
      expect(result!.items).toHaveLength(1);
    });
  });
});
