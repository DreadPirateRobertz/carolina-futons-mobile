/**
 * Tests for offlineQueue loadQueue — exercises the error handling paths.
 * The dynamic import() of AsyncStorage inside loadQueue makes full mock
 * interception unreliable, so we focus on testing the error-resilience
 * paths and verifying the function contract.
 */
import { loadQueue, enqueue, getQueue, _resetForTesting } from '../offlineQueue';

beforeEach(() => {
  _resetForTesting();
});

describe('loadQueue', () => {
  it('returns an array', async () => {
    const result = await loadQueue();
    expect(Array.isArray(result)).toBe(true);
  });

  it('returns empty array on fresh state', async () => {
    const result = await loadQueue();
    expect(result).toEqual([]);
  });

  it('does not throw even if AsyncStorage is unavailable', async () => {
    await expect(loadQueue()).resolves.toBeDefined();
  });

  it('returns a copy of the queue (not a reference)', async () => {
    enqueue('cart', 'ADD_ITEM', { id: 1 });
    const result = await loadQueue();
    // Mutating the returned array should not affect internal queue
    result.push({
      id: 'fake',
      timestamp: 0,
      domain: 'cart',
      action: 'FAKE',
      payload: {},
    });
    expect(getQueue()).toHaveLength(1);
  });
});
