/**
 * @module usePayment
 *
 * Orchestrates the Stripe checkout flow: creates a PaymentIntent on the
 * backend, presents the native payment sheet (Apple Pay / Google Pay / card),
 * confirms the order, and clears the cart on success. Guards against
 * double-submission via a processing ref.
 */
import { useState, useCallback, useRef, useMemo } from 'react';
import { Platform } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
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
 * Drives the end-to-end payment lifecycle, from intent creation through
 * Stripe sheet presentation to order confirmation. Resets cleanly on cancel.
 */
export function usePayment() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { items, subtotal, clearCart } = useCart();
  const [state, setState] = useState<PaymentState>({
    status: 'idle',
    error: null,
    order: null,
  });
  const processingRef = useRef(false);

  const totals = useMemo(() => calculateTotals(subtotal), [subtotal]);

  const processPayment = useCallback(
    async (method: PaymentMethod): Promise<OrderConfirmation | null> => {
      if (items.length === 0 || processingRef.current) return null;

      processingRef.current = true;
      setState({ status: 'processing', error: null, order: null });

      try {
        // 1. Create PaymentIntent on backend
        const { clientSecret, ephemeralKey, customerId, paymentIntentId } =
          await createPaymentIntent(items, totals);

        // 2. Initialize Stripe payment sheet
        const { error: initError } = await initPaymentSheet({
          paymentIntentClientSecret: clientSecret,
          customerEphemeralKeySecret: ephemeralKey,
          customerId,
          merchantDisplayName: 'Carolina Futons',
          applePay:
            Platform.OS === 'ios' && (method === 'apple-pay' || method === 'card')
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

        // 3. Present payment sheet to user
        const { error: presentError } = await presentPaymentSheet();

        if (presentError) {
          if (presentError.code === 'Canceled') {
            processingRef.current = false;
            setState({ status: 'idle', error: null, order: null });
            return null;
          }
          throw new PaymentError(presentError.message ?? 'Payment failed', 'STRIPE_ERROR');
        }

        // 4. Confirm order on backend
        const confirmation = await confirmOrder(paymentIntentId, items, totals, method);

        // 5. Clear cart and set success state
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
    [items, totals, initPaymentSheet, presentPaymentSheet, clearCart],
  );

  const resetPayment = useCallback(() => {
    setState({ status: 'idle', error: null, order: null });
  }, []);

  return {
    ...state,
    totals,
    processPayment,
    resetPayment,
  };
}
