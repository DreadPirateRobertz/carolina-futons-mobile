/**
 * useMutationQueue TDD tests — hq-vel
 *
 * Tests written BEFORE implementation.
 *
 * The hook:
 *   - Queues mutations when offline (persisted to AsyncStorage via offlineQueue)
 *   - Replays queued mutations on reconnect, with exponential backoff
 *   - Deduplicates via Last-Write-Wins before replay (no double-fire)
 *   - Calls onSyncComplete callback after replay so callers can notify users
 *   - Works for cart, wishlist, and profile domains
 *   - Exposes pendingCount, isSyncing, lastReplayResult
 */

import React from 'react';
import { act, waitFor, renderHook } from '@testing-library/react-native';
import { ConnectivityProvider } from '../useConnectivity';
import { useMutationQueue } from '../useMutationQueue';
import { _resetForTesting, getQueue } from '@/services/offlineQueue';
import type { ReplayResult } from '@/services/offlineQueue';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeWrapper(initialOnline = false) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ConnectivityProvider initialOnline={initialOnline} skipNetInfo={true}>
        {children}
      </ConnectivityProvider>
    );
  };
}

/** Render useMutationQueue in a controlled connectivity wrapper. */
function renderQueue(opts: Parameters<typeof useMutationQueue>[0], initialOnline = false) {
  const wrapper = makeWrapper(initialOnline);
  return renderHook(() => useMutationQueue(opts), { wrapper });
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  _resetForTesting();
  jest.clearAllMocks();
});

// ── queueMutation — enqueuing ─────────────────────────────────────────────────

describe('useMutationQueue — queueMutation', () => {
  it('enqueues a mutation when offline', async () => {
    const { result } = renderQueue({
      domain: 'cart',
      executors: {},
    });

    await act(async () => {
      result.current.queueMutation('CART_ADD', { productId: 'p1' });
    });

    expect(result.current.pendingCount).toBe(1);
    const q = getQueue('cart');
    expect(q).toHaveLength(1);
    expect(q[0].action).toBe('CART_ADD');
    expect(q[0].domain).toBe('cart');
    expect(q[0].payload).toEqual({ productId: 'p1' });
  });

  it('increments pendingCount for each enqueued mutation', async () => {
    const { result } = renderQueue({ domain: 'cart', executors: {} });

    await act(async () => {
      result.current.queueMutation('CART_ADD', { productId: 'p1' });
      result.current.queueMutation('CART_ADD', { productId: 'p2' });
      result.current.queueMutation('CART_REMOVE', { productId: 'p3' });
    });

    expect(result.current.pendingCount).toBe(3);
  });

  it('supports the wishlist domain', async () => {
    const { result } = renderQueue({ domain: 'wishlist', executors: {} });

    await act(async () => {
      result.current.queueMutation('WISHLIST_ADD', { productId: 'w1' });
    });

    expect(getQueue('wishlist')).toHaveLength(1);
  });

  it('supports the profile domain', async () => {
    const { result } = renderQueue({ domain: 'profile', executors: {} });

    await act(async () => {
      result.current.queueMutation('PROFILE_UPDATE', { displayName: 'Alice' });
    });

    expect(getQueue('profile')).toHaveLength(1);
  });

  it('does not affect other domains when queuing cart', async () => {
    const { result } = renderQueue({ domain: 'cart', executors: {} });

    await act(async () => {
      result.current.queueMutation('CART_ADD', { productId: 'p1' });
    });

    expect(getQueue('wishlist')).toHaveLength(0);
    expect(getQueue('profile')).toHaveLength(0);
  });
});

// ── Replay on reconnect ────────────────────────────────────────────────────────

