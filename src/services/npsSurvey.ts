/**
 * @module npsSurvey
 *
 * Submits post-purchase NPS survey responses — deacon-kon2.
 *
 * Writes to the Wix `SurveyResponses` collection.
 * Returns a result object and never throws.
 */

import { captureException } from '@/services/crashReporting';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WixClientLike {
  insertDataItem: (
    collectionId: string,
    data: Record<string, unknown>,
  ) => Promise<{ id: string; data: Record<string, unknown> }>;
}

export interface NpsSurveyData {
  orderId: string;
  score: number; // 0–10
  comment?: string;
  submittedAt: string; // ISO 8601
  memberId?: string;
}

export interface NpsSurveyResult {
  success: boolean;
  id?: string;
  error?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COLLECTION = 'SurveyResponses';

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * Submit an NPS survey response to the Wix SurveyResponses collection.
 *
 * Returns {success: false, error} on any failure — never throws.
 */
export async function submitNpsSurvey(
  client: WixClientLike | null,
  data: NpsSurveyData,
): Promise<NpsSurveyResult> {
  if (!client) {
    return { success: false, error: 'Wix client unavailable' };
  }

  const payload: Record<string, unknown> = {
    orderId: data.orderId,
    score: data.score,
    submittedAt: data.submittedAt,
  };

  if (data.comment !== undefined) {
    payload.comment = data.comment;
  }

  if (data.memberId !== undefined) {
    payload.memberId = data.memberId;
  }

  try {
    const result = await client.insertDataItem(COLLECTION, payload);
    return { success: true, id: result.id };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    captureException(error, 'error', { action: 'submitNpsSurvey', orderId: data.orderId });
    return { success: false, error: error.message };
  }
}
