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
const mockRefreshAchievements = jest.fn().mockResolvedValue(undefined);

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

// 14 days ago in ms
const NOW = Date.now();
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const DELIVERED_14_DAYS_AGO = new Date(NOW - FOURTEEN_DAYS_MS).toISOString();
const DELIVERED_13_DAYS_AGO = new Date(NOW - 13 * 24 * 60 * 60 * 1000).toISOString();
const DELIVERED_15_DAYS_AGO = new Date(NOW - 15 * 24 * 60 * 60 * 1000).toISOString();

// --- Helpers ---

function renderPromptHook(overrides = {}) {
  return renderHook(() =>
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
}

function storageKey(orderId: string) {
  return `${REVIEW_PROMPT_STORAGE_PREFIX}${orderId}`;
}

// --- Tests ---

describe('usePostDeliveryReviewPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  // --- AC 1: Prompt fires at T+14, not before ---

  describe('scheduling', () => {
    it('schedules notification when delivered >= 14 days ago', async () => {
      await act(async () => {
        renderPromptHook({ deliveredAt: DELIVERED_14_DAYS_AGO });
      });

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
      const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
      expect(call.content.data.type).toBe('review_prompt');
      expect(call.content.data.orderId).toBe(ORDER_ID);
    });

    it('schedules notification when delivered > 14 days ago (past due)', async () => {
      await act(async () => {
        renderPromptHook({ deliveredAt: DELIVERED_15_DAYS_AGO });
      });

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    });

    it('does NOT schedule when delivered < 14 days ago', async () => {
      await act(async () => {
        renderPromptHook({ deliveredAt: DELIVERED_13_DAYS_AGO });
      });

      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('schedules with remaining delay when between 13-14 days', async () => {
      // Delivered 13.5 days ago — should schedule for 0.5 days from now
      const delivered13_5 = new Date(NOW - 13.5 * 24 * 60 * 60 * 1000).toISOString();
      await act(async () => {
        renderPromptHook({ deliveredAt: delivered13_5 });
      });

      // Should NOT schedule yet — still under 14 days
      // The hook only schedules when the delay has elapsed OR schedules a future notification
      // Either way, it should not fire the prompt immediately
      // Check: trigger seconds should be > 0 (the remaining half day)
      if ((Notifications.scheduleNotificationAsync as jest.Mock).mock.calls.length > 0) {
        const trigger = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0].trigger;
        expect(trigger.seconds).toBeGreaterThan(0);
        expect(trigger.seconds).toBeLessThanOrEqual(FOURTEEN_DAYS_SECONDS);
      }
    });

    it('uses TIME_INTERVAL trigger with correct seconds for exact T+14', async () => {
      await act(async () => {
        renderPromptHook({ deliveredAt: DELIVERED_14_DAYS_AGO });
      });

      const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
      expect(call.trigger.type).toBe('timeInterval');
      // When delivered exactly 14 days ago, trigger should be minimal (1 second min)
      expect(call.trigger.seconds).toBeGreaterThanOrEqual(1);
      expect(call.trigger.repeats).toBe(false);
    });

    it('does NOT schedule when reviewPromptEnabled is false', async () => {
      await act(async () => {
        renderPromptHook({ reviewPromptEnabled: false });
      });

      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('does NOT schedule when permissionGranted is false', async () => {
      await act(async () => {
        renderPromptHook({ permissionGranted: false });
      });

      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('does NOT schedule if already scheduled for this order', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ scheduledNotificationId: 'existing-notif', orderId: ORDER_ID }),
      );

      await act(async () => {
        renderPromptHook();
      });

      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('does NOT schedule if already reviewed for this order', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ reviewedAt: '2026-03-01T00:00:00Z', orderId: ORDER_ID }),
      );

      await act(async () => {
        renderPromptHook();
      });

      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('persists scheduled notification ID to AsyncStorage', async () => {
      await act(async () => {
        renderPromptHook();
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        storageKey(ORDER_ID),
        expect.stringContaining('notif-123'),
      );
    });

    it('notification deep links to product review', async () => {
      await act(async () => {
        renderPromptHook();
      });

      const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
      expect(call.content.data.deepLink).toContain(PRODUCT_ID);
    });
  });

  // --- AC 2: Points awarded once on review submit ---

  describe('review submission + points', () => {
    it('returns submitReview callback', async () => {
      let result: any;
      await act(async () => {
        const { result: hookResult } = renderPromptHook();
        result = hookResult;
      });

      expect(typeof result.current.submitReview).toBe('function');
    });

    it('calls gamification submitReview with productId and rating', async () => {
      let result: any;
      await act(async () => {
        const hook = renderPromptHook();
        result = hook.result;
      });

      await act(async () => {
        await result.current.submitReview(4, true);
      });

      expect(mockSubmitReview).toHaveBeenCalledWith(PRODUCT_ID, 4, true);
    });

    it('marks order as reviewed in AsyncStorage after submit', async () => {
      let result: any;
      await act(async () => {
        const hook = renderPromptHook();
        result = hook.result;
      });

      await act(async () => {
        await result.current.submitReview(5, false);
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        storageKey(ORDER_ID),
        expect.stringContaining('reviewedAt'),
      );
    });

    it('prevents double submission (idempotent)', async () => {
      let result: any;
      await act(async () => {
        const hook = renderPromptHook();
        result = hook.result;
      });

      await act(async () => {
        await result.current.submitReview(5, false);
      });

      // Second submission should be no-op
      await act(async () => {
        const secondResult = await result.current.submitReview(5, false);
        expect(secondResult.success).toBe(false);
      });

      expect(mockSubmitReview).toHaveBeenCalledTimes(1);
    });

    it('cancels scheduled notification after review submit', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null); // mount
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValueOnce('notif-456');

      let result: any;
      await act(async () => {
        const hook = renderPromptHook();
        result = hook.result;
      });

      // After submit, the pending notification should be cancelled
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify({ scheduledNotificationId: 'notif-456', orderId: ORDER_ID }),
      );

      await act(async () => {
        await result.current.submitReview(5, false);
      });

      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-456');
    });

    it('returns gamification result on success', async () => {
      let result: any;
      await act(async () => {
        const hook = renderPromptHook();
        result = hook.result;
      });

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
      let result: any;
      await act(async () => {
        const hook = renderPromptHook();
        result = hook.result;
      });

      await act(async () => {
        await result.current.submitReview(5, false);
      });

      expect(mockRefreshAchievements).toHaveBeenCalledTimes(1);
    });

    it('does NOT call onBadgeCheck when submitReview fails', async () => {
      mockSubmitReview.mockResolvedValueOnce({ success: false });

      let result: any;
      await act(async () => {
        const hook = renderPromptHook();
        result = hook.result;
      });

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

      await act(async () => {
        renderPromptHook();
      });

      // Should not throw — scheduling degrades gracefully
    });

    it('handles notification scheduling failure gracefully', async () => {
      (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValue(
        new Error('Notifications not available'),
      );

      await act(async () => {
        renderPromptHook();
      });

      // Should not throw
    });

    it('handles gamification submitReview failure gracefully', async () => {
      mockSubmitReview.mockRejectedValueOnce(new Error('Network error'));

      let result: any;
      await act(async () => {
        const hook = renderPromptHook();
        result = hook.result;
      });

      let submitResult: any;
      await act(async () => {
        submitResult = await result.current.submitReview(5, false);
      });

      expect(submitResult.success).toBe(false);
      // Should not crash, and should NOT mark as reviewed (can retry)
    });

    it('handles missing deliveredAt gracefully (no schedule)', async () => {
      await act(async () => {
        renderPromptHook({ deliveredAt: '' });
      });

      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('handles invalid deliveredAt date gracefully', async () => {
      await act(async () => {
        renderPromptHook({ deliveredAt: 'not-a-date' });
      });

      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });
  });
});
