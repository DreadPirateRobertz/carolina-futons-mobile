/**
 * @module referralService
 *
 * Generates referral deep links via Wix backend and records conversions.
 * Links use the format: carolinafutons://referral/{code}
 *
 * Epic D: Social Gamification (cfutons_mobile-iap)
 */

import { captureException } from '@/services/crashReporting';

type WixCallFn = (path: string, method: 'GET' | 'POST', body?: unknown) => Promise<unknown>;

export async function generateReferralLink(
  callFunction: WixCallFn,
  memberId: string,
): Promise<string | null> {
  try {
    const result = (await callFunction('/_functions/generateReferralLink', 'POST', {
      memberId,
    })) as { code: string };
    return `carolinafutons://referral/${result.code}`;
  } catch (err) {
    captureException(err instanceof Error ? err : new Error(String(err)));
    return null;
  }
}

export async function recordReferralConversion(
  callFunction: WixCallFn,
  code: string,
  newMemberId: string,
): Promise<void> {
  try {
    await callFunction('/_functions/recordReferralConversion', 'POST', { code, newMemberId });
  } catch (err) {
    captureException(err instanceof Error ? err : new Error(String(err)));
  }
}
