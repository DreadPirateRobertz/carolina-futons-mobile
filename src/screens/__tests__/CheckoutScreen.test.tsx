import React from 'react';
import { Platform } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { CheckoutScreen } from '../CheckoutScreen';
import { CartProvider, useCart } from '@/hooks/useCart';
import { ConnectivityProvider } from '@/hooks/useConnectivity';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { FUTON_MODELS, FABRICS } from '@/data/futons';
import { typography } from '@/theme/tokens';

const mockPremiumValue = {
  isPremium: false,
  isLoading: false,
  offerings: [],
  error: null,
  purchase: jest.fn(),
  restore: jest.fn(),
  refreshStatus: jest.fn(),
};

jest.mock('@/hooks/usePremium', () => ({
  PremiumProvider: ({ children }: any) => children,
  usePremium: () => mockPremiumValue,
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: 'Medium' },
  NotificationFeedbackType: { Success: 'Success' },
}));

// Mock analytics
jest.mock('@/services/analytics', () => ({
  events: {
    beginCheckout: jest.fn(),
    purchase: jest.fn(),
  },
}));

// Mock address book
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
const mockIsPlatformPaySupported = jest.fn().mockResolvedValue(true);
const mockConfirmPlatformPayPayment = jest.fn().mockResolvedValue({ error: null, paymentIntent: {} });