describe('useMutationQueue — replay on reconnect', () => {
  it('calls executor when replaying queued mutation on reconnect', async () => {
    const cartAdd = jest.fn().mockResolvedValue(undefined);

    const { result } = renderQueue({
      domain: 'cart',
      executors: { CART_ADD: cartAdd },
    });

    // Enqueue while offline
    await act(async () => {
      result.current.queueMutation('CART_ADD', { productId: 'p1' });
    });
    expect(result.current.pendingCount).toBe(1);

    // Reconnect triggers replay
    await act(async () => {
      result.current.setOnline(true);
    });

    await waitFor(() => expect(result.current.pendingCount).toBe(0));
    expect(cartAdd).toHaveBeenCalledWith({ productId: 'p1' });
  });

  it('drains the queue after all mutations replay successfully', async () => {
    const executor = jest.fn().mockResolvedValue(undefined);

    const { result } = renderQueue({
      domain: 'cart',
      executors: { CART_ADD: executor, CART_REMOVE: executor },
    });

    await act(async () => {
      result.current.queueMutation('CART_ADD', { productId: 'p1' });
      result.current.queueMutation('CART_REMOVE', { productId: 'p2' });
    });

    await act(async () => {
      result.current.setOnline(true);
    });

    await waitFor(() => expect(result.current.pendingCount).toBe(0));
    expect(executor).toHaveBeenCalledTimes(2);
  });

  it('does not auto-replay when already online at mount', async () => {
    const executor = jest.fn().mockResolvedValue(undefined);

    // Start online — no offline→online transition, so no auto-replay
    const { result } = renderQueue(
      { domain: 'cart', executors: { CART_ADD: executor } },
      true, // initialOnline = true
    );

    await act(async () => {
      result.current.queueMutation('CART_ADD', { productId: 'p1' });
    });

    // Give a tick for any unintended effects
    await act(async () => {
      await Promise.resolve();
    });

    // No reconnect happened — executor should NOT have been called
    expect(executor).not.toHaveBeenCalled();
  });

  it('sets isSyncing true during replay and false after', async () => {
    let resolveMutation: () => void = () => {};
    const slowExecutor = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveMutation = resolve;
        }),
    );

    const { result } = renderQueue({
      domain: 'cart',
      executors: { CART_ADD: slowExecutor },
    });

    await act(async () => {
      result.current.queueMutation('CART_ADD', { productId: 'p1' });
    });

    // Trigger reconnect (starts slow replay)
    act(() => {
      result.current.setOnline(true);
    });

    await waitFor(() => expect(result.current.isSyncing).toBe(true));

    // Resolve the mutation
    await act(async () => {
      resolveMutation();
    });

    await waitFor(() => expect(result.current.isSyncing).toBe(false));
  });

  it('sets lastReplayResult after replay completes', async () => {
    const executor = jest.fn().mockResolvedValue(undefined);

    const { result } = renderQueue({
      domain: 'cart',
      executors: { CART_ADD: executor },
    });

    await act(async () => {
      result.current.queueMutation('CART_ADD', { productId: 'p1' });
    });

    await act(async () => {
      result.current.setOnline(true);
    });

    await waitFor(() => expect(result.current.lastReplayResult).not.toBeNull());
    expect(result.current.lastReplayResult!.succeeded).toBe(1);
    expect(result.current.lastReplayResult!.failed).toBe(0);
  });

  it('leaves failed actions in the queue when executor throws', async () => {
    const failingExecutor = jest.fn().mockRejectedValue(new Error('network error'));

    const { result } = renderQueue({
      domain: 'cart',
      executors: { CART_ADD: failingExecutor },
      maxRetries: 0,
    });

    await act(async () => {
      result.current.queueMutation('CART_ADD', { productId: 'p1' });
    });

    await act(async () => {
      result.current.setOnline(true);
    });

    await waitFor(() => expect(result.current.isSyncing).toBe(false));
    expect(result.current.pendingCount).toBe(1);
    expect(result.current.lastReplayResult!.failed).toBe(1);
  });
});

// ── Deduplication (LWW) ────────────────────────────────────────────────────────

