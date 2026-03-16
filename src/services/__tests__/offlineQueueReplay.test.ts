import {
  enqueue,
  replay,
  registerExecutor,
  getExecutor,
  clearExecutors,
  reEnqueue,
  getQueueLength,
  getQueue,
  _resetForTesting,
} from '../offlineQueue';

beforeEach(() => {
  _resetForTesting();
});

describe('offlineQueue replay', () => {
  it('replays queued mutations via registered executors', async () => {
    const mockExecutor = jest.fn().mockResolvedValue(undefined);
    registerExecutor('ADD_ITEM', mockExecutor);

    enqueue('cart', 'ADD_ITEM', { productId: 'p1', quantity: 1 });
    enqueue('cart', 'ADD_ITEM', { productId: 'p2', quantity: 2 });

    const result = await replay({ baseDelayMs: 1 });

    expect(mockExecutor).toHaveBeenCalledTimes(2);
    expect(mockExecutor).toHaveBeenCalledWith({ productId: 'p1', quantity: 1 });
    expect(mockExecutor).toHaveBeenCalledWith({ productId: 'p2', quantity: 2 });
    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(0);
    expect(getQueueLength()).toBe(0);
  });

  it('retries failed replays with exponential backoff', async () => {
    const mockExecutor = jest
      .fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(undefined);
    registerExecutor('ADD_ITEM', mockExecutor);

    enqueue('cart', 'ADD_ITEM', { productId: 'p1' });

    const result = await replay({ maxRetries: 3, baseDelayMs: 1 });

    expect(mockExecutor).toHaveBeenCalledTimes(3);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);
    expect(getQueueLength()).toBe(0);
  });

  it('keeps failed actions in queue after retries exhausted', async () => {
    const mockExecutor = jest.fn().mockRejectedValue(new Error('Server down'));
    registerExecutor('ADD_ITEM', mockExecutor);

    enqueue('cart', 'ADD_ITEM', { productId: 'p1' });

    const result = await replay({ maxRetries: 2, baseDelayMs: 1 });

    // 1 initial + 2 retries = 3 attempts
    expect(mockExecutor).toHaveBeenCalledTimes(3);
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error.message).toBe('Server down');
    // Action remains in queue for next replay cycle
    expect(getQueueLength()).toBe(1);
  });

  it('skips actions with no registered executor', async () => {
    enqueue('cart', 'UNKNOWN_ACTION', { foo: 'bar' });

    const result = await replay({ baseDelayMs: 1 });

    expect(result.failed).toBe(1);
    expect(result.errors[0].error.message).toContain('No executor registered');
    expect(getQueueLength()).toBe(1);
  });

  it('handles mixed success and failure', async () => {
    const successExecutor = jest.fn().mockResolvedValue(undefined);
    const failExecutor = jest.fn().mockRejectedValue(new Error('fail'));
    registerExecutor('ADD_ITEM', successExecutor);
    registerExecutor('REMOVE_ITEM', failExecutor);

    enqueue('cart', 'ADD_ITEM', { productId: 'p1' });
    enqueue('cart', 'REMOVE_ITEM', { productId: 'p2' });
    enqueue('cart', 'ADD_ITEM', { productId: 'p3' });

    const result = await replay({ maxRetries: 1, baseDelayMs: 1 });

    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(1);
    // Only the failed action remains
    expect(getQueueLength()).toBe(1);
    expect(getQueue()[0].action).toBe('REMOVE_ITEM');
  });

  it('returns empty result when queue is empty', async () => {
    const result = await replay({ baseDelayMs: 1 });

    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.errors).toEqual([]);
  });

  it('wraps non-Error thrown values in Error', async () => {
    const mockExecutor = jest.fn().mockRejectedValue('string error');
    registerExecutor('THROW_STRING', mockExecutor);

    enqueue('cart', 'THROW_STRING', { id: 1 });

    const result = await replay({ maxRetries: 0, baseDelayMs: 1 });

    expect(result.failed).toBe(1);
    expect(result.errors[0].error).toBeInstanceOf(Error);
    expect(result.errors[0].error.message).toBe('string error');
  });

  it('replays actions from different domains', async () => {
    const cartExecutor = jest.fn().mockResolvedValue(undefined);
    const wishlistExecutor = jest.fn().mockResolvedValue(undefined);
    registerExecutor('ADD_ITEM', cartExecutor);
    registerExecutor('ADD', wishlistExecutor);

    enqueue('cart', 'ADD_ITEM', { productId: 'p1', quantity: 1 });
    enqueue('wishlist', 'ADD', { productId: 'p2', savedPrice: 299 });

    const result = await replay({ baseDelayMs: 1 });

    expect(cartExecutor).toHaveBeenCalledWith({ productId: 'p1', quantity: 1 });
    expect(wishlistExecutor).toHaveBeenCalledWith({ productId: 'p2', savedPrice: 299 });
    expect(result.succeeded).toBe(2);
    expect(getQueueLength()).toBe(0);
  });

  it('uses default options when none provided', async () => {
    const mockExecutor = jest.fn().mockResolvedValue(undefined);
    registerExecutor('ADD_ITEM', mockExecutor);
    enqueue('cart', 'ADD_ITEM', { productId: 'p1' });

    const result = await replay();

    expect(result.succeeded).toBe(1);
  });
});

describe('executor registry', () => {
  it('registers and retrieves an executor', () => {
    const executor = jest.fn();
    registerExecutor('MY_ACTION', executor);
    expect(getExecutor('MY_ACTION')).toBe(executor);
  });

  it('returns undefined for unregistered action', () => {
    expect(getExecutor('NONEXISTENT')).toBeUndefined();
  });

  it('clearExecutors removes all executors', () => {
    registerExecutor('A', jest.fn());
    registerExecutor('B', jest.fn());
    clearExecutors();
    expect(getExecutor('A')).toBeUndefined();
    expect(getExecutor('B')).toBeUndefined();
  });
});

describe('reEnqueue', () => {
  it('prepends failed actions back to front of queue', () => {
    enqueue('cart', 'ADD_ITEM', { productId: 'p2' });
    const failed = [
      {
        id: 'oq-old-1',
        timestamp: Date.now() - 1000,
        domain: 'cart' as const,
        action: 'ADD_ITEM',
        payload: { productId: 'p1' },
      },
    ];
    reEnqueue(failed);

    const q = getQueue();
    expect(q).toHaveLength(2);
    expect(q[0].id).toBe('oq-old-1');
  });

  it('handles empty array', () => {
    enqueue('cart', 'ADD_ITEM', { productId: 'p1' });
    reEnqueue([]);
    expect(getQueueLength()).toBe(1);
  });
});
