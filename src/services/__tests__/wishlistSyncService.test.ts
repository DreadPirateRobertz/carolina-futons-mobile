import { WishlistSyncService } from '../wishlistSyncService';
import { WixClient, type WixClientConfig } from '../wix/wixClient';
import type { WishlistItem } from '@/hooks/useWishlist';
import type { QueuedAction } from '../offlineQueue';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const TEST_CONFIG: WixClientConfig = {
  apiKey: 'test-api-key',
  siteId: 'test-site-id',
};

const MOCK_WISHLIST_ITEM: WishlistItem = {
  productId: 'prod-1',
  addedAt: 1000,
  savedPrice: 299,
};

const SERVER_TIME = '2026-03-06T12:00:00.000Z';
const SERVER_TIME_MS = new Date(SERVER_TIME).getTime();

function mockQueryEmpty() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ dataItems: [], pagingMetadata: { total: 0 } }),
  });
}

function mockQueryWithItems(items: WishlistItem[], serverTime: string, docId = 'doc-1') {
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

describe('WishlistSyncService', () => {
  const client = new WixClient(TEST_CONFIG);
  const service = new WishlistSyncService(client);

  describe('pullWishlist', () => {
    it('returns null when no server wishlist exists', async () => {
      mockQueryEmpty();
      const result = await service.pullWishlist('user-1');
      expect(result).toBeNull();
    });

    it('returns server wishlist items with server timestamp', async () => {
      mockQueryWithItems([MOCK_WISHLIST_ITEM], SERVER_TIME);
      const result = await service.pullWishlist('user-1');
      expect(result).not.toBeNull();
      expect(result!.items).toHaveLength(1);
      expect(result!.items[0].productId).toBe('prod-1');
      expect(result!.serverTimestamp).toBe(SERVER_TIME_MS);
    });

    it('queries with correct userId filter', async () => {
      mockQueryEmpty();
      await service.pullWishlist('user-42');
      const [, opts] = mockFetch.mock.calls[0];
      const body = JSON.parse(opts.body);
      expect(body.dataCollectionId).toBe('user_wishlists');
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
      const result = await service.pullWishlist('user-1');
      expect(result!.serverTimestamp).toBe(0);
    });
  });

  describe('pushWishlist', () => {
    it('inserts new doc when no server wishlist exists', async () => {
      mockQueryEmpty();
      mockMutationSuccess('new-doc');

      await service.pushWishlist('user-1', [MOCK_WISHLIST_ITEM]);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      const [, opts] = mockFetch.mock.calls[1];
      const body = JSON.parse(opts.body);
      expect(body.dataItem.data.userId).toBe('user-1');
      expect(body.dataItem.data.items).toHaveLength(1);
      expect(body.dataItem.data.updatedAt).toBeUndefined();
    });

    it('returns server timestamp from response', async () => {
      mockQueryEmpty();
      mockMutationSuccess('new-doc', '2026-03-06T15:30:00.000Z');

      const serverTs = await service.pushWishlist('user-1', [MOCK_WISHLIST_ITEM]);

      expect(serverTs).toBe(new Date('2026-03-06T15:30:00.000Z').getTime());
    });

    it('updates existing doc when server wishlist exists', async () => {
      mockQueryWithItems([], SERVER_TIME, 'existing-doc');
      mockMutationSuccess('existing-doc');

      await service.pushWishlist('user-1', [MOCK_WISHLIST_ITEM]);

      const [url, opts] = mockFetch.mock.calls[1];
      expect(url).toContain('/wix-data/v2/items/existing-doc');
      expect(opts.method).toBe('PUT');
    });
  });

  describe('resolveConflict', () => {
    it('returns server state when server is newer', () => {
      const result = service.resolveConflict(
        { items: [MOCK_WISHLIST_ITEM], serverTimestamp: 1000 },
        { items: [], serverTimestamp: 2000 },
      );
      expect(result.source).toBe('server');
      expect(result.items).toEqual([]);
    });

    it('returns local state when local is newer', () => {
      const result = service.resolveConflict(
        { items: [MOCK_WISHLIST_ITEM], serverTimestamp: 3000 },
        { items: [], serverTimestamp: 1000 },
      );
      expect(result.source).toBe('local');
      expect(result.items).toHaveLength(1);
    });

    it('returns local state on tie', () => {
      const result = service.resolveConflict(
        { items: [MOCK_WISHLIST_ITEM], serverTimestamp: 1000 },
        { items: [], serverTimestamp: 1000 },
      );
      expect(result.source).toBe('local');
    });
  });

  describe('replayActions', () => {
    it('coalesces queued actions and pushes final state', async () => {
      mockQueryEmpty();
      mockMutationSuccess();

      const item2: WishlistItem = { productId: 'prod-2', addedAt: 2000, savedPrice: 199 };
      const actions: QueuedAction[] = [
        {
          id: 'oq-1',
          timestamp: 1000,
          domain: 'wishlist',
          action: 'ADD',
          payload: { items: [MOCK_WISHLIST_ITEM] },
        },
        {
          id: 'oq-2',
          timestamp: 2000,
          domain: 'wishlist',
          action: 'ADD',
          payload: { items: [MOCK_WISHLIST_ITEM, item2] },
        },
      ];

      const serverTs = await service.replayActions('user-1', actions);

      // Coalesced: 1 query + 1 insert = 2 calls
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const [, opts] = mockFetch.mock.calls[1];
      const body = JSON.parse(opts.body);
      expect(body.dataItem.data.items).toHaveLength(2);
      expect(serverTs).toBe(SERVER_TIME_MS);
    });

    it('returns 0 for empty actions array without API calls', async () => {
      const serverTs = await service.replayActions('user-1', []);
      expect(mockFetch).not.toHaveBeenCalled();
      expect(serverTs).toBe(0);
    });
  });
});
