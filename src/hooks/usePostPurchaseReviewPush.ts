/**
 * usePostPurchaseReviewPush — cm-qbt
 *
 * Schedules a push notification 3 days after an order is placed, prompting
 * the user to leave a product review. Also registers the order in the
 * pending-nudges index so usePostPurchaseInAppPrompt can surface an in-app
 * prompt on next launch.
 *
 * Idempotent: only one push per order.
 */
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

// --- Constants ---

export const PUSH_STORAGE_PREFIX = '@post_purchase_review_push:';
export const NUDGES_INDEX_KEY = '@post_purchase_review_push:index';
export const THREE_DAYS_SECONDS = 3 * 24 * 60 * 60;
const THREE_DAYS_MS = THREE_DAYS_SECONDS * 1000;
const MIN_TRIGGER_SECONDS = 1;

// --- Types ---

export interface PurchaseReviewRecord {
  orderId: string;
  productId: string;
  placedAt: string;
  scheduledNotificationId?: string | null;
  reviewedAt?: string | null;
  inAppDismissedUntil?: number | null;
}

export interface UsePostPurchaseReviewPushOptions {
  orderId: string;
  productId: string;
  placedAt: string;
  reviewPushEnabled: boolean;
  permissionGranted: boolean;
}

// --- Storage helpers ---

function storageKey(orderId: string): string {
  return `${PUSH_STORAGE_PREFIX}${orderId}`;
}

async function loadRecord(orderId: string): Promise<PurchaseReviewRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(orderId));
    if (raw) return JSON.parse(raw) as PurchaseReviewRecord;
  } catch {
    // Storage unavailable — continue without state
  }
  return null;
}

async function saveRecord(record: PurchaseReviewRecord): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(record.orderId), JSON.stringify(record));
  } catch {
    // Fire-and-forget persistence
  }
}

async function addToIndex(orderId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(NUDGES_INDEX_KEY);
    const index: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    if (!index.includes(orderId)) {
      index.push(orderId);
      await AsyncStorage.setItem(NUDGES_INDEX_KEY, JSON.stringify(index));
    }
  } catch {
    // Non-critical index update
  }
}

// --- Hook ---

export function usePostPurchaseReviewPush({
  orderId,
  productId,
  placedAt,
  reviewPushEnabled,
  permissionGranted,
}: UsePostPurchaseReviewPushOptions): void {
  useEffect(() => {
    let cancelled = false;

    async function maybeSchedule() {
      // Guard: invalid or missing date
      if (!placedAt) return;
      const placedDate = new Date(placedAt);
      if (isNaN(placedDate.getTime())) return;

      // Guard: preferences
      if (!reviewPushEnabled || !permissionGranted) return;

      // Guard: already scheduled or reviewed
      const record = await loadRecord(orderId);
      if (cancelled) return;
      if (record?.scheduledNotificationId) return;
      if (record?.reviewedAt) return;

      // Calculate delay from order placement
      const elapsedMs = Date.now() - placedDate.getTime();
      const remainingMs = THREE_DAYS_MS - elapsedMs;

      // Don't schedule if placed in the future
      if (elapsedMs < 0) return;

      const triggerSeconds = Math.max(MIN_TRIGGER_SECONDS, Math.ceil(remainingMs / 1000));

      try {
        const notifId = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'How do you like your new futon?',
            body: 'Share your thoughts and earn 50 points!',
            data: {
              type: 'post_purchase_review',
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

        if (cancelled) return;

        await saveRecord({
          orderId,
          productId,
          placedAt,
          scheduledNotificationId: notifId,
        });

        // Register in index for in-app prompt
        await addToIndex(orderId);
      } catch {
        // Scheduling failed — non-critical
        // Still register in index so in-app prompt can surface it
        await addToIndex(orderId);
        await saveRecord({ orderId, productId, placedAt });
      }
    }

    maybeSchedule();
    return () => {
      cancelled = true;
    };
  }, [orderId, productId, placedAt, reviewPushEnabled, permissionGranted]);
}
