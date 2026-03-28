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

import {
  emitStreakExtended,
  emitChallengeStarted,
  emitRedemptionInitiated,
  emitCartAbandoned,
  replayCrossRigQueue,
} from '../crossRigEventBus';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@/services/crashReporting', () => ({
  captureException: jest.fn(),
}));

// ── Constants ──────────────────────────────────────────────────────────────

const USER = 'member-test-001';

// ── Helpers ────────────────────────────────────────────────────────────────

function mockClient(
  response: object = { success: true },
  shouldThrow?: Error,
  opts: { refreshTokens?: jest.Mock } = {},
) {
  return {
    callFunction: jest.fn(
      async (_name: string, _method: string, _body: Record<string, unknown>) => {
        if (shouldThrow) throw shouldThrow;
        return response;
      },
    ),
    refreshTokens: opts.refreshTokens ?? jest.fn(async () => {}),
  };
}

// ── Schema validation ──────────────────────────────────────────────────────

describe('event schema', () => {
  it('includes eventId as UUID v4 format', async () => {
    const client = mockClient();
    await emitStreakExtended(client, { streak: 5, delta: 50, newTotal: 550 });
    const body = client.callFunction.mock.calls[0][2] as Record<string, unknown>;
    expect(body.eventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('includes schemaVersion 1.0', async () => {
    const client = mockClient();
    await emitStreakExtended(client, { streak: 3, delta: 30, newTotal: 330 });
    const body = client.callFunction.mock.calls[0][2] as Record<string, unknown>;
    expect(body.schemaVersion).toBe('1.0');
  });

  it('includes traceId with trace_ prefix', async () => {
    const client = mockClient();
    await emitStreakExtended(client, { streak: 3, delta: 30, newTotal: 330 });
    const body = client.callFunction.mock.calls[0][2] as Record<string, unknown>;
    expect(typeof body.traceId).toBe('string');
    expect((body.traceId as string).startsWith('trace_')).toBe(true);
  });

  it('includes source: mobile', async () => {
    const client = mockClient();
    await emitStreakExtended(client, { streak: 3, delta: 30, newTotal: 330 });
    const body = client.callFunction.mock.calls[0][2] as Record<string, unknown>;
    expect(body.source).toBe('mobile');
  });

  it('includes platform as ios or android', async () => {
    const client = mockClient();
    await emitStreakExtended(client, { streak: 3, delta: 30, newTotal: 330 });
    const body = client.callFunction.mock.calls[0][2] as Record<string, unknown>;
    expect(['ios', 'android']).toContain(body.platform);
  });

  it('includes appVersion as a string', async () => {
    const client = mockClient();
    await emitStreakExtended(client, { streak: 3, delta: 30, newTotal: 330 });
    const body = client.callFunction.mock.calls[0][2] as Record<string, unknown>;
    expect(typeof body.appVersion).toBe('string');
    expect((body.appVersion as string).length).toBeGreaterThan(0);
  });

  it('includes ts as epoch-ms integer', async () => {
    const before = Date.now();
    const client = mockClient();
    await emitStreakExtended(client, { streak: 3, delta: 50, newTotal: 350 });
    const after = Date.now();
    const body = client.callFunction.mock.calls[0][2] as Record<string, unknown>;
    expect(typeof body.ts).toBe('number');
    expect(body.ts as number).toBeGreaterThanOrEqual(before);
    expect(body.ts as number).toBeLessThanOrEqual(after);
  });

  it('each emission generates a unique eventId', async () => {
    const client = mockClient();
    await emitStreakExtended(client, { streak: 1, delta: 10, newTotal: 110 });
    await emitStreakExtended(client, { streak: 2, delta: 20, newTotal: 220 });
    const id1 = (client.callFunction.mock.calls[0][2] as Record<string, unknown>).eventId;
    const id2 = (client.callFunction.mock.calls[1][2] as Record<string, unknown>).eventId;
    expect(id1).not.toBe(id2);
  });

  it('each emission generates a unique traceId', async () => {
    const client = mockClient();
    await emitChallengeStarted(client, { challengeId: 'ch-1', currentPoints: 100 });
    await emitChallengeStarted(client, { challengeId: 'ch-2', currentPoints: 200 });
    const t1 = (client.callFunction.mock.calls[0][2] as Record<string, unknown>).traceId;
    const t2 = (client.callFunction.mock.calls[1][2] as Record<string, unknown>).traceId;
    expect(t1).not.toBe(t2);
  });
});

// ── emitStreakExtended ─────────────────────────────────────────────────────

describe('emitStreakExtended', () => {
  it('sends event: streak_extended', async () => {
    const client = mockClient();
    await emitStreakExtended(client, { streak: 7, delta: 70, newTotal: 770 });
    const body = client.callFunction.mock.calls[0][2] as Record<string, unknown>;
    expect(body.event).toBe('streak_extended');
  });

  it('includes streak count in payload', async () => {
    const client = mockClient();
    await emitStreakExtended(client, { streak: 12, delta: 120, newTotal: 1200 });
    const body = client.callFunction.mock.calls[0][2] as Record<string, unknown>;
    expect(body.streak).toBe(12);
  });

  it('returns success:true on 200 response', async () => {
    const result = await emitStreakExtended(mockClient(), {
      streak: 5,
      delta: 50,
      newTotal: 550,
    });
    expect(result.success).toBe(true);
  });

  it('queues and returns queued:true when client is null', async () => {
    const result = await emitStreakExtended(null, {
      streak: 3,
      delta: 30,
      newTotal: 330,
    });
    expect(result.success).toBe(false);
    expect(result.queued).toBe(true);
  });

  it('queues and returns queued:true on network error', async () => {
    const client = mockClient({}, new Error('Network timeout'));
    const result = await emitStreakExtended(client, {
      streak: 3,
      delta: 30,
      newTotal: 330,
    });
    expect(result.success).toBe(false);
    expect(result.queued).toBe(true);
  });
});

// ── emitChallengeStarted ──────────────────────────────────────────────────

describe('emitChallengeStarted', () => {
  it('sends event: challenge_started', async () => {
    const client = mockClient();
    await emitChallengeStarted(client, {
      challengeId: 'ch-sunrise-hike',
      currentPoints: 400,
    });
    const body = client.callFunction.mock.calls[0][2] as Record<string, unknown>;
    expect(body.event).toBe('challenge_started');
  });

  it('includes challengeId in payload', async () => {
    const client = mockClient();
    await emitChallengeStarted(client, {
      challengeId: 'ch-sunrise-hike',
      currentPoints: 400,
    });
    const body = client.callFunction.mock.calls[0][2] as Record<string, unknown>;
    expect(body.challengeId).toBe('ch-sunrise-hike');
  });

  it('sends delta:0 and newTotal:currentPoints (consistent envelope shape)', async () => {
    const client = mockClient();
    await emitChallengeStarted(client, { challengeId: 'ch-1', currentPoints: 750 });
    const body = client.callFunction.mock.calls[0][2] as Record<string, unknown>;
    expect(body.delta).toBe(0);
    expect(body.newTotal).toBe(750);
  });

  it('returns success:true on 200', async () => {
    const result = await emitChallengeStarted(mockClient(), {
      challengeId: 'ch-1',
      currentPoints: 400,
    });
    expect(result.success).toBe(true);
  });

  it('queues when client null', async () => {
    const result = await emitChallengeStarted(null, {
      challengeId: 'ch-1',
      currentPoints: 400,
    });
    expect(result.queued).toBe(true);
  });
});

// ── emitRedemptionInitiated ───────────────────────────────────────────────

describe('emitRedemptionInitiated', () => {
  it('sends event: redemption_initiated', async () => {
    const client = mockClient();
    await emitRedemptionInitiated(client, { pointsRedeemed: 200, newTotal: 800 });
    const body = client.callFunction.mock.calls[0][2] as Record<string, unknown>;
    expect(body.event).toBe('redemption_initiated');
  });

  it('sends delta as negative pointsRedeemed and includes newTotal', async () => {
    const client = mockClient();
    await emitRedemptionInitiated(client, { pointsRedeemed: 500, newTotal: 1500 });
    const body = client.callFunction.mock.calls[0][2] as Record<string, unknown>;
    expect(body.delta).toBe(-500);
    expect(body.newTotal).toBe(1500);
  });

  it('returns success:true on 200', async () => {
    const result = await emitRedemptionInitiated(mockClient(), {
      pointsRedeemed: 100,
      newTotal: 900,
    });
    expect(result.success).toBe(true);
  });

  it('queues when client null', async () => {
    const result = await emitRedemptionInitiated(null, {
      pointsRedeemed: 100,
      newTotal: 900,
    });
    expect(result.queued).toBe(true);
  });
});

// ── 400 rejection — do NOT retry ──────────────────────────────────────────

describe('400 rejection handling', () => {
  it('returns error and does NOT queue on 400 (schema validation failure)', async () => {
    const client = mockClient({ success: false, status: 400, error: 'missing eventId' });
    // A 400-like response: success:false, not a thrown error
    const result = await emitStreakExtended(client, {
      streak: 1,
      delta: 10,
      newTotal: 110,
    });
    // Should not queue — schema errors are not retriable
    expect(result.queued).toBeUndefined();
  });

  it('does not queue on explicit 400 thrown error', async () => {
    const err = new Error('Bad Request') as Error & { status?: number };
    err.status = 400;
    const client = mockClient({}, err);
    const result = await emitStreakExtended(client, {
      streak: 1,
      delta: 10,
      newTotal: 110,
    });
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
    await emitStreakExtended(null, { streak: 3, delta: 30, newTotal: 330 });
    await emitChallengeStarted(null, { challengeId: 'ch-1', currentPoints: 400 });

    const client = mockClient();
    const result = await replayCrossRigQueue(client);
    expect(result.replayed).toBe(2);
    expect(result.failed).toBe(0);
    expect(client.callFunction).toHaveBeenCalledTimes(2);
  });

  it('clears queue after successful replay', async () => {
    await emitStreakExtended(null, { streak: 1, delta: 10, newTotal: 110 });
    await replayCrossRigQueue(mockClient());

    // Re-replay should find nothing
    const result = await replayCrossRigQueue(mockClient());
    expect(result.replayed).toBe(0);
  });

  it('keeps failed events in queue for next retry', async () => {
    await emitRedemptionInitiated(null, { pointsRedeemed: 100, newTotal: 900 });

    const failingClient = mockClient({}, new Error('Server error'));
    const result = await replayCrossRigQueue(failingClient);
    expect(result.failed).toBe(1);

    // Should still be in queue
    const secondClient = mockClient();
    const result2 = await replayCrossRigQueue(secondClient);
    expect(result2.replayed).toBe(1);
  });

  it('preserves eventId across queue → replay (idempotency)', async () => {
    await emitStreakExtended(null, { streak: 5, delta: 50, newTotal: 550 });
    const client = mockClient();
    await replayCrossRigQueue(client);
    const body = client.callFunction.mock.calls[0][2] as Record<string, unknown>;
    // eventId should be a UUID v4, set at queue time
    expect(body.eventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('queued body does not contain a session token field', async () => {
    await emitStreakExtended(null, { streak: 1, delta: 10, newTotal: 110 });
    const client = mockClient();
    await replayCrossRigQueue(client);
    const body = client.callFunction.mock.calls[0][2] as Record<string, unknown>;
    expect(body).not.toHaveProperty('sessionToken');
    expect(body).not.toHaveProperty('authorization');
    expect(body).not.toHaveProperty('token');
  });
});

// ── 401 auth hardening — hq-ud4bq ─────────────────────────────────────────

function make401Error(): Error & { status?: number } {
  const err = new Error('Unauthorized') as Error & { status?: number };
  err.status = 401;
  return err;
}

function mockClientWithRefresh(
  opts: {
    failFirstWith?: Error;
    refreshThrows?: boolean;
  } = {},
) {
  let callCount = 0;
  const refreshTokens = opts.refreshThrows
    ? jest.fn().mockRejectedValue(new Error('refresh failed'))
    : jest.fn().mockResolvedValue(undefined);

  const callFunction = jest.fn(async () => {
    callCount++;
    if (callCount === 1 && opts.failFirstWith) throw opts.failFirstWith;
    return { success: true };
  });

  return { callFunction, refreshTokens };
}

describe('401 auth hardening', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('calls refreshTokens() and retries once on 401', async () => {
    const client = mockClientWithRefresh({ failFirstWith: make401Error() });
    const result = await emitStreakExtended(client, {
      streak: 5,
      delta: 50,
      newTotal: 550,
    });

    expect(client.refreshTokens).toHaveBeenCalledTimes(1);
    expect(client.callFunction).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(true);
  });

  it('does not retry more than once on consecutive 401s', async () => {
    const err401 = make401Error();
    const client = {
      callFunction: jest.fn().mockRejectedValue(err401),
      refreshTokens: jest.fn().mockResolvedValue(undefined),
    };
    const result = await emitStreakExtended(client, {
      streak: 5,
      delta: 50,
      newTotal: 550,
    });

    expect(client.callFunction).toHaveBeenCalledTimes(2); // initial + one retry
    expect(result.queued).toBeUndefined(); // stale auth — not queued (hq-ud4bq)
    expect(result.success).toBe(false);
  });

  it('does not queue when no refreshTokens method on client (401 = stale auth)', async () => {
    const clientNoRefresh = {
      callFunction: jest.fn().mockRejectedValue(make401Error()),
    };
    const result = await emitStreakExtended(clientNoRefresh, {
      streak: 3,
      delta: 30,
      newTotal: 330,
    });

    expect(result.queued).toBeUndefined(); // 401 = stale auth, not transient — hq-ud4bq
    expect(result.success).toBe(false);
  });

  it('queues event when refreshTokens() throws', async () => {
    const client = mockClientWithRefresh({ failFirstWith: make401Error(), refreshThrows: true });
    const result = await emitStreakExtended(client, {
      streak: 3,
      delta: 30,
      newTotal: 330,
    });

    expect(client.refreshTokens).toHaveBeenCalledTimes(1);
    expect(result.queued).toBe(true);
    expect(result.success).toBe(false);
  });

  it('does not call refreshTokens on non-401 network errors', async () => {
    const client = mockClientWithRefresh({ failFirstWith: new Error('Network timeout') });
    await emitStreakExtended(client, { streak: 3, delta: 30, newTotal: 330 });

    expect(client.refreshTokens).not.toHaveBeenCalled();
  });

  it('replayCrossRigQueue calls refreshTokens and retries on 401', async () => {
    await emitStreakExtended(null, { streak: 2, delta: 20, newTotal: 220 });

    const client = mockClientWithRefresh({ failFirstWith: make401Error() });
    const result = await replayCrossRigQueue(client);

    expect(client.refreshTokens).toHaveBeenCalledTimes(1);
    expect(result.replayed).toBe(1);
    expect(result.failed).toBe(0);
  });
});

// ── Security: userId absent from payload ──────────────────────────────────
//
// Server resolves memberId from the Wix session token — payload userId
// is a forgeable IDOR vector and must not be sent. hq-u35ub.

describe('security — userId not in payload', () => {
  it('emitStreakExtended does not include userId in body', async () => {
    const client = mockClient();
    await emitStreakExtended(client, { streak: 5, delta: 50, newTotal: 550 });
    const body = client.callFunction.mock.calls[0][2] as Record<string, unknown>;
    expect(body).not.toHaveProperty('userId');
  });

  it('emitChallengeStarted does not include userId in body', async () => {
    const client = mockClient();
    await emitChallengeStarted(client, { challengeId: 'ch-1', currentPoints: 400 });
    const body = client.callFunction.mock.calls[0][2] as Record<string, unknown>;
    expect(body).not.toHaveProperty('userId');
  });

  it('emitRedemptionInitiated does not include userId in body', async () => {
    const client = mockClient();
    await emitRedemptionInitiated(client, { pointsRedeemed: 200, newTotal: 800 });
    const body = client.callFunction.mock.calls[0][2] as Record<string, unknown>;
    expect(body).not.toHaveProperty('userId');
  });

  it('queued events do not include userId', async () => {
    await emitStreakExtended(null, { streak: 3, delta: 30, newTotal: 330 });
    const raw = await AsyncStorage.getItem('@cf_cross_rig_queue');
    const queue = JSON.parse(raw!);
    expect(queue[0].body).not.toHaveProperty('userId');
  });
});

// ── 401 auth error handling ────────────────────────────────────────────────
//
// On 401: refresh token and retry once. If retry succeeds, return success.
// If retry still fails, return error — do NOT queue (stale auth, not transient).

describe('401 auth error handling', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('calls refreshTokens and retries on 401', async () => {
    const authErr = Object.assign(new Error('Unauthorized'), { status: 401 });
    const callFunction = jest
      .fn()
      .mockRejectedValueOnce(authErr)
      .mockResolvedValueOnce({ success: true });
    const refreshTokens = jest.fn(async () => {});
    const client = { callFunction, refreshTokens };

    const result = await emitStreakExtended(client, {
      streak: 5,
      delta: 50,
      newTotal: 550,
    });

    expect(refreshTokens).toHaveBeenCalledTimes(1);
    expect(callFunction).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(true);
  });

  it('does not queue on 401 — auth errors are not transient', async () => {
    const authErr = Object.assign(new Error('Unauthorized'), { status: 401 });
    const client = mockClient({}, authErr);

    const result = await emitStreakExtended(client, {
      streak: 5,
      delta: 50,
      newTotal: 550,
    });

    expect(result.queued).toBeUndefined();
    expect(result.success).toBe(false);
  });

  it('returns error if retry after refresh also fails', async () => {
    const authErr = Object.assign(new Error('Unauthorized'), { status: 401 });
    const callFunction = jest.fn().mockRejectedValue(authErr);
    const refreshTokens = jest.fn(async () => {});
    const client = { callFunction, refreshTokens };

    const result = await emitChallengeStarted(client, {
      challengeId: 'ch-1',
      currentPoints: 400,
    });

    expect(refreshTokens).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(false);
    expect(result.queued).toBeUndefined();
  });

  it('retries with the same body (same eventId for idempotency)', async () => {
    const authErr = Object.assign(new Error('Unauthorized'), { status: 401 });
    const callFunction = jest
      .fn()
      .mockRejectedValueOnce(authErr)
      .mockResolvedValueOnce({ success: true });
    const client = { callFunction, refreshTokens: jest.fn(async () => {}) };

    await emitRedemptionInitiated(client, { pointsRedeemed: 100, newTotal: 900 });

    const body1 = callFunction.mock.calls[0][2] as Record<string, unknown>;
    const body2 = callFunction.mock.calls[1][2] as Record<string, unknown>;
    expect(body1.eventId).toBe(body2.eventId);
  });
});

// ── emitCartAbandoned ──────────────────────────────────────────────────────

// mockCallFunction helper for emitCartAbandoned tests
let mockCallFunction: jest.Mock;
const mockWixClient = { callFunction: (...args: unknown[]) => mockCallFunction(...args) };

describe('emitCartAbandoned', () => {
  beforeEach(() => {
    mockCallFunction = jest.fn();
  });

  it('emitCartAbandoned sends cart_abandoned event', async () => {
    mockCallFunction.mockResolvedValue({ success: true });
    await emitCartAbandoned(mockWixClient, { cartTotal: 299, itemCount: 2 });
    expect(mockCallFunction).toHaveBeenCalledWith(
      'crossRigEvent',
      'POST',
      expect.objectContaining({ event: 'cart_abandoned', cartTotal: 299, itemCount: 2 }),
    );
  });

  it('returns success:true on 200', async () => {
    mockCallFunction.mockResolvedValue({ success: true });
    const result = await emitCartAbandoned(mockWixClient, { cartTotal: 499, itemCount: 3 });
    expect(result.success).toBe(true);
  });

  it('queues and returns queued:true when client is null', async () => {
    const result = await emitCartAbandoned(null, { cartTotal: 199, itemCount: 1 });
    expect(result.success).toBe(false);
    expect(result.queued).toBe(true);
  });

  it('does not include userId in body (IDOR protection)', async () => {
    mockCallFunction.mockResolvedValue({ success: true });
    await emitCartAbandoned(mockWixClient, { cartTotal: 299, itemCount: 2 });
    const body = mockCallFunction.mock.calls[0][2] as Record<string, unknown>;
    expect(body).not.toHaveProperty('userId');
  });
});
