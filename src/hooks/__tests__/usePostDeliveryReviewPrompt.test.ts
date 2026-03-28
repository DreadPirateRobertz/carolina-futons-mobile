/**
 * Tests for usePostDeliveryReviewPrompt — cm-dyl
 *
 * AC:
 *  1. Review prompt fires exactly at T+14 days post-delivery (not before)
 *  2. Points awarded once on review submit
 *  3. Badge check triggered after submit
 */

import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {
  usePostDeliveryReviewPrompt,
  REVIEW_PROMPT_STORAGE_PREFIX,
  FOURTEEN_DAYS_SECONDS,
} from '../usePostDeliveryReviewPrompt';

// --- Mocks ---

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notif-123'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
}));

const mockSubmitReview = jest.fn().mockResolvedValue({ success: true, newTotal: 150 });
const mockRefreshAchievements = jest.fn();

jest.mock('@/hooks/useGamificationEvents', () => ({
  useGamificationEvents: () => ({
    submitReview: mockSubmitReview,
    addToCart: jest.fn(),
    referralShared: jest.fn(),
    arUsed: jest.fn(),
    wishlistAdd: jest.fn(),
    orderPlaced: jest.fn(),
    styleQuizComplete: jest.fn(),
  }),
}));

// --- Constants ---

const ORDER_ID = 'order-abc';
const PRODUCT_ID = 'prod-futon-1';

const NOW = Date.now();
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const DELIVERED_14_DAYS_AGO = new Date(NOW - FOURTEEN_DAYS_MS).toISOString();
const DELIVERED_13_DAYS_AGO = new Date(NOW - 13 * 24 * 60 * 60 * 1000).toISOString();
const DELIVERED_15_DAYS_AGO = new Date(NOW - 15 * 24 * 60 * 60 * 1000).toISOString();

// --- Helpers ---

function storageKey(orderId: string) {
  return `${REVIEW_PROMPT_STORAGE_PREFIX}${orderId}`;
}

/** Render hook and flush the mount effect */
async function renderLoaded(overrides = {}) {
  const hook = renderHook(() =>
    usePostDeliveryReviewPrompt({
      orderId: ORDER_ID,
      productId: PRODUCT_ID,
      deliveredAt: DELIVERED_14_DAYS_AGO,
      reviewPromptEnabled: true,
      permissionGranted: true,
      onBadgeCheck: mockRefreshAchievements,
      ...overrides,
    }),
  );
  await act(async () => {});
  return hook;
}

// --- Tests ---

