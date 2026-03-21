/**
 * @module useKlarnaCheckout
 *
 * Orchestrates the Klarna redirect checkout flow (cm-g2o):
 * 1. Validate amount client-side (rejects zero/negative/non-finite).
 * 2. POST /_functions/klarna/checkout via wixClient to create a session.
 * 3. SSRF-guard the returned redirect URL.
 * 4. Open Klarna hosted page via expo-linking.
 * 5. Listen for the deep link return URL and branch on status=success|cancel|error.
 * 6. On success: confirm the order, clear the cart, emit success state.
 * 7. On cancel: reset to idle.
 * 8. On error / API failure: emit error state.
 *
 * Security: no client-side Klarna keys; amount sent in cents; SSRF guard
 * enforced on redirect URL (validateKlarnaRedirectUrl).
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import * as Linking from 'expo-linking';
import { useOptionalWixClient } from '@/services/wix';
import { captureException } from '@/services/crashReporting';
import {
  validateCheckoutAmount,
  validateKlarnaRedirectUrl,
  amountToCents,
} from '@/services/checkoutSecurity';
import { useCart } from './useCart';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface KlarnaCartItem {
  id: string;
  quantity: number;
  price: number;
}

export interface KlarnaTotals {
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
}

export interface KlarnaOrderConfirmation {
  orderId: string;
  total: number;
  currency: string;
}

export type KlarnaCheckoutStatus =
  | 'idle'
  | 'processing'
  | 'awaiting_redirect'
  | 'success'
  | 'error';

type KlarnaState =
  | { status: 'idle'; error: null; order: null }
  | { status: 'processing'; error: null; order: null }
  | { status: 'awaiting_redirect'; error: null; order: null }
  | { status: 'success'; error: null; order: KlarnaOrderConfirmation }
  | { status: 'error'; error: string; order: null };

const KLARNA_RETURN_SCHEME = 'carolinafutons://klarna/return';

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useKlarnaCheckout() {
  const wixClient = useOptionalWixClient() as {
    createKlarnaSession: (params: {
      amountCents: number;
      items: KlarnaCartItem[];
    }) => Promise<{ redirectUrl: string; orderId: string }>;
    confirmKlarnaOrder: (params: { orderId: string }) => Promise<KlarnaOrderConfirmation>;
  } | null;

  const { clearCart } = useCart();
  const [state, setState] = useState<KlarnaState>({ status: 'idle', error: null, order: null });
  const processingRef = useRef(false);
  const listenerRef = useRef<{ remove: () => void } | null>(null);

  // Clean up the deep link listener on unmount
  useEffect(() => {
    return () => {
      listenerRef.current?.remove();
      listenerRef.current = null;
    };
  }, []);

  const _handleReturnUrl = useCallback(
    async (url: string, orderId: string) => {
      // Remove listener immediately — we only handle the first return
      listenerRef.current?.remove();
      listenerRef.current = null;

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        processingRef.current = false;
        setState({ status: 'error', error: 'Invalid return URL', order: null });
        return;
      }

      const status = parsedUrl.searchParams.get('status');

      if (status === 'cancel') {
        processingRef.current = false;
        setState({ status: 'idle', error: null, order: null });
        return;
      }

      if (status === 'error') {
        processingRef.current = false;
        setState({ status: 'error', error: 'Klarna checkout was declined', order: null });
        return;
      }

      if (status === 'success') {
        try {
          if (!wixClient) throw new Error('Payment service unavailable');
          const confirmation = await wixClient.confirmKlarnaOrder({ orderId });
          clearCart();
          processingRef.current = false;
          setState({ status: 'success', error: null, order: confirmation });
        } catch (err) {
          processingRef.current = false;
          const message = err instanceof Error ? err.message : 'Order confirmation failed';
          setState({ status: 'error', error: message, order: null });
          captureException(err instanceof Error ? err : new Error(message), 'error', {
            action: 'confirmKlarnaOrder',
            orderId,
          });
        }
        return;
      }

      // Unrecognised status
      processingRef.current = false;
      setState({ status: 'error', error: 'Unexpected Klarna return status', order: null });
    },
    [wixClient, clearCart],
  );

  const startCheckout = useCallback(
    async (
      items: KlarnaCartItem[],
      totals: KlarnaTotals,
    ): Promise<KlarnaOrderConfirmation | null> => {
      if (processingRef.current) return null;

      // Client-side amount guard
      if (!validateCheckoutAmount(totals.total)) {
        setState({ status: 'error', error: 'Invalid checkout amount', order: null });
        return null;
      }

      processingRef.current = true;
      setState({ status: 'processing', error: null, order: null });

      try {
        if (!wixClient) {
          throw new Error('Payment service unavailable');
        }

        const amountCents = amountToCents(totals.total);
        const session = await wixClient.createKlarnaSession({ amountCents, items });

        // SSRF guard — reject any URL that isn't a legitimate Klarna domain
        if (!validateKlarnaRedirectUrl(session.redirectUrl)) {
          throw new Error('Invalid Klarna redirect URL');
        }

        // Register deep link listener before opening URL to avoid race
        listenerRef.current?.remove();
        listenerRef.current = Linking.addEventListener('url', ({ url }) => {
          if (url.startsWith(KLARNA_RETURN_SCHEME)) {
            _handleReturnUrl(url, session.orderId);
          }
        });

        await Linking.openURL(session.redirectUrl);
        setState({ status: 'awaiting_redirect', error: null, order: null });
        return null;
      } catch (err) {
        listenerRef.current?.remove();
        listenerRef.current = null;
        processingRef.current = false;
        const message = err instanceof Error ? err.message : 'Klarna checkout failed';
        setState({ status: 'error', error: message, order: null });
        captureException(err instanceof Error ? err : new Error(message), 'error', {
          action: 'startKlarnaCheckout',
        });
        return null;
      }
    },
    [wixClient, _handleReturnUrl],
  );

  const reset = useCallback(() => {
    listenerRef.current?.remove();
    listenerRef.current = null;
    processingRef.current = false;
    setState({ status: 'idle', error: null, order: null });
  }, []);

  return {
    ...state,
    startCheckout,
    reset,
  };
}
