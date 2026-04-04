/**
 * @module usePriceAlertSubscription
 *
 * Manages a user's price-drop alert subscription for a specific product.
 * Writes to the Wix CMS PriceAlerts collection — each record links a push
 * token to a product with the price at subscription time.
 *
 * On mount, queries PriceAlerts to restore isSubscribed state.
 * subscribe()   → inserts a new alert record; sets isSubscribed=true.
 * unsubscribe() → deletes the record by ID; sets isSubscribed=false.
 *
 * Gracefully no-ops when no push token or no Wix client is available.
 *
 * @bead cm-pda
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useOptionalWixClient } from '@/services/wix/wixProvider';
import { useOptionalNotifications } from '@/hooks/useNotifications';
import { captureException } from '@/services/crashReporting';

const COLLECTION = 'PriceAlerts';

export interface UsePriceAlertSubscriptionReturn {
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

export function usePriceAlertSubscription(
  productId: string,
  productSlug: string,
  currentPrice: number,
): UsePriceAlertSubscriptionReturn {
  const wixClient = useOptionalWixClient();
  const pushToken = useOptionalNotifications()?.pushToken ?? null;

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Store the Wix item ID so we can delete it on unsubscribe
  const alertIdRef = useRef<string | null>(null);

  // ── Mount: check for existing subscription ────────────────────────────────
  useEffect(() => {
    if (!wixClient || !pushToken) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const result = await wixClient.queryData<{ id?: string; productId?: string }>(COLLECTION, {
          filter: {
            productId: { $eq: productId },
            pushToken: { $eq: pushToken },
          },
        });

        if (cancelled) return;

        if (result.items.length > 0) {
          alertIdRef.current = String(result.items[0].id ?? '');
          setIsSubscribed(true);
        }
      } catch (err) {
        if (cancelled) return;
        captureException(
          err instanceof Error ? err : new Error('Failed to check price alert'),
          'warning',
          { action: 'usePriceAlertSubscription/mount', productId },
        );
        // Non-fatal: user just can't see their existing subscription state
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productId, pushToken, wixClient]);

  // ── subscribe ────────────────────────────────────────────────────────────────
  const subscribe = useCallback(async () => {
    if (!wixClient || !pushToken) return;
    if (isSubscribed) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await wixClient.insertDataItem(COLLECTION, {
        productId,
        productSlug,
        pushToken,
        originalPrice: currentPrice,
        subscribedAt: new Date().toISOString(),
      });

      alertIdRef.current = result.id;
      setIsSubscribed(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to subscribe to price alerts';
      setError(message);
      captureException(
        err instanceof Error ? err : new Error(message),
        'error',
        { action: 'usePriceAlertSubscription/subscribe', productId },
      );
    } finally {
      setIsLoading(false);
    }
  }, [wixClient, pushToken, isSubscribed, productId, productSlug, currentPrice]);

  // ── unsubscribe ───────────────────────────────────────────────────────────────
  const unsubscribe = useCallback(async () => {
    if (!wixClient || !pushToken) return;
    if (!isSubscribed || !alertIdRef.current) return;

    setIsLoading(true);
    setError(null);
    const savedId = alertIdRef.current;

    try {
      await wixClient.deleteDataItem(COLLECTION, savedId);
      alertIdRef.current = null;
      setIsSubscribed(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove price alert';
      setError(message);
      captureException(
        err instanceof Error ? err : new Error(message),
        'error',
        { action: 'usePriceAlertSubscription/unsubscribe', productId },
      );
    } finally {
      setIsLoading(false);
    }
  }, [wixClient, pushToken, isSubscribed, productId]);

  return { isSubscribed, isLoading, error, subscribe, unsubscribe };
}
