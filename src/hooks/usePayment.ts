/**
 * @module usePayment
 *
 * Orchestrates the Stripe checkout flow: creates a PaymentIntent via the
 * Wix eCommerce API, presents either the native Apple Pay sheet (via
 * usePlatformPay) or the Stripe payment sheet (for card/BNPL), confirms
 * the order, and clears the cart on success. Guards against double-
 * submission via a processing ref.
 */
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Platform } from 'react-native';
import { useStripe, usePlatformPay, PlatformPay } from '@stripe/stripe-react-native';
import { useWixClient } from '@/services/wix';
import { useCart } from './useCart';
import {
  createPaymentIntent,
  confirmOrder,
  calculateTotals,
  PaymentError,
  type PaymentMethod,
  type OrderConfirmation,
  type OrderTotals,
} from '@/services/payment';

export type PaymentStatus = 'idle' | 'processing' | 'success' | 'error';

interface PaymentState {
  status: PaymentStatus;
  error: string | null;
  order: OrderConfirmation | null;
}

/**
 * Build Apple Pay cart summary items from order totals.
 * The last item is treated as the grand total by Apple Pay.
 */
function buildApplePayCartItems(
  totals: OrderTotals,
): PlatformPay.CartSummaryItem[] {
  const items: PlatformPay.CartSummaryItem[] = [
    {
      paymentType: PlatformPay.PaymentType.Immediate,
      label: 'Subtotal',
      amount: totals.subtotal.toFixed(2),
    },
  ];

  if (totals.shipping > 0) {
    items.push({
      paymentType: PlatformPay.PaymentType.Immediate,
      label: 'Shipping',
      amount: totals.shipping.toFixed(2),
    });
  }

  if (totals.tax > 0) {
    items.push({
      paymentType: PlatformPay.PaymentType.Immediate,
      label: 'Tax',
      amount: totals.tax.toFixed(2),
    });
  }

  // Grand total — must be the last item
  items.push({
    paymentType: PlatformPay.PaymentType.Immediate,
    label: 'Carolina Futons',
    amount: totals.total.toFixed(2),
  });

  return items;
}

/**
 * Drives the end-to-end payment lifecycle, from intent creation through
 * Stripe sheet presentation to order confirmation. Supports Apple Pay
 * via the native PlatformPay flow and falls back to the Stripe payment
 * sheet for card and BNPL methods. Resets cleanly on cancel.
 */
export function usePayment() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { isPlatformPaySupported, confirmPlatformPayPayment } = usePlatformPay();
  const wixClient = useWixClient();
  const { items, subtotal, clearCart } = useCart();
  const [state, setState] = useState<PaymentState>({
    status: 'idle',
    error: null,
    order: null,
  });
  const [applePaySupported, setApplePaySupported] = useState(false);
  const processingRef = useRef(false);

  const totals = useMemo(() => calculateTotals(subtotal), [subtotal]);

  // Check Apple Pay support on mount
  useEffect(() => {
    isPlatformPaySupported().then(setApplePaySupported).catch(() => setApplePaySupported(false));
  }, [isPlatformPaySupported]);

  const processPayment = useCallback(
    async (method: PaymentMethod): Promise<OrderConfirmation | null> => {
      if (items.length === 0 || processingRef.current) return null;

      processingRef.current = true;
      setState({ status: 'processing', error: null, order: null });

      try {
        // 1. Create PaymentIntent via Wix eCommerce API
        const { clientSecret, ephemeralKey, customerId, paymentIntentId } =
          await createPaymentIntent(wixClient, items, totals);

        if (method === 'apple-pay') {
          // 2a. Apple Pay flow via confirmPlatformPayPayment
          const { error: applePayError } = await confirmPlatformPayPayment(
            clientSecret,
            {
              applePay: {
                merchantCountryCode: 'US',
                currencyCode: 'USD',
                cartItems: buildApplePayCartItems(totals),
              },
            },
          );

          if (applePayError) {
            if (applePayError.code === 'Canceled') {
              processingRef.current = false;
              setState({ status: 'idle', error: null, order: null });
              return null;
            }
            throw new PaymentError(
              applePayError.message ?? 'Apple Pay failed',
              'STRIPE_ERROR',
            );
          }
        } else {
          // 2b. Standard Stripe Payment Sheet flow (card, BNPL, Google Pay)
          const { error: initError } = await initPaymentSheet({
            paymentIntentClientSecret: clientSecret,
            customerEphemeralKeySecret: ephemeralKey,
            customerId,
            merchantDisplayName: 'Carolina Futons',
            applePay:
              Platform.OS === 'ios'
                ? { merchantCountryCode: 'US' }
                : undefined,
            googlePay:
              Platform.OS === 'android' && (method === 'google-pay' || method === 'card')
                ? { merchantCountryCode: 'US', testEnv: __DEV__ }
                : undefined,
            defaultBillingDetails: {
              address: { country: 'US' },
            },
          });

          if (initError) {
            throw new PaymentError(
              initError.message ?? 'Failed to initialize payment',
              'STRIPE_ERROR',
            );
          }

          const { error: presentError } = await presentPaymentSheet();

          if (presentError) {
            if (presentError.code === 'Canceled') {
              processingRef.current = false;
              setState({ status: 'idle', error: null, order: null });
              return null;
            }
            throw new PaymentError(
              presentError.message ?? 'Payment failed',
              'STRIPE_ERROR',
            );
          }
        }

        // 3. Confirm order via Wix eCommerce API
        const confirmation = await confirmOrder(wixClient, paymentIntentId, items, totals, method);

        // 4. Clear cart and set success state
        clearCart();
        processingRef.current = false;
        setState({ status: 'success', error: null, order: confirmation });
        return confirmation;
      } catch (err) {
        processingRef.current = false;
        const message =
          err instanceof PaymentError
            ? err.message
            : 'An unexpected error occurred. Please try again.';
        setState({ status: 'error', error: message, order: null });
        return null;
      }
    },
    [items, totals, wixClient, initPaymentSheet, presentPaymentSheet, confirmPlatformPayPayment, clearCart],
  );

  const resetPayment = useCallback(() => {
    setState({ status: 'idle', error: null, order: null });
  }, []);

  return {
    ...state,
    totals,
    isApplePaySupported: applePaySupported,
    processPayment,
    resetPayment,
  };
}
