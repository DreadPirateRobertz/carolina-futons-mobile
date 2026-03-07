/**
 * Offline action queue and sync-on-reconnect hook.
 *
 * When the device goes offline, components can enqueue mutation actions (e.g.,
 * "add to cart", "submit review") via `queueAction`. When connectivity is
 * restored, the hook automatically drains the queue and invokes the caller's
 * `onSync` handler to replay those actions against the backend.
 *
 * Actions are persisted to AsyncStorage through the offlineQueue service so
 * they survive app restarts.
 *
 * @module useOfflineSync
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useConnectivity } from './useConnectivity';
import { drain, loadQueue, getQueueLength, enqueue, reEnqueue } from '@/services/offlineQueue';
import type { QueuedAction } from '@/services/offlineQueue';

/**
 * Callback invoked with the batch of queued actions when connectivity is restored.
 *
 * @param actions - Array of actions accumulated while offline.
 */
export interface SyncHandler {
  (actions: QueuedAction[]): Promise<void> | void;
}

/** Configuration options for the `useOfflineSync` hook. */
interface UseOfflineSyncOptions {
  /** Handler called with queued actions when coming back online. */
  onSync?: SyncHandler;
  /** Whether to auto-load the persisted queue on mount (default: true). */
  autoLoad?: boolean;
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
  /** Manually trigger a sync drain, independent of connectivity transitions. */
  syncNow: () => Promise<void>;
}

/**
 * Hook that manages offline action queueing and sync-on-reconnect.
 *
 * - Loads the persisted queue on mount (unless `autoLoad` is false)
 * - Watches connectivity; when transitioning offline to online, drains queue
 *   and calls `onSync`
 * - Provides `queueAction` for components to enqueue mutations while offline
 *
 * @param options - Optional configuration (sync handler, autoLoad toggle).
 * @returns Object containing `{ pendingCount, isSyncing, queueAction, syncNow }`
 *
 * @example
 * const { pendingCount, queueAction, syncNow } = useOfflineSync({
 *   onSync: async (actions) => { await replayActions(actions); },
 * });
 */
export function useOfflineSync(options: UseOfflineSyncOptions = {}): UseOfflineSyncResult {
  const { onSync, autoLoad = true } = options;
  const { isOnline } = useConnectivity();
  const wasOnline = useRef(isOnline);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  // Load queue on mount
  useEffect(() => {
    if (autoLoad) {
      loadQueue().then((q) => setPendingCount(q.length));
    }
  }, [autoLoad]);

  const syncNow = useCallback(async () => {
    const actions = drain();
    if (actions.length === 0) return;
    setIsSyncing(true);
    try {
      if (onSyncRef.current) {
        await onSyncRef.current(actions);
      }
    } catch (err) {
      // Re-enqueue actions so they survive for the next sync attempt
      reEnqueue(actions);
      throw err;
    } finally {
      setIsSyncing(false);
      setPendingCount(getQueueLength());
    }
  }, []);

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

  return { pendingCount, isSyncing, queueAction, syncNow };
}
