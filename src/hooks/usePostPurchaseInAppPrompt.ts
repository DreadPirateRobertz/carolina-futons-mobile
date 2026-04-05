/**
 * usePostPurchaseInAppPrompt — cm-qbt
 *
 * On app launch (and every foreground transition), checks for orders that
 * were placed 3+ days ago and haven't been reviewed or permanently dismissed.
 * Returns the first qualifying order so the caller can show a review prompt.
 *
 * Works in tandem with usePostPurchaseReviewPush: that hook writes the index
 * and per-order records; this hook reads them.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PurchaseReviewRecord } from './usePostPurchaseReviewPush';

// Re-export so test files can import from one place
export { PUSH_STORAGE_PREFIX, NUDGES_INDEX_KEY } from './usePostPurchaseReviewPush';

export const IN_APP_DISMISS_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

// --- Types ---

export interface PendingReviewOrder {
  orderId: string;
  productId: string;
  placedAt: string;
}

export interface UsePostPurchaseInAppPromptResult {
  /** The first qualifying order that needs a review nudge, or null. */
  pendingOrder: PendingReviewOrder | null;
  /** Dismiss the prompt with a cooldown. Call when user taps "Maybe Later". */
  dismiss: () => Promise<void>;
  /** Mark the current order as reviewed. Permanently removes from prompt queue. */
  markReviewed: () => Promise<void>;
}

// --- Storage helpers ---

function storageKey(orderId: string): string {
  // Import inline to avoid circular — matches PUSH_STORAGE_PREFIX
  return `@post_purchase_review_push:${orderId}`;
}

const INDEX_KEY = '@post_purchase_review_push:index';

async function loadIndex(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function loadRecord(orderId: string): Promise<PurchaseReviewRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(orderId));
    if (!raw) return null;
    return JSON.parse(raw) as PurchaseReviewRecord;
  } catch {
    return null;
  }
}

async function saveRecord(record: PurchaseReviewRecord): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(record.orderId), JSON.stringify(record));
  } catch {
    // Fire-and-forget persistence
  }
}

function isQualifying(record: PurchaseReviewRecord): boolean {
  // Must have a valid placedAt
  if (!record.placedAt) return false;
  const placedDate = new Date(record.placedAt);
  if (isNaN(placedDate.getTime())) return false;

  // Must be 3+ days since order placed
  const elapsedMs = Date.now() - placedDate.getTime();
  if (elapsedMs < THREE_DAYS_MS) return false;

  // Not already reviewed
  if (record.reviewedAt) return false;

  // Not within dismiss cooldown
  if (record.inAppDismissedUntil && Date.now() < record.inAppDismissedUntil) return false;

  return true;
}

async function findPendingOrder(): Promise<PendingReviewOrder | null> {
  const index = await loadIndex();
  for (const orderId of index) {
    const record = await loadRecord(orderId);
    if (!record) continue;
    if (isQualifying(record)) {
      return {
        orderId: record.orderId,
        productId: record.productId,
        placedAt: record.placedAt,
      };
    }
  }
  return null;
}

// --- Hook ---

export function usePostPurchaseInAppPrompt(): UsePostPurchaseInAppPromptResult {
  const [pendingOrder, setPendingOrder] = useState<PendingReviewOrder | null>(null);

  const check = useCallback(async () => {
    const order = await findPendingOrder();
    setPendingOrder(order);
  }, []);

  // Load on mount
  useEffect(() => {
    check();
  }, [check]);

  // Re-check on every app foreground transition
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        check();
      }
    });

    return () => subscription.remove();
  }, [check]);

  const dismiss = useCallback(async () => {
    const current = pendingOrder;
    if (!current) return;

    const record = await loadRecord(current.orderId);
    if (!record) return;

    await saveRecord({
      ...record,
      inAppDismissedUntil: Date.now() + IN_APP_DISMISS_COOLDOWN_MS,
    });

    setPendingOrder(null);
  }, [pendingOrder]);

  const markReviewed = useCallback(async () => {
    const current = pendingOrder;
    if (!current) return;

    const record = await loadRecord(current.orderId);
    if (!record) return;

    await saveRecord({
      ...record,
      reviewedAt: new Date().toISOString(),
      inAppDismissedUntil: null,
    });

    setPendingOrder(null);
  }, [pendingOrder]);

  return { pendingOrder, dismiss, markReviewed };
}