describe('useMutationQueue — deduplication', () => {
  it('deduplicates mutations by dedupeKey before replay (LWW)', async () => {
    const executor = jest.fn().mockResolvedValue(undefined);

    const { result } = renderQueue({
      domain: 'cart',
      executors: { CART_ADD: executor },
      dedupeKey: 'productId',
    });

    // Queue the same productId twice — only the latest should be sent
    await act(async () => {
      result.current.queueMutation('CART_ADD', { productId: 'p1', quantity: 1 });
      result.current.queueMutation('CART_ADD', { productId: 'p1', quantity: 5 }); // supersedes
    });

    expect(result.current.pendingCount).toBe(2); // 2 in queue before compaction

    await act(async () => {
      result.current.setOnline(true);
    });

    await waitFor(() => expect(result.current.isSyncing).toBe(false));

    // Only 1 executor call (the latest one)
    expect(executor).toHaveBeenCalledTimes(1);
    expect(executor).toHaveBeenCalledWith(expect.objectContaining({ quantity: 5 }));
  });

  it('preserves distinct productIds as separate mutations', async () => {
    const executor = jest.fn().mockResolvedValue(undefined);

    const { result } = renderQueue({
      domain: 'cart',
      executors: { CART_ADD: executor },
      dedupeKey: 'productId',
    });

    await act(async () => {
      result.current.queueMutation('CART_ADD', { productId: 'p1', quantity: 2 });
      result.current.queueMutation('CART_ADD', { productId: 'p2', quantity: 3 });
    });

    await act(async () => {
      result.current.setOnline(true);
    });

    await waitFor(() => expect(result.current.isSyncing).toBe(false));

    expect(executor).toHaveBeenCalledTimes(2);
  });

  it('does not deduplicate when dedupeKey is not provided', async () => {
    const executor = jest.fn().mockResolvedValue(undefined);

    const { result } = renderQueue({
      domain: 'cart',
      executors: { CART_ADD: executor },
      // no dedupeKey
    });

    await act(async () => {
      result.current.queueMutation('CART_ADD', { productId: 'p1', quantity: 1 });
      result.current.queueMutation('CART_ADD', { productId: 'p1', quantity: 5 });
    });

    await act(async () => {
      result.current.setOnline(true);
    });

    await waitFor(() => expect(result.current.isSyncing).toBe(false));

    // Both mutations fired (no dedup)
    expect(executor).toHaveBeenCalledTimes(2);
  });
});

// ── onSyncComplete notification ───────────────────────────────────────────────

