/**
 * @module useStreakMilestonePush
 *
 * Schedules a local Day-7 streak milestone push notification when the user
 * completes their Day-6 streak. The notification fires 24h later (Day-7)
 * and deep links to the gamification/challenges screen.
 *
 * Scheduling rules:
 *  - Only triggers exactly at streak === 6 (day-6 completion)
 *  - Respects streakMilestoneEnabled preference and OS permission
 *  - Idempotent: skips if a notification is already scheduled for this cycle
 *  - Cancels any pending milestone notification when streak resets (streak === 1)
 *
 * Pattern: mirrors useCartAbandonmentReminder scheduling approach.
 *
 * cfutons_mobile-tl9
 */

import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

const STORAGE_KEY = '@streak_milestone_push';
const DAY_SECONDS = 24 * 60 * 60;
const TRIGGER_STREAK = 6; // schedule on day-6 so notification fires on day-7

interface MilestonePushState {
  scheduledNotificationId: string;
  scheduledForStreak: number;
}

export interface UseStreakMilestonePushOptions {
  streak: number;
  streakLoading?: boolean;
  streakMilestoneEnabled: boolean;
  permissionGranted: boolean;
}

async function loadState(): Promise<MilestonePushState | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as MilestonePushState;
  } catch {
    // Storage unavailable
  }
  return null;
}

async function clearState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Fire-and-forget
  }
}

async function saveState(state: MilestonePushState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Fire-and-forget
  }
}

async function cancelExisting(state: MilestonePushState | null): Promise<void> {
  if (!state?.scheduledNotificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(state.scheduledNotificationId);
  } catch {
    // Non-critical
  }
}

/**
 * Call this hook wherever streak data is available (e.g., HomeScreen or
 * a root-level provider). Pass current streak and notification preferences.
 */
export function useStreakMilestonePush({
  streak,
  streakLoading = false,
  streakMilestoneEnabled,
  permissionGranted,
}: UseStreakMilestonePushOptions): void {
  useEffect(() => {
    // Wait for streak to be loaded from storage before acting
    if (streakLoading) return;

    let cancelled = false;

    async function run() {
      const state = await loadState();
      if (cancelled) return;

      // Streak reset — cancel any pending milestone notification
      if (streak === 1 && state) {
        await cancelExisting(state);
        await clearState();
        return;
      }

      // Only schedule at exactly day-6 completion
      if (streak !== TRIGGER_STREAK) return;

      // Guard: preferences and permission
      if (!streakMilestoneEnabled || !permissionGranted) return;

      // Idempotent: already scheduled for this streak cycle
      if (state?.scheduledForStreak === TRIGGER_STREAK) return;

      // Schedule the Day-7 notification
      try {
        const notifId = await Notifications.scheduleNotificationAsync({
          content: {
            title: "You're on a 7-day streak! 🔥",
            body: 'Keep it going! Open the app today to hit Day 7 and earn bonus points.',
            data: {
              type: 'streak_milestone',
              deepLink: 'carolinafutons://challenges',
            },
          },
          trigger: {
            type: SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: DAY_SECONDS,
            repeats: false,
          },
        });

        if (cancelled) return;
        await saveState({ scheduledNotificationId: notifId, scheduledForStreak: TRIGGER_STREAK });
      } catch (err) {
        if (__DEV__) console.warn('[StreakMilestonePush] Failed to schedule notification:', err);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [streak, streakLoading, streakMilestoneEnabled, permissionGranted]);
}
