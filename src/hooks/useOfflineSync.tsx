import { useEffect, useRef, useCallback, useState } from 'react';
import { useConnectivity } from './useConnectivity';
import { drain, loadQueue, getQueueLength, enqueue } from '@/services/offlineQueue';
import type { QueuedAction } from '@/services/offlineQueue';

export interface SyncHandler {
  (actions: QueuedAction[]): Promise<void> | void;
}

interface UseOfflineSyncOptions {
  /** Handler called with queued actions when coming back online */
  onSync?: SyncHandler;
  /** Whether to auto-load queue on mount (default: true) */
  autoLoad?: boolean;
}

interface UseOfflineSyncResult {
  /** Number of actions pending in the queue */
  pendingCount: number;
  /** Whether a sync is currently in progress */
  isSyncing: boolean;
  /** Enqueue an action (when offline) */
  queueAction: (
    domain: QueuedAction['domain'],
    action: string,
    payload: Record<string, unknown>,
  ) => void;
  /** Manually trigger a sync */
  syncNow: () => Promise<void>;
}

/**
 * Hook that manages offline action queueing and sync-on-reconnect.
 *
 * - Loads persisted queue on mount
 * - Watches connectivity; when transitioning offline→online, drains queue and calls onSync
 * - Provides queueAction for components to enqueue mutations while offline
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
    } finally {
      setIsSyncing(false);
      setPendingCount(getQueueLength());
    }
  }, []);

  // Watch for offline→online transition
  useEffect(() => {
    if (!wasOnline.current && isOnline) {
      syncNow();
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
