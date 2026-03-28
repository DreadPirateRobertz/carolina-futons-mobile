/**
 * @module sommelierResults
 *
 * Wix CMS SommelierResults service — read/write style quiz results.
 * Collection keyed by memberId, populated by Style Quiz completion.
 *
 * hq-5hnml
 */

import { getWixClientSingleton } from '@/services/wix/wixClientSingleton';
import type { StylePreferences } from '@/hooks/useStyleQuiz';
import { captureException } from '@/services/crashReporting';

export interface SommelierResultsData {
  topCategory: string;
  flavors: string[];
  recommendations: string[];
}

/**
 * Fetch sommelier (style quiz) results for a member from Wix CMS.
 * Returns null if no results exist, wix client unavailable, or on error.
 */
export async function getSommelierResults(memberId: string): Promise<SommelierResultsData | null> {
  try {
    const client = getWixClientSingleton();
    if (!client) return null;

    const result = await client.callFunction('getSommelierResults', { memberId });
    if (!result) return null;

    return result as SommelierResultsData;
  } catch (err) {
    captureException(err instanceof Error ? err : new Error(String(err)), 'warning', {
      action: 'getSommelierResults',
      memberId,
    });
    return null;
  }
}

/**
 * Write quiz results to SommelierResults CMS collection.
 * Returns true on success, false on failure.
 */
export async function recordSommelierResult(
  memberId: string,
  quizAnswers: StylePreferences,
): Promise<boolean> {
  try {
    const client = getWixClientSingleton();
    if (!client) return false;

    await client.callFunction('recordSommelierResult', { memberId, quizAnswers });
    return true;
  } catch (err) {
    captureException(err instanceof Error ? err : new Error(String(err)), 'error', {
      action: 'recordSommelierResult',
      memberId,
    });
    return false;
  }
}
