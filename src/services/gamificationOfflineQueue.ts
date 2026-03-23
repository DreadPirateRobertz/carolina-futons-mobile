/**
 * @module gamificationOfflineQueue
 *
 * Offline queue for gamification events — hq-94ado.
 *
 * When offline, call `queueGamificationEvent` to store events to AsyncStorage
 * via the shared offlineQueue. Each event receives a unique `eventId` (the
 * QueuedAction.id) which the server uses for idempotency deduplication.
 *
 * On reconnect, call `flushGamificationQueue(client)` to POST each stored event
 * to `/_functions/gamificationEvent`. Successfully replayed events are removed
 * from the queue; failed events remain for the next reconnect cycle.
 *
 * Pairs with:
 *   hq-74nry — client-side rate limit guard (gamificationRateLimiter)
 *   hq-825vi — server-side endpoint wiring
 */

import type { WixClient } from './wix/wixClient';
import { enqueue, getQueue, dequeue } from './offlineQueue';

export interface FlushResult {
  succeeded: number;
  failed: number;
}

/**
 * Queue a gamification event for later replay when offline.
 * Adds `eventId` to the payload for server-side deduplication.
 *
 * @param name - Event name (e.g. 'gamification_add_to_cart').
 * @param properties - Event properties (product_id, price, etc.).
 */
export function queueGamificationEvent(name: string, properties: Record<string, unknown>): void {
  const entry = enqueue('gamification', name, properties);
  // Back-patch eventId into the payload entry that was just enqueued.
  // The QueuedAction.id IS the eventId for server deduplication.
  entry.payload.eventId = entry.id;
}

/** Number of gamification events currently waiting in the queue. */
export function getGamificationQueueLength(): number {
  return getQueue('gamification').length;
}

/**
 * Replay all queued gamification events to the backend endpoint.
 * Successfully replayed events are removed from the queue.
 * Failed events remain in the queue for the next reconnect cycle.
 *
 * @param client - WixClient instance with `callFunction` method.
 */
export async function flushGamificationQueue(client: WixClient): Promise<FlushResult> {
  const pending = getQueue('gamification');
  const result: FlushResult = { succeeded: 0, failed: 0 };

  if (pending.length === 0) return result;

  for (const action of pending) {
    try {
      await client.callFunction('/_functions/gamificationEvent', 'POST', {
        eventName: action.action,
        ...action.payload,
      });
      dequeue(action.id);
      result.succeeded++;
    } catch {
      result.failed++;
      // Leave failed events in the queue (they were not dequeued).
      // Re-enqueue any that were implicitly removed — but since we only
      // dequeue on success, no re-enqueue is needed here.
    }
  }

  return result;
}
