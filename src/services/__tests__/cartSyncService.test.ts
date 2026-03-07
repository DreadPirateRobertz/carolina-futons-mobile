import { CartSyncService } from '../cartSyncService';
import { WixClient, type WixClientConfig, WixApiError } from '../wix/wixClient';
import type { CartItem } from '@/hooks/useCart';
import type { QueuedAction } from '../offlineQueue';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const TEST_CONFIG: WixClientConfig = {
  apiKey: 'test-api-key',
  siteId: 'test-site-id',
};

const MOCK_CART_ITEM: CartItem = {
  id: 'model-1:fabric-1',
  model: {
    id: 'model-1',
    name: 'Asheville',
    basePrice: 299,
    description: 'A futon',
    images: [],
    fabrics: [],
  } as CartItem['model'],
  fabric: {
    id: 'fabric-1',
    name: 'Denim Blue',
    hex: '#336699',
    price: 50,
    swatch: 'swatch.jpg',
  } as CartItem['fabric'],
  quantity: 2,
  unitPrice: 349,
};

const SERVER_TIME = '2026-03-06T12:00:00.000Z';
const SERVER_TIME_MS = new Date(SERVER_TIME).getTime();

function mockQueryEmpty() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ dataItems: [], pagingMetadata: { total: 0 } }),
  });
}

function mockQueryWithItems(items: CartItem[], serverTime: string, docId = 'doc-1') {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () =>
      Promise.resolve({
        dataItems: [{ id: docId, data: { userId: 'user-1', items }, _updatedDate: serverTime }],
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

describe('CartSyncService', () => {
  const client = new WixClient(TEST_CONFIG);
  const service = new CartSyncService(client);

  describe('pullCart', () => {
    it('returns null when no server cart exists', async () => {
      mockQueryEmpty();
      const result = await service.pullCart('user-1');
      expect(result).toBeNull();
    });

    it('returns server cart items with server timestamp', async () => {
      mockQueryWithItems([MOCK_CART_ITEM], SERVER_TIME);
      const result = await service.pullCart('user-1');
      expect(result).not.toBeNull();
      expect(result!.items).toHaveLength(1);
      expect(result!.items[0].id).toBe('model-1:fabric-1');
      expect(result!.serverTimestamp).toBe(SERVER_TIME_MS);
    });

    it('queries with correct userId filter', async () => {
      mockQueryEmpty();
      await service.pullCart('user-42');
      const [, opts] = mockFetch.mock.calls[0];
      const body = JSON.parse(opts.body);
      expect(body.dataCollectionId).toBe('user_carts');
      expect(body.query.filter).toEqual({ userId: { $eq: 'user-42' } });
    });

    it('defaults serverTimestamp to 0 when _updatedDate is missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            dataItems: [{ id: 'doc-1', data: { userId: 'user-1', items: [] } }],
            pagingMetadata: { total: 1 },
          }),
      });
      const result = await service.pullCart('user-1');
      expect(result!.serverTimestamp).toBe(0);
    });
  });

  describe('pushCart', () => {
    it('inserts new doc when no server cart exists', async () => {
      mockQueryEmpty(); // upsert: query first
      mockMutationSuccess('new-doc'); // then insert

      const serverTs = await service.pushCart('user-1', [MOCK_CART_ITEM]);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      // Second call is the insert
      const [, opts] = mockFetch.mock.calls[1];
      const body = JSON.parse(opts.body);
      expect(body.dataItem.data.userId).toBe('user-1');
      expect(body.dataItem.data.items).toHaveLength(1);
      // updatedAt should NOT be in payload (server sets timestamp)
      expect(body.dataItem.data.updatedAt).toBeUndefined();
    });

    it('returns server timestamp from response', async () => {
      mockQueryEmpty();
      mockMutationSuccess('new-doc', '2026-03-06T15:30:00.000Z');

      const serverTs = await service.pushCart('user-1', [MOCK_CART_ITEM]);

      expect(serverTs).toBe(new Date('2026-03-06T15:30:00.000Z').getTime());
    });

    it('updates existing doc when server cart exists', async () => {
      mockQueryWithItems([], SERVER_TIME, 'existing-doc'); // upsert: found existing
      mockMutationSuccess('existing-doc'); // then update

      await service.pushCart('user-1', [MOCK_CART_ITEM]);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      const [url, opts] = mockFetch.mock.calls[1];
      expect(url).toContain('/wix-data/v2/items/existing-doc');
      expect(opts.method).toBe('PUT');
    });

    it('throws on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      await expect(
        service.pushCart('user-1', [MOCK_CART_ITEM]),
      ).rejects.toThrow();
    });
  });

  describe('resolveConflict', () => {
    it('returns server state when server is newer', () => {
      const localItems = [{ ...MOCK_CART_ITEM, quantity: 1 }];
      const serverItems = [{ ...MOCK_CART_ITEM, quantity: 3 }];

      const result = service.resolveConflict(
        { items: localItems, serverTimestamp: 1000 },
        { items: serverItems, serverTimestamp: 2000 },
      );

      expect(result.source).toBe('server');
      expect(result.items[0].quantity).toBe(3);
    });

    it('returns local state when local is newer', () => {
      const localItems = [{ ...MOCK_CART_ITEM, quantity: 5 }];
      const serverItems = [{ ...MOCK_CART_ITEM, quantity: 1 }];

      const result = service.resolveConflict(
        { items: localItems, serverTimestamp: 3000 },
        { items: serverItems, serverTimestamp: 1000 },
      );

      expect(result.source).toBe('local');
      expect(result.items[0].quantity).toBe(5);
    });

    it('returns local state on tie (local wins ties)', () => {
      const result = service.resolveConflict(
        { items: [MOCK_CART_ITEM], serverTimestamp: 1000 },
        { items: [], serverTimestamp: 1000 },
      );
      expect(result.source).toBe('local');
    });
  });

  describe('replayActions', () => {
    it('replays ADD_ITEM actions by pushing full cart state', async () => {
      mockQueryEmpty();
      mockMutationSuccess();

      const actions: QueuedAction[] = [
        {
          id: 'oq-1',
          timestamp: 1000,
          domain: 'cart',
          action: 'ADD_ITEM',
          payload: { items: [MOCK_CART_ITEM] },
        },
      ];

      const serverTs = await service.replayActions('user-1', actions);
      expect(mockFetch).toHaveBeenCalled();
      expect(serverTs).toBe(SERVER_TIME_MS);
    });

    it('returns 0 for empty actions array without API calls', async () => {
      const serverTs = await service.replayActions('user-1', []);
      expect(mockFetch).not.toHaveBeenCalled();
      expect(serverTs).toBe(0);
    });

    it('uses last action snapshot for push (coalesces queue)', async () => {
      mockQueryEmpty();
      mockMutationSuccess();

      const actions: QueuedAction[] = [
        {
          id: 'oq-1',
          timestamp: 1000,
          domain: 'cart',
          action: 'ADD_ITEM',
          payload: { items: [MOCK_CART_ITEM] },
        },
        {
          id: 'oq-2',
          timestamp: 2000,
          domain: 'cart',
          action: 'UPDATE_QUANTITY',
          payload: { items: [{ ...MOCK_CART_ITEM, quantity: 5 }] },
        },
      ];

      await service.replayActions('user-1', actions);

      // Should only make one push (coalesced), not replay each action individually
      // 1 query + 1 insert = 2 fetch calls
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const [, opts] = mockFetch.mock.calls[1];
      const body = JSON.parse(opts.body);
      expect(body.dataItem.data.items[0].quantity).toBe(5);
    });
  });
});
