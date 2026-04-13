/**
 * @module useQueueStatus
 *
 * Lightweight hook that exposes the current offline queue length.
 *
 * Subscribes to queue count changes via the offlineQueue service, so the
 * returned `pendingCount` updates reactively whenever items are enqueued,
 * replayed, or cleared — without coupling to any specific sync strategy.
 *
 * Intended to drive UI signals (e.g. OfflineBanner) that inform users how
 * many writes are pending while offline.
 */

import { useState, useEffect } from 'react';
import { getQueueLength, subscribeToQueueLength } from '@/services/offlineQueue';

/** Status of the offline write queue. */
export interface QueueStatus {
  /** Number of queued writes waiting to be replayed on reconnect. */
  pendingCount: number;
}

/**
 * Returns the current number of writes queued for offline replay.
 *
 * The count updates reactively via a subscription to the offlineQueue service.
 * Safe to use in any component; does not trigger replays or register executors.
 *
 * @example
 * const { pendingCount } = useQueueStatus();
 * // pendingCount reflects real-time queue length
 */
export function useQueueStatus(): QueueStatus {
  const [pendingCount, setPendingCount] = useState<number>(getQueueLength);

  useEffect(() => {
    // Sync with current queue length in case it changed before subscription
    setPendingCount(getQueueLength());
    return subscribeToQueueLength(setPendingCount);
  }, []);

  return { pendingCount };
}
