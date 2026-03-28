/**
 * usePostDeliveryReviewPrompt — cm-dyl
 *
 * Schedules a local notification 14 days after order delivery to prompt a
 * product review. On review submit, awards gamification points and triggers
 * a badge check.
 *
 * Idempotent: only one prompt per order, only one point award per order.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { useGamificationEvents } from '@/hooks/useGamificationEvents';
import type { GamificationEventResult } from '@/services/gamificationApi';

// --- Constants ---

export const REVIEW_PROMPT_STORAGE_PREFIX = '@post_delivery_review:';
export const FOURTEEN_DAYS_SECONDS = 14 * 24 * 60 * 60;
const FOURTEEN_DAYS_MS = FOURTEEN_DAYS_SECONDS * 1000;
const MIN_TRIGGER_SECONDS = 1;

// --- Types ---

interface ReviewPromptState {
  orderId: string;
  scheduledNotificationId?: string | null;
  reviewedAt?: string | null;
}

export interface UsePostDeliveryReviewPromptOptions {
  orderId: string;
  productId: string;
  deliveredAt: string;
  reviewPromptEnabled: boolean;
  permissionGranted: boolean;
  onBadgeCheck?: () => void;
}

export interface UsePostDeliveryReviewPromptResult {
  submitReview: (rating: number, hasPhoto: boolean) => Promise<GamificationEventResult>;
}

const FALLBACK: GamificationEventResult = { success: false };

// --- Storage helpers ---

function storageKey(orderId: string): string {
  return `${REVIEW_PROMPT_STORAGE_PREFIX}${orderId}`;
}

async function loadState(orderId: string): Promise<ReviewPromptState | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(orderId));
    if (raw) return JSON.parse(raw) as ReviewPromptState;
  } catch {
    // Storage unavailable — continue without state
  }
  return null;
}

async function saveState(orderId: string, state: ReviewPromptState): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(orderId), JSON.stringify(state));
  } catch {
    // Fire-and-forget persistence
  }
}

async function cancelNotification(notifId: string | null | undefined): Promise<void> {
  if (!notifId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notifId);
  } catch {
    // Notification may have already fired
  }
}

// --- Hook ---

export function usePostDeliveryReviewPrompt({
  orderId,
  productId,
  deliveredAt,
  reviewPromptEnabled,
  permissionGranted,
  onBadgeCheck,
}: UsePostDeliveryReviewPromptOptions): UsePostDeliveryReviewPromptResult {
  const gamification = useGamificationEvents();
  const [reviewed, setReviewed] = useState(false);
  const reviewedRef = useRef(false);

  // Schedule notification on mount
  useEffect(() => {
    let cancelled = false;

    async function maybeSchedule() {
      // Guard: invalid or missing date
      if (!deliveredAt) return;
      const deliveredDate = new Date(deliveredAt);
      if (isNaN(deliveredDate.getTime())) return;

      // Guard: preferences
      if (!reviewPromptEnabled || !permissionGranted) return;

      // Guard: already scheduled or reviewed
      const state = await loadState(orderId);
      if (cancelled) return;
      if (state?.scheduledNotificationId) return;
      if (state?.reviewedAt) return;

      // Calculate delay
      const elapsedMs = Date.now() - deliveredDate.getTime();
      const remainingMs = FOURTEEN_DAYS_MS - elapsedMs;

      // Not yet time — don't schedule if more than 14 days remain
      // But DO schedule a future notification if within the 14-day window
      if (remainingMs > FOURTEEN_DAYS_MS) return;

      // If delivery is < 14 days ago and remaining > 0, schedule for the future
      // If delivery is >= 14 days ago, schedule immediately (min 1 second)
      const triggerSeconds = Math.max(MIN_TRIGGER_SECONDS, Math.ceil(remainingMs / 1000));

      // Don't schedule if more than 14 days remain
      if (remainingMs > 0 && elapsedMs < 0) return;

      try {
        const notifId = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'How do you like your new futon?',
            body: 'Leave a review and earn 50 points!',
            data: {
              type: 'review_prompt',
              orderId,
              productId,
              deepLink: `carolinafutons://product/${productId}`,
            },
          },
          trigger: {
            type: SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: triggerSeconds,
            repeats: false,
          },
        });

        if (!cancelled) {
          await saveState(orderId, {
            orderId,
            scheduledNotificationId: notifId,
          });
        }
      } catch {
        // Scheduling failed — non-critical
      }
    }

    maybeSchedule();
    return () => {
      cancelled = true;
    };
  }, [orderId, productId, deliveredAt, reviewPromptEnabled, permissionGranted]);

  const submitReview = useCallback(
    async (rating: number, hasPhoto: boolean): Promise<GamificationEventResult> => {
      // Idempotency: prevent double submission
      if (reviewedRef.current) return FALLBACK;

      // Check persisted state too
      const state = await loadState(orderId);
      if (state?.reviewedAt) {
        reviewedRef.current = true;
        setReviewed(true);
        return FALLBACK;
      }

      try {
        const result = await gamification.submitReview(productId, rating, hasPhoto);

        if (result.success) {
          reviewedRef.current = true;
          setReviewed(true);

          // Cancel any pending notification
          await cancelNotification(state?.scheduledNotificationId);

          // Persist reviewed state
          await saveState(orderId, {
            orderId,
            scheduledNotificationId: null,
            reviewedAt: new Date().toISOString(),
          });

          // Trigger badge check
          onBadgeCheck?.();
        }

        return result;
      } catch {
        return FALLBACK;
      }
    },
    [orderId, productId, gamification, onBadgeCheck],
  );

  return { submitReview };
}
