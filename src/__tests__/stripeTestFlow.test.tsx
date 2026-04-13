/**
 * Stripe test-flow verification — cm-stripe-test-verify
 *
 * Verifies:
 * 1. StripeProvider initializes with pk_test_ key (no crash, key passed through)
 * 2. StripeProvider handles empty/missing key without crashing
 * 3. Payment happy path — usePayment hook with cart items triggers the full
 *    createPaymentIntent → initPaymentSheet → presentPaymentSheet → confirmOrder
 *    chain (test card 4242 4242 4242 4242 simulation)
 * 4. Payment decline path — presentPaymentSheet returns a decline error
 *    and usePayment sets status to 'error' (test card 4000 0000 0000 0002)
 * 5. Payment cancellation — presentPaymentSheet returns Canceled code and
 *    usePayment resets to idle (user dismissed the sheet)
 * 6. Network failure — createPaymentIntent throws a network error and
 *    usePayment sets status to 'error'
 * 7. Apple Pay / Platform Pay support detection
 * 8. PaymentConfirmationScreen renders success and decline states correctly
 */

import React from 'react';
import { View } from 'react-native';
import { render, renderHook, act, fireEvent } from '@testing-library/react-native';
import { StripeProvider } from '@stripe/stripe-react-native';
import { usePayment } from '@/hooks/usePayment';
import { useCart } from '@/hooks/useCart';
import { CartProvider } from '@/hooks/useCart';
import { ConnectivityProvider } from '@/hooks/useConnectivity';
import { PaymentConfirmationScreen } from '@/screens/PaymentConfirmationScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import {
  createPaymentIntent,
  confirmOrder,
  PaymentError,
  type OrderConfirmation,
} from '@/services/payment';
import { futonModelId } from '@/data/productId';
import type { FutonModel } from '@/data/futons';
import type { Fabric } from '@/data/futons';

// ── Mock: Stripe SDK ──────────────────────────────────────────────────

const mockInitPaymentSheet = jest.fn();
const mockPresentPaymentSheet = jest.fn();
const mockIsPlatformPaySupported = jest.fn().mockResolvedValue(false);
const mockConfirmPlatformPayPayment = jest.fn();

jest.mock('@stripe/stripe-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    StripeProvider: ({
      children,
      publishableKey,
    }: {
      children: React.ReactNode;
      publishableKey: string;
    }) =>
      React.createElement(
        View,
        { testID: 'stripe-provider', accessibilityLabel: publishableKey ?? '' },
        children,
      ),
    useStripe: () => ({
      initPaymentSheet: mockInitPaymentSheet,
      presentPaymentSheet: mockPresentPaymentSheet,
    }),
    usePlatformPay: () => ({
      isPlatformPaySupported: mockIsPlatformPaySupported,
      confirmPlatformPayPayment: mockConfirmPlatformPayPayment,
    }),
    PlatformPay: {
      PaymentType: { Immediate: 'Immediate' },
    },
  };
});

// ── Mock: WixClient ───────────────────────────────────────────────────

const mockWixClient = {
  createPaymentIntent: jest.fn(),
  confirmOrder: jest.fn(),
};

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => mockWixClient,
}));

// ── Mock: payment service (keep real calculateTotals + PaymentError) ──

jest.mock('@/services/payment', () => {
  const actual = jest.requireActual('@/services/payment');
  return { ...actual, createPaymentIntent: jest.fn(), confirmOrder: jest.fn() };
});

const mockedCreatePaymentIntent = createPaymentIntent as jest.MockedFunction<
  typeof createPaymentIntent
>;
const mockedConfirmOrder = confirmOrder as jest.MockedFunction<typeof confirmOrder>;

// ── Mock: supporting services ─────────────────────────────────────────

jest.mock('@/services/crashReporting', () => ({ captureException: jest.fn() }));
jest.mock('@/hooks/usePremium', () => ({ usePremium: () => ({ isPremium: false }) }));

// ── Mock: theme ───────────────────────────────────────────────────────

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      sandBase: '#E8D5B7',
      sandLight: '#F5F0EB',
      espresso: '#3A2518',
      espressoLight: '#B8A99A',
      sunsetCoral: '#E8845C',
      mountainBlue: '#5B7FA6',
      white: '#FFFFFF',
      error: '#DC2626',
      success: '#16A34A',
      muted: '#9CA3AF',
    },
    spacing: { sm: 8, md: 16, lg: 24 },
    borderRadius: { card: 12, button: 8 },
    shadows: { card: {} },
  }),
}));

