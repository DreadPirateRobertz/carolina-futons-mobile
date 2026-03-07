/**
 * @module useCartSync
 *
 * Bridges the offline action queue to Wix eCommerce Cart REST API.
 * Uses useOfflineSync for connectivity-aware queueing and draining,
 * and replayOfflineQueue to dispatch queued cart mutations to Wix
 * when the device comes back online.
 */
import { useState, useCallback, useRef } from 'react';
import { useOfflineSync } from './useOfflineSync';
import { useWixClient } from '@/services/wix/wixProvider';
import { replayOfflineQueue, type ReplayResult } from '@/services/wix/replayOfflineQueue';
import type { QueuedAction } from '@/services/offlineQueue';

interface UseCartSyncOptions {
  cartId?: string;
}

export function useCartSync(options: UseCartSyncOptions) {
  const { cartId } = options;
  const client = useWixClient();
  const [lastReplayResult, setLastReplayResult] = useState<ReplayResult | null>(null);
  const cartIdRef = useRef(cartId);
  cartIdRef.current = cartId;

  const onSync = useCallback(
    async (actions: QueuedAction[]) => {
      if (!cartIdRef.current) return;
      try {
        const result = await replayOfflineQueue(actions, cartIdRef.current, client);
        setLastReplayResult(result);
      } catch {
        // replayOfflineQueue itself threw — don't crash the sync
      }
    },
    [client],
  );

  const { pendingCount, isSyncing, queueAction, syncNow } = useOfflineSync({ onSync });

  return {
    pendingCount,
    isSyncing,
    queueAction,
    syncNow,
    lastReplayResult,
  };
}
