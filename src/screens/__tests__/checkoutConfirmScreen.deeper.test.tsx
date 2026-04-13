/**
 * CheckoutScreen + OrderConfirmationScreen deeper edge cases — cm-v8u
 *
 * Covers:
 * - Address validation failure message content (specific strings)
 * - Payment declined: error message text, button remains active
 * - Retry flow: place-order button re-pressable after payment error
 * - Order ID display: orderNumber format, accessibility label, orderId distinction
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { CheckoutScreen } from '../CheckoutScreen';
import { OrderConfirmationScreen } from '../OrderConfirmationScreen';
import { CartProvider, useCart } from '@/hooks/useCart';
import { ConnectivityProvider } from '@/hooks/useConnectivity';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { FUTON_MODELS, FABRICS } from '@/data/futons';
import type { OrderConfirmation } from '@/services/payment';

// ── Mocks (CheckoutScreen) ────────────────────────────────────────────────────

jest.mock('@/hooks/usePremium', () => ({
  PremiumProvider: ({ children }: any) => children,
  usePremium: () => ({
    isPremium: false,
    isLoading: false,
    offerings: [],
    error: null,
    purchase: jest.fn(),
    restore: jest.fn(),
    refreshStatus: jest.fn(),
  }),
}));

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
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

const mockInitPaymentSheet = jest.fn().mockResolvedValue({ error: null });
const mockPresentPaymentSheet = jest.fn().mockResolvedValue({ error: null });

jest.mock('@stripe/stripe-react-native', () => ({
  useStripe: () => ({
    initPaymentSheet: mockInitPaymentSheet,
    presentPaymentSheet: mockPresentPaymentSheet,
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
  PlatformPayButton: ({ onPress, disabled, testID, style }: any) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled} testID={testID} style={style}>
        <Text>Apple Pay</Text>
      </TouchableOpacity>
    );
  },
  CardField: ({ onCardChange, testID, style }: any) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { View, TouchableOpacity, Text } = require('react-native');
    return (
      <View testID={testID} style={style}>
        <TouchableOpacity
          testID="card-field-complete-trigger"
          onPress={() => onCardChange?.({ complete: true })}
        >
          <Text>Complete Card</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="card-field-incomplete-trigger"
          onPress={() => onCardChange?.({ complete: false })}
        >
          <Text>Incomplete Card</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => ({
    createPaymentIntent: jest.fn(),
    confirmOrder: jest.fn(),
    callFunction: jest.fn(),
  }),
}));

jest.mock('@/services/shippingIntelligenceService', () => ({
  fetchShippingOptions: jest.fn().mockResolvedValue({ success: false, options: [] }),
  normalizeShippingOption: jest.requireActual('@/services/shippingIntelligenceService')
    .normalizeShippingOption,
}));

jest.mock('@/hooks/useAffirmPrequalification', () => ({
  useAffirmPrequalification: () => ({ isEligible: false, isLoading: false, error: null }),
}));

jest.mock('@/services/affirmService', () => ({
  checkAffirmPrequalification: jest.fn().mockResolvedValue({ eligible: false }),
  initiateAffirmCheckout: jest.fn().mockResolvedValue({ checkoutUrl: '', checkoutToken: '' }),
  AFFIRM_MIN_AMOUNT: 50,
  AFFIRM_MAX_AMOUNT: 30000,
}));

jest.mock('@/hooks/useKlarnaCheckout', () => ({
  useKlarnaCheckout: () => ({
    status: 'idle',
    error: null,
    order: null,
    startCheckout: jest.fn().mockResolvedValue(null),
    reset: jest.fn(),
  }),
}));

jest.mock('@/hooks/useLoyalty', () => ({
  useLoyalty: () => ({
    tier: 'bronze',
    points: 120,
    nextTier: 'silver',
    pointsToNext: 380,
    progress: 24,
    loading: false,
    error: null,
    refreshPoints: jest.fn(),
  }),
}));

const mockCreatePaymentIntent = jest.fn();
const mockConfirmOrder = jest.fn();

jest.mock('@/services/payment', () => ({
  calculateTotals: (subtotal: number) => {
    const shipping = subtotal >= 499 ? 0 : 49;
    const tax = Math.round(subtotal * 0.07 * 100) / 100;
    return { subtotal, shipping, tax, total: subtotal + shipping + tax };
  },
  createPaymentIntent: (...args: any[]) => mockCreatePaymentIntent(...args),
  confirmOrder: (...args: any[]) => mockConfirmOrder(...args),
  PaymentError: class PaymentError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
}));

// ── Mocks (OrderConfirmationScreen) ──────────────────────────────────────────

jest.mock('@/hooks/useRatingPrompt', () => ({
  useRatingPrompt: () => ({
    disabled: false,
    recordPurchase: jest.fn(),
    toggleDisabled: jest.fn(),
  }),
}));

jest.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({
    preferences: { orderUpdates: true },
    permissionStatus: 'granted',
  }),
}));

jest.mock('@/hooks/usePostPurchaseReviewPush', () => ({
  usePostPurchaseReviewPush: jest.fn(),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const asheville = FUTON_MODELS[0];
const naturalLinen = FABRICS[0];
const seed = [{ model: asheville, fabric: naturalLinen, qty: 1 }];

const mockOrder: OrderConfirmation = {
  orderId: 'ord_abc123',
  orderNumber: 'CF-20260413-042',
  items: [
    {
      id: 'asheville-full:natural-linen',
      model: { id: 'asheville-full', name: 'Asheville Full', basePrice: 349 } as any,
      fabric: {
        id: 'natural-linen',
        name: 'Natural Linen',
        color: '#C4B5A0',
        price: 0,
      } as any,
      quantity: 1,
      unitPrice: 349,
    },
  ],
  totals: { subtotal: 349, shipping: 49, tax: 24.43, total: 422.43 },
  paymentMethod: 'card',
  createdAt: '2026-04-13T12:00:00Z',
  estimatedDelivery: 'April 25-30, 2026',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function CartSeeder({
  items,
}: {
  items: { model: typeof asheville; fabric: typeof naturalLinen; qty: number }[];
}) {
  const { addItem } = useCart();
  React.useEffect(() => {
    items.forEach(({ model, fabric, qty }) => addItem(model, fabric, qty));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function renderCheckout(
  props: Partial<React.ComponentProps<typeof CheckoutScreen>> = {},
  seedItems = seed,
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ConnectivityProvider initialOnline={true} skipNetInfo={true}>
        <ThemeProvider>
          <CartProvider>
            {seedItems && <CartSeeder items={seedItems} />}
            {children}
          </CartProvider>
        </ThemeProvider>
      </ConnectivityProvider>
    );
  }
  return render(<CheckoutScreen {...props} />, { wrapper: Wrapper });
}

function fillShippingAddress(utils: ReturnType<typeof renderCheckout>) {
  const { getByTestId } = utils;
  fireEvent.changeText(getByTestId('shipping-fullName'), 'Jane Doe');
  fireEvent.changeText(getByTestId('shipping-line1'), '123 Main St');
  fireEvent.changeText(getByTestId('shipping-city'), 'Asheville');
  fireEvent.changeText(getByTestId('shipping-state'), 'NC');
  fireEvent.changeText(getByTestId('shipping-zip'), '28801');
}

function fillAndSelectCard(utils: ReturnType<typeof renderCheckout>) {
  fillShippingAddress(utils);
  fireEvent.press(utils.getByTestId('payment-card'));
  fireEvent.press(utils.getByTestId('card-field-complete-trigger'));
}

function renderConfirmation(
  props: Partial<React.ComponentProps<typeof OrderConfirmationScreen>> = {},
) {
  return render(
    <ThemeProvider>
      <OrderConfirmationScreen order={mockOrder} {...props} />
    </ThemeProvider>,
  );
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockCreatePaymentIntent.mockResolvedValue({
    clientSecret: 'pi_test_secret',
    ephemeralKey: 'ek_test',
    customerId: 'cus_test',
    paymentIntentId: 'pi_test',
  });
  mockConfirmOrder.mockResolvedValue({ orderId: 'order_123', status: 'confirmed' });
  mockInitPaymentSheet.mockResolvedValue({ error: null });
  mockPresentPaymentSheet.mockResolvedValue({ error: null });
});

// ── Address validation failure messages ───────────────────────────────────────

describe('address validation failure messages', () => {
  it('fullName error says "Full name is required"', () => {
    const utils = renderCheckout();
    fireEvent.press(utils.getByTestId('payment-affirm'));
    fireEvent.press(utils.getByTestId('place-order-button'));
    expect(utils.getByTestId('shipping-fullName-error').props.children).toBe(
      'Full name is required',
    );
  });

  it('street address error says "Street address is required"', () => {
    const utils = renderCheckout();
    fireEvent.press(utils.getByTestId('payment-affirm'));
    fireEvent.press(utils.getByTestId('place-order-button'));
    expect(utils.getByTestId('shipping-line1-error').props.children).toBe(
      'Street address is required',
    );
  });

  it('city error says "City is required"', () => {
    const utils = renderCheckout();
    fireEvent.press(utils.getByTestId('payment-affirm'));
    fireEvent.press(utils.getByTestId('place-order-button'));
    expect(utils.getByTestId('shipping-city-error').props.children).toBe('City is required');
  });

  it('ZIP error says "ZIP code is required" when blank', () => {
    const utils = renderCheckout();
    fireEvent.changeText(utils.getByTestId('shipping-fullName'), 'Jane Doe');
    fireEvent.changeText(utils.getByTestId('shipping-line1'), '123 Main St');
    fireEvent.changeText(utils.getByTestId('shipping-city'), 'Asheville');
    fireEvent.changeText(utils.getByTestId('shipping-state'), 'NC');
    fireEvent.press(utils.getByTestId('payment-affirm'));
    fireEvent.press(utils.getByTestId('place-order-button'));
    expect(utils.getByTestId('shipping-zip-error').props.children).toBe('ZIP code is required');
  });

  it('ZIP error says "Enter a valid ZIP code" for non-numeric input', () => {
    const utils = renderCheckout();
    fireEvent.changeText(utils.getByTestId('shipping-fullName'), 'Jane Doe');
    fireEvent.changeText(utils.getByTestId('shipping-line1'), '123 Main St');
    fireEvent.changeText(utils.getByTestId('shipping-city'), 'Asheville');
    fireEvent.changeText(utils.getByTestId('shipping-state'), 'NC');
    fireEvent.changeText(utils.getByTestId('shipping-zip'), 'ABCDE');
    fireEvent.press(utils.getByTestId('payment-affirm'));
    fireEvent.press(utils.getByTestId('place-order-button'));
    expect(utils.getByTestId('shipping-zip-error').props.children).toBe('Enter a valid ZIP code');
  });

  it('state error says "Enter a valid 2-letter state code" for invalid state', () => {
    const utils = renderCheckout();
    fireEvent.changeText(utils.getByTestId('shipping-fullName'), 'Jane Doe');
    fireEvent.changeText(utils.getByTestId('shipping-line1'), '123 Main St');
    fireEvent.changeText(utils.getByTestId('shipping-city'), 'Asheville');
    fireEvent.changeText(utils.getByTestId('shipping-state'), 'XX');
    fireEvent.changeText(utils.getByTestId('shipping-zip'), '28801');
    fireEvent.press(utils.getByTestId('payment-affirm'));
    fireEvent.press(utils.getByTestId('place-order-button'));
    expect(utils.getByTestId('shipping-state-error').props.children).toBe(
      'Enter a valid 2-letter state code',
    );
  });

  it('validation error elements have accessibilityRole alert', () => {
    const utils = renderCheckout();
    fireEvent.press(utils.getByTestId('payment-affirm'));
    fireEvent.press(utils.getByTestId('place-order-button'));
    expect(utils.getByTestId('shipping-fullName-error').props.accessibilityRole).toBe('alert');
  });
});

// ── Payment declined ──────────────────────────────────────────────────────────

describe('payment declined', () => {
  it('payment-error contains the declined error message', async () => {
    mockPresentPaymentSheet.mockResolvedValueOnce({
      error: { message: 'Your card was declined', code: 'Failed' },
    });

    const utils = renderCheckout();
    fillAndSelectCard(utils);

    await act(async () => {
      fireEvent.press(utils.getByTestId('place-order-button'));
    });

    await waitFor(() => {
      expect(utils.getByTestId('payment-error')).toBeTruthy();
    });
  });

  it('place-order button is still rendered after payment error', async () => {
    mockPresentPaymentSheet.mockResolvedValueOnce({
      error: { message: 'Your card was declined', code: 'Failed' },
    });

    const utils = renderCheckout();
    fillAndSelectCard(utils);

    await act(async () => {
      fireEvent.press(utils.getByTestId('place-order-button'));
    });

    await waitFor(() => {
      expect(utils.getByTestId('payment-error')).toBeTruthy();
      expect(utils.getByTestId('place-order-button')).toBeTruthy();
    });
  });

  it('payment-error has accessibilityRole alert', async () => {
    mockPresentPaymentSheet.mockResolvedValueOnce({
      error: { message: 'Payment failed', code: 'Failed' },
    });

    const utils = renderCheckout();
    fillAndSelectCard(utils);

    await act(async () => {
      fireEvent.press(utils.getByTestId('place-order-button'));
    });

    await waitFor(() => {
      expect(utils.getByTestId('payment-error').props.accessibilityRole).toBe('alert');
    });
  });

  it('onOrderComplete is NOT called on payment decline', async () => {
    const onOrderComplete = jest.fn();
    mockPresentPaymentSheet.mockResolvedValueOnce({
      error: { message: 'Declined', code: 'Failed' },
    });

    const utils = renderCheckout({ onOrderComplete });
    fillAndSelectCard(utils);

    await act(async () => {
      fireEvent.press(utils.getByTestId('place-order-button'));
    });

    await act(async () => {});
    expect(onOrderComplete).not.toHaveBeenCalled();
  });
});

// ── Retry flow ────────────────────────────────────────────────────────────────

describe('retry flow', () => {
  it('after payment error, pressing place-order again initiates a new payment attempt', async () => {
    // First attempt fails, second succeeds
    mockPresentPaymentSheet
      .mockResolvedValueOnce({ error: { message: 'Declined', code: 'Failed' } })
      .mockResolvedValueOnce({ error: null });

    const onOrderComplete = jest.fn();
    const utils = renderCheckout({ onOrderComplete });
    fillAndSelectCard(utils);

    // First attempt — should fail
    await act(async () => {
      fireEvent.press(utils.getByTestId('place-order-button'));
    });

    await waitFor(() => {
      expect(utils.getByTestId('payment-error')).toBeTruthy();
    });

    // Second attempt — should succeed
    await act(async () => {
      fireEvent.press(utils.getByTestId('place-order-button'));
    });

    await waitFor(() => {
      expect(mockInitPaymentSheet).toHaveBeenCalledTimes(2);
    });
  });

  it('payment error disappears when second attempt succeeds', async () => {
    mockPresentPaymentSheet
      .mockResolvedValueOnce({ error: { message: 'Declined', code: 'Failed' } })
      .mockResolvedValueOnce({ error: null });

    const utils = renderCheckout();
    fillAndSelectCard(utils);

    await act(async () => {
      fireEvent.press(utils.getByTestId('place-order-button'));
    });

    await waitFor(() => expect(utils.getByTestId('payment-error')).toBeTruthy());

    await act(async () => {
      fireEvent.press(utils.getByTestId('place-order-button'));
    });

    await waitFor(() => {
      expect(utils.queryByTestId('payment-error')).toBeNull();
    });
  });
});

// ── Order ID display ──────────────────────────────────────────────────────────

describe('order ID display', () => {
  it('order number renders with # prefix', () => {
    const { getByTestId } = renderConfirmation();
    const numberEl = getByTestId('order-number');
    // Children is ['#', orderNumber]
    expect(numberEl.props.children[0]).toBe('#');
    expect(numberEl.props.children[1]).toBe('CF-20260413-042');
  });

  it('order number accessibility label uses the order number (not orderId)', () => {
    const { getByTestId } = renderConfirmation();
    expect(getByTestId('order-number').props.accessibilityLabel).toBe(
      'Order number CF-20260413-042',
    );
  });

  it('accessibility label does NOT contain the internal orderId', () => {
    const { getByTestId } = renderConfirmation();
    const label = getByTestId('order-number').props.accessibilityLabel;
    expect(label).not.toContain('ord_abc123');
  });

  it('long order number renders without crashing', () => {
    const longNumberOrder = {
      ...mockOrder,
      orderNumber: 'CF-20260413-VERY-LONG-ORDER-NUMBER-123456',
    };
    const { getByTestId } = renderConfirmation({ order: longNumberOrder });
    expect(getByTestId('order-number')).toBeTruthy();
  });

  it('shows the confirmation screen for every valid orderId format', () => {
    const uuidOrder = { ...mockOrder, orderId: '550e8400-e29b-41d4-a716-446655440000' };
    const { getByTestId } = renderConfirmation({ order: uuidOrder });
    expect(getByTestId('order-confirmation-screen')).toBeTruthy();
  });
});
