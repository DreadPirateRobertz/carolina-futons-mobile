/**
 * @module useAffirmPrequalification
 *
 * React hook that checks Affirm BNPL eligibility for the current order total.
 *
 * Skips the API call for amounts outside Affirm's [min, max] range so the
 * checkout screen stays fast for obviously ineligible carts.
 *
 * Returns:
 *  - isEligible: whether the user qualifies for Affirm financing
 *  - isLoading: true while the API check is in progress
 *  - error: string if the API call failed (null otherwise)
 *
 * Bead: cm-d7l
 */

import { useState, useEffect } from 'react';
import { useOptionalWixClient } from '@/services/wix';
import {
  checkAffirmPrequalification,
  AFFIRM_MIN_AMOUNT,
  AFFIRM_MAX_AMOUNT,
} from '@/services/affirmService';

export interface AffirmPrequalState {
  isEligible: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Check Affirm BNPL eligibility for the given order amount (in dollars).
 *
 * @param amountDollars - The order total in dollars. Re-checks when this changes.
 */
export function useAffirmPrequalification(amountDollars: number): AffirmPrequalState {
  const wixClient = useOptionalWixClient();
  const [state, setState] = useState<AffirmPrequalState>({
    isEligible: false,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    // Skip API call for amounts outside Affirm's range
    if (amountDollars < AFFIRM_MIN_AMOUNT || amountDollars > AFFIRM_MAX_AMOUNT) {
      setState({ isEligible: false, isLoading: false, error: null });
      return;
    }

    if (!wixClient) {
      setState({ isEligible: false, isLoading: false, error: null });
      return;
    }

    let cancelled = false;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    checkAffirmPrequalification(wixClient, amountDollars).then((result) => {
      if (cancelled) return;
      setState({
        isEligible: result.eligible,
        isLoading: false,
        error: result.error ?? null,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [amountDollars, wixClient]);

  return state;
}
