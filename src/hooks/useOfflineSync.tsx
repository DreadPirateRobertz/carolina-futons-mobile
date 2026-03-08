/**
 * Offline action queue and sync-on-reconnect hook.
 *
 * When the device goes offline, components can enqueue mutation actions (e.g.,
 * "add to cart", "submit review") via `queueAction`. When connectivity is
 * restored, the hook automatically replays queued actions against the
 * appropriate Wix REST endpoints with exponential backoff.
 *
 * Actions are persisted to AsyncStorage through the offlineQueue service so
 * they survive app restarts.
 *
 * @module useOfflineSync
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useConnectivity } from './useConnectivity';
import {
  drain,
  loadQueue,
  getQueueLength,
  enqueue,
  reEnqueue,
  replay,
  registerExecutor,
  clearExecutors,
} from '@/services/offlineQueue';
import type { QueuedAction, ReplayResult } from '@/services/offlineQueue';

/**
 * Callback invoked with the batch of queued actions when connectivity is restored.
 *
 * @param actions - Array of actions accumulated while offline.
 * @deprecated Use the executor-based replay system instead. This callback is
 * still invoked after replay completes for backwards compatibility.
 */
export interface SyncHandler {
  (actions: QueuedAction[]): Promise<void> | void;
}

/** Configuration options for the `useOfflineSync` hook. */
interface UseOfflineSyncOptions {
  /** Handler called with queued actions when coming back online (legacy). */
  onSync?: SyncHandler;
  /** Whether to auto-load the persisted queue on mount (default: true). */
  autoLoad?: boolean;
  /** Custom executors to register on mount. Keys are action types. */
  executors?: Record<string, (payload: Record<string, unknown>) => Promise<void>>;
  /** Max retries per action during replay (default: 3). */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff (default: 1000). */
  baseDelayMs?: number;
}

/** Return value of the `useOfflineSync` hook. */
interface UseOfflineSyncResult {
  /** Number of actions pending in the queue. */
  pendingCount: number;
  /** Whether a sync is currently in progress. */
  isSyncing: boolean;
  /** Enqueue an action for later replay (typically called when offline). */
  queueAction: (
    domain: QueuedAction['domain'],
    action: string,
    payload: Record<string, unknown>,
  ) => void;
  /** Manually trigger a replay, independent of connectivity transitions. */
  syncNow: () => Promise<ReplayResult | void>;
  /** Result from the last replay attempt. */
  lastReplayResult: ReplayResult | null;
}

/**
 * Hook that manages offline action queueing and replay-on-reconnect.
 *
 * - Loads the persisted queue on mount (unless `autoLoad` is false)
 * - Registers provided executors for action types
 * - Watches connectivity; when transitioning offline→online, replays queue
 *   via registered executors with exponential backoff
 * - Provides `queueAction` for components to enqueue mutations while offline
 *
 * @param options - Optional configuration (executors, retry settings, etc).
 * @returns Object containing `{ pendingCount, isSyncing, queueAction, syncNow, lastReplayResult }`
 *
 * @example
 * const { pendingCount, queueAction, syncNow } = useOfflineSync({
 *   executors: {
 *     ADD_ITEM: async (payload) => { await wixClient.addToCart(payload.productId, payload.quantity); },
 *     REMOVE_ITEM: async (payload) => { await wixClient.removeFromCart(payload.productId); },
 *   },
 * });
 */
export function useOfflineSync(options: UseOfflineSyncOptions = {}): UseOfflineSyncResult {
  const { onSync, autoLoad = true, executors: executorMap, maxRetries, baseDelayMs } = options;
  const { isOnline } = useConnectivity();
  const wasOnline = useRef(isOnline);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastReplayResult, setLastReplayResult] = useState<ReplayResult | null>(null);
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  // Register executors on mount, clean up on unmount
  useEffect(() => {
    if (executorMap) {
      for (const [actionType, executor] of Object.entries(executorMap)) {
        registerExecutor(actionType, executor);
      }
    }
    return () => {
      clearExecutors();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load queue on mount
  useEffect(() => {
    if (autoLoad) {
      loadQueue().then((q) => setPendingCount(q.length));
    }
  }, [autoLoad]);

  const syncNow = useCallback(async () => {
    if (getQueueLength() === 0) return;

    setIsSyncing(true);
    try {
      // Replay via executor registry with exponential backoff.
      // replay() dequeues successful actions internally; failed actions stay in queue.
      const result = await replay({ maxRetries, baseDelayMs });
      setLastReplayResult(result);

      // Legacy fallback: drain remaining items and pass to onSync callback.
      // This covers the case where no executors are registered (old-style usage).
      if (onSyncRef.current && getQueueLength() > 0) {
        const remaining = drain();
        try {
          await onSyncRef.current(remaining);
        } catch {
          // Re-enqueue actions so they survive for the next sync attempt
          reEnqueue(remaining);
          throw new Error('Legacy onSync handler failed');
        }
      }

      return result;
    } finally {
      setIsSyncing(false);
      setPendingCount(getQueueLength());
    }
  }, [maxRetries, baseDelayMs]);

  // Watch for offline→online transition
  useEffect(() => {
    if (!wasOnline.current && isOnline) {
      syncNow().catch(() => {
        // Sync failed — actions have been re-enqueued for next attempt
      });
    }
    wasOnline.current = isOnline;
  }, [isOnline, syncNow]);

  const queueAction = useCallback(
    (domain: QueuedAction['domain'], action: string, payload: Record<string, unknown>) => {
      enqueue(domain, action, payload);
      setPendingCount(getQueueLength());
    },
    [],
  );

  return { pendingCount, isSyncing, queueAction, syncNow, lastReplayResult };
}