// Mock @stripe/stripe-react-native
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
  PlatformPayButton: ({
    onPress,
    disabled,
    testID,
    style,
  }: {
    onPress: () => void;
    disabled?: boolean;
    testID?: string;
    style?: object;
  }) => {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled} testID={testID} style={style}>
        <Text>Apple Pay</Text>
      </TouchableOpacity>
    );
  },
  CardField: ({
    onCardChange,
    testID,
    style,
  }: {
    onCardChange?: (details: { complete: boolean }) => void;
    testID?: string;
    style?: object;
  }) => {
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

// Mock useWixClient
jest.mock('@/services/wix', () => ({
  useWixClient: () => ({ createPaymentIntent: jest.fn(), confirmOrder: jest.fn() }),
}));

const mockCreatePaymentIntent = jest.fn().mockResolvedValue({
  clientSecret: 'pi_test_secret',
  ephemeralKey: 'ek_test',
  customerId: 'cus_test',
  paymentIntentId: 'pi_test',
});
const mockConfirmOrder = jest.fn().mockResolvedValue({
  orderId: 'order_123',
  status: 'confirmed',
});

// Mock the payment service
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

const asheville = FUTON_MODELS[0]; // $349
const blueRidge = FUTON_MODELS[1]; // $449
const naturalLinen = FABRICS[0]; // $0
const mountainBlue = FABRICS[2]; // $29

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

const seed = [{ model: asheville, fabric: naturalLinen, qty: 1 }];

function fillShippingAddress(utils: ReturnType<typeof renderCheckout>) {
  const { getByTestId } = utils;
  fireEvent.changeText(getByTestId('shipping-fullName'), 'John Doe');
  fireEvent.changeText(getByTestId('shipping-line1'), '123 Main St');
  fireEvent.changeText(getByTestId('shipping-city'), 'Asheville');
  fireEvent.changeText(getByTestId('shipping-state'), 'NC');
  fireEvent.changeText(getByTestId('shipping-zip'), '28801');
}

describe('CheckoutScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreatePaymentIntent.mockResolvedValue({
      clientSecret: 'pi_test_secret',
      ephemeralKey: 'ek_test',
      customerId: 'cus_test',
      paymentIntentId: 'pi_test',
    });
    mockConfirmOrder.mockResolvedValue({
      orderId: 'order_123',
      status: 'confirmed',
    });
    mockInitPaymentSheet.mockResolvedValue({ error: null });
    mockPresentPaymentSheet.mockResolvedValue({ error: null });
  });

  describe('Rendering', () => {
    it('renders with default testID', () => {
      const { getByTestId } = renderCheckout({}, seed);
      expect(getByTestId('checkout-screen')).toBeTruthy();
    });

    it('accepts custom testID', () => {
      const { getByTestId } = renderCheckout({ testID: 'my-checkout' }, seed);
      expect(getByTestId('my-checkout')).toBeTruthy();
    });

    it('shows checkout header', () => {
      const { getByTestId } = renderCheckout({}, seed);
      expect(getByTestId('checkout-header')).toBeTruthy();
    });
  });

  describe('Back button', () => {
    it('renders back button when onBack provided', () => {
      const { getByTestId } = renderCheckout({ onBack: jest.fn() }, seed);
      expect(getByTestId('checkout-back-button')).toBeTruthy();
    });

    it('does not render back button when onBack not provided', () => {
      const { queryByTestId } = renderCheckout({}, seed);
      expect(queryByTestId('checkout-back-button')).toBeNull();
    });

    it('calls onBack when pressed', () => {
      const onBack = jest.fn();
      const { getByTestId } = renderCheckout({ onBack }, seed);
      fireEvent.press(getByTestId('checkout-back-button'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Shipping address form', () => {
    it('renders shipping address section', () => {
      const { getByTestId } = renderCheckout({}, seed);
      expect(getByTestId('shipping-address-title')).toBeTruthy();
      expect(getByTestId('shipping-form')).toBeTruthy();
    });

    it('renders all shipping address fields', () => {
      const { getByTestId } = renderCheckout({}, seed);
      expect(getByTestId('shipping-fullName')).toBeTruthy();
      expect(getByTestId('shipping-line1')).toBeTruthy();
      expect(getByTestId('shipping-line2')).toBeTruthy();
      expect(getByTestId('shipping-city')).toBeTruthy();
      expect(getByTestId('shipping-state')).toBeTruthy();
      expect(getByTestId('shipping-zip')).toBeTruthy();
    });

    it('updates shipping address fields on input', () => {
      const { getByTestId } = renderCheckout({}, seed);
      fireEvent.changeText(getByTestId('shipping-fullName'), 'Jane Doe');
      expect(getByTestId('shipping-fullName').props.value).toBe('Jane Doe');
    });

    it('uppercases state input', () => {
      const { getByTestId } = renderCheckout({}, seed);
      fireEvent.changeText(getByTestId('shipping-state'), 'nc');
      expect(getByTestId('shipping-state').props.value).toBe('NC');
    });
  });

  describe('Billing / shipping toggle', () => {
    it('shows billing toggle defaulting to on', () => {
      const { getByTestId } = renderCheckout({}, seed);
      const toggle = getByTestId('billing-same-toggle');
      expect(toggle.props.value).toBe(true);
    });

    it('does not show billing form when toggle is on', () => {
      const { queryByTestId } = renderCheckout({}, seed);
      expect(queryByTestId('billing-address-title')).toBeNull();
      expect(queryByTestId('billing-form')).toBeNull();
    });

    it('shows billing form when toggle is off', () => {
      const { getByTestId } = renderCheckout({}, seed);
      fireEvent(getByTestId('billing-same-toggle'), 'valueChange', false);
      expect(getByTestId('billing-address-title')).toBeTruthy();
      expect(getByTestId('billing-form')).toBeTruthy();
    });

    it('hides billing form when toggle is turned back on', () => {
      const { getByTestId, queryByTestId } = renderCheckout({}, seed);
      fireEvent(getByTestId('billing-same-toggle'), 'valueChange', false);
      expect(getByTestId('billing-form')).toBeTruthy();
      fireEvent(getByTestId('billing-same-toggle'), 'valueChange', true);
      expect(queryByTestId('billing-form')).toBeNull();
    });
  });

  describe('Order items', () => {
    it('shows checkout items', () => {
      const { getByTestId } = renderCheckout({}, seed);
      expect(getByTestId('checkout-item-asheville-full:natural-linen')).toBeTruthy();
    });

    it('shows multiple items', () => {
      const multi = [
        { model: asheville, fabric: naturalLinen, qty: 1 },
        { model: blueRidge, fabric: mountainBlue, qty: 2 },
      ];
      const { getByTestId } = renderCheckout({}, multi);
      expect(getByTestId('checkout-item-asheville-full:natural-linen')).toBeTruthy();
      expect(getByTestId('checkout-item-blue-ridge-queen:mountain-blue')).toBeTruthy();
    });
  });

  describe('Totals', () => {
    it('shows totals card', () => {
      const { getByTestId } = renderCheckout({}, seed);
      expect(getByTestId('checkout-totals')).toBeTruthy();
    });

    it('shows correct total', () => {
      const { getByTestId } = renderCheckout({}, seed);
      // $349 + $49 shipping + $24.43 tax = $422.43
      expect(getByTestId('checkout-total').props.children).toBe('$422.43');
    });
  });

  describe('Payment methods', () => {
    it('renders credit card payment option', () => {
      const { getByTestId } = renderCheckout({}, seed);
      expect(getByTestId('payment-card')).toBeTruthy();
    });

    it('renders Affirm payment option', () => {
      const { getByTestId } = renderCheckout({}, seed);
      expect(getByTestId('payment-affirm')).toBeTruthy();
    });

    it('renders Klarna payment option', () => {
      const { getByTestId } = renderCheckout({}, seed);
      expect(getByTestId('payment-klarna')).toBeTruthy();
    });

    it('selects payment method on press', () => {
      const { getByTestId } = renderCheckout({}, seed);
      const affirm = getByTestId('payment-affirm');
      fireEvent.press(affirm);
      expect(affirm.props.accessibilityState).toMatchObject({ selected: true });
    });

    it('deselects previous method when new one selected', () => {
      const { getByTestId } = renderCheckout({}, seed);
      fireEvent.press(getByTestId('payment-affirm'));
      fireEvent.press(getByTestId('payment-card'));
      expect(getByTestId('payment-affirm').props.accessibilityState).toMatchObject({
        selected: false,
      });
      expect(getByTestId('payment-card').props.accessibilityState).toMatchObject({
        selected: true,
      });
    });

    it('payment options have accessibility role radio', () => {
      const { getByTestId } = renderCheckout({}, seed);
      expect(getByTestId('payment-card').props.accessibilityRole).toBe('radio');
    });
  });

  describe('Stripe CardField', () => {
    it('does not show card field when no method selected', () => {
      const { queryByTestId } = renderCheckout({}, seed);
      expect(queryByTestId('card-field-section')).toBeNull();
    });

    it('shows card field when card method selected', () => {
      const { getByTestId } = renderCheckout({}, seed);
      fireEvent.press(getByTestId('payment-card'));
      expect(getByTestId('card-field-section')).toBeTruthy();
      expect(getByTestId('stripe-card-field')).toBeTruthy();
    });

    it('does not show card field when BNPL selected', () => {
      const { getByTestId, queryByTestId } = renderCheckout({}, seed);
      fireEvent.press(getByTestId('payment-affirm'));
      expect(queryByTestId('card-field-section')).toBeNull();
    });

    it('hides card field when switching from card to BNPL', () => {
      const { getByTestId, queryByTestId } = renderCheckout({}, seed);
      fireEvent.press(getByTestId('payment-card'));
      expect(getByTestId('card-field-section')).toBeTruthy();
      fireEvent.press(getByTestId('payment-klarna'));
      expect(queryByTestId('card-field-section')).toBeNull();
    });
  });

  describe('Form validation', () => {
    it('shows shipping validation errors when submitting empty address', () => {
      const utils = renderCheckout({}, seed);
      const { getByTestId } = utils;
      fireEvent.press(getByTestId('payment-card'));
      fireEvent.press(getByTestId('card-field-complete-trigger'));
      fireEvent.press(getByTestId('place-order-button'));

      expect(getByTestId('shipping-fullName-error')).toBeTruthy();
      expect(getByTestId('shipping-line1-error')).toBeTruthy();
      expect(getByTestId('shipping-city-error')).toBeTruthy();
      expect(getByTestId('shipping-state-error')).toBeTruthy();
      expect(getByTestId('shipping-zip-error')).toBeTruthy();
    });

    it('validates ZIP code format', () => {
      const utils = renderCheckout({}, seed);
      const { getByTestId } = utils;
      fireEvent.press(getByTestId('payment-affirm'));

      fireEvent.changeText(getByTestId('shipping-fullName'), 'John Doe');
      fireEvent.changeText(getByTestId('shipping-line1'), '123 Main St');
      fireEvent.changeText(getByTestId('shipping-city'), 'Asheville');
      fireEvent.changeText(getByTestId('shipping-state'), 'NC');
      fireEvent.changeText(getByTestId('shipping-zip'), 'abc');

      fireEvent.press(getByTestId('place-order-button'));
      expect(getByTestId('shipping-zip-error')).toBeTruthy();
    });

    it('validates state code', () => {
      const utils = renderCheckout({}, seed);
      const { getByTestId } = utils;
      fireEvent.press(getByTestId('payment-affirm'));

      fireEvent.changeText(getByTestId('shipping-fullName'), 'John Doe');
      fireEvent.changeText(getByTestId('shipping-line1'), '123 Main St');
      fireEvent.changeText(getByTestId('shipping-city'), 'Asheville');
      fireEvent.changeText(getByTestId('shipping-state'), 'XX');
      fireEvent.changeText(getByTestId('shipping-zip'), '28801');

      fireEvent.press(getByTestId('place-order-button'));
      expect(getByTestId('shipping-state-error')).toBeTruthy();
    });

    it('shows card error when card method selected but incomplete', () => {
      const utils = renderCheckout({}, seed);
      const { getByTestId } = utils;
      fillShippingAddress(utils);
      fireEvent.press(getByTestId('payment-card'));
      fireEvent.press(getByTestId('place-order-button'));

      expect(getByTestId('card-field-error')).toBeTruthy();
    });

    it('clears card error when card becomes complete', () => {
      const utils = renderCheckout({}, seed);
      const { getByTestId, queryByTestId } = utils;
      fillShippingAddress(utils);
      fireEvent.press(getByTestId('payment-card'));
      fireEvent.press(getByTestId('place-order-button'));
      expect(getByTestId('card-field-error')).toBeTruthy();

      fireEvent.press(getByTestId('card-field-complete-trigger'));
      expect(queryByTestId('card-field-error')).toBeNull();
    });

    it('validates billing address when toggle is off', () => {
      const utils = renderCheckout({}, seed);
      const { getByTestId } = utils;
      fillShippingAddress(utils);
      fireEvent.press(getByTestId('payment-affirm'));

      // Turn off billing same as shipping
      fireEvent(getByTestId('billing-same-toggle'), 'valueChange', false);

      fireEvent.press(getByTestId('place-order-button'));

      expect(getByTestId('billing-fullName-error')).toBeTruthy();
      expect(getByTestId('billing-line1-error')).toBeTruthy();
      expect(getByTestId('billing-city-error')).toBeTruthy();
      expect(getByTestId('billing-state-error')).toBeTruthy();
      expect(getByTestId('billing-zip-error')).toBeTruthy();
    });

    it('does not validate billing address when toggle is on', () => {
      const utils = renderCheckout({}, seed);
      const { getByTestId, queryByTestId } = utils;
      fillShippingAddress(utils);
      fireEvent.press(getByTestId('payment-affirm'));

      fireEvent.press(getByTestId('place-order-button'));

      expect(queryByTestId('billing-fullName-error')).toBeNull();
    });

    it('clears field error when user types in that field', () => {
      const utils = renderCheckout({}, seed);
      const { getByTestId, queryByTestId } = utils;
      fireEvent.press(getByTestId('payment-affirm'));
      fireEvent.press(getByTestId('place-order-button'));

      expect(getByTestId('shipping-fullName-error')).toBeTruthy();

      fireEvent.changeText(getByTestId('shipping-fullName'), 'J');
      expect(queryByTestId('shipping-fullName-error')).toBeNull();
    });
  });

  describe('BNPL breakdown', () => {
    it('does not show BNPL breakdown when no method selected', () => {
      const { queryByTestId } = renderCheckout({}, seed);
      expect(queryByTestId('bnpl-breakdown')).toBeNull();
    });

    it('shows BNPL breakdown when Affirm selected', () => {
      const { getByTestId } = renderCheckout({}, seed);
      fireEvent.press(getByTestId('payment-affirm'));
      expect(getByTestId('bnpl-breakdown')).toBeTruthy();
    });

    it('shows BNPL breakdown when Klarna selected', () => {
      const { getByTestId } = renderCheckout({}, seed);
      fireEvent.press(getByTestId('payment-klarna'));
      expect(getByTestId('bnpl-breakdown')).toBeTruthy();
    });

    it('hides BNPL breakdown when card selected', () => {
      const { getByTestId, queryByTestId } = renderCheckout({}, seed);
      fireEvent.press(getByTestId('payment-affirm'));
      expect(getByTestId('bnpl-breakdown')).toBeTruthy();
      fireEvent.press(getByTestId('payment-card'));
      expect(queryByTestId('bnpl-breakdown')).toBeNull();
    });
  });

  describe('Visual polish — warm sand + tokenized typography', () => {
    it('header title uses heading fontFamily', () => {
      const { getByTestId } = renderCheckout({}, seed);
      const header = getByTestId('checkout-header');
      const styles = Array.isArray(header.props.style)
        ? Object.assign({}, ...header.props.style)
        : header.props.style;
      expect(styles.fontFamily).toBe(typography.headingFamily);
    });

    it('section titles use body semibold fontFamily', () => {
      const { getByTestId } = renderCheckout({}, seed);
      const section = getByTestId('checkout-items-section-title');
      const styles = Array.isArray(section.props.style)
        ? Object.assign({}, ...section.props.style)
        : section.props.style;
      expect(styles.fontFamily).toBe(typography.bodyFamilySemiBold);
    });

    it('grand total uses heading fontFamily', () => {
      const { getByTestId } = renderCheckout({}, seed);
      const total = getByTestId('checkout-total');
      const styles = Array.isArray(total.props.style)
        ? Object.assign({}, ...total.props.style)
        : total.props.style;
      expect(styles.fontFamily).toBe(typography.headingFamily);
    });
  });

  describe('Place order button', () => {
    it('is disabled when no payment method selected', () => {
      const { getByTestId } = renderCheckout({}, seed);
      const btn = getByTestId('place-order-button');
      expect(btn.props.accessibilityState).toMatchObject({ disabled: true });
    });

    it('is enabled when payment method selected', () => {
      const { getByTestId } = renderCheckout({}, seed);
      fireEvent.press(getByTestId('payment-card'));
      const btn = getByTestId('place-order-button');
      expect(btn.props.accessibilityState).toMatchObject({ disabled: false });
    });

    it('shows total in button text when method selected', () => {
      const { getByTestId, getByText } = renderCheckout({}, seed);
      fireEvent.press(getByTestId('payment-card'));
      expect(getByText('Place Order — $422.43')).toBeTruthy();
    });

    it('shows "Select Payment Method" when no method selected', () => {
      const { getByText } = renderCheckout({}, seed);
      expect(getByText('Select Payment Method')).toBeTruthy();
    });
  });

  describe('Place order — payment submission', () => {
    function fillAndSelectCard(utils: ReturnType<typeof renderCheckout>) {
      fillShippingAddress(utils);
      fireEvent.press(utils.getByTestId('payment-card'));
      fireEvent.press(utils.getByTestId('card-field-complete-trigger'));
    }

    function fillAndSelectBNPL(utils: ReturnType<typeof renderCheckout>, method: 'affirm' | 'klarna' = 'affirm') {
      fillShippingAddress(utils);
      fireEvent.press(utils.getByTestId(`payment-${method}`));
    }

    it('calls processPayment through Stripe when Place Order pressed', async () => {
      const utils = renderCheckout({}, seed);
      fillAndSelectCard(utils);

      await act(async () => {
        fireEvent.press(utils.getByTestId('place-order-button'));
      });

      expect(mockCreatePaymentIntent).toHaveBeenCalledTimes(1);
      expect(mockInitPaymentSheet).toHaveBeenCalledTimes(1);
      expect(mockPresentPaymentSheet).toHaveBeenCalledTimes(1);
      expect(mockConfirmOrder).toHaveBeenCalledTimes(1);
    });

    it('calls onOrderComplete with confirmation on success', async () => {
      const onOrderComplete = jest.fn();
      const utils = renderCheckout({ onOrderComplete }, seed);
      fillAndSelectCard(utils);

      await act(async () => {
        fireEvent.press(utils.getByTestId('place-order-button'));
      });

      expect(onOrderComplete).toHaveBeenCalledWith({
        orderId: 'order_123',
        status: 'confirmed',
      });
    });

    it('does not submit when no payment method is selected', async () => {
      const { getByTestId } = renderCheckout({}, seed);

      await act(async () => {
        fireEvent.press(getByTestId('place-order-button'));
      });

      expect(mockCreatePaymentIntent).not.toHaveBeenCalled();
    });

    it('shows processing state while payment is in flight', async () => {
      let resolvePayment!: (v: any) => void;
      mockCreatePaymentIntent.mockReturnValue(
        new Promise((resolve) => { resolvePayment = resolve; }),
      );

      const utils = renderCheckout({}, seed);
      fillAndSelectCard(utils);

      await act(async () => {
        fireEvent.press(utils.getByTestId('place-order-button'));
      });

      // Button should show processing state
      expect(utils.getByText('Processing...')).toBeTruthy();
      expect(utils.getByTestId('place-order-button').props.accessibilityState).toMatchObject({
        disabled: true,
      });

      // Resolve to clean up
      await act(async () => {
        resolvePayment({
          clientSecret: 'pi_test_secret',
          ephemeralKey: 'ek_test',
          customerId: 'cus_test',
          paymentIntentId: 'pi_test',
        });
      });
    });

    it('shows error message when payment fails', async () => {
      const { PaymentError } = jest.requireMock('@/services/payment');
      mockCreatePaymentIntent.mockRejectedValue(
        new PaymentError('Card declined', 'STRIPE_ERROR'),
      );

      const utils = renderCheckout({}, seed);
      fillAndSelectCard(utils);

      await act(async () => {
        fireEvent.press(utils.getByTestId('place-order-button'));
      });

      await waitFor(() => {
        expect(utils.getByTestId('payment-error')).toBeTruthy();
      });
    });

    it('does not call onOrderComplete on payment failure', async () => {
      const { PaymentError } = jest.requireMock('@/services/payment');
      mockCreatePaymentIntent.mockRejectedValue(
        new PaymentError('Card declined', 'STRIPE_ERROR'),
      );
      const onOrderComplete = jest.fn();

      const utils = renderCheckout({ onOrderComplete }, seed);
      fillAndSelectCard(utils);

      await act(async () => {
        fireEvent.press(utils.getByTestId('place-order-button'));
      });

      expect(onOrderComplete).not.toHaveBeenCalled();
    });

    it('resets to idle when user cancels Stripe payment sheet', async () => {
      mockPresentPaymentSheet.mockResolvedValue({
        error: { code: 'Canceled', message: 'User cancelled' },
      });

      const utils = renderCheckout({}, seed);
      fillAndSelectCard(utils);

      await act(async () => {
        fireEvent.press(utils.getByTestId('place-order-button'));
      });

      // Should return to idle — no error, button shows total again
      expect(utils.queryByTestId('payment-error')).toBeNull();
      expect(utils.getByText(/Place Order/)).toBeTruthy();
    });

    it('passes selected payment method through to confirmOrder', async () => {
      const utils = renderCheckout({}, seed);
      fillAndSelectBNPL(utils, 'affirm');

      await act(async () => {
        fireEvent.press(utils.getByTestId('place-order-button'));
      });

      expect(mockConfirmOrder).toHaveBeenCalledWith(
        expect.any(Object), // WixClient
        'pi_test',
        expect.any(Array),
        expect.any(Object),
        'affirm',
      );
    });
  });

  describe('Google Pay button (Android)', () => {
    const originalPlatform = Platform.OS;

    beforeEach(() => {
      (Platform as any).OS = 'android';
    });

    afterEach(() => {
      (Platform as any).OS = originalPlatform;
    });

    it('renders Google Pay button on Android when supported', async () => {
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      expect(utils.getByTestId('google-pay-section')).toBeTruthy();
      expect(utils.getByTestId('google-pay-button')).toBeTruthy();
    });

    it('does not render Apple Pay button on Android', async () => {
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      expect(utils.queryByTestId('apple-pay-section')).toBeNull();
    });

    it('calls processPayment with google-pay when Google Pay button pressed', async () => {
      const onOrderComplete = jest.fn();
      const utils = renderCheckout({ onOrderComplete }, seed);
      fillShippingAddress(utils);
      await act(async () => {});

      await act(async () => {
        fireEvent.press(utils.getByTestId('google-pay-button'));
      });

      expect(mockCreatePaymentIntent).toHaveBeenCalledTimes(1);
      expect(mockConfirmPlatformPayPayment).toHaveBeenCalledTimes(1);
    });

    it('does not render Google Pay when not supported', async () => {
      mockIsPlatformPaySupported.mockResolvedValue(false);
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      expect(utils.queryByTestId('google-pay-section')).toBeNull();
    });
  });

  describe('Premium badge indicators', () => {
    const seed = [{ model: asheville, fabric: naturalLinen, qty: 1 }];

    afterEach(() => {
      mockPremiumValue.isPremium = false;
    });

    it('shows CF+ badge on shipping line when user is premium', async () => {
      mockPremiumValue.isPremium = true;
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      expect(utils.getByTestId('shipping-premium-badge')).toBeTruthy();
    });

    it('does not show CF+ badge on shipping line when user is not premium', async () => {
      mockPremiumValue.isPremium = false;
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      expect(utils.queryByTestId('shipping-premium-badge')).toBeNull();
    });
  });
});
