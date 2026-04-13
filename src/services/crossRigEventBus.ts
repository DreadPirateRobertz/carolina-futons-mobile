/**
 * @module crossRigEventBus
 *
 * Phase 8 mobile → web event emitter (cm-p8-bus).
 *
 * Sends streak_extended, challenge_started, redemption_initiated to the Wix
 * crossRigEvent webMethod using the cf-44r finalized envelope schema:
 *   { eventId, schemaVersion, traceId, event, userId, source, platform, appVersion, ts, delta, newTotal, ...payload }
 *
 * Retry policy:
 *   - Network failures / null client → queued in AsyncStorage for replay
 *   - 400 responses (schema validation) → NOT queued (permanent failure)
 *
 * Idempotency (cm-030):
 *   - Client-side guard keyed by memberId+eventType+YYYY-MM-DD in AsyncStorage
 *   - Only successful server-confirmed emissions are marked; queued/failed are not
 *   - Backend receiver (crossRigEventReceiver.web.js) MUST use suppressAuth:true
 *     on all wixData calls to operate under elevated permissions without a session
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { captureException } from '@/services/crashReporting';
import { version as appVersion } from '../../package.json';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CrossRigEventResult {
  success: boolean;
  queued?: true;
  /** Returned when emission is suppressed by the same-day idempotency guard (cm-030). */
  idempotent?: true;
  error?: string;
}

interface ReplayResult {
  replayed: number;
  failed: number;
}

/** A single event spec for emitBatch. Payload is the pre-transformed envelope payload. */
export interface BatchEventSpec {
  event: string;
  payload: Record<string, unknown>;
  memberId?: string;
}

export interface BatchResult {
  results: ({ event: string } & CrossRigEventResult)[];
  succeeded: number;
  failed: number;
}

interface WixClientLike {
  callFunction: (
    name: string,
    method: 'GET' | 'POST',
    body: Record<string, unknown>,
  ) => Promise<unknown>;
  /** Optional — called on 401 to refresh the session before a single retry. */
  refreshTokens?: () => Promise<void>;
}

interface QueuedEvent {
  fnName: string;
  body: Record<string, unknown>;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WIX_FN = 'crossRigEvent';
const QUEUE_KEY = '@cf_cross_rig_queue';
const IDEM_KEY_PREFIX = '@cf_idem_';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** YYYY-MM-DD in local time — used as the day bucket for idempotency keys. */
function isoDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function idempotencyKey(memberId: string, event: string): string {
  return `${IDEM_KEY_PREFIX}${memberId}_${event}_${isoDateString()}`;
}

async function isIdempotent(memberId: string, event: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(idempotencyKey(memberId, event))) !== null;
  } catch {
    return false;
  }
}

async function markIdempotent(memberId: string, event: string): Promise<void> {
  try {
    await AsyncStorage.setItem(idempotencyKey(memberId, event), '1');
  } catch (err) {
    captureException(err instanceof Error ? err : new Error(String(err)));
  }
}

