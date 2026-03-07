import { WixClient, type WixClientConfig, WixApiError } from '../wixClient';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const TEST_CONFIG: WixClientConfig = {
  apiKey: 'test-api-key',
  siteId: 'test-site-id',
};

function mockFetchSuccess(data: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

function mockFetchError(status: number, message = 'Error') {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: () => Promise.resolve({ message }),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('WixClient data mutations', () => {
  const client = new WixClient(TEST_CONFIG);

  describe('insertDataItem', () => {
    it('posts to wix-data insert endpoint with correct body', async () => {
      mockFetchSuccess({ dataItem: { id: 'item-1', data: { userId: 'u1', items: [] } } });

      const result = await client.insertDataItem('user_carts', {
        userId: 'u1',
        items: [],
        updatedAt: 1000,
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe('https://www.wixapis.com/wix-data/v2/items');
      expect(opts.method).toBe('POST');
      const body = JSON.parse(opts.body);
      expect(body.dataCollectionId).toBe('user_carts');
      expect(body.dataItem.data.userId).toBe('u1');
      expect(result.id).toBe('item-1');
    });

    it('throws WixApiError on 400 response', async () => {
      mockFetchError(400, 'Bad Request');
      await expect(
        client.insertDataItem('user_carts', { userId: 'u1' }),
      ).rejects.toThrow(WixApiError);
    });

    it('throws WixApiError on network failure', async () => {
      // 3 attempts: initial + 2 retries (default retry config)
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      await expect(
        client.insertDataItem('user_carts', { userId: 'u1' }),
      ).rejects.toThrow(WixApiError);
    }, 10000);

    it('rejects empty collectionId', async () => {
      await expect(
        client.insertDataItem('', { userId: 'u1' }),
      ).rejects.toThrow('Collection ID is required');
    });
  });

  describe('updateDataItem', () => {
    it('puts to wix-data update endpoint', async () => {
      mockFetchSuccess({ dataItem: { id: 'item-1', data: { userId: 'u1', items: [{ id: 'x' }] } } });

      const result = await client.updateDataItem('user_carts', 'item-1', {
        userId: 'u1',
        items: [{ id: 'x' }],
        updatedAt: 2000,
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe('https://www.wixapis.com/wix-data/v2/items/item-1');
      expect(opts.method).toBe('PUT');
      expect(result.id).toBe('item-1');
    });

    it('rejects empty itemId', async () => {
      await expect(
        client.updateDataItem('user_carts', '', { userId: 'u1' }),
      ).rejects.toThrow('Item ID is required');
    });
  });

  describe('deleteDataItem', () => {
    it('deletes from wix-data endpoint', async () => {
      mockFetchSuccess({ dataItem: { id: 'item-1' } });

      await client.deleteDataItem('user_carts', 'item-1');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe('https://www.wixapis.com/wix-data/v2/items/item-1');
      expect(opts.method).toBe('DELETE');
    });

    it('rejects empty collectionId', async () => {
      await expect(client.deleteDataItem('', 'item-1')).rejects.toThrow(
        'Collection ID is required',
      );
    });
  });

  describe('upsertDataItem', () => {
    it('inserts when no existing item found', async () => {
      // queryData returns empty
      mockFetchSuccess({ dataItems: [], pagingMetadata: { total: 0 } });
      // insertDataItem succeeds
      mockFetchSuccess({ dataItem: { id: 'new-1', data: { userId: 'u1', items: [] } } });

      const result = await client.upsertDataItem('user_carts', { userId: { $eq: 'u1' } }, {
        userId: 'u1',
        items: [],
        updatedAt: 1000,
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.id).toBe('new-1');
    });

    it('updates when existing item found', async () => {
      // queryData returns existing item
      mockFetchSuccess({
        dataItems: [{ id: 'existing-1', data: { userId: 'u1', items: [] } }],
        pagingMetadata: { total: 1 },
      });
      // updateDataItem succeeds
      mockFetchSuccess({
        dataItem: { id: 'existing-1', data: { userId: 'u1', items: [{ id: 'x' }] } },
      });

      const result = await client.upsertDataItem('user_carts', { userId: { $eq: 'u1' } }, {
        userId: 'u1',
        items: [{ id: 'x' }],
        updatedAt: 2000,
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.id).toBe('existing-1');
    });
  });
});
