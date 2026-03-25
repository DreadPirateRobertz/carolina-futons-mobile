/**
 * @module gamificationApi
 *
 * Sends gamification events to Wix HTTP endpoint POST /_functions/gamificationEvent.
 * Auth: Wix member session (enforced server-side; IDOR guard on memberId).
 * Rate limit: 20/min (server-side).
 *
 * Offline resilience: events queued to AsyncStorage when no wixClient is available
 * or when the API call fails. replayGamificationQueue() replays on reconnect,
 * passing the stored eventId for server-side idempotency.
 *
 * hq-825vi / Phase 5+
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureException } from '@/services/crashReporting';

const ENDPOINT = '/_functions/gamificationEvent';
const QUEUE_KEY = '@cf_gamification_queue';

export type GamificationEventName =
  | 'gamification_add_to_cart'
  | 'gamification_submit_review'
  | 'gamification_referral_shared'
  | 'gamification_ar_used'
  | 'gamification_wishlist_add'
  | 'gamification_order_placed'
  | 'gamification_style_quiz_complete';

export interface GamificationEventInput {
  eventName: GamificationEventName;
  memberId: string;
  payload: Record<string, unknown>;
  /** Caller-supplied stable ID for idempotency. Auto-generated if omitted. */
  eventId?: string;
}

export interface GamificationEventResult {
  success: boolean;
  newTotal?: number;
  tierChanged?: boolean;
  newTier?: string;
  queued?: boolean;
  error?: Error;
}

/** Server-side trigger signals returned from a receiveGamificationEvent response. */
export interface ServerTriggers {
  tierChanged: boolean;
  newTier: string | null;
  milestoneUnlocked: boolean;
  /** Badge key unlocked (e.g. 'streak_chip'), or null if none. */
  badgeUnlocked: string | null;
  challengeCompleted: { challengeId: string; title: string; rewardPoints: number }[];
  streakDanger: boolean;
}

interface QueuedGamificationEvent {
  eventId: string;
  eventName: GamificationEventName;
  memberId: string;
  payload: Record<string, unknown>;
  queuedAt: number;
}

export interface ReplayResult {
  replayed: number;
  failed: number;
  responses: GamificationEventResult[];
}

type WixClientLike = {
  callFunction: <T>(path: string, method: 'GET' | 'POST', body?: unknown) => Promise<T>;
};

function generateEventId(): string {
  return `ge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function loadQueue(): Promise<QueuedGamificationEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue: QueuedGamificationEvent[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    captureException(err instanceof Error ? err : new Error(String(err)), 'warning', {
      context: 'gamificationApi.saveQueue',
    });
  }
}

async function clearQueue(): Promise<void> {
  try {
    await AsyncStorage.removeItem(QUEUE_KEY);
  } catch {
    // Best-effort clear
  }
}

async function enqueueEvent(input: GamificationEventInput): Promise<void> {
  const queue = await loadQueue();
  const entry: QueuedGamificationEvent = {
    eventId: input.eventId ?? generateEventId(),
    eventName: input.eventName,
    memberId: input.memberId,
    payload: input.payload,
    queuedAt: Date.now(),
  };
  queue.push(entry);
  await saveQueue(queue);
}

async function postEvent(
  client: WixClientLike,
  eventId: string,
  eventName: GamificationEventName,
  memberId: string,
  payload: Record<string, unknown>,
): Promise<GamificationEventResult> {
  const response = await client.callFunction<{
    success: boolean;
    newTotal?: number;
    tierChanged?: boolean;
    newTier?: string;
  }>(ENDPOINT, 'POST', { eventId, eventName, memberId, payload });

  return {
    success: response.success ?? false,
    newTotal: response.newTotal,
    tierChanged: response.tierChanged,
    newTier: response.newTier,
  };
}

/**
 * Send a gamification event to the Wix endpoint.
 *
 * If `client` is null or the API call fails, the event is queued to
 * AsyncStorage for later replay via replayGamificationQueue().
 */
export async function sendGamificationEvent(
  client: WixClientLike | null,
  input: GamificationEventInput,
): Promise<GamificationEventResult> {
  const eventId = input.eventId ?? generateEventId();

  if (!client) {
    await enqueueEvent({ ...input, eventId });
    return { success: false, queued: true };
  }

  try {
    return await postEvent(client, eventId, input.eventName, input.memberId, input.payload);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    // Queue for retry
    await enqueueEvent({ ...input, eventId });
    return { success: false, queued: true, error };
  }
}

/**
 * Replay queued gamification events after connectivity is restored.
 *
 * Events that succeed are removed from the queue. Events that fail are
 * re-persisted for the next retry. eventId is forwarded to the server
 * for idempotent processing.
 */
export async function replayGamificationQueue(client: WixClientLike): Promise<ReplayResult> {
  const queue = await loadQueue();
  if (queue.length === 0) return { replayed: 0, failed: 0, responses: [] };

  const result: ReplayResult = { replayed: 0, failed: 0, responses: [] };
  const remaining: QueuedGamificationEvent[] = [];

  for (const item of queue) {
    try {
      const response = await postEvent(
        client,
        item.eventId,
        item.eventName,
        item.memberId,
        item.payload,
      );
      result.replayed++;
      result.responses.push(response);
    } catch (err) {
      result.failed++;
      remaining.push(item);
      captureException(err instanceof Error ? err : new Error(String(err)), 'warning', {
        context: 'gamificationApi.replayGamificationQueue',
        eventId: item.eventId,
        eventName: item.eventName,
      });
    }
  }

  if (remaining.length === 0) {
    await clearQueue();
  } else {
    await saveQueue(remaining);
  }

  return result;
}