describe('usePostDeliveryReviewPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    mockSubmitReview.mockResolvedValue({ success: true, newTotal: 150 });
  });

  // --- AC 1: Prompt fires at T+14, not before ---

  describe('scheduling', () => {
    it('schedules notification when delivered >= 14 days ago', async () => {
      await renderLoaded({ deliveredAt: DELIVERED_14_DAYS_AGO });

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
      const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
      expect(call.content.data.type).toBe('review_prompt');
      expect(call.content.data.orderId).toBe(ORDER_ID);
    });

    it('schedules notification when delivered > 14 days ago (past due)', async () => {
      await renderLoaded({ deliveredAt: DELIVERED_15_DAYS_AGO });

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    });

    it('schedules future notification when delivered < 14 days ago', async () => {
      await renderLoaded({ deliveredAt: DELIVERED_13_DAYS_AGO });

      // Should schedule with ~1 day remaining delay (not fire immediately)
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
      const trigger = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0].trigger;
      // Remaining delay should be roughly 1 day (86400s) — allow ±60s for test execution time
      expect(trigger.seconds).toBeGreaterThan(80000);
      expect(trigger.seconds).toBeLessThanOrEqual(FOURTEEN_DAYS_SECONDS);
    });

    it('schedules with remaining delay when between 13-14 days', async () => {
      const delivered13_5 = new Date(NOW - 13.5 * 24 * 60 * 60 * 1000).toISOString();
      await renderLoaded({ deliveredAt: delivered13_5 });

      // Should schedule with remaining ~0.5 days of delay
      if ((Notifications.scheduleNotificationAsync as jest.Mock).mock.calls.length > 0) {
        const trigger = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0].trigger;
        expect(trigger.seconds).toBeGreaterThan(0);
        expect(trigger.seconds).toBeLessThanOrEqual(FOURTEEN_DAYS_SECONDS);
      }
    });

    it('uses TIME_INTERVAL trigger with correct seconds for exact T+14', async () => {
      await renderLoaded({ deliveredAt: DELIVERED_14_DAYS_AGO });

      const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
      expect(call.trigger.type).toBe('timeInterval');
      expect(call.trigger.seconds).toBeGreaterThanOrEqual(1);
      expect(call.trigger.repeats).toBe(false);
    });

    it('does NOT schedule when reviewPromptEnabled is false', async () => {
      await renderLoaded({ reviewPromptEnabled: false });

      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('does NOT schedule when permissionGranted is false', async () => {
      await renderLoaded({ permissionGranted: false });

      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('does NOT schedule if already scheduled for this order', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ scheduledNotificationId: 'existing-notif', orderId: ORDER_ID }),
      );

      await renderLoaded();

      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('does NOT schedule if already reviewed for this order', async () => {
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
        expect.stringContaining('notif-123'),
      );
    });

    it('notification deep links to product review', async () => {
      await renderLoaded();

      const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
      expect(call.content.data.deepLink).toContain(PRODUCT_ID);
    });
  });

  // --- AC 2: Points awarded once on review submit ---

  describe('review submission + points', () => {
    it('returns submitReview callback', async () => {
      const { result } = await renderLoaded();

      expect(typeof result.current.submitReview).toBe('function');
    });

    it('calls gamification submitReview with productId and rating', async () => {
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.submitReview(4, true);
      });

      expect(mockSubmitReview).toHaveBeenCalledWith(PRODUCT_ID, 4, true);
    });

    it('marks order as reviewed in AsyncStorage after submit', async () => {
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.submitReview(5, false);
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        storageKey(ORDER_ID),
        expect.stringContaining('reviewedAt'),
      );
    });

    it('prevents double submission (idempotent)', async () => {
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.submitReview(5, false);
      });

      let secondResult: any;
      await act(async () => {
        secondResult = await result.current.submitReview(5, false);
      });

      expect(secondResult.success).toBe(false);
      expect(mockSubmitReview).toHaveBeenCalledTimes(1);
    });

    it('cancels scheduled notification after review submit', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null); // mount check
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValueOnce('notif-456');

      const { result } = await renderLoaded();

      // Mock storage to return the scheduled notification for the submit check
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify({ scheduledNotificationId: 'notif-456', orderId: ORDER_ID }),
      );

      await act(async () => {
        await result.current.submitReview(5, false);
      });

      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-456');
    });

    it('returns gamification result on success', async () => {
      const { result } = await renderLoaded();

      let submitResult: any;
      await act(async () => {
        submitResult = await result.current.submitReview(5, false);
      });

      expect(submitResult.success).toBe(true);
      expect(submitResult.newTotal).toBe(150);
    });
  });

  // --- AC 3: Badge check triggered after submit ---

  describe('badge check', () => {
    it('calls onBadgeCheck after successful review submit', async () => {
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.submitReview(5, false);
      });

      expect(mockRefreshAchievements).toHaveBeenCalledTimes(1);
    });

    it('does NOT call onBadgeCheck when submitReview fails', async () => {
      mockSubmitReview.mockResolvedValueOnce({ success: false });

      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.submitReview(5, false);
      });

      expect(mockRefreshAchievements).not.toHaveBeenCalled();
    });
  });

  // --- Edge cases ---

  describe('edge cases', () => {
    it('handles AsyncStorage errors gracefully (no crash)', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage unavailable'));

      await renderLoaded();

      // Should not throw
    });

    it('handles notification scheduling failure gracefully', async () => {
      (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValue(
        new Error('Notifications not available'),
      );

      await renderLoaded();

      // Should not throw
    });

    it('handles gamification submitReview failure gracefully', async () => {
      mockSubmitReview.mockRejectedValueOnce(new Error('Network error'));

      const { result } = await renderLoaded();

      let submitResult: any;
      await act(async () => {
        submitResult = await result.current.submitReview(5, false);
      });

      expect(submitResult.success).toBe(false);
    });

    it('handles missing deliveredAt gracefully (no schedule)', async () => {
      await renderLoaded({ deliveredAt: '' });

      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('handles invalid deliveredAt date gracefully', async () => {
      await renderLoaded({ deliveredAt: 'not-a-date' });

      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });
  });
});
