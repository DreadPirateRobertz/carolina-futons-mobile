/**
 * TDD tests for offline queue replay — wires queued actions to Wix REST APIs.
 *
 * Action types:
 *   cart/ADD_ITEM      → POST /ecom/v1/carts/{cartId}/add-to-cart
 *   cart/REMOVE_ITEM   → POST /ecom/v1/carts/{cartId}/remove-line-items
 *   cart/UPDATE_QUANTITY → POST /ecom/v1/carts/{cartId}/update-line-items
 *   wishlist/ADD       → no-op (local only)
 *   wishlist/REMOVE    → no-op (local only)
 */

import type { QueuedAction } from '@/services/offlineQueue';
import { replayOfflineQueue } from '../replayOfflineQueue';

describe('replayOfflineQueue', () => {
  let mockClient: {
    addToCart: jest.Mock;
    removeCartLineItems: jest.Mock;
    updateCartLineItems: jest.Mock;
  };

  beforeEach(() => {
    mockClient = {
      addToCart: jest.fn().mockResolvedValue({ cart: { id: 'cart-1' } }),
      removeCartLineItems: jest.fn().mockResolvedValue({ cart: { id: 'cart-1' } }),
      updateCartLineItems: jest.fn().mockResolvedValue({ cart: { id: 'cart-1' } }),
    };
  });

  function makeAction(
    overrides: Partial<QueuedAction> & { domain: QueuedAction['domain']; action: string },
  ): QueuedAction {
    return {
      id: `oq-${Date.now()}-1`,
      timestamp: Date.now(),
      payload: {},
      ...overrides,
    };
  }

  describe('cart/ADD_ITEM', () => {
    it('calls addToCart with catalogItemId and quantity', async () => {
      const actions: QueuedAction[] = [
        makeAction({
          domain: 'cart',
          action: 'ADD_ITEM',
          payload: {
            productId: 'prod-123',
            variantId: 'var-456',
            quantity: 2,
          },
        }),
      ];

      const result = await replayOfflineQueue(actions, 'cart-1', mockClient as any);

      expect(mockClient.addToCart).toHaveBeenCalledWith('cart-1', [
        {
          catalogReference: {
            catalogItemId: 'prod-123',
            appId: '215238eb-22a5-4c36-9e7b-e7c08025e04e',
            options: { variantId: 'var-456' },
          },
          quantity: 2,
        },
      ]);
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('defaults quantity to 1 when not specified', async () => {
      const actions: QueuedAction[] = [
        makeAction({
          domain: 'cart',
          action: 'ADD_ITEM',
          payload: { productId: 'prod-123' },
        }),
      ];

      await replayOfflineQueue(actions, 'cart-1', mockClient as any);

      expect(mockClient.addToCart).toHaveBeenCalledWith('cart-1', [
        {
          catalogReference: {
            catalogItemId: 'prod-123',
            appId: '215238eb-22a5-4c36-9e7b-e7c08025e04e',
            options: {},
          },
          quantity: 1,
        },
      ]);
    });
  });

  describe('cart/REMOVE_ITEM', () => {
    it('calls removeCartLineItems with line item IDs', async () => {
      const actions: QueuedAction[] = [
        makeAction({
          domain: 'cart',
          action: 'REMOVE_ITEM',
          payload: { lineItemIds: ['li-1', 'li-2'] },
        }),
      ];

      await replayOfflineQueue(actions, 'cart-1', mockClient as any);

      expect(mockClient.removeCartLineItems).toHaveBeenCalledWith('cart-1', ['li-1', 'li-2']);
    });

    it('wraps single itemId in array', async () => {
      const actions: QueuedAction[] = [
        makeAction({
          domain: 'cart',
          action: 'REMOVE_ITEM',
          payload: { itemId: 'li-solo' },
        }),
      ];

      await replayOfflineQueue(actions, 'cart-1', mockClient as any);

      expect(mockClient.removeCartLineItems).toHaveBeenCalledWith('cart-1', ['li-solo']);
    });
  });

  describe('cart/UPDATE_QUANTITY', () => {
    it('calls updateCartLineItems with line item ID and new quantity', async () => {
      const actions: QueuedAction[] = [
        makeAction({
          domain: 'cart',
          action: 'UPDATE_QUANTITY',
          payload: { lineItemId: 'li-1', quantity: 5 },
        }),
      ];

      await replayOfflineQueue(actions, 'cart-1', mockClient as any);

      expect(mockClient.updateCartLineItems).toHaveBeenCalledWith('cart-1', [
        { id: 'li-1', quantity: 5 },
      ]);
    });
  });

  describe('wishlist actions', () => {
    it('skips wishlist/ADD actions (local only)', async () => {
      const actions: QueuedAction[] = [
        makeAction({
          domain: 'wishlist',
          action: 'ADD',
          payload: { productId: 'p-1' },
        }),
      ];

      const result = await replayOfflineQueue(actions, 'cart-1', mockClient as any);

      expect(mockClient.addToCart).not.toHaveBeenCalled();
      expect(mockClient.removeCartLineItems).not.toHaveBeenCalled();
      expect(mockClient.updateCartLineItems).not.toHaveBeenCalled();
      expect(result.skipped).toBe(1);
    });

    it('skips wishlist/REMOVE actions (local only)', async () => {
      const actions: QueuedAction[] = [
        makeAction({
          domain: 'wishlist',
          action: 'REMOVE',
          payload: { productId: 'p-1' },
        }),
      ];

      const result = await replayOfflineQueue(actions, 'cart-1', mockClient as any);

      expect(result.skipped).toBe(1);
    });
  });

  describe('error handling', () => {
    it('continues processing after a failed action', async () => {
      mockClient.addToCart
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ cart: { id: 'cart-1' } });

      const actions: QueuedAction[] = [
        makeAction({
          domain: 'cart',
          action: 'ADD_ITEM',
          payload: { productId: 'fail-prod' },
        }),
        makeAction({
          domain: 'cart',
          action: 'ADD_ITEM',
          payload: { productId: 'ok-prod' },
        }),
      ];

      const result = await replayOfflineQueue(actions, 'cart-1', mockClient as any);

      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].action.payload.productId).toBe('fail-prod');
      expect(result.errors[0].error.message).toBe('Network error');
    });

    it('records unknown action types as skipped', async () => {
      const actions: QueuedAction[] = [
        makeAction({
          domain: 'cart',
          action: 'UNKNOWN_ACTION',
          payload: {},
        }),
      ];

      const result = await replayOfflineQueue(actions, 'cart-1', mockClient as any);

      expect(result.skipped).toBe(1);
    });
  });

  describe('mixed queue', () => {
    it('replays cart actions and skips wishlist actions in order', async () => {
      const actions: QueuedAction[] = [
        makeAction({ domain: 'cart', action: 'ADD_ITEM', payload: { productId: 'p1' } }),
        makeAction({ domain: 'wishlist', action: 'ADD', payload: { productId: 'p2' } }),
        makeAction({
          domain: 'cart',
          action: 'REMOVE_ITEM',
          payload: { lineItemIds: ['li-1'] },
        }),
        makeAction({
          domain: 'cart',
          action: 'UPDATE_QUANTITY',
          payload: { lineItemId: 'li-2', quantity: 3 },
        }),
        makeAction({ domain: 'wishlist', action: 'REMOVE', payload: { productId: 'p3' } }),
      ];

      const result = await replayOfflineQueue(actions, 'cart-1', mockClient as any);

      expect(result.succeeded).toBe(3);
      expect(result.skipped).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockClient.addToCart).toHaveBeenCalledTimes(1);
      expect(mockClient.removeCartLineItems).toHaveBeenCalledTimes(1);
      expect(mockClient.updateCartLineItems).toHaveBeenCalledTimes(1);
    });
  });

  describe('empty queue', () => {
    it('returns zero counts for empty actions array', async () => {
      const result = await replayOfflineQueue([], 'cart-1', mockClient as any);

      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toEqual([]);
    });
  });
});
