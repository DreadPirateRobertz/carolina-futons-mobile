/**
 * Hook for scheduling local cart abandonment reminder notifications.
 *
 * Schedules a notification 24h after the last cart modification when the cart
 * is non-empty. Respects user notification preferences (cartReminders toggle)
 * and limits to max 1 reminder per week to avoid being intrusive.
 *
 * Deep links the notification to the CartScreen via carolinafutons://cart.
 */
import { useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const STORAGE_KEY = '@cart_abandonment_state';
const ONE_DAY_SECONDS = 24 * 60 * 60;
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface AbandonmentState {
  scheduledNotificationId: string | null;
  lastModifiedAt: number;
  lastReminderSentAt: number | null;
}

interface UseCartAbandonmentReminderOptions {
  itemCount: number;
  cartRemindersEnabled: boolean;
  permissionGranted: boolean;
}

interface UseCartAbandonmentReminderResult {
  onCartChanged: () => Promise<void>;
  onOrderPlaced: () => Promise<void>;
}

async function loadState(): Promise<AbandonmentState | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AbandonmentState;
  } catch {
    // Storage unavailable — continue without previous state
  }
  return null;
}

async function saveState(state: AbandonmentState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Fire-and-forget persistence
  }
}

async function cancelExisting(state: AbandonmentState | null): Promise<void> {
  if (state?.scheduledNotificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(state.scheduledNotificationId);
    } catch {
      // Notification may have already fired or been cleared
    }
  }
}

export function useCartAbandonmentReminder({
  itemCount,
  cartRemindersEnabled,
  permissionGranted,
}: UseCartAbandonmentReminderOptions): UseCartAbandonmentReminderResult {
  const itemCountRef = useRef(itemCount);
  itemCountRef.current = itemCount;

  const enabledRef = useRef(cartRemindersEnabled);
  enabledRef.current = cartRemindersEnabled;

  const permissionRef = useRef(permissionGranted);
  permissionRef.current = permissionGranted;

  const onCartChanged = useCallback(async () => {
    const state = await loadState();

    // Cart is empty — cancel any scheduled reminder
    if (itemCountRef.current === 0) {
      await cancelExisting(state);
      if (state) {
        await saveState({ ...state, scheduledNotificationId: null });
      }
      return;
    }

    // Preferences or permissions not met — don't schedule
    if (!enabledRef.current || !permissionRef.current) {
      return;
    }

    // Throttle: max 1 reminder per week
    if (state?.lastReminderSentAt) {
      const elapsed = Date.now() - state.lastReminderSentAt;
      if (elapsed < ONE_WEEK_MS) {
        return;
      }
    }

    // Cancel previous scheduled notification before rescheduling
    await cancelExisting(state);

    const count = itemCountRef.current;
    const itemWord = count === 1 ? 'item' : 'items';
    const sellWord = count === 1 ? 'it sells' : 'they sell';

    try {
      const notifId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Items waiting in your cart!',
          body: `You have ${count} ${itemWord} in your cart. Complete your order before ${sellWord} out!`,
          data: { type: 'cart_reminder', deepLink: 'carolinafutons://cart' },
        },
        trigger: { type: 'timeInterval', seconds: ONE_DAY_SECONDS, repeats: false },
      });

      await saveState({
        scheduledNotificationId: notifId,
        lastModifiedAt: Date.now(),
        lastReminderSentAt: state?.lastReminderSentAt ?? null,
      });
    } catch {
      // Scheduling failed — non-critical, don't crash
    }
  }, []);

  const onOrderPlaced = useCallback(async () => {
    const state = await loadState();
    await cancelExisting(state);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // Fire-and-forget cleanup
    }
  }, []);

  return { onCartChanged, onOrderPlaced };
}
