/**
 * Integration test: offlineQueue → drain → replayOfflineQueue → WixClient
 *
 * Verifies the full chain from enqueuing actions while offline
 * through draining and replaying them against WixClient cart methods.
 * WixClient.post is mocked at the HTTP level; everything else is real.
 */
import { enqueue, drain, _resetForTesting } from '@/services/offlineQueue';
import { replayOfflineQueue } from '../replayOfflineQueue';
import { WixClient } from '../wixClient';

// Mock fetch at the global level
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  _resetForTesting();
  mockFetch.mockReset();
});

function mockSuccessResponse(cartId: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ cart: { id: cartId } }),
  };
}

describe('offline queue → replay → WixClient integration', () => {
  const client = new WixClient({
    apiKey: 'test-key',
    siteId: 'test-site',
  });

  it('enqueues ADD_ITEM, drains, and replays against WixClient.addToCart', async () => {
    mockFetch.mockResolvedValue(mockSuccessResponse('cart-1'));

    enqueue('cart', 'ADD_ITEM', {
      productId: 'futon-asheville',
      quantity: 2,
    });

    const actions = drain();
    expect(actions).toHaveLength(1);

    const result = await replayOfflineQueue(actions, 'cart-1', client);

    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/ecom/v1/carts/cart-1/add-to-cart');
    const body = JSON.parse(opts.body);
    expect(body.lineItems[0].catalogReference.catalogItemId).toBe('futon-asheville');
    expect(body.lineItems[0].quantity).toBe(2);
  });

  it('enqueues REMOVE_ITEM, drains, and replays against WixClient.removeCartLineItems', async () => {
    mockFetch.mockResolvedValue(mockSuccessResponse('cart-1'));

    enqueue('cart', 'REMOVE_ITEM', { lineItemIds: ['li-42'] });

    const actions = drain();
    const result = await replayOfflineQueue(actions, 'cart-1', client);

    expect(result.succeeded).toBe(1);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/ecom/v1/carts/cart-1/remove-line-items');
    expect(JSON.parse(opts.body).lineItemIds).toEqual(['li-42']);
  });

  it('enqueues UPDATE_QUANTITY, drains, and replays against WixClient.updateCartLineItems', async () => {
    mockFetch.mockResolvedValue(mockSuccessResponse('cart-1'));

    enqueue('cart', 'UPDATE_QUANTITY', { lineItemId: 'li-7', quantity: 5 });

    const actions = drain();
    const result = await replayOfflineQueue(actions, 'cart-1', client);

    expect(result.succeeded).toBe(1);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/ecom/v1/carts/cart-1/update-line-items');
    const body = JSON.parse(opts.body);
    expect(body.lineItems[0].id).toBe('li-7');
    expect(body.lineItems[0].quantity).toBe(5);
  });

  it('replays a mixed queue in order, skipping wishlist actions', async () => {
    mockFetch.mockResolvedValue(mockSuccessResponse('cart-1'));

    enqueue('cart', 'ADD_ITEM', { productId: 'p1', quantity: 1 });
    enqueue('wishlist', 'ADD', { productId: 'p2' });
    enqueue('cart', 'REMOVE_ITEM', { itemId: 'li-1' });
    enqueue('cart', 'UPDATE_QUANTITY', { lineItemId: 'li-3', quantity: 3 });

    const actions = drain();
    expect(actions).toHaveLength(4);

    const result = await replayOfflineQueue(actions, 'cart-1', client);

    expect(result.succeeded).toBe(3);
    expect(result.skipped).toBe(1);
    expect(result.failed).toBe(0);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('continues after a failed action and reports errors', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ message: 'Bad request' }) })
      .mockResolvedValueOnce(mockSuccessResponse('cart-1'));

    enqueue('cart', 'ADD_ITEM', { productId: 'p1', quantity: 1 });
    enqueue('cart', 'ADD_ITEM', { productId: 'p2', quantity: 1 });

    const actions = drain();
    const result = await replayOfflineQueue(actions, 'cart-1', client);

    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('draining empties the queue so re-drain returns nothing', () => {
    enqueue('cart', 'ADD_ITEM', { productId: 'p1', quantity: 1 });
    const first = drain();
    expect(first).toHaveLength(1);

    const second = drain();
    expect(second).toHaveLength(0);
  });
});
