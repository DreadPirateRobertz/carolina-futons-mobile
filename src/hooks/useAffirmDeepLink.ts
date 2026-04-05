/**
 * useAffirmDeepLink — hq-8iw
 *
 * Opens the Affirm financing calculator pre-populated with a product price.
 * Tries the native Affirm app deep-link first; falls back to the Affirm web
 * URL when the app is not installed.
 *
 * AC: tap opens calculator, handles Affirm SDK unavailable gracefully.
 *
 * App URL: affirm://calculator?amount=<cents>
 * Web URL: https://www.affirm.com/apps
 */

import { useState, useEffect, useCallback } from 'react';
import { Linking } from 'react-native';

const AFFIRM_APP_SCHEME = 'affirm://';
const AFFIRM_CALCULATOR_APP_BASE = 'affirm://calculator';
const AFFIRM_CALCULATOR_WEB_URL = 'https://www.affirm.com/apps';

export interface UseAffirmDeepLinkResult {
  /** Open the Affirm calculator. App deep-link if installed, web otherwise. */
  openCalculator: () => Promise<void>;
  /** True when the calculator can be opened (app installed OR web fallback). False only if Linking is entirely unavailable. */
  canOpen: boolean;
  error: string | null;
}

export function useAffirmDeepLink(price: number): UseAffirmDeepLinkResult {
  const [affirmAppAvailable, setAffirmAppAvailable] = useState(false);
  const [canOpen, setCanOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Linking.canOpenURL(AFFIRM_APP_SCHEME)
      .then((available) => {
        if (cancelled) return;
        setAffirmAppAvailable(available);
        setCanOpen(true); // web fallback always available
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Linking entirely unavailable (e.g. test env / restricted device)
        setAffirmAppAvailable(false);
        setCanOpen(false);
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openCalculator = useCallback(async () => {
    setError(null);
    const cents = Math.round(Math.max(0, price) * 100);
    const url = affirmAppAvailable
      ? `${AFFIRM_CALCULATOR_APP_BASE}?amount=${cents}`
      : AFFIRM_CALCULATOR_WEB_URL;
    try {
      await Linking.openURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [price, affirmAppAvailable]);

  return { openCalculator, canOpen, error };
}
