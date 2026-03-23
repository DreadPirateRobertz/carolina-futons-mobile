/**
 * gamificationOfflineQueue TDD tests — hq-94ado
 *
 * Tests written BEFORE implementation per CLAUDE.md mandate.
 * Offline queue for gamification events: AsyncStorage persistence,
 * unique eventId per event, replay to /_functions/gamificationEvent on reconnect.
 */

import {
  queueGamificationEvent,
  flushGamificationQueue,
  getGamificationQueueLength,
} from '../gamificationOfflineQueue';
import { _resetForTesting, getQueue } from '@/services/offlineQueue';

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockWixClient(callFunctionImpl?: jest.Mock) {
  return {
    callFunction: callFunctionImpl ?? jest.fn().mockResolvedValue({ ok: true }),
  };
}

beforeEach(() => {
  _resetForTesting();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ── queueGamificationEvent ────────────────────────────────────────────────────

describe('queueGamificationEvent', () => {
  it('stores event in the offline queue with domain=gamification', () => {
    queueGamificationEvent('gamification_add_to_cart', { product_id: 'prod-123', price: 299 });

    const gamQueue = getQueue('gamification');
    expect(gamQueue).toHaveLength(1);
    expect(gamQueue[0].domain).toBe('gamification');
    expect(gamQueue[0].action).toBe('gamification_add_to_cart');
  });

  it('stores event payload in the queue entry', () => {
    queueGamificationEvent('gamification_submit_review', {
      product_id: 'futon-xl',
      rating: 5,
      has_photo: true,
    });

    const entry = getQueue('gamification')[0];
    expect(entry.payload.product_id).toBe('futon-xl');
    expect(entry.payload.rating).toBe(5);
    expect(entry.payload.has_photo).toBe(true);
  });

  it('assigns a unique eventId (the QueuedAction id) per event', () => {
    queueGamificationEvent('gamification_add_to_cart', { product_id: 'a' });
    queueGamificationEvent('gamification_add_to_cart', { product_id: 'b' });

    const entries = getQueue('gamification');
    expect(entries[0].id).not.toBe(entries[1].id);
  });

  it('includes the eventId in the payload for server deduplication', () => {
    queueGamificationEvent('gamification_referral_shared', { referral_code: 'CODE-XK7P' });

    const entry = getQueue('gamification')[0];
    expect(entry.payload.eventId).toBe(entry.id);
  });

  it('increments getGamificationQueueLength', () => {
    expect(getGamificationQueueLength()).toBe(0);
    queueGamificationEvent('gamification_ar_used', { product_id: 'p1' });
    expect(getGamificationQueueLength()).toBe(1);
    queueGamificationEvent('gamification_ar_used', { product_id: 'p2' });
    expect(getGamificationQueueLength()).toBe(2);
  });
});

// ── flushGamificationQueue ────────────────────────────────────────────────────

describe('flushGamificationQueue', () => {
  it('is a no-op when queue is empty', async () => {
    const client = mockWixClient();
    const result = await flushGamificationQueue(client as never);

    expect(client.callFunction).not.toHaveBeenCalled();
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('calls /_functions/gamificationEvent for each queued event', async () => {
    queueGamificationEvent('gamification_add_to_cart', { product_id: 'a', price: 100 });
    queueGamificationEvent('gamification_wishlist_add', { product_id: 'b' });

    const client = mockWixClient();
    await flushGamificationQueue(client as never);

    expect(client.callFunction).toHaveBeenCalledTimes(2);
    expect(client.callFunction).toHaveBeenCalledWith(
      '/_functions/gamificationEvent',
      'POST',
      expect.objectContaining({ eventName: 'gamification_add_to_cart', product_id: 'a' }),
    );
  });

  it('includes eventId in each POST payload', async () => {
    queueGamificationEvent('gamification_submit_review', { product_id: 'p1', rating: 4 });

    const entry = getQueue('gamification')[0];
    const client = mockWixClient();
    await flushGamificationQueue(client as never);

    const callArgs = (client.callFunction as jest.Mock).mock.calls[0][2] as Record<string, unknown>;
    expect(callArgs.eventId).toBe(entry.id);
  });

  it('removes successfully replayed events from the queue', async () => {
    queueGamificationEvent('gamification_add_to_cart', { product_id: 'p1', price: 50 });
    queueGamificationEvent('gamification_ar_used', { product_id: 'p2' });

    const client = mockWixClient();
    await flushGamificationQueue(client as never);

    expect(getGamificationQueueLength()).toBe(0);
  });

  it('returns succeeded count equal to number of events replayed', async () => {
    queueGamificationEvent('gamification_add_to_cart', { product_id: 'p1', price: 10 });
    queueGamificationEvent('gamification_referral_shared', { referral_code: 'X' });

    const client = mockWixClient();
    const result = await flushGamificationQueue(client as never);

    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(0);
  });

  it('keeps failed events in queue for next reconnect', async () => {
    queueGamificationEvent('gamification_add_to_cart', { product_id: 'p1', price: 10 });

    const client = mockWixClient(jest.fn().mockRejectedValue(new Error('Network error')));
    const result = await flushGamificationQueue(client as never);

    expect(result.failed).toBe(1);
    expect(getGamificationQueueLength()).toBe(1);
  });

  it('replays events in the order they were queued', async () => {
    queueGamificationEvent('gamification_add_to_cart', { product_id: 'first', price: 1 });
    queueGamificationEvent('gamification_submit_review', { product_id: 'second', rating: 3 });
    queueGamificationEvent('gamification_ar_used', { product_id: 'third' });

    const callOrder: string[] = [];
    const client = {
      callFunction: jest
        .fn()
        .mockImplementation((_path: string, _method: string, body: Record<string, unknown>) => {
          callOrder.push(body.eventName as string);
          return Promise.resolve({ ok: true });
        }),
    };

    await flushGamificationQueue(client as never);

    expect(callOrder).toEqual([
      'gamification_add_to_cart',
      'gamification_submit_review',
      'gamification_ar_used',
    ]);
  });

  it('partial failure: succeeds first, fails second, keeps only failed in queue', async () => {
    queueGamificationEvent('gamification_add_to_cart', { product_id: 'ok', price: 10 });
    queueGamificationEvent('gamification_ar_used', { product_id: 'fail' });

    let callCount = 0;
    const client = {
      callFunction: jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 2) return Promise.reject(new Error('fail'));
        return Promise.resolve({ ok: true });
      }),
    };

    const result = await flushGamificationQueue(client as never);

    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(1);
    // The failed event (ar_used) stays in queue
    const remaining = getQueue('gamification');
    expect(remaining).toHaveLength(1);
    expect(remaining[0].action).toBe('gamification_ar_used');
  });
});
