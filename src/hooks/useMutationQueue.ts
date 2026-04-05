/**
 * useMutationQueue — hq-vel
 *
 * Domain-scoped offline mutation queue with automatic replay on reconnect.
 *
 * Wraps useOfflineSync to provide a simpler per-domain API:
 *   - queueMutation(actionType, payload) — no domain arg needed
 *   - Optional LWW deduplication via dedupeKey (runs compactByLWW before replay)
 *   - onSyncComplete callback invoked after each replay attempt (for user toasts)
 *   - setOnline exposed for test control without reaching into ConnectivityProvider
 *
 * Supports: 'cart' | 'wishlist' | 'profile'
 */

import { useCallback, useEffect, useRef } from 'react';
import { useConnectivity } from './useConnectivity';
import { useOfflineSync } from './useOfflineSync';
import { compactByLWW } from '@/services/offlineQueue';
import type { QueuedAction, ReplayResult } from '@/services/offlineQueue';

export interface UseMutationQueueOptions {
  /** Domain that all mutations queued via this hook belong to. */
  domain: QueuedAction['domain'];
  /**
   * Executor map: action type → async function that performs the mutation.
   * Registered on mount, used during replay.
   */
  executors: Record<string, (payload: Record<string, unknown>) => Promise<void>>;
  /**
   * Payload field name used for Last-Write-Wins deduplication before replay.
   * When provided, compactByLWW runs on this domain immediately before each replay.
   * Omit to disable deduplication (all queued mutations will be replayed).
   */
  dedupeKey?: string;
  /**
   * Called after each replay attempt (success or partial failure) with the result.
   * Use this to show user-facing notifications (e.g. "Your changes have been synced").
   * Not called when the queue is empty at reconnect time.
   */
  onSyncComplete?: (result: ReplayResult) => void;
  /** Max retry attempts per action during replay (default: 3). */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff (default: 1000). */
  baseDelayMs?: number;
}

export interface UseMutationQueueResult {
  /** Enqueue a mutation for this hook's domain. */
  queueMutation: (actionType: string, payload: Record<string, unknown>) => void;
  /** Number of mutations pending in the queue. */
  pendingCount: number;
  /** True while a replay is in progress. */
  isSyncing: boolean;
  /** Manually trigger a replay (e.g. pull-to-refresh). Returns ReplayResult or undefined if queue is empty. */
  syncNow: () => Promise<ReplayResult | void>;
  /** Result from the most recent replay attempt. Null before first replay. */
  lastReplayResult: ReplayResult | null;
  /**
   * Programmatically set online state.
   * Exposed primarily for testing — production code should not need this.
   */
  setOnline: (online: boolean) => void;
}

export function useMutationQueue(options: UseMutationQueueOptions): UseMutationQueueResult {
  const { domain, executors, dedupeKey, onSyncComplete, maxRetries, baseDelayMs } = options;

  const { setOnline } = useConnectivity();

  // Keep onSyncComplete stable across renders
  const onSyncCompleteRef = useRef(onSyncComplete);
  onSyncCompleteRef.current = onSyncComplete;

  // preSync: run LWW compaction on this domain before replay, if dedupeKey is set
  const preSync = dedupeKey ? () => compactByLWW(domain, dedupeKey) : undefined;

  const { pendingCount, isSyncing, queueAction, syncNow, lastReplayResult } = useOfflineSync({
    executors,
    maxRetries,
    baseDelayMs,
    preSync,
  });

  // Fire onSyncComplete whenever lastReplayResult transitions to a new value
  const prevResultRef = useRef<ReplayResult | null>(null);
  useEffect(() => {
    if (lastReplayResult && lastReplayResult !== prevResultRef.current) {
      prevResultRef.current = lastReplayResult;
      onSyncCompleteRef.current?.(lastReplayResult);
    }
  }, [lastReplayResult]);

  const queueMutation = useCallback(
    (actionType: string, payload: Record<string, unknown>) => {
      queueAction(domain, actionType, payload);
    },
    [domain, queueAction],
  );

  return { queueMutation, pendingCount, isSyncing, syncNow, lastReplayResult, setOnline };
}