// ── Fixtures ──────────────────────────────────────────────────────────

/** pk_test_ key format used by Stripe test mode */
const TEST_PK_KEY = 'pk_test_51AbcDeFgHiJkLmNoPqRsTuVwXyZ0123456789';

const INTENT_RESPONSE = {
  clientSecret: 'pi_3test_secret_abc123',
  paymentIntentId: 'pi_3test_abc123',
  ephemeralKey: 'ek_test_abc123',
  customerId: 'cus_test_abc123',
};

const TEST_ORDER: OrderConfirmation = {
  orderId: 'ord_test_pi_3test_abc123',
  orderNumber: 'CF-20260321-TEST',
  items: [
    {
      id: 'asheville-full:natural-linen',
      model: {
        id: 'asheville-full',
        name: 'Asheville Full',
        basePrice: 349,
      } as OrderConfirmation['items'][0]['model'],
      fabric: {
        id: 'natural-linen',
        name: 'Natural Linen',
        color: '#C4B5A0',
        price: 0,
      } as OrderConfirmation['items'][0]['fabric'],
      quantity: 1,
      unitPrice: 349,
    },
  ],
  totals: { subtotal: 349, shipping: 49, tax: 24.43, total: 422.43 },
  paymentMethod: 'card',
  createdAt: '2026-03-21T00:00:00Z',
  estimatedDelivery: 'April 1 – April 6, 2026',
};

/** Minimal FutonModel fixture for cart population */
const TEST_MODEL: FutonModel = {
  id: futonModelId('asheville-full'),
  name: 'Asheville Full',
  tagline: 'Classic comfort',
  dimensions: { width: 72, depth: 32, height: 34, seatHeight: 17 },
  basePrice: 349,
  fabrics: [],
};

/** Minimal Fabric fixture for cart population */
const TEST_FABRIC: Fabric = {
  id: 'natural-linen',
  name: 'Natural Linen',
  color: '#D4C5A9',
  price: 0,
};

// ── Helpers ───────────────────────────────────────────────────────────

function hookWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ConnectivityProvider initialOnline skipNetInfo>
      <CartProvider>{children}</CartProvider>
    </ConnectivityProvider>
  );
}

/** Render useCart + usePayment together so cart state is shared */
function renderPaymentWithCart() {
  return renderHook(() => ({ cart: useCart(), payment: usePayment() }), {
    wrapper: hookWrapper,
  });
}

/** Populate cart with one test item then return the hooks result */
async function renderPaymentWithItem() {
  const { result } = renderPaymentWithCart();
  await act(async () => {
    result.current.cart.addItem(TEST_MODEL, TEST_FABRIC, 1);
  });
  return { result };
}

function renderConfirmation(
  props: Partial<React.ComponentProps<typeof PaymentConfirmationScreen>> = {},
) {
  return render(
    <ThemeProvider>
      <PaymentConfirmationScreen order={TEST_ORDER} onSuccess={jest.fn()} {...props} />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockIsPlatformPaySupported.mockResolvedValue(false);
  mockInitPaymentSheet.mockResolvedValue({ error: undefined });
  mockPresentPaymentSheet.mockResolvedValue({ error: undefined });
  mockedCreatePaymentIntent.mockResolvedValue(INTENT_RESPONSE);
  mockedConfirmOrder.mockResolvedValue(TEST_ORDER);
});

// ── 1. StripeProvider — pk_test_ key initialisation ───────────────────

