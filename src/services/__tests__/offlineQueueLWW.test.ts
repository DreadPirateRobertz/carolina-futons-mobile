import {
  enqueue,
  getQueue,
  getQueueLength,
  compactByLWW,
  _resetForTesting,
} from '../offlineQueue';

beforeEach(() => {
  _resetForTesting();
});

describe('compactByLWW', () => {
  it('keeps only the latest action per productId', () => {
    enqueue('wishlist', 'WISHLIST_ADD', { productId: 'p1', savedPrice: 100 });
    enqueue('wishlist', 'WISHLIST_REMOVE', { productId: 'p1' });

    expect(getQueueLength()).toBe(2);

    const removed = compactByLWW('wishlist');

    expect(removed).toBe(1);
    expect(getQueueLength()).toBe(1);
    expect(getQueue()[0].action).toBe('WISHLIST_REMOVE');
  });

  it('preserves actions for different productIds', () => {
    enqueue('wishlist', 'WISHLIST_ADD', { productId: 'p1', savedPrice: 100 });
    enqueue('wishlist', 'WISHLIST_ADD', { productId: 'p2', savedPrice: 200 });

    const removed = compactByLWW('wishlist');

    expect(removed).toBe(0);
    expect(getQueueLength()).toBe(2);
  });

  it('handles add→remove→add for same product (keeps last add)', () => {
    enqueue('wishlist', 'WISHLIST_ADD', { productId: 'p1', savedPrice: 100 });
    enqueue('wishlist', 'WISHLIST_REMOVE', { productId: 'p1' });
    enqueue('wishlist', 'WISHLIST_ADD', { productId: 'p1', savedPrice: 150 });

    const removed = compactByLWW('wishlist');

    expect(removed).toBe(2);
    expect(getQueueLength()).toBe(1);
    const remaining = getQueue()[0];
    expect(remaining.action).toBe('WISHLIST_ADD');
    expect(remaining.payload.savedPrice).toBe(150);
  });

  it('does not touch actions from other domains', () => {
    enqueue('cart', 'ADD_ITEM', { productId: 'p1', quantity: 1 });
    enqueue('wishlist', 'WISHLIST_ADD', { productId: 'p1', savedPrice: 100 });
    enqueue('wishlist', 'WISHLIST_REMOVE', { productId: 'p1' });

    compactByLWW('wishlist');

    expect(getQueueLength()).toBe(2); // 1 cart + 1 wishlist
    const cartActions = getQueue('cart');
    expect(cartActions).toHaveLength(1);
    expect(cartActions[0].action).toBe('ADD_ITEM');
  });

  it('returns 0 when no compaction needed', () => {
    enqueue('wishlist', 'WISHLIST_ADD', { productId: 'p1', savedPrice: 100 });

    const removed = compactByLWW('wishlist');

    expect(removed).toBe(0);
    expect(getQueueLength()).toBe(1);
  });

  it('returns 0 for empty queue', () => {
    const removed = compactByLWW('wishlist');
    expect(removed).toBe(0);
  });

  it('compacts multiple products simultaneously', () => {
    enqueue('wishlist', 'WISHLIST_ADD', { productId: 'p1', savedPrice: 100 });
    enqueue('wishlist', 'WISHLIST_ADD', { productId: 'p2', savedPrice: 200 });
    enqueue('wishlist', 'WISHLIST_REMOVE', { productId: 'p1' });
    enqueue('wishlist', 'WISHLIST_REMOVE', { productId: 'p2' });

    const removed = compactByLWW('wishlist');

    expect(removed).toBe(2);
    expect(getQueueLength()).toBe(2);
    const actions = getQueue('wishlist');
    expect(actions.every((a) => a.action === 'WISHLIST_REMOVE')).toBe(true);
  });

  it('uses custom keyField', () => {
    enqueue('wishlist', 'WISHLIST_ADD', { itemKey: 'a', value: 1 });
    enqueue('wishlist', 'WISHLIST_ADD', { itemKey: 'a', value: 2 });

    const removed = compactByLWW('wishlist', 'itemKey');

    expect(removed).toBe(1);
    expect(getQueue()[0].payload.value).toBe(2);
  });
});
