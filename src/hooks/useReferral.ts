/**
 * @module useReferral
 *
 * Referral program hook — cm-z0x + cm-9sa.
 *
 * Fetches the current member's referral code from the Wix ReferralCodes CMS
 * collection, exposes credit/count stats, generates a shareable URL, and
 * provides utilities for storing/reading a referred-by code in AsyncStorage
 * (written when the user lands via a referral deep link).
 *
 * Also reads individual referral events from the Wix Referrals collection
 * (cm-9sa) and exposes submitReferral() to write a new referral record on
 * share acceptance.
 *
 * Collections:
 *   ReferralCodes — { memberId, code, creditsEarned, referralCount }
 *   Referrals     — { referralCode, referrerMemberId, refereeEmail,
 *                     referrerCredit, refereeCredit, status }
 *
 * Credits: referrer $25, referee $25.
 */
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOptionalWixClient } from '@/services/wix';
import { useAuth } from '@/hooks/useAuth';
import { captureException } from '@/services/crashReporting';

const REFERRED_BY_KEY = 'cfutons_referral_referred_by_code';
const SHARE_BASE_URL = 'https://carolinafutons.com/referral';
const REFERRER_CREDIT = 25;
const REFEREE_CREDIT = 25;

interface WixReferralCodeItem {
  memberId: string;
  code: string;
  creditsEarned: number;
  referralCount: number;
}

interface WixReferralRecord {
  _id: string;
  referralCode: string;
  referrerMemberId: string;
  refereeEmail: string;
  referrerCredit: number;
  refereeCredit: number;
  status: string;
}

export interface ReferralRecord {
  _id: string;
  referralCode: string;
  referrerMemberId: string;
  refereeEmail: string;
  /** Store credit amount awarded to the referrer on completion. */
  referrerCredit: number;
  /** Store credit amount awarded to the referee on first purchase. */
  refereeCredit: number;
  status: 'pending' | 'completed' | 'expired';
}

export interface UseReferralResult {
  /** The member's own referral code, or null if not yet assigned / not authenticated. */
  code: string | null;
  /** Total store credits earned from confirmed referrals. */
  creditsEarned: number;
  /** Number of confirmed referrals. */
  referralCount: number;
  /** Full shareable URL: https://carolinafutons.com/referral/{code} */
  shareUrl: string | null;
  /** Whether the initial fetch is in progress. */
  loading: boolean;
  /** Error message, or null if none. */
  error: string | null;
  /** Referral code of whoever referred this user (from deep link), or null. */
  referredByCode: string | null;
  /** Individual referral event records for this member as referrer. */
  referrals: ReferralRecord[];
  /** Persist a referred-by code to AsyncStorage (called from deep link handler). */
  storeReferredByCode: (code: string) => Promise<void>;
  /**
   * Write a new referral record to the Wix Referrals collection.
   * Called when the referee accepts the referral share.
   * Throws if wixClient unavailable, member not authenticated, or code not loaded.
   */
  submitReferral: (refereeEmail: string) => Promise<void>;
}

function rawToReferralRecord(item: WixReferralRecord): ReferralRecord {
  const knownStatuses = ['pending', 'completed', 'expired'];
  if (!knownStatuses.includes(item.status)) {
    console.warn(`[useReferral] Unexpected referral status: "${item.status}"`);
  }
  const status =
    item.status === 'completed' || item.status === 'expired' ? item.status : 'pending';
  return {
    _id: item._id,
    referralCode: item.referralCode,
    referrerMemberId: item.referrerMemberId,
    refereeEmail: item.refereeEmail,
    referrerCredit: item.referrerCredit ?? REFERRER_CREDIT,
    refereeCredit: item.refereeCredit ?? REFEREE_CREDIT,
    status,
  };
}