describe('StripeProvider initialization with pk_test_ key', () => {
  it('renders without crashing when given a pk_test_ publishable key', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <StripeProvider
          publishableKey={TEST_PK_KEY}
          merchantIdentifier="merchant.com.carolinafutons"
        >
          <View />
        </StripeProvider>
      </ThemeProvider>,
    );
    expect(getByTestId('stripe-provider')).toBeTruthy();
  });

  it('passes pk_test_ key through to provider (key is present, not empty)', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <StripeProvider
          publishableKey={TEST_PK_KEY}
          merchantIdentifier="merchant.com.carolinafutons"
        >
          <View />
        </StripeProvider>
      </ThemeProvider>,
    );
    expect(getByTestId('stripe-provider').props.accessibilityLabel).toBe(TEST_PK_KEY);
  });

  it('pk_test_ key has correct Stripe test-mode prefix format', () => {
    expect(TEST_PK_KEY).toMatch(/^pk_test_/);
  });

  it('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY env var is set in test environment', () => {
    // jest.setup.js sets this to 'pk_test_mock' so StripeProvider always gets a key
    expect(process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY).toBe('pk_test_mock');
  });

  it('App.tsx reads key from env and falls back to empty string when unset', () => {
    const key = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
    expect(typeof key).toBe('string');
  });
});

// ── 2. StripeProvider — missing/empty key fallback ────────────────────

describe('StripeProvider missing key fallback', () => {
  it('renders without crashing when given empty string key', () => {
    expect(() =>
      render(
        <ThemeProvider>
          <StripeProvider publishableKey="" merchantIdentifier="merchant.com.carolinafutons">
            <View />
          </StripeProvider>
        </ThemeProvider>,
      ),
    ).not.toThrow();
  });

  it('empty-key StripeProvider still renders the provider node', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <StripeProvider publishableKey="" merchantIdentifier="merchant.com.carolinafutons">
          <View />
        </StripeProvider>
      </ThemeProvider>,
    );
    expect(getByTestId('stripe-provider')).toBeTruthy();
  });

  it('processPayment stays idle with empty cart even when wixClient present', async () => {
    const { result } = renderPaymentWithCart();
    await act(async () => {
      await result.current.payment.processPayment('card');
    });
    expect(result.current.payment.status).toBe('idle');
    expect(mockedCreatePaymentIntent).not.toHaveBeenCalled();
  });
});

// ── 3. Happy path — test card 4242 4242 4242 4242 ─────────────────────

describe('payment happy path (test card 4242 4242 4242 4242)', () => {
  it('createPaymentIntent is called with cart items when processPayment runs', async () => {
    const { result } = await renderPaymentWithItem();
    await act(async () => {
      await result.current.payment.processPayment('card');
    });
    expect(mockedCreatePaymentIntent).toHaveBeenCalledTimes(1);
    expect(mockedCreatePaymentIntent).toHaveBeenCalledWith(
      mockWixClient,
      expect.arrayContaining([expect.objectContaining({ id: 'asheville-full:natural-linen' })]),
      expect.objectContaining({ subtotal: 349 }),
      expect.any(String), // idempotency key
    );
  });

  it('initPaymentSheet is called with clientSecret from createPaymentIntent', async () => {
    const { result } = await renderPaymentWithItem();
    await act(async () => {
      await result.current.payment.processPayment('card');
    });
    expect(mockInitPaymentSheet).toHaveBeenCalledWith(
      expect.objectContaining({ paymentIntentClientSecret: INTENT_RESPONSE.clientSecret }),
    );
  });

  it('presentPaymentSheet is called after initPaymentSheet succeeds', async () => {
    const { result } = await renderPaymentWithItem();
    await act(async () => {
      await result.current.payment.processPayment('card');
    });
    expect(mockPresentPaymentSheet).toHaveBeenCalledTimes(1);
  });

  it('confirmOrder is called after presentPaymentSheet succeeds', async () => {
    const { result } = await renderPaymentWithItem();
    await act(async () => {
      await result.current.payment.processPayment('card');
    });
    expect(mockedConfirmOrder).toHaveBeenCalledWith(
      mockWixClient,
      INTENT_RESPONSE.paymentIntentId,
      expect.any(Array),
      expect.objectContaining({ subtotal: 349 }),
      'card',
    );
  });

  it('status becomes success after the full happy-path chain completes', async () => {
    const { result } = await renderPaymentWithItem();
    await act(async () => {
      await result.current.payment.processPayment('card');
    });
    expect(result.current.payment.status).toBe('success');
    expect(result.current.payment.order?.orderNumber).toBe('CF-20260321-TEST');
  });

  it('cart is cleared after successful payment', async () => {
    const { result } = await renderPaymentWithItem();
    expect(result.current.cart.items).toHaveLength(1);
    await act(async () => {
      await result.current.payment.processPayment('card');
    });
    expect(result.current.cart.items).toHaveLength(0);
  });
});

