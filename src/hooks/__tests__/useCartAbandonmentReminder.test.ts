/**
 * Tests for the useCartAbandonmentReminder hook.
 *
 * Verifies: scheduling 24h after last cart change, respecting preferences,
 * cancellation on cart empty/order, max 1 per week throttle, deep link to cart.
 */
import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useCartAbandonmentReminder } from '../useCartAbandonmentReminder';

// Mock dependencies
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notif-id-1'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

const STORAGE_KEY = '@cart_abandonment_state';
const ONE_DAY_SECONDS = 24 * 60 * 60;
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

describe('useCartAbandonmentReminder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1000000000000); // fixed timestamp
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not schedule when cart is empty', async () => {
    const { result } = renderHook(() =>
      useCartAbandonmentReminder({
        itemCount: 0,
        cartRemindersEnabled: true,
        permissionGranted: true,
      }),
    );

    await act(async () => {
      await result.current.onCartChanged();
    });

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('does not schedule when cartReminders preference is disabled', async () => {
    const { result } = renderHook(() =>
      useCartAbandonmentReminder({
        itemCount: 2,
        cartRemindersEnabled: false,
        permissionGranted: true,
      }),
    );

    await act(async () => {
      await result.current.onCartChanged();
    });

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('does not schedule when notification permission is not granted', async () => {
    const { result } = renderHook(() =>
      useCartAbandonmentReminder({
        itemCount: 2,
        cartRemindersEnabled: true,
        permissionGranted: false,
      }),
    );

    await act(async () => {
      await result.current.onCartChanged();
    });

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('schedules a notification 24h after cart change when conditions met', async () => {
    const { result } = renderHook(() =>
      useCartAbandonmentReminder({
        itemCount: 3,
        cartRemindersEnabled: true,
        permissionGranted: true,
      }),
    );

    await act(async () => {
      await result.current.onCartChanged();
    });

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        title: 'Items waiting in your cart!',
        body: 'You have 3 items in your cart. Complete your order before they sell out!',
        data: { type: 'cart_reminder', deepLink: 'carolinafutons://cart' },
      },
      trigger: { type: 'timeInterval', seconds: ONE_DAY_SECONDS, repeats: false },
    });
  });

  it('cancels previous notification before scheduling new one', async () => {
    // Simulate existing scheduled notification
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({
        scheduledNotificationId: 'old-notif-id',
        lastModifiedAt: 999999990000,
        lastReminderSentAt: null,
      }),
    );

    const { result } = renderHook(() =>
      useCartAbandonmentReminder({
        itemCount: 2,
        cartRemindersEnabled: true,
        permissionGranted: true,
      }),
    );

    await act(async () => {
      await result.current.onCartChanged();
    });

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('old-notif-id');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
  });

  it('cancels scheduled notification when cart is emptied', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({
        scheduledNotificationId: 'active-notif',
        lastModifiedAt: 999999990000,
        lastReminderSentAt: null,
      }),
    );

    const { result } = renderHook(() =>
      useCartAbandonmentReminder({
        itemCount: 0,
        cartRemindersEnabled: true,
        permissionGranted: true,
      }),
    );

    await act(async () => {
      await result.current.onCartChanged();
    });

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('active-notif');
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('cancels and clears state when order is placed', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({
        scheduledNotificationId: 'order-notif',
        lastModifiedAt: 999999990000,
        lastReminderSentAt: null,
      }),
    );

    const { result } = renderHook(() =>
      useCartAbandonmentReminder({
        itemCount: 0,
        cartRemindersEnabled: true,
        permissionGranted: true,
      }),
    );

    await act(async () => {
      await result.current.onOrderPlaced();
    });

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('order-notif');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it('throttles to max 1 reminder per week', async () => {
    const recentSentTime = Date.now() - ONE_WEEK_MS + 60000; // less than a week ago
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({
        scheduledNotificationId: null,
        lastModifiedAt: 999999990000,
        lastReminderSentAt: recentSentTime,
      }),
    );

    const { result } = renderHook(() =>
      useCartAbandonmentReminder({
        itemCount: 2,
        cartRemindersEnabled: true,
        permissionGranted: true,
      }),
    );

    await act(async () => {
      await result.current.onCartChanged();
    });

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('allows scheduling when last reminder was more than a week ago', async () => {
    const oldSentTime = Date.now() - ONE_WEEK_MS - 60000; // more than a week ago
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({
        scheduledNotificationId: null,
        lastModifiedAt: 999999990000,
        lastReminderSentAt: oldSentTime,
      }),
    );

    const { result } = renderHook(() =>
      useCartAbandonmentReminder({
        itemCount: 2,
        cartRemindersEnabled: true,
        permissionGranted: true,
      }),
    );

    await act(async () => {
      await result.current.onCartChanged();
    });

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
  });

  it('persists state to AsyncStorage on schedule', async () => {
    (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValueOnce('new-notif-id');

    const { result } = renderHook(() =>
      useCartAbandonmentReminder({
        itemCount: 1,
        cartRemindersEnabled: true,
        permissionGranted: true,
      }),
    );

    await act(async () => {
      await result.current.onCartChanged();
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      expect.stringContaining('"scheduledNotificationId":"new-notif-id"'),
    );
  });

  it('uses singular item text for 1 item', async () => {
    const { result } = renderHook(() =>
      useCartAbandonmentReminder({
        itemCount: 1,
        cartRemindersEnabled: true,
        permissionGranted: true,
      }),
    );

    await act(async () => {
      await result.current.onCartChanged();
    });

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          body: 'You have 1 item in your cart. Complete your order before it sells out!',
        }),
      }),
    );
  });

  it('handles AsyncStorage errors gracefully', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

    const { result } = renderHook(() =>
      useCartAbandonmentReminder({
        itemCount: 2,
        cartRemindersEnabled: true,
        permissionGranted: true,
      }),
    );

    // Should not throw
    await act(async () => {
      await result.current.onCartChanged();
    });

    // Should still attempt to schedule (fallback to no previous state)
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
  });

  it('handles notification scheduling errors gracefully', async () => {
    (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValueOnce(
      new Error('Schedule failed'),
    );

    const { result } = renderHook(() =>
      useCartAbandonmentReminder({
        itemCount: 2,
        cartRemindersEnabled: true,
        permissionGranted: true,
      }),
    );

    // Should not throw
    await act(async () => {
      await result.current.onCartChanged();
    });
  });
});
