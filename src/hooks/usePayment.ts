import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { useCart, type CartItem } from './useCart';
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

export function usePayment() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { items, subtotal, clearCart } = useCart();
  const [state, setState] = useState<PaymentState>({
    status: 'idle',
    error: null,
    order: null,
  });

  const totals: OrderTotals = calculateTotals(subtotal);

  const processPayment = useCallback(
    async (method: PaymentMethod): Promise<OrderConfirmation | null> => {
      if (items.length === 0) return null;

      setState({ status: 'processing', error: null, order: null });

      try {
        // 1. Create PaymentIntent on backend
        const { clientSecret, ephemeralKey, customerId } = await createPaymentIntent(
          items,
          totals,
        );

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
            setState({ status: 'idle', error: null, order: null });
            return null;
          }
          throw new PaymentError(
            presentError.message ?? 'Payment failed',
            'STRIPE_ERROR',
          );
        }

        // 4. Confirm order on backend
        const confirmation = await confirmOrder(
          clientSecret.split('_secret_')[0], // extract PaymentIntent ID
          items,
          totals,
          method,
        );

        // 5. Clear cart and set success state
        clearCart();
        setState({ status: 'success', error: null, order: confirmation });
        return confirmation;
      } catch (err) {
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
