/**
 * Tests for useCartSync — wires useOfflineSync to replayOfflineQueue
 * so cart mutations queued while offline are replayed against Wix
 * when connectivity is restored.
 */
import { renderHook, act } from '@testing-library/react-native';

// Mock useOfflineSync
const mockSyncNow = jest.fn();
let capturedOnSync: ((actions: unknown[]) => Promise<void>) | undefined;

jest.mock('../useOfflineSync', () => ({
  useOfflineSync: jest.fn((opts: { onSync?: (actions: unknown[]) => Promise<void> }) => {
    capturedOnSync = opts?.onSync;
    return {
      pendingCount: 0,
      isSyncing: false,
      queueAction: jest.fn(),
      syncNow: mockSyncNow,
    };
  }),
}));

// Mock replayOfflineQueue
const mockReplayOfflineQueue = jest.fn();
jest.mock('@/services/wix/replayOfflineQueue', () => ({
  replayOfflineQueue: (...args: unknown[]) => mockReplayOfflineQueue(...args),
}));

// Mock useWixClient
const mockWixClient = {
  addToCart: jest.fn(),
  removeCartLineItems: jest.fn(),
  updateCartLineItems: jest.fn(),
};
jest.mock('@/services/wix/wixProvider', () => ({
  useWixClient: () => mockWixClient,
}));

import { useCartSync } from '../useCartSync';
import type { QueuedAction } from '@/services/offlineQueue';

beforeEach(() => {
  jest.clearAllMocks();
  capturedOnSync = undefined;
});

describe('useCartSync', () => {
  it('returns pendingCount, isSyncing, queueAction, syncNow, and lastReplayResult', () => {
    const { result } = renderHook(() => useCartSync({ cartId: 'cart-1' }));

    expect(result.current).toEqual(
      expect.objectContaining({
        pendingCount: expect.any(Number),
        isSyncing: expect.any(Boolean),
        queueAction: expect.any(Function),
        syncNow: expect.any(Function),
        lastReplayResult: null,
      }),
    );
  });

  it('passes replayOfflineQueue as the onSync handler to useOfflineSync', () => {
    renderHook(() => useCartSync({ cartId: 'cart-1' }));
    expect(capturedOnSync).toBeDefined();
  });

  it('onSync calls replayOfflineQueue with actions, cartId, and wixClient', async () => {
    mockReplayOfflineQueue.mockResolvedValue({
      succeeded: 2,
      failed: 0,
      skipped: 0,
      errors: [],
    });

    const { result } = renderHook(() => useCartSync({ cartId: 'cart-1' }));

    const actions: QueuedAction[] = [
      {
        id: 'oq-1',
        timestamp: Date.now(),
        domain: 'cart',
        action: 'ADD_ITEM',
        payload: { productId: 'p1', quantity: 1 },
      },
      {
        id: 'oq-2',
        timestamp: Date.now(),
        domain: 'cart',
        action: 'REMOVE_ITEM',
        payload: { itemId: 'li-1' },
      },
    ];

    await act(async () => {
      await capturedOnSync!(actions);
    });

    expect(mockReplayOfflineQueue).toHaveBeenCalledWith(actions, 'cart-1', mockWixClient);
    expect(result.current.lastReplayResult).toEqual({
      succeeded: 2,
      failed: 0,
      skipped: 0,
      errors: [],
    });
  });

  it('does not call replayOfflineQueue when cartId is not provided', async () => {
    renderHook(() => useCartSync({}));

    const actions: QueuedAction[] = [
      {
        id: 'oq-1',
        timestamp: Date.now(),
        domain: 'cart',
        action: 'ADD_ITEM',
        payload: { productId: 'p1', quantity: 1 },
      },
    ];

    await act(async () => {
      await capturedOnSync!(actions);
    });

    expect(mockReplayOfflineQueue).not.toHaveBeenCalled();
  });

  it('stores replay errors in lastReplayResult', async () => {
    const replayError = new Error('Wix API failed');
    mockReplayOfflineQueue.mockResolvedValue({
      succeeded: 1,
      failed: 1,
      skipped: 0,
      errors: [{ action: { id: 'oq-2' }, error: replayError }],
    });

    const { result } = renderHook(() => useCartSync({ cartId: 'cart-1' }));

    await act(async () => {
      await capturedOnSync!([
        {
          id: 'oq-1',
          timestamp: Date.now(),
          domain: 'cart',
          action: 'ADD_ITEM',
          payload: { productId: 'p1', quantity: 1 },
        },
      ]);
    });

    expect(result.current.lastReplayResult?.failed).toBe(1);
    expect(result.current.lastReplayResult?.errors).toHaveLength(1);
  });

  it('handles replayOfflineQueue throwing by not crashing', async () => {
    mockReplayOfflineQueue.mockRejectedValue(new Error('Network error'));

    renderHook(() => useCartSync({ cartId: 'cart-1' }));

    // Should not throw
    await act(async () => {
      await capturedOnSync!([
        {
          id: 'oq-1',
          timestamp: Date.now(),
          domain: 'cart',
          action: 'ADD_ITEM',
          payload: { productId: 'p1', quantity: 1 },
        },
      ]);
    });
  });

  it('updates lastReplayResult on each sync', async () => {
    mockReplayOfflineQueue
      .mockResolvedValueOnce({ succeeded: 1, failed: 0, skipped: 0, errors: [] })
      .mockResolvedValueOnce({ succeeded: 3, failed: 0, skipped: 1, errors: [] });

    const { result } = renderHook(() => useCartSync({ cartId: 'cart-1' }));

    await act(async () => {
      await capturedOnSync!([
        { id: 'oq-1', timestamp: Date.now(), domain: 'cart', action: 'ADD_ITEM', payload: {} },
      ]);
    });
    expect(result.current.lastReplayResult?.succeeded).toBe(1);

    await act(async () => {
      await capturedOnSync!([
        { id: 'oq-2', timestamp: Date.now(), domain: 'cart', action: 'ADD_ITEM', payload: {} },
      ]);
    });
    expect(result.current.lastReplayResult?.succeeded).toBe(3);
  });
});