describe('useMutationQueue — onSyncComplete', () => {
  it('calls onSyncComplete after successful replay', async () => {
    const onSyncComplete = jest.fn();
    const executor = jest.fn().mockResolvedValue(undefined);

    const { result } = renderQueue({
      domain: 'cart',
      executors: { CART_ADD: executor },
      onSyncComplete,
    });

    await act(async () => {
      result.current.queueMutation('CART_ADD', { productId: 'p1' });
    });

    await act(async () => {
      result.current.setOnline(true);
    });

    await waitFor(() => expect(onSyncComplete).toHaveBeenCalledTimes(1));
    expect(onSyncComplete).toHaveBeenCalledWith(
      expect.objectContaining({ succeeded: 1, failed: 0 }),
    );
  });

  it('calls onSyncComplete even when some mutations fail', async () => {
    const onSyncComplete = jest.fn();
    const failingExecutor = jest.fn().mockRejectedValue(new Error('oops'));

    const { result } = renderQueue({
      domain: 'cart',
      executors: { CART_ADD: failingExecutor },
      onSyncComplete,
      maxRetries: 0,
    });

    await act(async () => {
      result.current.queueMutation('CART_ADD', { productId: 'p1' });
    });

    await act(async () => {
      result.current.setOnline(true);
    });

    await waitFor(() => expect(onSyncComplete).toHaveBeenCalledTimes(1));
    expect(onSyncComplete).toHaveBeenCalledWith(expect.objectContaining({ failed: 1 }));
  });

  it('does not call onSyncComplete when queue is empty at reconnect', async () => {
    const onSyncComplete = jest.fn();

    const { result } = renderQueue({
      domain: 'cart',
      executors: {},
      onSyncComplete,
    });

    // No mutations queued — just go online
    await act(async () => {
      result.current.setOnline(true);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(onSyncComplete).not.toHaveBeenCalled();
  });

  it('does not call onSyncComplete on second consecutive online event', async () => {
    const onSyncComplete = jest.fn();
    const executor = jest.fn().mockResolvedValue(undefined);

    const { result } = renderQueue({
      domain: 'cart',
      executors: { CART_ADD: executor },
      onSyncComplete,
    });

    await act(async () => {
      result.current.queueMutation('CART_ADD', { productId: 'p1' });
    });

    await act(async () => {
      result.current.setOnline(true);
    });

    await waitFor(() => expect(onSyncComplete).toHaveBeenCalledTimes(1));

    // Stay online — going online again should NOT re-trigger
    await act(async () => {
      result.current.setOnline(true);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(onSyncComplete).toHaveBeenCalledTimes(1);
  });
});

// ── syncNow — manual trigger ───────────────────────────────────────────────────

describe('useMutationQueue — syncNow', () => {
  it('replays queue when called manually while online', async () => {
    const executor = jest.fn().mockResolvedValue(undefined);

    const { result } = renderQueue(
      { domain: 'cart', executors: { CART_ADD: executor } },
      true, // start online
    );

    await act(async () => {
      result.current.queueMutation('CART_ADD', { productId: 'p1' });
    });

    await act(async () => {
      await result.current.syncNow();
    });

    expect(executor).toHaveBeenCalledWith({ productId: 'p1' });
    expect(result.current.pendingCount).toBe(0);
  });

  it('syncNow returns a ReplayResult', async () => {
    const executor = jest.fn().mockResolvedValue(undefined);

    const { result } = renderQueue({ domain: 'cart', executors: { CART_ADD: executor } }, true);

    await act(async () => {
      result.current.queueMutation('CART_ADD', { productId: 'p1' });
    });

    let syncResult: ReplayResult | void = undefined;
    await act(async () => {
      syncResult = await result.current.syncNow();
    });

    expect(syncResult).toEqual(expect.objectContaining({ succeeded: 1, failed: 0 }));
  });

  it('syncNow is a no-op and returns undefined when queue is empty', async () => {
    const { result } = renderQueue({ domain: 'cart', executors: {} }, true);

    let syncResult: ReplayResult | void = undefined;
    await act(async () => {
      syncResult = await result.current.syncNow();
    });

    expect(syncResult).toBeUndefined();
  });
});

// ── Profile domain ────────────────────────────────────────────────────────────

describe('useMutationQueue — profile domain', () => {
  it('queues profile mutations offline and replays on reconnect', async () => {
    const profileUpdate = jest.fn().mockResolvedValue(undefined);

    const { result } = renderQueue({
      domain: 'profile',
      executors: { PROFILE_UPDATE: profileUpdate },
    });

    await act(async () => {
      result.current.queueMutation('PROFILE_UPDATE', { displayName: 'Bob' });
    });

    expect(getQueue('profile')).toHaveLength(1);

    await act(async () => {
      result.current.setOnline(true);
    });

    await waitFor(() => expect(result.current.pendingCount).toBe(0));
    expect(profileUpdate).toHaveBeenCalledWith({ displayName: 'Bob' });
  });

  it('deduplicates profile updates by userId when dedupeKey set', async () => {
    const executor = jest.fn().mockResolvedValue(undefined);

    const { result } = renderQueue({
      domain: 'profile',
      executors: { PROFILE_UPDATE: executor },
      dedupeKey: 'userId',
    });

    await act(async () => {
      result.current.queueMutation('PROFILE_UPDATE', { userId: 'u1', displayName: 'Alice' });
      result.current.queueMutation('PROFILE_UPDATE', { userId: 'u1', displayName: 'Alice B.' });
    });

    await act(async () => {
      result.current.setOnline(true);
    });

    await waitFor(() => expect(result.current.isSyncing).toBe(false));

    expect(executor).toHaveBeenCalledTimes(1);
    expect(executor).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'Alice B.' }));
  });
});

// ── pendingCount persistence ───────────────────────────────────────────────────

describe('useMutationQueue — pendingCount', () => {
  it('starts at 0', () => {
    const { result } = renderQueue({ domain: 'cart', executors: {} });
    expect(result.current.pendingCount).toBe(0);
  });

  it('decrements as mutations replay successfully', async () => {
    const executor = jest.fn().mockResolvedValue(undefined);

    const { result } = renderQueue({
      domain: 'cart',
      executors: { CART_ADD: executor },
    });

    await act(async () => {
      result.current.queueMutation('CART_ADD', { productId: 'p1' });
      result.current.queueMutation('CART_ADD', { productId: 'p2' });
    });
    expect(result.current.pendingCount).toBe(2);

    await act(async () => {
      result.current.setOnline(true);
    });

    await waitFor(() => expect(result.current.pendingCount).toBe(0));
  });
});

// ── Connectivity exposed ───────────────────────────────────────────────────────

describe('useMutationQueue — setOnline exposed', () => {
  it('exposes setOnline so tests can control connectivity', () => {
    const { result } = renderQueue({ domain: 'cart', executors: {} });
    expect(typeof result.current.setOnline).toBe('function');
  });
});
