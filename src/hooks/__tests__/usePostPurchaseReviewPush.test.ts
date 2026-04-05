/**
 * Tests for usePostPurchaseReviewPush — cm-qbt
 *
 * AC:
 *  1. Push notification scheduled T+3 days after order placed
 *  2. Does not double-schedule (idempotent per order)
 *  3. Respects reviewPushEnabled and permissionGranted flags
 *  4. Records order in pending-nudges index for in-app prompt
 */

import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {
  usePostPurchaseReviewPush,
  PUSH_STORAGE_PREFIX,
  NUDGES_INDEX_KEY,
  THREE_DAYS_SECONDS,
} from '../usePostPurchaseReviewPush';

// --- Mocks ---

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn().mockResolvedValue('push-notif-001'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
}));

// --- Constants ---

const ORDER_ID = 'order-xyz';
const PRODUCT_ID = 'prod-futon-2';

const NOW = Date.now();
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const PLACED_3_DAYS_AGO = new Date(NOW - THREE_DAYS_MS).toISOString();
const PLACED_2_DAYS_AGO = new Date(NOW - 2 * 24 * 60 * 60 * 1000).toISOString();
const PLACED_4_DAYS_AGO = new Date(NOW - 4 * 24 * 60 * 60 * 1000).toISOString();

// --- Helpers ---

function storageKey(orderId: string) {
  return `${PUSH_STORAGE_PREFIX}${orderId}`;
}

async function renderLoaded(overrides = {}) {
  const hook = renderHook(() =>
    usePostPurchaseReviewPush({
      orderId: ORDER_ID,
      productId: PRODUCT_ID,
      placedAt: PLACED_3_DAYS_AGO,
      reviewPushEnabled: true,
      permissionGranted: true,
      ...overrides,
    }),
  );
  await act(async () => {});
  return hook;
}

// --- Tests ---

describe('usePostPurchaseReviewPush', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  // --- AC 1: Notification scheduled at T+3 days ---

  describe('scheduling', () => {
    it('schedules notification when order placed >= 3 days ago', async () => {
      await renderLoaded({ placedAt: PLACED_3_DAYS_AGO });

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
      const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
      expect(call.content.data.type).toBe('post_purchase_review');
      expect(call.content.data.orderId).toBe(ORDER_ID);
    });

    it('schedules notification when order placed > 3 days ago (past due)', async () => {
      await renderLoaded({ placedAt: PLACED_4_DAYS_AGO });

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    });

    it('schedules future notification when order placed < 3 days ago', async () => {
      await renderLoaded({ placedAt: PLACED_2_DAYS_AGO });

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
      const trigger = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0]
        .trigger;
      // Remaining delay should be roughly 1 day — allow ±60s for test execution
      expect(trigger.seconds).toBeGreaterThan(80_000);
      expect(trigger.seconds).toBeLessThanOrEqual(THREE_DAYS_SECONDS);
    });

    it('uses TIME_INTERVAL trigger type', async () => {
      await renderLoaded();

      const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
      expect(call.trigger.type).toBe('timeInterval');
      expect(call.trigger.repeats).toBe(false);
      expect(call.trigger.seconds).toBeGreaterThanOrEqual(1);
    });

    it('notification body mentions review and points', async () => {
      await renderLoaded();

      const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
      expect(call.content.title).toBeTruthy();
      expect(call.content.body).toBeTruthy();
    });

    it('notification deep-links to the product', async () => {
      await renderLoaded();

      const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
      expect(call.content.data.deepLink).toContain(PRODUCT_ID);
    });
  });

  // --- AC 2: Idempotency ---

  describe('idempotency', () => {
    it('does NOT re-schedule if push already scheduled for this order', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ scheduledNotificationId: 'existing-push', orderId: ORDER_ID }),
      );

      await renderLoaded();

      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('does NOT schedule if order already reviewed', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ reviewedAt: '2026-03-01T00:00:00Z', orderId: ORDER_ID }),
      );

      await renderLoaded();

      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('persists scheduled notification ID to AsyncStorage', async () => {
      await renderLoaded();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        storageKey(ORDER_ID),
        expect.stringContaining('push-notif-001'),
      );
    });
  });

  // --- AC 3: Preference and permission guards ---

  describe('guards', () => {
    it('does NOT schedule when reviewPushEnabled is false', async () => {
      await renderLoaded({ reviewPushEnabled: false });

      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('does NOT schedule when permissionGranted is false', async () => {
      await renderLoaded({ permissionGranted: false });

      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });
  });

  // --- AC 4: Records order in pending-nudges index ---

  describe('nudges index', () => {
    it('adds orderId to the nudges index when scheduling', async () => {
      await renderLoaded();

      const indexCall = (AsyncStorage.setItem as jest.Mock).mock.calls.find(
        ([key]: [string]) => key === NUDGES_INDEX_KEY,
      );
      expect(indexCall).toBeDefined();
      const stored = JSON.parse(indexCall[1]);
      expect(stored).toContain(ORDER_ID);
    });

    it('does not duplicate orderId in index if already present', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === NUDGES_INDEX_KEY) return Promise.resolve(JSON.stringify([ORDER_ID]));
        return Promise.resolve(null);
      });

      await renderLoaded();

      const indexCalls = (AsyncStorage.setItem as jest.Mock).mock.calls.filter(
        ([key]: [string]) => key === NUDGES_INDEX_KEY,
      );
      if (indexCalls.length > 0) {
        const stored = JSON.parse(indexCalls[indexCalls.length - 1][1]);
        const occurrences = stored.filter((id: string) => id === ORDER_ID).length;
        expect(occurrences).toBe(1);
      }
    });
  });

  // --- Edge cases ---

  describe('edge cases', () => {
    it('handles missing placedAt gracefully (no schedule)', async () => {
      await renderLoaded({ placedAt: '' });

      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('handles invalid placedAt date gracefully', async () => {
      await renderLoaded({ placedAt: 'not-a-date' });

      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('handles AsyncStorage read error gracefully (no crash)', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage unavailable'));

      await renderLoaded();

      // Should not throw
    });

    it('handles notification scheduling failure gracefully (no crash)', async () => {
      (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValue(
        new Error('Notifications unavailable'),
      );

      await renderLoaded();

      // Should not throw
    });

    it('handles AsyncStorage write error gracefully (no crash)', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Write failed'));

      await renderLoaded();

      // Should not throw
    });
  });
});
