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
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { captureException } from '@/services/crashReporting';
import { version as appVersion } from '../../package.json';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CrossRigEventResult {
  success: boolean;
  queued?: true;
  error?: string;
}

interface ReplayResult {
  replayed: number;
  failed: number;
}

interface WixClientLike {
  callFunction: (name: string, method: string, body: Record<string, unknown>) => Promise<unknown>;
  getSessionToken?: () => Promise<string | null>;
}

interface QueuedEvent {
  fnName: string;
  body: Record<string, unknown>;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WIX_FN = 'crossRigEvent';
const QUEUE_KEY = '@cf_cross_rig_queue';

// ── Helpers ───────────────────────────────────────────────────────────────────

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
): Promise<CrossRigEventResult> {
  const body = buildBody(event, payload);

  if (!client) {
    await enqueue(body);
    return { success: false, queued: true };
  }

  const sessionToken = client.getSessionToken ? await client.getSessionToken() : null;
  const sendBody = sessionToken ? { ...body, sessionToken } : body;

  try {
    const response = await client.callFunction(WIX_FN, 'POST', sendBody);
    const res = response as Record<string, unknown>;
    if (res.success === false && res.status === 400) {
      return { success: false, error: (res.error as string) ?? 'schema_error' };
    }
    return { success: true };
  } catch (err) {
    if (is400(err)) {
      captureException(err instanceof Error ? err : new Error(String(err)));
      return { success: false, error: (err as Error).message };
    }
    // Network / transient error → queue
    await enqueue(body);
    return { success: false, queued: true };
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function emitStreakExtended(
  client: WixClientLike | null,
  input: { userId: string; streak: number; delta: number; newTotal: number },
): Promise<CrossRigEventResult> {
  return emit(client, 'streak_extended', {
    userId: input.userId,
    streak: input.streak,
    delta: input.delta,
    newTotal: input.newTotal,
  });
}

export async function emitChallengeStarted(
  client: WixClientLike | null,
  input: { userId: string; challengeId: string; currentPoints: number },
): Promise<CrossRigEventResult> {
  return emit(client, 'challenge_started', {
    userId: input.userId,
    challengeId: input.challengeId,
    delta: 0, // no points change on challenge start — consistent envelope shape per cf-44r
    newTotal: input.currentPoints,
  });
}

export async function emitRedemptionInitiated(
  client: WixClientLike | null,
  input: { userId: string; pointsRedeemed: number; newTotal: number },
): Promise<CrossRigEventResult> {
  return emit(client, 'redemption_initiated', {
    userId: input.userId,
    delta: -input.pointsRedeemed, // negative: points leaving the account
    newTotal: input.newTotal,
  });
}

export async function replayCrossRigQueue(client: WixClientLike): Promise<ReplayResult> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return { replayed: 0, failed: 0 };

  const queue: QueuedEvent[] = JSON.parse(raw);
  if (queue.length === 0) return { replayed: 0, failed: 0 };

  const sessionToken = client.getSessionToken ? await client.getSessionToken() : null;

  let replayed = 0;
  const failed: QueuedEvent[] = [];

  for (const item of queue) {
    const sendBody = sessionToken ? { ...item.body, sessionToken } : item.body;
    try {
      await client.callFunction(item.fnName, 'POST', sendBody);
      replayed++;
    } catch (err) {
      failed.push(item);
    }
  }

  if (failed.length > 0) {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
  } else {
    await AsyncStorage.removeItem(QUEUE_KEY);
  }

  return { replayed, failed: failed.length };
}
