/**
 * @module npsSurvey
 *
 * Submits post-purchase NPS survey responses — cm-5cp.
 *
 * Writes to the Wix `SurveyResponses` collection.
 * Schema: memberId, orderId, score (0–10), comment, createdAt, suppressedUntil.
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
  createdAt: string; // ISO 8601 — when the user submitted the survey
  suppressedUntil: string; // ISO 8601 — end of 90-day suppress window
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
  client: WixClientLike | null | undefined,
  data: NpsSurveyData,
): Promise<NpsSurveyResult> {
  if (!client) {
    return { success: false, error: 'Wix client unavailable' };
  }

  const payload: Record<string, unknown> = {
    orderId: data.orderId,
    npsScore: data.score,
    createdAt: data.createdAt,
    suppressedUntil: data.suppressedUntil,
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
