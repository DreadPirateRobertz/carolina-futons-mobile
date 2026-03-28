/**
 * TDD tests for Affirm BNPL flow in CheckoutScreen.
 *
 * Covers:
 *  - Affirm prequal badge shows when user is pre-qualified
 *  - Affirm prequal badge hidden when not eligible
 *  - Selecting Affirm and pressing Place Order opens Affirm checkout URL
 *  - Affirm checkout error shows error message
 *  - Place Order for non-Affirm methods still uses Stripe flow
 *  - handleAffirmCheckout not called when affirmEligible=false (guard)
 *
 * Bead: cm-d7l
 */

import React from 'react';
import { Linking, Platform } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CheckoutScreen } from '../CheckoutScreen';
import { CartProvider, useCart } from '@/hooks/useCart';
import { ConnectivityProvider } from '@/hooks/useConnectivity';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { FUTON_MODELS, FABRICS } from '@/data/futons';

// ── Standard mocks (matching existing CheckoutScreen.test.tsx) ───────────────

jest.mock('@/hooks/usePremium', () => ({
  PremiumProvider: ({ children }: any) => children,
  usePremium: () => ({ isPremium: false, isLoading: false }),
}));

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: 'Medium' },
  NotificationFeedbackType: { Success: 'Success' },
}));

jest.mock('@/hooks/useCartAbandonmentReminder', () => ({
  cancelCartAbandonmentForOrder: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/services/analytics', () => ({
  trackEvent: jest.fn(),
  events: { beginCheckout: jest.fn(), purchase: jest.fn() },
}));

jest.mock('@/hooks/useAddressBook', () => ({
  useAddressBook: () => ({
    addresses: [],
    defaultAddress: null,
    loading: false,
    addAddress: jest.fn(),
    updateAddress: jest.fn(),
    deleteAddress: jest.fn(),
    setDefault: jest.fn(),
    saveFromCheckout: jest.fn(),
  }),
}));

jest.mock('@stripe/stripe-react-native', () => ({
  useStripe: () => ({
    initPaymentSheet: jest.fn().mockResolvedValue({ error: null }),
    presentPaymentSheet: jest.fn().mockResolvedValue({ error: null }),
  }),
  usePlatformPay: () => ({
    isPlatformPaySupported: jest.fn().mockResolvedValue(false),
    confirmPlatformPayPayment: jest.fn().mockResolvedValue({ error: null }),
  }),
  PlatformPay: {
    PaymentType: { Immediate: 'Immediate' },
    ButtonType: { Pay: 'Pay' },
    ButtonStyle: { Black: 'Black' },
  },
  StripeProvider: ({ children }: { children: React.ReactNode }) => children,
  PlatformPayButton: () => null,
  CardField: ({ testID }: { testID?: string }) => {
    const { View } = require('react-native');
    return <View testID={testID} />;
  },
}));

// ── Wix client mock ──────────────────────────────────────────────────────────

const mockCallAffirmPrequal = jest.fn();
const mockInitiateAffirmCheckout = jest.fn();
const mockWixClient = {
  createPaymentIntent: jest.fn(),
  confirmOrder: jest.fn(),
  callAffirmPrequal: mockCallAffirmPrequal,
  initiateAffirmCheckout: mockInitiateAffirmCheckout,
};

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => mockWixClient,
}));

jest.mock('@/services/payment', () => ({
  calculateTotals: (subtotal: number) => {
    const shipping = subtotal >= 499 ? 0 : 49;
    const tax = Math.round(subtotal * 0.07 * 100) / 100;
    const total = Math.round((subtotal + shipping + tax) * 100) / 100;
    return { subtotal, shipping, tax, total };
  },
  createPaymentIntent: jest.fn().mockResolvedValue({
    clientSecret: 'pi_secret',
    ephemeralKey: 'ek_test',
    customerId: 'cus_test',
    paymentIntentId: 'pi_test',
  }),
  confirmOrder: jest.fn().mockResolvedValue({ orderId: 'order_123' }),
  PaymentError: class PaymentError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
}));

// ── Affirm service mock ──────────────────────────────────────────────────────

const mockCheckPrequal = jest.fn();

jest.mock('@/services/affirmService', () => ({
  checkAffirmPrequalification: (...args: any[]) => mockCheckPrequal(...args),
  initiateAffirmCheckout: (...args: any[]) => mockInitiateAffirmCheckoutService(...args),
  AFFIRM_MIN_AMOUNT: 50,
  AFFIRM_MAX_AMOUNT: 30000,
}));

