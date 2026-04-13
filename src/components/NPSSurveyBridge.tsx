/**
 * NPSSurveyBridge — cm-5cp
 *
 * Rendered inside the provider tree (App.tsx). On mount (and foreground
 * transitions) finds the most recent delivered order, feeds orderId +
 * deliveredAt into useNPSSurvey, and shows NPSSurveyModal when the
 * 3-day / 90-day gates are met.
 *
 * Responsibility split:
 *   - useNPSSurvey: reads 90-day suppress window, computes shouldShow,
 *     provides dismiss() to start/reset the suppress window
 *   - NPSSurveyModal: owns the UI, score selection, and Wix submission
 *   - Bridge: wires them — passes shouldShow → visible, dismiss() to both
 *     the modal's onDismiss and onSubmitted callbacks
 *
 * Uses the same order storage index as usePostPurchaseReviewPush so we
 * don't maintain a separate order ledger. `placedAt` is used as a proxy
 * for deliveredAt (consistent with the PostPurchaseReviewBridge pattern).
 */

import React, { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { useNPSSurvey } from '@/hooks/useNPSSurvey';
import { NPSSurveyModal } from '@/components/NPSSurveyModal';
import { useOptionalWixClient } from '@/services/wix';
import { PUSH_STORAGE_PREFIX, NUDGES_INDEX_KEY } from '@/hooks/usePostPurchaseReviewPush';

// ── Order resolution ──────────────────────────────────────────────────────────

interface ResolvedOrder {
  orderId: string;
  placedAt: string;
}

async function findMostRecentOrder(): Promise<ResolvedOrder | null> {
  try {
    const raw = await AsyncStorage.getItem(NUDGES_INDEX_KEY);
    if (!raw) return null;
    const index: string[] = JSON.parse(raw);
    if (!Array.isArray(index) || index.length === 0) return null;

    // Index is appended chronologically — last entry is most recent
    const orderId = index[index.length - 1];
    const recordRaw = await AsyncStorage.getItem(`${PUSH_STORAGE_PREFIX}${orderId}`);
    if (!recordRaw) return null;
    const record = JSON.parse(recordRaw) as { orderId: string; placedAt: string };
    if (!record?.placedAt) return null;

    return { orderId: record.orderId, placedAt: record.placedAt };
  } catch {
    return null;
  }
}

// ── Bridge ────────────────────────────────────────────────────────────────────

export function NPSSurveyBridge() {
  const wixClient = useOptionalWixClient();
  const [order, setOrder] = useState<ResolvedOrder | null>(null);

  const checkOrder = useCallback(async () => {
    const resolved = await findMostRecentOrder();
    setOrder(resolved);
  }, []);

  useEffect(() => {
    checkOrder();
  }, [checkOrder]);

  // Re-check when app comes to foreground — user may have received a delivery
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkOrder();
    });
    return () => sub.remove();
  }, [checkOrder]);

  const deliveredAt = order?.placedAt ? new Date(order.placedAt) : null;

  const { shouldShow, dismiss } = useNPSSurvey({
    orderId: order?.orderId ?? null,
    deliveredAt,
  });

  // Both dismiss and post-submit trigger the 90-day suppress window
  const handleDismiss = useCallback(async () => {
    await dismiss();
  }, [dismiss]);

  const handleSubmitted = useCallback(async () => {
    await dismiss();
  }, [dismiss]);

  return (
    <NPSSurveyModal
      visible={shouldShow}
      orderId={order?.orderId ?? ''}
      wixClient={wixClient}
      onDismiss={handleDismiss}
      onSubmitted={handleSubmitted}
      testID="nps-survey-bridge-modal"
    />
  );
}
