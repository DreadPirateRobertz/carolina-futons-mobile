/**
 * @module useDormancyRescuePush
 *
 * Schedules a local push notification to fire 14 days after each app session,
 * re-engaging users who have gone dormant. The notification is rescheduled on
 * every mount so it tracks the user's last active session.
 *
 * The notification must fire when the app is closed, so it is intentionally
 * NOT cancelled on unmount.
 *
 * Session throttle: reschedule is skipped if the hook has already run within
 * the last hour (prevents excessive cancel/reschedule churn on tab switches).
 *
 * Bead: cfutons_mobile-b0z
 */
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureException } from '@/services/crashReporting';

const STORAGE_KEY = '@cf_dormancy_state';
const FOURTEEN_DAYS_SECONDS = 14 * 24 * 60 * 60;
const SESSION_RESCHEDULE_THROTTLE_MS = 60 * 60 * 1000; // 1 hour

interface DormancyState {
  notifId: string;
  scheduledAt: number;
}

export interface UseDormancyRescuePushOptions {
  /** User's current loyalty points balance, shown in the notification body. */
  pointsBalance: number;
  /** Whether the user has granted push notification permission. */
  permissionGranted: boolean;
}

export function useDormancyRescuePush({
  pointsBalance,
  permissionGranted,
}: UseDormancyRescuePushOptions): void {
  useEffect(() => {
    if (!permissionGranted) return;

    async function schedule() {
      const now = Date.now();

      // Load persisted state
      let existingState: DormancyState | null = null;
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          existingState = JSON.parse(raw) as DormancyState;
        }
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)));
        return;
      }

      // Throttle: skip if we already rescheduled within the last hour
      if (existingState && now - existingState.scheduledAt < SESSION_RESCHEDULE_THROTTLE_MS) {
        return;
      }

      // Cancel previous notification (best-effort — failure should not block reschedule)
      if (existingState?.notifId) {
        try {
          await Notifications.cancelScheduledNotificationAsync(existingState.notifId);
        } catch {
          // Ignore cancel failures — proceed to schedule
        }
      }

      // Schedule the 14-day dormancy rescue notification
      let newNotifId: string;
      try {
        newNotifId = await Notifications.scheduleNotificationAsync({
          content: {
            title: "We miss you! 👋",
            body: `You have ${pointsBalance} loyalty points waiting. Come back and use them!`,
            data: {
              gamification_type: 'dormancy_rescue',
              deepLink: 'carolinafutons://loyalty',
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: FOURTEEN_DAYS_SECONDS,
            repeats: false,
          },
        });
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)));
        return;
      }

      // Persist new state
      const newState: DormancyState = { notifId: newNotifId, scheduledAt: now };
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      } catch {
        // Persistence failure is non-fatal — notification was already scheduled
      }
    }

    schedule();
    // Intentionally no cleanup: notification must fire after app is closed
  }, [permissionGranted, pointsBalance]);
}