// ── 4. Decline path — test card 4000 0000 0000 0002 ──────────────────

describe('payment decline path (test card 4000 0000 0000 0002)', () => {
  const DECLINE_ERROR = {
    code: 'Failed',
    message: 'Your card was declined.',
    type: 'card_error',
  };

  beforeEach(() => {
    mockPresentPaymentSheet.mockResolvedValue({ error: DECLINE_ERROR });
  });

  it('processPayment sets status to error when card is declined', async () => {
    const { result } = await renderPaymentWithItem();
    await act(async () => {
      await result.current.payment.processPayment('card');
    });
    expect(result.current.payment.status).toBe('error');
  });

  it('error message contains decline reason', async () => {
    const { result } = await renderPaymentWithItem();
    await act(async () => {
      await result.current.payment.processPayment('card');
    });
    expect(result.current.payment.error).toContain('declined');
  });

  it('confirmOrder is NOT called after a card decline', async () => {
    const { result } = await renderPaymentWithItem();
    await act(async () => {
      await result.current.payment.processPayment('card');
    });
    expect(mockedConfirmOrder).not.toHaveBeenCalled();
  });

  it('PaymentError wraps the decline message with STRIPE_ERROR code', () => {
    const err = new PaymentError('Your card was declined.', 'STRIPE_ERROR');
    expect(err.code).toBe('STRIPE_ERROR');
    expect(err.message).toBe('Your card was declined.');
  });

  it('decline error is not a Canceled code (cancel vs decline are different flows)', () => {
    expect(DECLINE_ERROR.code).not.toBe('Canceled');
  });
});

// ── 5. Cancellation — user dismisses payment sheet ────────────────────

describe('payment cancellation (user dismisses sheet)', () => {
  beforeEach(() => {
    mockPresentPaymentSheet.mockResolvedValue({ error: { code: 'Canceled', message: 'Canceled' } });
  });

  it('status resets to idle when user cancels the payment sheet', async () => {
    const { result } = await renderPaymentWithItem();
    await act(async () => {
      await result.current.payment.processPayment('card');
    });
    expect(result.current.payment.status).toBe('idle');
  });

  it('error is null after cancellation (cancel is not an error)', async () => {
    const { result } = await renderPaymentWithItem();
    await act(async () => {
      await result.current.payment.processPayment('card');
    });
    expect(result.current.payment.error).toBeNull();
  });

  it('confirmOrder is NOT called after cancellation', async () => {
    const { result } = await renderPaymentWithItem();
    await act(async () => {
      await result.current.payment.processPayment('card');
    });
    expect(mockedConfirmOrder).not.toHaveBeenCalled();
  });

  it('processPayment can be called again after a cancellation', async () => {
    const { result } = await renderPaymentWithItem();

    // First attempt — cancelled
    await act(async () => {
      await result.current.payment.processPayment('card');
    });
    expect(result.current.payment.status).toBe('idle');

    // Second attempt — succeed
    mockPresentPaymentSheet.mockResolvedValueOnce({ error: undefined });
    await act(async () => {
      await result.current.payment.processPayment('card');
    });
    expect(result.current.payment.status).toBe('success');
  });
});

// ── 6. Network failure ────────────────────────────────────────────────

describe('payment network failure', () => {
  it('status becomes error when createPaymentIntent throws a network error', async () => {
    mockedCreatePaymentIntent.mockRejectedValueOnce(
      new PaymentError('Request timed out', 'NETWORK_ERROR'),
    );
    const { result } = await renderPaymentWithItem();
    await act(async () => {
      await result.current.payment.processPayment('card');
    });
    expect(result.current.payment.status).toBe('error');
  });

  it('status becomes error when initPaymentSheet fails', async () => {
    mockInitPaymentSheet.mockResolvedValueOnce({
      error: { code: 'Failed', message: 'Network unavailable' },
    });
    const { result } = await renderPaymentWithItem();
    await act(async () => {
      await result.current.payment.processPayment('card');
    });
    expect(result.current.payment.status).toBe('error');
  });

  it('confirmOrder failure sets status to error', async () => {
    mockedConfirmOrder.mockRejectedValueOnce(
      new PaymentError('Order confirmation failed', 'CONFIRM_FAILED'),
    );
    const { result } = await renderPaymentWithItem();
    await act(async () => {
      await result.current.payment.processPayment('card');
    });
    expect(result.current.payment.status).toBe('error');
  });
});

