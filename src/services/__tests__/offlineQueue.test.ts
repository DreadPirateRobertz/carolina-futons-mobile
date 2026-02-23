import {
  enqueue,
  getQueue,
  getQueueLength,
  dequeue,
  drain,
  clearQueue,
  _resetForTesting,
} from '../offlineQueue';

beforeEach(() => {
  _resetForTesting();
});

describe('offlineQueue', () => {
  describe('enqueue', () => {
    it('adds an action to the queue', () => {
      const action = enqueue('cart', 'ADD_ITEM', { itemId: 'foo' });
      expect(action.domain).toBe('cart');
      expect(action.action).toBe('ADD_ITEM');
      expect(action.payload).toEqual({ itemId: 'foo' });
      expect(action.id).toMatch(/^oq-/);
      expect(action.timestamp).toBeGreaterThan(0);
    });

    it('assigns unique ids', () => {
      const a1 = enqueue('cart', 'ADD_ITEM', {});
      const a2 = enqueue('cart', 'ADD_ITEM', {});
      expect(a1.id).not.toBe(a2.id);
    });

    it('increments queue length', () => {
      expect(getQueueLength()).toBe(0);
      enqueue('cart', 'ADD_ITEM', {});
      expect(getQueueLength()).toBe(1);
      enqueue('wishlist', 'ADD', {});
      expect(getQueueLength()).toBe(2);
    });
  });

  describe('getQueue', () => {
    it('returns all actions when no domain specified', () => {
      enqueue('cart', 'ADD_ITEM', {});
      enqueue('wishlist', 'ADD', {});
      expect(getQueue()).toHaveLength(2);
    });

    it('filters by domain', () => {
      enqueue('cart', 'ADD_ITEM', {});
      enqueue('wishlist', 'ADD', {});
      enqueue('cart', 'REMOVE_ITEM', {});
      expect(getQueue('cart')).toHaveLength(2);
      expect(getQueue('wishlist')).toHaveLength(1);
    });

    it('returns empty array when queue is empty', () => {
      expect(getQueue()).toEqual([]);
    });
  });

  describe('dequeue', () => {
    it('removes a specific action by id', () => {
      const a1 = enqueue('cart', 'ADD_ITEM', {});
      enqueue('cart', 'REMOVE_ITEM', {});
      expect(dequeue(a1.id)).toBe(true);
      expect(getQueueLength()).toBe(1);
    });

    it('returns false for nonexistent id', () => {
      expect(dequeue('nonexistent')).toBe(false);
    });
  });

  describe('drain', () => {
    it('returns and removes all actions', () => {
      enqueue('cart', 'ADD_ITEM', {});
      enqueue('wishlist', 'ADD', {});
      const drained = drain();
      expect(drained).toHaveLength(2);
      expect(getQueueLength()).toBe(0);
    });

    it('drains only specified domain', () => {
      enqueue('cart', 'ADD_ITEM', {});
      enqueue('wishlist', 'ADD', {});
      enqueue('cart', 'REMOVE_ITEM', {});
      const drained = drain('cart');
      expect(drained).toHaveLength(2);
      expect(getQueueLength()).toBe(1);
      expect(getQueue()[0].domain).toBe('wishlist');
    });

    it('returns empty array when queue is empty', () => {
      expect(drain()).toEqual([]);
    });
  });

  describe('clearQueue', () => {
    it('empties the queue', () => {
      enqueue('cart', 'ADD_ITEM', {});
      enqueue('wishlist', 'ADD', {});
      clearQueue();
      expect(getQueueLength()).toBe(0);
    });
  });
});
