/**
 * @module useGamificationOfflineSync
 *
 * Connectivity-aware gamification event emitter — hq-94ado.
 *
 * - When online: fires events immediately via `trackEvent`.
 * - When offline: queues events to AsyncStorage via `queueGamificationEvent`.
 * - On reconnect: automatically flushes the queue to /_functions/gamificationEvent.
 *
 * Usage:
 *   const { emitOrQueue, pendingCount, isSyncing } = useGamificationOfflineSync();
 *   emitOrQueue('gamification_add_to_cart', { product_id, price });
 *
 * Must be rendered within a ConnectivityProvider.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useOptionalConnectivity } from './useConnectivity';
import { trackEvent } from '@/services/analytics';
import {
  queueGamificationEvent,
  flushGamificationQueue,
  getGamificationQueueLength,
} from '@/services/gamificationOfflineQueue';
import { getWixClientSingleton } from '@/services/wix/wixClientSingleton';

export interface GamificationOfflineSyncResult {
  /** Emit a gamification event — fires immediately when online, queues when offline. */
  emitOrQueue(name: string, properties: Record<string, unknown>): void;
  /** Number of gamification events currently waiting in the queue. */
  pendingCount: number;
  /** True while a queue flush is in progress. */
  isSyncing: boolean;
}

export function useGamificationOfflineSync(): GamificationOfflineSyncResult {
  const connectivity = useOptionalConnectivity();
  const isOnline = connectivity?.isOnline ?? true;

  const [pendingCount, setPendingCount] = useState(getGamificationQueueLength);
  const [isSyncing, setIsSyncing] = useState(false);
  const prevOnlineRef = useRef(isOnline);

  // Flush queued events on transition from offline → online
  useEffect(() => {
    const wasOnline = prevOnlineRef.current;
    prevOnlineRef.current = isOnline;

    if (!wasOnline && isOnline) {
      const client = getWixClientSingleton();
      if (!client || getGamificationQueueLength() === 0) return;

      setIsSyncing(true);
      flushGamificationQueue(client)
        .then(() => {
          setPendingCount(getGamificationQueueLength());
        })
        .catch(() => {
          setPendingCount(getGamificationQueueLength());
        })
        .finally(() => {
          setIsSyncing(false);
        });
    }
  }, [isOnline]);

  const emitOrQueue = useCallback(
    (name: string, properties: Record<string, unknown>) => {
      if (isOnline) {
        trackEvent(name as Parameters<typeof trackEvent>[0], properties);
      } else {
        queueGamificationEvent(name, properties);
        setPendingCount(getGamificationQueueLength());
      }
    },
    [isOnline],
  );

  return { emitOrQueue, pendingCount, isSyncing };
}