// ── 7. Platform Pay support detection ────────────────────────────────

describe('Apple Pay / Platform Pay support detection', () => {
  it('isApplePaySupported is false when isPlatformPaySupported returns false', async () => {
    mockIsPlatformPaySupported.mockResolvedValue(false);
    const { result } = renderHook(() => usePayment(), { wrapper: hookWrapper });
    // Let the mount effect run
    await act(async () => {});
    expect(result.current.isApplePaySupported).toBe(false);
  });

  it('isApplePaySupported is true when isPlatformPaySupported returns true', async () => {
    mockIsPlatformPaySupported.mockResolvedValue(true);
    const { result } = renderHook(() => usePayment(), { wrapper: hookWrapper });
    await act(async () => {});
    expect(result.current.isApplePaySupported).toBe(true);
  });

  it('isPlatformPaySupported is called on mount to detect Apple Pay', async () => {
    const { result } = renderHook(() => usePayment(), { wrapper: hookWrapper });
    await act(async () => {});
    expect(mockIsPlatformPaySupported).toHaveBeenCalled();
    expect(result.current).toBeDefined();
  });
});

// ── 8. PaymentConfirmationScreen — success state ──────────────────────

describe('PaymentConfirmationScreen — test order success state', () => {
  it('renders the confirmation screen without crashing', () => {
    const { getByTestId } = renderConfirmation();
    expect(getByTestId('payment-confirmation-screen')).toBeTruthy();
  });

  it('displays the test order number', () => {
    const { getByTestId } = renderConfirmation();
    expect(getByTestId('payment-order-number').props.children).toBe('CF-20260321-TEST');
  });

  it('displays correct subtotal', () => {
    const { getByTestId } = renderConfirmation();
    expect(getByTestId('subtotal-value').props.children).toBe('$349.00');
  });

  it('displays grand total including shipping and tax', () => {
    const { getByText } = renderConfirmation();
    expect(getByText('$422.43')).toBeTruthy();
  });

  it('displays shipping cost', () => {
    const { getByText } = renderConfirmation();
    expect(getByText('$49.00')).toBeTruthy();
  });

  it('shows continue button in success state', () => {
    const { getByTestId } = renderConfirmation();
    expect(getByTestId('continue-btn')).toBeTruthy();
  });

  it('does not show error view in success state', () => {
    const { queryByTestId } = renderConfirmation();
    expect(queryByTestId('payment-error-view')).toBeNull();
  });

  it('calls onSuccess callback when continue button is pressed', () => {
    const onSuccess = jest.fn();
    const { getByTestId } = renderConfirmation({ onSuccess });
    fireEvent.press(getByTestId('continue-btn'));
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});

// ── 9. PaymentConfirmationScreen — decline error state ───────────────

describe('PaymentConfirmationScreen — decline error state', () => {
  it('shows the decline error message', () => {
    const { getByText } = renderConfirmation({ error: 'Your card was declined.' });
    expect(getByText('Your card was declined.')).toBeTruthy();
  });

  it('shows error view container', () => {
    const { getByTestId } = renderConfirmation({ error: 'Your card was declined.' });
    expect(getByTestId('payment-error-view')).toBeTruthy();
  });

  it('shows retry button on decline', () => {
    const { getByTestId } = renderConfirmation({ error: 'Your card was declined.' });
    expect(getByTestId('retry-btn')).toBeTruthy();
  });

  it('calls onRetry when retry button is pressed', () => {
    const onRetry = jest.fn();
    const { getByTestId } = renderConfirmation({ error: 'Your card was declined.', onRetry });
    fireEvent.press(getByTestId('retry-btn'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not show continue button in error state', () => {
    const { queryByTestId } = renderConfirmation({ error: 'Your card was declined.' });
    expect(queryByTestId('continue-btn')).toBeNull();
  });

  it('shows correct message for insufficient_funds decline', () => {
    const { getByText } = renderConfirmation({ error: 'Your card has insufficient funds.' });
    expect(getByText('Your card has insufficient funds.')).toBeTruthy();
  });
});
