/**
 * Tests for gamificationApi — hq-825vi
 * TDD: tests written before implementation per Melania Directive.
 *
 * sendGamificationEvent POSTs to /_functions/gamificationEvent.
 * Offline queue: events queued when no wixClient, replayed on reconnect.
 * Idempotency: each event has a stable eventId to prevent double-counting.
 */

import { sendGamificationEvent, replayGamificationQueue } from '../gamificationApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Mock wix index ────────────────────────────────────────────────────────────
const mockCallFunction = jest.fn();
const mockGetWixClient = jest.fn();
jest.mock('@/services/wix', () => ({
  useOptionalWixClient: jest.fn(),
  getWixClient: () => mockGetWixClient(),
}));

// ── Mock AsyncStorage ─────────────────────────────────────────────────────────
jest.mock('@react-native-async-storage/async-storage');
const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockRemoveItem = AsyncStorage.removeItem as jest.Mock;

// ── Mock crashReporting ───────────────────────────────────────────────────────
jest.mock('@/services/crashReporting', () => ({
  captureException: jest.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeClient(response: Record<string, unknown> = { success: true, newTotal: 100 }) {
  return { callFunction: jest.fn().mockResolvedValue(response) };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
  mockRemoveItem.mockResolvedValue(undefined);
});

describe('sendGamificationEvent', () => {
  describe('online path', () => {
    it('POSTs to /_functions/gamificationEvent with correct body', async () => {
      const client = makeClient();
      const result = await sendGamificationEvent(client, {
        eventName: 'gamification_add_to_cart',
        memberId: 'member-1',
        payload: { product_id: 'prod-1', price: 199 },
      });

      expect(client.callFunction).toHaveBeenCalledWith(
        '/_functions/gamificationEvent',
        'POST',
        expect.objectContaining({
          eventName: 'gamification_add_to_cart',
          memberId: 'member-1',
          payload: { product_id: 'prod-1', price: 199 },
          eventId: expect.any(String),
        }),
      );
      expect(result.success).toBe(true);
    });

    it('returns server response fields', async () => {
      const client = makeClient({
        success: true,
        newTotal: 550,
        tierChanged: true,
        newTier: 'silver',
      });
      const result = await sendGamificationEvent(client, {
        eventName: 'gamification_submit_review',
        memberId: 'member-2',
        payload: { product_id: 'prod-2', rating: 5, has_photo: true },
      });
      expect(result.newTotal).toBe(550);
      expect(result.tierChanged).toBe(true);
      expect(result.newTier).toBe('silver');
    });

    it('eventId is a stable deterministic string per event', async () => {
      const client = makeClient();
      await sendGamificationEvent(client, {
        eventName: 'gamification_ar_used',
        memberId: 'member-3',
        payload: { product_id: 'prod-3' },
        eventId: 'stable-id-abc',
      });
      expect(client.callFunction).toHaveBeenCalledWith(
        '/_functions/gamificationEvent',
        'POST',
        expect.objectContaining({ eventId: 'stable-id-abc' }),
      );
    });

    it('generates a unique eventId when none provided', async () => {
      const client = makeClient();
      const calls: string[] = [];
      for (let i = 0; i < 3; i++) {
        await sendGamificationEvent(client, {
          eventName: 'gamification_wishlist_add',
          memberId: 'member-4',
          payload: { product_id: `prod-${i}` },
        });
        const body = (client.callFunction as jest.Mock).mock.calls[i][2];
        calls.push(body.eventId);
      }
      const unique = new Set(calls);
      expect(unique.size).toBe(3);
    });
  });

  describe('offline queue path', () => {
    it('queues event to AsyncStorage when no wixClient provided', async () => {
      const result = await sendGamificationEvent(null, {
        eventName: 'gamification_add_to_cart',
        memberId: 'member-5',
        payload: { product_id: 'prod-5', price: 99 },
      });

      expect(mockSetItem).toHaveBeenCalledWith(
        expect.stringContaining('gamification_queue'),
        expect.any(String),
      );
      expect(result.queued).toBe(true);
      expect(result.success).toBe(false);
    });

    it('appends to existing queue', async () => {
      const existing = JSON.stringify([
        { eventId: 'old-1', eventName: 'gamification_ar_used', memberId: 'm1', payload: {} },
      ]);
      mockGetItem.mockResolvedValue(existing);

      await sendGamificationEvent(null, {
        eventName: 'gamification_wishlist_add',
        memberId: 'member-6',
        payload: { product_id: 'prod-6' },
      });

      const saved = JSON.parse((mockSetItem as jest.Mock).mock.calls[0][1]);
      expect(saved).toHaveLength(2);
      expect(saved[0].eventId).toBe('old-1');
      expect(saved[1].eventName).toBe('gamification_wishlist_add');
    });

    it('queued event preserves memberId and payload', async () => {
      await sendGamificationEvent(null, {
        eventName: 'gamification_referral_shared',
        memberId: 'member-7',
        payload: { referral_code: 'REF123' },
      });

      const saved = JSON.parse((mockSetItem as jest.Mock).mock.calls[0][1]);
      expect(saved[0].memberId).toBe('member-7');
      expect(saved[0].payload.referral_code).toBe('REF123');
    });
  });

  describe('error handling', () => {
    it('returns error result when API call fails', async () => {
      const client = { callFunction: jest.fn().mockRejectedValue(new Error('network error')) };
      const result = await sendGamificationEvent(client, {
        eventName: 'gamification_add_to_cart',
        memberId: 'member-8',
        payload: {},
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('falls back to queue when API fails', async () => {
      const client = { callFunction: jest.fn().mockRejectedValue(new Error('timeout')) };
      const result = await sendGamificationEvent(client, {
        eventName: 'gamification_add_to_cart',
        memberId: 'member-9',
        payload: {},
      });
      expect(result.queued).toBe(true);
      expect(mockSetItem).toHaveBeenCalled();
    });
  });
});

describe('replayGamificationQueue', () => {
  it('returns early with 0 replayed when queue is empty', async () => {
    mockGetItem.mockResolvedValue(null);
    const client = makeClient();
    const result = await replayGamificationQueue(client);
    expect(result.replayed).toBe(0);
    expect(client.callFunction).not.toHaveBeenCalled();
  });

  it('replays each queued event via callFunction', async () => {
    const queue = [
      { eventId: 'q1', eventName: 'gamification_add_to_cart', memberId: 'm1', payload: {} },
      { eventId: 'q2', eventName: 'gamification_ar_used', memberId: 'm1', payload: {} },
    ];
    mockGetItem.mockResolvedValue(JSON.stringify(queue));
    const client = makeClient();
    const result = await replayGamificationQueue(client);

    expect(client.callFunction).toHaveBeenCalledTimes(2);
    expect(result.replayed).toBe(2);
    expect(result.failed).toBe(0);
  });

  it('passes stored eventId for idempotency', async () => {
    const queue = [
      {
        eventId: 'stable-q1',
        eventName: 'gamification_submit_review',
        memberId: 'm2',
        payload: { rating: 4 },
      },
    ];
    mockGetItem.mockResolvedValue(JSON.stringify(queue));
    const client = makeClient();
    await replayGamificationQueue(client);

    expect(client.callFunction).toHaveBeenCalledWith(
      '/_functions/gamificationEvent',
      'POST',
      expect.objectContaining({ eventId: 'stable-q1' }),
    );
  });

  it('clears queue after successful replay', async () => {
    const queue = [
      { eventId: 'q3', eventName: 'gamification_wishlist_add', memberId: 'm3', payload: {} },
    ];
    mockGetItem.mockResolvedValue(JSON.stringify(queue));
    const client = makeClient();
    await replayGamificationQueue(client);
    expect(mockRemoveItem).toHaveBeenCalled();
  });

  it('counts failed replays without throwing', async () => {
    const queue = [
      { eventId: 'q4', eventName: 'gamification_add_to_cart', memberId: 'm4', payload: {} },
      { eventId: 'q5', eventName: 'gamification_ar_used', memberId: 'm4', payload: {} },
    ];
    mockGetItem.mockResolvedValue(JSON.stringify(queue));
    const client = {
      callFunction: jest
        .fn()
        .mockResolvedValueOnce({ success: true, newTotal: 100 })
        .mockRejectedValueOnce(new Error('server error')),
    };
    const result = await replayGamificationQueue(client);
    expect(result.replayed).toBe(1);
    expect(result.failed).toBe(1);
  });

  it('keeps failed events in queue for next retry', async () => {
    const queue = [
      { eventId: 'q6', eventName: 'gamification_add_to_cart', memberId: 'm5', payload: {} },
    ];
    mockGetItem.mockResolvedValue(JSON.stringify(queue));
    const client = { callFunction: jest.fn().mockRejectedValue(new Error('fail')) };
    await replayGamificationQueue(client);
    // setItem called to persist remaining failures
    expect(mockSetItem).toHaveBeenCalled();
    const remaining = JSON.parse((mockSetItem as jest.Mock).mock.calls[0][1]);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].eventId).toBe('q6');
  });
});