export function useReferral(): UseReferralResult {
  const wixClient = useOptionalWixClient();
  const { user } = useAuth();
  const memberId = user?.id ?? null;

  const [code, setCode] = useState<string | null>(null);
  const [creditsEarned, setCreditsEarned] = useState(0);
  const [referralCount, setReferralCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [referredByCode, setReferredByCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Load referred-by code from storage (independent of auth)
      try {
        const stored = await AsyncStorage.getItem(REFERRED_BY_KEY);
        if (!cancelled) setReferredByCode(stored);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        captureException(err, 'warning', { action: 'useReferral/readReferredByCode' });
      }

      if (!memberId) {
        if (!cancelled) {
          setError('Please sign in to access your referral code');
          setLoading(false);
        }
        return;
      }

      if (!wixClient) {
        if (!cancelled) {
          setError('Referral service unavailable');
          setLoading(false);
        }
        return;
      }

      // Fetch ReferralCodes and Referrals in parallel
      const [codesResult, referralsResult] = await Promise.allSettled([
        wixClient.queryData<WixReferralCodeItem>('ReferralCodes', {
          filter: { memberId },
          limit: 1,
        }),
        wixClient.queryData<WixReferralRecord>('Referrals', {
          filter: { referrerMemberId: memberId },
          limit: 100,
        }),
      ]);

      if (cancelled) return;

      // Handle ReferralCodes result
      if (codesResult.status === 'fulfilled') {
        if (codesResult.value.items.length === 0) {
          // No code exists yet — auto-generate and persist one
          const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
          const generatedCode = `FUTON-${suffix}`;
          try {
            await wixClient.insertDataItem('ReferralCodes', {
              memberId,
              code: generatedCode,
              creditsEarned: 0,
              referralCount: 0,
            });
            if (!cancelled) {
              setCode(generatedCode);
              setError(null);
            }
          } catch (e) {
            if (!cancelled) {
              const err = e instanceof Error ? e : new Error(String(e));
              captureException(err, 'error', {
                action: 'useReferral/generateReferralCode',
                memberId: memberId ?? undefined,
              });
              setError('Could not create your referral code. Please try again later.');
            }
          }
        } else {
          const item = codesResult.value.items[0];
          setCode(item.code);
          setCreditsEarned(item.creditsEarned ?? 0);
          setReferralCount(item.referralCount ?? 0);
          setError(null);
        }
      } else {
        const err =
          codesResult.reason instanceof Error
            ? codesResult.reason
            : new Error(String(codesResult.reason));
        captureException(err, 'error', {
          action: 'useReferral/fetchReferralCodes',
          memberId: memberId ?? undefined,
        });
        setError('Could not load your referral code. Please try again later.');
      }

      // Handle Referrals result — failures don't block code display
      if (referralsResult.status === 'fulfilled') {
        setReferrals(referralsResult.value.items.map(rawToReferralRecord));
      } else {
        const err =
          referralsResult.reason instanceof Error
            ? referralsResult.reason
            : new Error(String(referralsResult.reason));
        captureException(err, 'error', {
          action: 'useReferral/fetchReferrals',
          memberId: memberId ?? undefined,
        });
        console.warn('[useReferral] Referrals fetch failed (non-blocking):', err);
      }

      setLoading(false);
    })().catch((e) => {
      if (cancelled) return;
      const err = e instanceof Error ? e : new Error(String(e));
      captureException(err, 'error', { action: 'useReferral/effect' });
      setError('Referral service encountered an unexpected error');
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [memberId, wixClient]);

  const storeReferredByCode = useCallback(async (incomingCode: string) => {
    if (!incomingCode || !incomingCode.trim()) return;
    try {
      await AsyncStorage.setItem(REFERRED_BY_KEY, incomingCode.trim());
      setReferredByCode(incomingCode.trim());
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      captureException(err, 'error', {
        action: 'useReferral/storeReferredByCode',
        code: incomingCode,
      });
    }
  }, []);

  const submitReferral = useCallback(
    async (refereeEmail: string) => {
      if (!wixClient) throw new Error('Referral service unavailable');
      if (!memberId) throw new Error('Must be signed in to submit a referral');
      if (!code) throw new Error('Referral code not yet loaded');

      const trimmedEmail = refereeEmail.trim();
      if (!trimmedEmail) throw new Error('Referee email is required');

      const payload = {
        referralCode: code,
        referrerMemberId: memberId,
        refereeEmail: trimmedEmail,
        referrerCredit: REFERRER_CREDIT,
        refereeCredit: REFEREE_CREDIT,
        status: 'pending' as const,
      };

      const inserted = await wixClient.insertDataItem('Referrals', payload);

      if (!inserted?.id) {
        throw new Error('Referrals insert returned no ID');
      }

      setReferrals((prev) => [
        ...prev,
        {
          _id: inserted.id,
          ...payload,
        },
      ]);
    },
    [wixClient, memberId, code],
  );

  return {
    code,
    creditsEarned,
    referralCount,
    shareUrl: code ? `${SHARE_BASE_URL}/${code}` : null,
    loading,
    error,
    referredByCode,
    referrals,
    storeReferredByCode,
    submitReferral,
  };
}