function buildBody(event: string, payload: Record<string, unknown>): Record<string, unknown> {
  return {
    eventId: crypto.randomUUID(),
    schemaVersion: '1.0',
    traceId: `trace_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    event,
    source: 'mobile',
    platform: Platform.OS as 'ios' | 'android',
    appVersion,
    ts: Date.now(), // epoch-ms per cf-44r shared envelope schema
    ...payload,
  };
}

function is400(err: unknown): boolean {
  if (err instanceof Error && (err as Error & { status?: number }).status === 400) return true;
  return false;
}

function is401(err: unknown): boolean {
  return err instanceof Error && (err as Error & { status?: number }).status === 401;
}

/**
 * Calls callFunction once. On 401, refreshes the session token and retries exactly once.
 * If refresh fails or the retry also throws, the error is re-thrown for the caller to handle.
 */
async function callWithRetry(
  client: WixClientLike,
  body: Record<string, unknown>,
): Promise<unknown> {
  try {
    return await client.callFunction(WIX_FN, 'POST', body);
  } catch (err) {
    if (is401(err) && client.refreshTokens) {
      await client.refreshTokens();
      return await client.callFunction(WIX_FN, 'POST', body);
    }
    throw err;
  }
}

async function enqueue(body: Record<string, unknown>): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const queue: QueuedEvent[] = raw ? JSON.parse(raw) : [];
    queue.push({ fnName: WIX_FN, body });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    captureException(err instanceof Error ? err : new Error(String(err)));
  }
}

async function emit(
  client: WixClientLike | null,
  event: string,
  payload: Record<string, unknown>,
  memberId?: string,
): Promise<CrossRigEventResult> {
  // Idempotency guard (cm-030): same memberId+eventType+day → no-op
  if (memberId && (await isIdempotent(memberId, event))) {
    return { success: true, idempotent: true };
  }

  const body = buildBody(event, payload);

  if (!client) {
    await enqueue(body);
    return { success: false, queued: true };
  }

  try {
    const response = await callWithRetry(client, body);
    const res = response as Record<string, unknown>;
    if (res.success === false && res.status === 400) {
      return { success: false, error: (res.error as string) ?? 'schema_error' };
    }
    // Only mark idempotent after confirmed server receipt — queued/failed are not marked
    if (memberId) await markIdempotent(memberId, event);
    return { success: true };
  } catch (err) {
    if (is400(err)) {
      captureException(err instanceof Error ? err : new Error(String(err)));
      return { success: false, error: (err as Error).message };
    }
    if (is401(err)) {
      // 401 after refresh+retry = stale auth, not transient — do NOT queue
      return { success: false, error: (err as Error).message };
    }
    // Network / transient failures → queue for replay
    await enqueue(body);
    return { success: false, queued: true };
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function emitStreakExtended(
  client: WixClientLike | null,
  input: { streak: number; delta: number; newTotal: number },
  opts?: { memberId?: string },
): Promise<CrossRigEventResult> {
  return emit(
    client,
    'streak_extended',
    {
      // userId excluded — server resolves identity from Wix session token (IDOR protection, hq-u35ub)
      streak: input.streak,
      delta: input.delta,
      newTotal: input.newTotal,
    },
    opts?.memberId,
  );
}

export async function emitChallengeStarted(
  client: WixClientLike | null,
  input: { challengeId: string; currentPoints: number },
  opts?: { memberId?: string },
): Promise<CrossRigEventResult> {
  return emit(
    client,
    'challenge_started',
    {
      // userId excluded — server resolves identity from Wix session token (IDOR protection, hq-u35ub)
      challengeId: input.challengeId,
      delta: 0, // no points change on challenge start — consistent envelope shape per cf-44r
      newTotal: input.currentPoints,
    },
    opts?.memberId,
  );
}

export async function emitRedemptionInitiated(
  client: WixClientLike | null,
  input: { pointsRedeemed: number; newTotal: number },
  opts?: { memberId?: string },
): Promise<CrossRigEventResult> {
  return emit(
    client,
    'redemption_initiated',
    {
      // userId excluded — server resolves identity from Wix session token (IDOR protection, hq-u35ub)
      delta: -input.pointsRedeemed, // negative: points leaving the account
      newTotal: input.newTotal,
    },
    opts?.memberId,
  );
}

export async function emitBadgeEarned(
  client: WixClientLike | null,
  input: { badgeId: string; badgeName: string },
  opts?: { memberId?: string },
): Promise<CrossRigEventResult> {
  return emit(
    client,
    'badge_earned',
    {
      badgeId: input.badgeId,
      badgeName: input.badgeName,
      delta: 0,
      newTotal: 0,
    },
    opts?.memberId,
  );
}

export async function emitTierChanged(
  client: WixClientLike | null,
  input: { oldTier: string; newTier: string },
  opts?: { memberId?: string },
): Promise<CrossRigEventResult> {
  return emit(
    client,
    'tier_changed',
    {
      oldTier: input.oldTier,
      newTier: input.newTier,
      delta: 0,
      newTotal: 0,
    },
    opts?.memberId,
  );
}

export async function emitCartAbandoned(
  client: WixClientLike | null,
  input: { cartTotal: number; itemCount: number },
  opts?: { memberId?: string },
): Promise<CrossRigEventResult> {
  return emit(
    client,
    'cart_abandoned',
    {
      cartTotal: input.cartTotal,
      itemCount: input.itemCount,
      delta: 0,
      newTotal: 0,
    },
    opts?.memberId,
  );
}

export async function replayCrossRigQueue(client: WixClientLike): Promise<ReplayResult> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return { replayed: 0, failed: 0 };

  const queue: QueuedEvent[] = JSON.parse(raw);
  if (queue.length === 0) return { replayed: 0, failed: 0 };

  // Promise.allSettled: one failure never blocks the rest of the batch (cm-030)
  const outcomes = await Promise.allSettled(queue.map((item) => callWithRetry(client, item.body)));

  const failedItems = queue.filter((_, i) => outcomes[i].status === 'rejected');
  const replayed = outcomes.filter((o) => o.status === 'fulfilled').length;

  if (failedItems.length > 0) {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(failedItems));
  } else {
    await AsyncStorage.removeItem(QUEUE_KEY);
  }

  return { replayed, failed: failedItems.length };
}

/**
 * Emit multiple events concurrently. Uses Promise.allSettled so one failure
 * never prevents the remaining events from being attempted (cm-030).
 */
export async function emitBatch(
  client: WixClientLike | null,
  events: BatchEventSpec[],
): Promise<BatchResult> {
  if (events.length === 0) return { results: [], succeeded: 0, failed: 0 };

  const outcomes = await Promise.allSettled(
    events.map((e) => emit(client, e.event, e.payload, e.memberId)),
  );

  let succeeded = 0;
  let failed = 0;
  const results: ({ event: string } & CrossRigEventResult)[] = [];

  for (let i = 0; i < outcomes.length; i++) {
    const outcome = outcomes[i];
    const event = events[i].event;
    if (outcome.status === 'fulfilled') {
      results.push({ event, ...outcome.value });
      if (outcome.value.success) succeeded++;
      else failed++;
    } else {
      // emit() should not reject, but guard defensively
      results.push({ event, success: false, error: (outcome.reason as Error)?.message });
      failed++;
    }
  }

  return { results, succeeded, failed };
}
