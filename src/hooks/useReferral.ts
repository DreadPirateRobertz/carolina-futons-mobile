/**
 * @module useReferral
 *
 * Referral program hook — cm-z0x.
 *
 * Fetches the current member's referral code from the Wix ReferralCodes CMS
 * collection, exposes credit/count stats, generates a shareable URL, and
 * provides utilities for storing/reading a referred-by code in AsyncStorage
 * (written when the user lands via a referral deep link).
 */
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOptionalWixClient } from '@/services/wix';
import { useAuth } from '@/hooks/useAuth';

const REFERRED_BY_KEY = 'cfutons_referral_referred_by_code';
const SHARE_BASE_URL = 'https://carolinafutons.com/referral';

interface WixReferralItem {
  memberId: string;
  code: string;
  creditsEarned: number;
  referralCount: number;
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
  /** Persist a referred-by code to AsyncStorage (called from deep link handler). */
  storeReferredByCode: (code: string) => Promise<void>;
}

export function useReferral(): UseReferralResult {
  const wixClient = useOptionalWixClient() as {
    queryData: <T>(
      collectionId: string,
      options?: { filter?: Record<string, unknown>; limit?: number },
    ) => Promise<{ items: T[]; totalResults: number }>;
  } | null;

  const { user } = useAuth();
  const memberId = user?.id ?? null;

  const [code, setCode] = useState<string | null>(null);
  const [creditsEarned, setCreditsEarned] = useState(0);
  const [referralCount, setReferralCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [referredByCode, setReferredByCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Load referred-by code from storage (independent of auth)
      try {
        const stored = await AsyncStorage.getItem(REFERRED_BY_KEY);
        if (!cancelled) setReferredByCode(stored);
      } catch {
        // AsyncStorage unavailable — operate in-memory
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

      try {
        const result = await wixClient.queryData<WixReferralItem>('ReferralCodes', {
          filter: { memberId },
          limit: 1,
        });

        if (cancelled) return;

        if (result.items.length === 0) {
          setError('Referral code not available yet');
          setLoading(false);
          return;
        }

        const item = result.items[0];
        setCode(item.code);
        setCreditsEarned(item.creditsEarned ?? 0);
        setReferralCount(item.referralCount ?? 0);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load referral code');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [memberId, wixClient]);

  const storeReferredByCode = useCallback(async (incomingCode: string) => {
    if (!incomingCode || !incomingCode.trim()) return;
    try {
      await AsyncStorage.setItem(REFERRED_BY_KEY, incomingCode.trim());
      setReferredByCode(incomingCode.trim());
    } catch {
      // AsyncStorage unavailable — state still updated in-memory
    }
  }, []);

  return {
    code,
    creditsEarned,
    referralCount,
    shareUrl: code ? `${SHARE_BASE_URL}/${code}` : null,
    loading,
    error,
    referredByCode,
    storeReferredByCode,
  };
}
