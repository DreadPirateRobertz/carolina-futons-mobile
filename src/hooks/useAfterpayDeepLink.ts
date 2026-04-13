/**
 * useAfterpayDeepLink — hq-f5l
 *
 * Opens the Afterpay app pre-populated with a product price.
 * Tries the native Afterpay app deep-link first; falls back to the Afterpay
 * web URL when the app is not installed.
 *
 * AC: tap opens Afterpay calculator, handles SDK unavailable gracefully.
 *
 * App URL: afterpay://consumer/amount/<cents>
 * Web URL: https://www.afterpay.com
 */

import { useState, useEffect, useCallback } from 'react';
import { Linking } from 'react-native';

const AFTERPAY_APP_SCHEME = 'afterpay://';
const AFTERPAY_APP_BASE = 'afterpay://consumer/amount';
const AFTERPAY_WEB_URL = 'https://www.afterpay.com';

export interface UseAfterpayDeepLinkResult {
  /** Open the Afterpay app. Native deep-link if installed, web otherwise. */
  openCalculator: () => Promise<void>;
  /** True when the app can be opened (app installed OR web fallback). False only if Linking is entirely unavailable. */
  canOpen: boolean;
  error: string | null;
}

export function useAfterpayDeepLink(price: number): UseAfterpayDeepLinkResult {
  const [afterpayAppAvailable, setAfterpayAppAvailable] = useState(false);
  const [canOpen, setCanOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Linking.canOpenURL(AFTERPAY_APP_SCHEME)
      .then((available) => {
        if (cancelled) return;
        setAfterpayAppAvailable(available);
        setCanOpen(true); // web fallback always available
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setAfterpayAppAvailable(false);
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
    const url = afterpayAppAvailable ? `${AFTERPAY_APP_BASE}/${cents}` : AFTERPAY_WEB_URL;
    try {
      await Linking.openURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [price, afterpayAppAvailable]);

  return { openCalculator, canOpen, error };
}
