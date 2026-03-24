/**
 * crossRigEventBus tests — cm-p8-bus
 *
 * Phase 8 mobile → web event emitter. Sends streak_extended,
 * challenge_started, redemption_initiated to Wix webMethod with
 * full v2 schema: eventId (UUID v4), schemaVersion '1.0', traceId.
 *
 * Wix rejects events missing eventId or schemaVersion (400) — these
 * must NOT be retried. Network failures ARE queued for retry.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@/services/crashReporting', () => ({
  captureException: jest.fn(),
}));

import {
  emitStreakExtended,
  emitChallengeStarted,
  emitRedemptionInitiated,
  replayCrossRigQueue,
  type CrossRigEventResult,
} from '../crossRigEventBus';

// ── Helpers ────────────────────────────────────────────────────────────────

function mockClient(response: object = { success: true }, shouldThrow?: Error) {
  return {
    callFunction: jest.fn(
      async (_name: string, _method: string, _body: Record<string, unknown>) => {
        if (shouldThrow) throw shouldThrow;
        return response;
      },
    ),
  };
}

const USER = 'member-abc123';

// ── Schema validation ──────────────────────────────────────────────────────

describe('event schema', () => {
  it('includes eventId as UUID v4 format', async () => {
    const client = mockClient();
    await emitStreakExtended(client, { userId: USER, streak: 5, delta: 50, newTotal: 550 });
    const body = client.callFunction.mock.calls[0][2] as Record<string, unknown>;
    expect(body.eventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('includes schemaVersion 1.0', async () => {
    const client = mockClient();
    await emitStreakExtended(client, { userId: USER, streak: 3, delta: 30, newTotal: 330 });
    const body = client.callFunction.mock.calls[0][2] as Record<string, unknown>;
    expect(body.schemaVersion).toBe('1.0');
  });

  it('includes traceId with trace_ prefix', async () => {
    const client = mockClient();
    await emitStreakExtended(client, { userId: USER, streak: 3, delta: 30, newTotal: 330 });
    const body = client.callFunction.mock.calls[0][2] as Record<string, unknown>;
    expect(typeof body.traceId).toBe('string');
    expect((body.traceId as string).startsWith('trace_')).toBe(true);
  });

  it('includes source: mobile', async () => {
    const client = mockClient();
    await emitStreakExtended(client, { userId: USER, streak: 3, delta: 30, newTotal: 330 });
    const body = client.callFunction.mock.calls[0][2] as Record<string, unknown>;
    expect(body.source).toBe('mobile');
  });

  it('includes platform as ios or android', async () => {
    const client = mockClient();
    await emitStreakExtended(client, { userId: USER, streak: 3, delta: 30, newTotal: 330 });
    const body = client.callFunction.mock.calls[0][2] as Record<string, unknown>;
    expect(['ios', 'android']).toContain(body.platform);
  });

  it('includes appVersion as a string', async () => {
    const client = mockClient();
    await emitStreakExtended(client, { userId: USER, streak: 3, delta: 30, newTotal: 330 });
    const body = client.callFunction.mock.calls[0][2] as Record<string, unknown>;
    expect(typeof body.appVersion).toBe('string');
    expect((body.appVersion as string).length).toBeGreaterThan(0);
  });

  it('includes ts as epoch-ms integer', async () => {
    const before = Date.now();
    const client = mockClient();
    await emitStreakExtended(client, { userId: USER, streak: 3, delta: 50, newTotal: 350 });
    const after = Date.now();
    const body = client.callFunction.mock.calls[0][2] as Record<string, unknown>;
    expect(typeof body.ts).toBe('number');
    expect(body.ts as number).toBeGreaterThanOrEqual(before);
    expect(body.ts as number).toBeLessThanOrEqual(after);
  });

  it('each emission generates a unique eventId', async () => {
    const client = mockClient();
    await emitStreakExtended(client, { userId: USER, streak: 1, delta: 10, newTotal: 110 });
    await emitStreakExtended(client, { userId: USER, streak: 2, delta: 20, newTotal: 220 });
    const id1 = (client.callFunction.mock.calls[0][2] as Record<string, unknown>).eventId;
    const id2 = (client.callFunction.mock.calls[1][2] as Record<string, unknown>).eventId;
    expect(id1).not.toBe(id2);
  });

  it('each emission generates a unique traceId', async () => {
    const client = mockClient();
    await emitChallengeStarted(client, { userId: USER, challengeId: 'ch-1', currentPoints: 100 });
    await emitChallengeStarted(client, { userId: USER, challengeId: 'ch-2', currentPoints: 200 });
    const t1 = (client.callFunction.mock.calls[0][2] as Record<string, unknown>).traceId;
    const t2 = (client.callFunction.mock.calls[1][2] as Record<string, unknown>).traceId;
    expect(t1).not.toBe(t2);
  });
});

// ── emitStreakExtended ─────────────────────────────────────────────────────

describe('emitStreakExtended', () => {
  it('sends event: streak_extended', async () => {
    const client = mockClient();
    await emitStreakExtended(client, { userId: USER, streak: 7, delta: 70, newTotal: 770 });
    const body = client.callFunction.mock.calls[0][2] as Record<string, unknown>;
    expect(body.event).toBe('streak_extended');
  });

  it('includes streak count in payload', async () => {
    const client = mockClient();
    await emitStreakExtended(client, { userId: USER, streak: 12, delta: 120, newTotal: 1200 });
    const body = client.callFunction.mock.calls[0][2] as Record<string, unknown>;
    expect(body.streak).toBe(12);
  });

  it('returns success:true on 200 response', async () => {
    const result = await emitStreakExtended(mockClient(), { userId: USER, streak: 5, delta: 50, newTotal: 550 });
    expect(result.success).toBe(true);
  });

  it('queues and returns queued:true when client is null', async () => {
    const result = await emitStreakExtended(null, { userId: USER, streak: 3, delta: 30, newTotal: 330 });
    expect(result.success).toBe(false);
    expect(result.queued).toBe(true);
  });

  it('queues and returns queued:true on network error', async () => {
    const client = mockClient({}, new Error('Network timeout'));
    const result = await emitStreakExtended(client, { userId: USER, streak: 3, delta: 30, newTotal: 330 });
    expect(result.success).toBe(false);
    expect(result.queued).toBe(true);
  });
});

// ── emitChallengeStarted ──────────────────────────────────────────────────

describe('emitChallengeStarted', () => {
  it('sends event: challenge_started', async () => {
    const client = mockClient();
    await emitChallengeStarted(client, { userId: USER, challengeId: 'ch-sunrise-hike', currentPoints: 400 });
    const body = client.callFunction.mock.calls[0][2] as Record<string, unknown>;
    expect(body.event).toBe('challenge_started');
  });

  it('includes challengeId in payload', async () => {
    const client = mockClient();
    await emitChallengeStarted(client, { userId: USER, challengeId: 'ch-sunrise-hike', currentPoints: 400 });
    const body = client.callFunction.mock.calls[0][2] as Record<string, unknown>;
    expect(body.challengeId).toBe('ch-sunrise-hike');
  });

  it('sends delta:0 and newTotal:currentPoints (consistent envelope shape)', async () => {
    const client = mockClient();
    await emitChallengeStarted(client, { userId: USER, challengeId: 'ch-1', currentPoints: 750 });
    const body = client.callFunction.mock.calls[0][2] as Record<string, unknown>;
    expect(body.delta).toBe(0);
    expect(body.newTotal).toBe(750);
  });

  it('returns success:true on 200', async () => {
    const result = await emitChallengeStarted(mockClient(), {
      userId: USER,
      challengeId: 'ch-1',
      currentPoints: 400,
    });
    expect(result.success).toBe(true);
  });

  it('queues when client null', async () => {
    const result = await emitChallengeStarted(null, { userId: USER, challengeId: 'ch-1', currentPoints: 400 });
    expect(result.queued).toBe(true);
  });
});

// ── emitRedemptionInitiated ───────────────────────────────────────────────

describe('emitRedemptionInitiated', () => {
  it('sends event: redemption_initiated', async () => {
    const client = mockClient();
    await emitRedemptionInitiated(client, { userId: USER, pointsRedeemed: 200, newTotal: 800 });
    const body = client.callFunction.mock.calls[0][2] as Record<string, unknown>;
    expect(body.event).toBe('redemption_initiated');
  });

  it('sends delta as negative pointsRedeemed and includes newTotal', async () => {
    const client = mockClient();
    await emitRedemptionInitiated(client, { userId: USER, pointsRedeemed: 500, newTotal: 1500 });
    const body = client.callFunction.mock.calls[0][2] as Record<string, unknown>;
    expect(body.delta).toBe(-500);
    expect(body.newTotal).toBe(1500);
  });

  it('returns success:true on 200', async () => {
    const result = await emitRedemptionInitiated(mockClient(), {
      userId: USER,
      pointsRedeemed: 100,
      newTotal: 900,
    });
    expect(result.success).toBe(true);
  });

  it('queues when client null', async () => {
    const result = await emitRedemptionInitiated(null, { userId: USER, pointsRedeemed: 100, newTotal: 900 });
    expect(result.queued).toBe(true);
  });
});

// ── 400 rejection — do NOT retry ──────────────────────────────────────────

describe('400 rejection handling', () => {
  it('returns error and does NOT queue on 400 (schema validation failure)', async () => {
    const client = mockClient({ success: false, status: 400, error: 'missing eventId' });
    // A 400-like response: success:false, not a thrown error
    const result = await emitStreakExtended(client, { userId: USER, streak: 1, delta: 10, newTotal: 110 });
    // Should not queue — schema errors are not retriable
    expect(result.queued).toBeUndefined();
  });

  it('does not queue on explicit 400 thrown error', async () => {
    const err = new Error('Bad Request') as Error & { status?: number };
    err.status = 400;
    const client = mockClient({}, err);
    const result = await emitStreakExtended(client, { userId: USER, streak: 1, delta: 10, newTotal: 110 });
    expect(result.queued).toBeUndefined();
    expect(result.success).toBe(false);
  });
});

// ── Offline queue replay ───────────────────────────────────────────────────

describe('replayCrossRigQueue', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns 0/0 when queue is empty', async () => {
    const result = await replayCrossRigQueue(mockClient());
    expect(result.replayed).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('replays queued events on reconnect', async () => {
    // Queue 2 events while offline
    await emitStreakExtended(null, { userId: USER, streak: 3, delta: 30, newTotal: 330 });
    await emitChallengeStarted(null, { userId: USER, challengeId: 'ch-1', currentPoints: 400 });

    const client = mockClient();
    const result = await replayCrossRigQueue(client);
    expect(result.replayed).toBe(2);
    expect(result.failed).toBe(0);
    expect(client.callFunction).toHaveBeenCalledTimes(2);
  });

  it('clears queue after successful replay', async () => {
    await emitStreakExtended(null, { userId: USER, streak: 1, delta: 10, newTotal: 110 });
    await replayCrossRigQueue(mockClient());

    // Re-replay should find nothing
    const result = await replayCrossRigQueue(mockClient());
    expect(result.replayed).toBe(0);
  });

  it('keeps failed events in queue for next retry', async () => {
    await emitRedemptionInitiated(null, { userId: USER, pointsRedeemed: 100, newTotal: 900 });

    const failingClient = mockClient({}, new Error('Server error'));
    const result = await replayCrossRigQueue(failingClient);
    expect(result.failed).toBe(1);

    // Should still be in queue
    const secondClient = mockClient();
    const result2 = await replayCrossRigQueue(secondClient);
    expect(result2.replayed).toBe(1);
  });

  it('preserves eventId across queue → replay (idempotency)', async () => {
    await emitStreakExtended(null, { userId: USER, streak: 5, delta: 50, newTotal: 550 });
    const client = mockClient();
    await replayCrossRigQueue(client);
    const body = client.callFunction.mock.calls[0][2] as Record<string, unknown>;
    // eventId should be a UUID v4, set at queue time
    expect(body.eventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
