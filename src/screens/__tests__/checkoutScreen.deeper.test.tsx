/**
 * CheckoutScreen deeper edge-case tests — cm-ggn
 *
 * Covers gaps not exercised by checkoutScreen.test.tsx:
 *
 *   Payment error (deeper):
 *     - payment-error absent before any attempt
 *     - payment-error has accessibilityRole="alert" after failure
 *     - initPaymentSheet error message text shown in payment-error
 *     - presentPaymentSheet error message text shown in payment-error
 *     - createPaymentIntent network rejection shows payment-error
 *     - timeout message text contains "Check your email"
 *
 *   Address validation (deeper):
 *     - fullName required: correct error text
 *     - line1 required: correct error text
 *     - city required: correct error text
 *     - state required (empty): "State is required" (vs ZZ → "Enter a valid 2-letter state code")
 *     - zip required (empty): "ZIP code is required"
 *     - all fields empty: multiple error testIDs present simultaneously
 *     - billing fullName required when billing-same-toggle is off
 *
 *   Promo code (deeper):
 *     - promo-discount-row absent before promo applied
 *     - promo-discount-row shown after percent promo applied
 *     - percent discount label shows "Promo (25% off)"
 *     - promo-discount-value shows correct negative amount for percent
 *     - fixed discount cannot drive total below $0.00
 *
 *   Order confirm (deeper):
 *     - onOrderComplete called with the order object on successful card payment
 *     - onOrderComplete NOT called on poll timeout
 *     - cancelCartAbandonmentForOrder called on success
 *     - onOrderComplete receives the correct orderId
 */

/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { CheckoutScreen } from '../CheckoutScreen';
import { CartProvider, useCart } from '@/hooks/useCart';
import { ConnectivityProvider } from '@/hooks/useConnectivity';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { FUTON_MODELS, FABRICS } from '@/data/futons';

// ── Mocks ─────────────────────────────────────────────────────────────────────

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