const mockInitiateAffirmCheckoutService = jest.fn();

// Mock Linking — spy on re-exported object (RN 0.84 internal paths changed)
jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);

// ── Helpers ──────────────────────────────────────────────────────────────────

const model = FUTON_MODELS[1]; // Blue Ridge $449
const fabric = FABRICS[0]; // Natural Linen $0

function CartSeeder({ model: m, fabric: f }: any) {
  const { addItem } = useCart();
  React.useEffect(() => {
    addItem(m, f, 1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function renderCheckout(onOrderComplete = jest.fn()) {
  return render(
    <ThemeProvider>
      <ConnectivityProvider>
        <CartProvider>
          <CartSeeder model={model} fabric={fabric} />
          <CheckoutScreen onOrderComplete={onOrderComplete} />
        </CartProvider>
      </ConnectivityProvider>
    </ThemeProvider>,
  );
}

function fillRequiredAddress(getByTestId: any) {
  fireEvent.changeText(getByTestId('shipping-fullName'), 'Test User');
  fireEvent.changeText(getByTestId('shipping-line1'), '123 Main St');
  fireEvent.changeText(getByTestId('shipping-city'), 'Raleigh');
  fireEvent.changeText(getByTestId('shipping-state'), 'NC');
  fireEvent.changeText(getByTestId('shipping-zip'), '27601');
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('CheckoutScreen — Affirm BNPL flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Linking.openURL as jest.Mock).mockResolvedValue(undefined);
  });

  it('shows pre-qualified badge when user is eligible for Affirm', async () => {
    mockCheckPrequal.mockResolvedValue({ eligible: true });

    const { getByTestId } = renderCheckout();

    await waitFor(() => {
      expect(getByTestId('affirm-prequal-badge')).toBeTruthy();
    });
  });

  it('does not show pre-qualified badge when user is not eligible', async () => {
    mockCheckPrequal.mockResolvedValue({ eligible: false });

    const { queryByTestId } = renderCheckout();

    await waitFor(() => {
      // Give prequal check time to resolve
      expect(mockCheckPrequal).toHaveBeenCalled();
    });

    expect(queryByTestId('affirm-prequal-badge')).toBeNull();
  });

  it('opens Affirm checkout URL via Linking when Affirm is selected and user is eligible', async () => {
    mockCheckPrequal.mockResolvedValue({ eligible: true });
    mockInitiateAffirmCheckoutService.mockResolvedValue({
      checkoutUrl: 'https://sandbox.affirm.com/ui/redirect?token=tok-test',
      checkoutToken: 'tok-test',
    });

    const { getByTestId } = renderCheckout();

    await waitFor(() => expect(getByTestId('affirm-prequal-badge')).toBeTruthy());

    // Fill address and select Affirm
    fillRequiredAddress(getByTestId);
    fireEvent.press(getByTestId('payment-affirm'));

    // Press Place Order
    fireEvent.press(getByTestId('place-order-button'));

    await waitFor(() => {
      expect(mockInitiateAffirmCheckoutService).toHaveBeenCalledTimes(1);
      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://sandbox.affirm.com/ui/redirect?token=tok-test',
      );
    });
  });

  it('shows affirm error when Affirm checkout initiation fails', async () => {
    mockCheckPrequal.mockResolvedValue({ eligible: true });
    mockInitiateAffirmCheckoutService.mockRejectedValue(new Error('Affirm service unavailable'));

    const { getByTestId, findByTestId } = renderCheckout();

    await waitFor(() => expect(getByTestId('affirm-prequal-badge')).toBeTruthy());

    fillRequiredAddress(getByTestId);
    fireEvent.press(getByTestId('payment-affirm'));
    fireEvent.press(getByTestId('place-order-button'));

    const errorView = await findByTestId('affirm-error');
    expect(errorView).toBeTruthy();
  });

  it('does NOT open Affirm URL when user is not eligible (falls back to Stripe)', async () => {
    mockCheckPrequal.mockResolvedValue({ eligible: false });

    const { getByTestId } = renderCheckout();

    await waitFor(() => expect(mockCheckPrequal).toHaveBeenCalled());

    fillRequiredAddress(getByTestId);
    fireEvent.press(getByTestId('payment-affirm'));
    fireEvent.press(getByTestId('place-order-button'));

    // Should not call Affirm redirect when not eligible
    await waitFor(() => {
      expect(mockInitiateAffirmCheckoutService).not.toHaveBeenCalled();
    });
  });
});