const mockCancelCartAbandonment = jest.fn().mockResolvedValue(undefined);
jest.mock('@/hooks/useCartAbandonmentReminder', () => ({
  cancelCartAbandonmentForOrder: (...args: any[]) => mockCancelCartAbandonment(...args),
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
const mockIsPlatformPaySupported = jest.fn().mockResolvedValue(false);
const mockConfirmPlatformPayPayment = jest
  .fn()
  .mockResolvedValue({ error: null, paymentIntent: {} });

jest.mock('@stripe/stripe-react-native', () => ({
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
    ButtonType: { Pay: 'Pay' },
    ButtonStyle: { Black: 'Black' },
  },
  StripeProvider: ({ children }: { children: React.ReactNode }) => children,
  PlatformPayButton: ({ onPress, disabled, testID, style }: any) => {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled} testID={testID} style={style}>
        <Text>Apple Pay</Text>
      </TouchableOpacity>
    );
  },
  CardField: ({ onCardChange, testID, style }: any) => {
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

const mockFetchShippingOptions = jest.fn().mockResolvedValue({ success: false, options: [] });
jest.mock('@/services/shippingIntelligenceService', () => ({
  fetchShippingOptions: (...args: any[]) => mockFetchShippingOptions(...args),
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

const mockKlarnaStartCheckout = jest.fn().mockResolvedValue(null);
jest.mock('@/hooks/useKlarnaCheckout', () => ({
  useKlarnaCheckout: () => ({
    status: 'idle',
    error: null,
    order: null,
    startCheckout: mockKlarnaStartCheckout,
    reset: jest.fn(),
  }),
}));

jest.mock('@/hooks/useLoyalty', () => ({
  useLoyalty: () => ({
    tier: 'bronze' as const,
    points: 120,
    nextTier: 'silver' as const,
    pointsToNext: 380,
    progress: 24,
    loading: false,
    error: null,
    refreshPoints: jest.fn(),
  }),
}));

const mockCreatePaymentIntent = jest.fn().mockResolvedValue({
  clientSecret: 'pi_test_secret',
  ephemeralKey: 'ek_test',
  customerId: 'cus_test',
  paymentIntentId: 'pi_test',
});
const mockConfirmOrder = jest.fn().mockResolvedValue({
  orderId: 'order_abc',
  status: 'confirmed',
});

jest.mock('@/services/payment', () => ({
  calculateTotals: (subtotal: number) => {
    const shipping = subtotal >= 499 ? 0 : 49;
    const tax = Math.round(subtotal * 0.07 * 100) / 100;
    const total = subtotal + shipping + tax;
    return { subtotal, shipping, tax, total };
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

// ── Fixtures ──────────────────────────────────────────────────────────────────

const asheville = FUTON_MODELS[0]; // $349
const naturalLinen = FABRICS[0]; // $0
const seed = [{ model: asheville, fabric: naturalLinen, qty: 1 }];

// Asheville $349 + $49 shipping + $24.43 tax = $422.43 total

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
  seedItems?: { model: typeof asheville; fabric: typeof naturalLinen; qty: number }[],
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
  fireEvent.changeText(getByTestId('shipping-fullName'), 'John Doe');
  fireEvent.changeText(getByTestId('shipping-line1'), '123 Main St');
  fireEvent.changeText(getByTestId('shipping-city'), 'Asheville');
  fireEvent.changeText(getByTestId('shipping-state'), 'NC');
  fireEvent.changeText(getByTestId('shipping-zip'), '28801');
}

async function renderAndFillCard(props: Partial<React.ComponentProps<typeof CheckoutScreen>> = {}) {
  const utils = renderCheckout(props, seed);
  await act(async () => {});
  fillShippingAddress(utils);
  fireEvent.press(utils.getByTestId('payment-card'));
  fireEvent.press(utils.getByTestId('card-field-complete-trigger'));
  return utils;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockInitPaymentSheet.mockResolvedValue({ error: null });
  mockPresentPaymentSheet.mockResolvedValue({ error: null });
  mockCreatePaymentIntent.mockResolvedValue({
    clientSecret: 'pi_test_secret',
    ephemeralKey: 'ek_test',
    customerId: 'cus_test',
    paymentIntentId: 'pi_test',
  });
  mockConfirmOrder.mockResolvedValue({ orderId: 'order_abc', status: 'confirmed' });
  mockCancelCartAbandonment.mockResolvedValue(undefined);
});

// ── Payment error (deeper) ────────────────────────────────────────────────────

describe('CheckoutScreen — payment error (deeper)', () => {
  it('payment-error is not shown before any order attempt', async () => {
    const utils = renderCheckout({}, seed);
    await act(async () => {});
    expect(utils.queryByTestId('payment-error')).toBeNull();
  });

  it('payment-error has accessibilityRole="alert" after initPaymentSheet failure', async () => {
    mockInitPaymentSheet.mockResolvedValueOnce({
      error: { message: 'Setup failed', code: 'Failed' },
    });
    const utils = await renderAndFillCard();
    await act(async () => {
      fireEvent.press(utils.getByTestId('place-order-button'));
    });
    await waitFor(() => {
      const el = utils.getByTestId('payment-error');
      expect(el.props.accessibilityRole).toBe('alert');
    });
  });

  it('initPaymentSheet error message text is shown inside payment-error', async () => {
    mockInitPaymentSheet.mockResolvedValueOnce({
      error: { message: 'Card not supported', code: 'Failed' },
    });
    const utils = await renderAndFillCard();
    await act(async () => {
      fireEvent.press(utils.getByTestId('place-order-button'));
    });
    await waitFor(() => {
      expect(utils.getByText('Card not supported')).toBeTruthy();
    });
  });

  it('presentPaymentSheet error message text is shown inside payment-error', async () => {
    mockPresentPaymentSheet.mockResolvedValueOnce({
      error: { message: 'Your card was declined', code: 'Failed' },
    });
    const utils = await renderAndFillCard();
    await act(async () => {
      fireEvent.press(utils.getByTestId('place-order-button'));
    });
    await waitFor(() => {
      expect(utils.getByText('Your card was declined')).toBeTruthy();
    });
  });

  it('createPaymentIntent network rejection shows payment-error', async () => {
    mockCreatePaymentIntent.mockRejectedValueOnce(new Error('Network timeout'));
    const utils = await renderAndFillCard();
    await act(async () => {
      fireEvent.press(utils.getByTestId('place-order-button'));
    });
    await waitFor(() => {
      expect(utils.getByTestId('payment-error')).toBeTruthy();
    });
  });

  it('timeout error text contains "Check your email"', async () => {
    const paymentPoller = require('@/services/paymentPoller');
    const pollSpy = jest
      .spyOn(paymentPoller, 'pollPaymentConfirmation')
      .mockResolvedValueOnce('timeout');

    const utils = await renderAndFillCard();
    await act(async () => {
      fireEvent.press(utils.getByTestId('place-order-button'));
    });

    await waitFor(() => {
      expect(utils.getByText(/Check your email/i)).toBeTruthy();
    });

    pollSpy.mockRestore();
  });
});

// ── Address validation (deeper) ───────────────────────────────────────────────

describe('CheckoutScreen — address validation (deeper)', () => {
  function pressPlaceOrder(utils: ReturnType<typeof renderCheckout>) {
    fireEvent.press(utils.getByTestId('payment-affirm'));
    fireEvent.press(utils.getByTestId('place-order-button'));
  }

  it('empty fullName shows "Full name is required"', () => {
    const utils = renderCheckout({}, seed);
    fireEvent.changeText(utils.getByTestId('shipping-line1'), '123 Main St');
    fireEvent.changeText(utils.getByTestId('shipping-city'), 'Asheville');
    fireEvent.changeText(utils.getByTestId('shipping-state'), 'NC');
    fireEvent.changeText(utils.getByTestId('shipping-zip'), '28801');
    pressPlaceOrder(utils);
    const err = utils.getByTestId('shipping-fullName-error');
    expect(err.props.children).toBe('Full name is required');
  });

  it('empty line1 shows "Street address is required"', () => {
    const utils = renderCheckout({}, seed);
    fireEvent.changeText(utils.getByTestId('shipping-fullName'), 'Jane Doe');
    fireEvent.changeText(utils.getByTestId('shipping-city'), 'Asheville');
    fireEvent.changeText(utils.getByTestId('shipping-state'), 'NC');
    fireEvent.changeText(utils.getByTestId('shipping-zip'), '28801');
    pressPlaceOrder(utils);
    const err = utils.getByTestId('shipping-line1-error');
    expect(err.props.children).toBe('Street address is required');
  });

  it('empty city shows "City is required"', () => {
    const utils = renderCheckout({}, seed);
    fireEvent.changeText(utils.getByTestId('shipping-fullName'), 'Jane Doe');
    fireEvent.changeText(utils.getByTestId('shipping-line1'), '123 Main St');
    fireEvent.changeText(utils.getByTestId('shipping-state'), 'NC');
    fireEvent.changeText(utils.getByTestId('shipping-zip'), '28801');
    pressPlaceOrder(utils);
    const err = utils.getByTestId('shipping-city-error');
    expect(err.props.children).toBe('City is required');
  });

  it('empty state shows "State is required" (not the 2-letter format error)', () => {
    const utils = renderCheckout({}, seed);
    fireEvent.changeText(utils.getByTestId('shipping-fullName'), 'Jane Doe');
    fireEvent.changeText(utils.getByTestId('shipping-line1'), '123 Main St');
    fireEvent.changeText(utils.getByTestId('shipping-city'), 'Asheville');
    fireEvent.changeText(utils.getByTestId('shipping-zip'), '28801');
    pressPlaceOrder(utils);
    const err = utils.getByTestId('shipping-state-error');
    expect(err.props.children).toBe('State is required');
  });

  it('empty zip shows "ZIP code is required" (not format error)', () => {
    const utils = renderCheckout({}, seed);
    fireEvent.changeText(utils.getByTestId('shipping-fullName'), 'Jane Doe');
    fireEvent.changeText(utils.getByTestId('shipping-line1'), '123 Main St');
    fireEvent.changeText(utils.getByTestId('shipping-city'), 'Asheville');
    fireEvent.changeText(utils.getByTestId('shipping-state'), 'NC');
    pressPlaceOrder(utils);
    const err = utils.getByTestId('shipping-zip-error');
    expect(err.props.children).toBe('ZIP code is required');
  });

  it('all fields empty shows multiple errors simultaneously', () => {
    const utils = renderCheckout({}, seed);
    pressPlaceOrder(utils);
    expect(utils.getByTestId('shipping-fullName-error')).toBeTruthy();
    expect(utils.getByTestId('shipping-line1-error')).toBeTruthy();
    expect(utils.getByTestId('shipping-city-error')).toBeTruthy();
    expect(utils.getByTestId('shipping-state-error')).toBeTruthy();
    expect(utils.getByTestId('shipping-zip-error')).toBeTruthy();
  });

  it('billing fullName required when billing-same-toggle is off', () => {
    const utils = renderCheckout({}, seed);
    fillShippingAddress(utils);
    // Turn off "billing same as shipping"
    fireEvent(utils.getByTestId('billing-same-toggle'), 'valueChange', false);
    // Billing form visible but empty — pressing place order should show billing error
    pressPlaceOrder(utils);
    expect(utils.getByTestId('billing-fullName-error')).toBeTruthy();
    const err = utils.getByTestId('billing-fullName-error');
    expect(err.props.children).toBe('Full name is required');
  });
});

// ── Promo code (deeper) ───────────────────────────────────────────────────────

describe('CheckoutScreen — promo code (deeper)', () => {
  function mockPromoClient(discount: number, type: 'percent' | 'fixed') {
    const wixService = require('@/services/wix');
    jest.spyOn(wixService, 'useOptionalWixClient').mockReturnValue({
      createPaymentIntent: jest.fn(),
      confirmOrder: jest.fn(),
      callFunction: jest.fn().mockResolvedValue({ valid: true, discount, type }),
    });
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('promo-discount-row is absent before any promo is applied', async () => {
    const { queryByTestId } = renderCheckout({}, seed);
    await act(async () => {});
    expect(queryByTestId('promo-discount-row')).toBeNull();
  });

  it('promo-discount-row appears after a percent promo is applied', async () => {
    mockPromoClient(25, 'percent');
    const { getByTestId, getByText } = renderCheckout({}, seed);

    await waitFor(() => expect(getByText(/add promo code/i)).toBeTruthy());
    fireEvent.press(getByText(/add promo code/i));
    fireEvent.changeText(getByTestId('promo-input'), 'SAVE25');
    fireEvent.press(getByTestId('promo-apply-btn'));

    await waitFor(() => expect(getByTestId('promo-discount-row')).toBeTruthy());
  });

  it('percent discount label shows "Promo (25% off)"', async () => {
    mockPromoClient(25, 'percent');
    const { getByTestId, getByText } = renderCheckout({}, seed);

    await waitFor(() => expect(getByText(/add promo code/i)).toBeTruthy());
    fireEvent.press(getByText(/add promo code/i));
    fireEvent.changeText(getByTestId('promo-input'), 'SAVE25');
    fireEvent.press(getByTestId('promo-apply-btn'));

    await waitFor(() => expect(getByTestId('promo-discount-row')).toBeTruthy());
    expect(getByText(/Promo \(25%/)).toBeTruthy();
  });

  it('promo-discount-value shows correct negative amount for 25% discount', async () => {
    // total = $422.43, 25% of $422.43 = $105.61
    mockPromoClient(25, 'percent');
    const { getByTestId, getByText } = renderCheckout({}, seed);

    await waitFor(() => expect(getByText(/add promo code/i)).toBeTruthy());
    fireEvent.press(getByText(/add promo code/i));
    fireEvent.changeText(getByTestId('promo-input'), 'SAVE25');
    fireEvent.press(getByTestId('promo-apply-btn'));

    await waitFor(() => expect(getByTestId('promo-discount-value')).toBeTruthy());
    expect(getByTestId('promo-discount-value').props.children).toBe('-$105.61');
  });

  it('fixed discount of $1000 clamps total to $0.00 (never negative)', async () => {
    // total = $422.43; Math.max(0, 422.43 - 1000) = 0
    mockPromoClient(1000, 'fixed');
    const { getByTestId, getByText } = renderCheckout({}, seed);

    await waitFor(() => expect(getByText(/add promo code/i)).toBeTruthy());
    fireEvent.press(getByText(/add promo code/i));
    fireEvent.changeText(getByTestId('promo-input'), 'MEGA');
    fireEvent.press(getByTestId('promo-apply-btn'));

    await waitFor(() => expect(getByTestId('checkout-total')).toBeTruthy());
    expect(getByTestId('checkout-total').props.children).toBe('$0.00');
  });
});

// ── Order confirm (deeper) ────────────────────────────────────────────────────

describe('CheckoutScreen — order confirm (deeper)', () => {
  it('onOrderComplete is called with the order object on successful card payment', async () => {
    const onOrderComplete = jest.fn();
    const utils = await renderAndFillCard({ onOrderComplete });

    await act(async () => {
      fireEvent.press(utils.getByTestId('place-order-button'));
    });

    await waitFor(() => {
      expect(onOrderComplete).toHaveBeenCalledTimes(1);
    });

    const [order] = onOrderComplete.mock.calls[0];
    expect(order).toBeDefined();
    expect(typeof order.orderId).toBe('string');
  });

  it('onOrderComplete receives the orderId returned by confirmOrder', async () => {
    mockConfirmOrder.mockResolvedValueOnce({ orderId: 'order-xyz-789', status: 'confirmed' });
    const onOrderComplete = jest.fn();
    const utils = await renderAndFillCard({ onOrderComplete });

    await act(async () => {
      fireEvent.press(utils.getByTestId('place-order-button'));
    });

    await waitFor(() => expect(onOrderComplete).toHaveBeenCalled());
    expect(onOrderComplete.mock.calls[0][0].orderId).toBe('order-xyz-789');
  });

  it('onOrderComplete is NOT called on poll timeout', async () => {
    const paymentPoller = require('@/services/paymentPoller');
    const pollSpy = jest
      .spyOn(paymentPoller, 'pollPaymentConfirmation')
      .mockResolvedValueOnce('timeout');

    const onOrderComplete = jest.fn();
    const utils = await renderAndFillCard({ onOrderComplete });

    await act(async () => {
      fireEvent.press(utils.getByTestId('place-order-button'));
    });

    await act(async () => {});
    expect(onOrderComplete).not.toHaveBeenCalled();
    pollSpy.mockRestore();
  });

  it('cancelCartAbandonmentForOrder is called after successful payment', async () => {
    const utils = await renderAndFillCard();

    await act(async () => {
      fireEvent.press(utils.getByTestId('place-order-button'));
    });

    await waitFor(() => {
      expect(mockCancelCartAbandonment).toHaveBeenCalledTimes(1);
    });
  });
});
