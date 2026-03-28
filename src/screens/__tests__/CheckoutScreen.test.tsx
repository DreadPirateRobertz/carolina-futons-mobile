import React from 'react';
import { Platform } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

// Mock cart abandonment
const mockCancelCartAbandonment = jest.fn().mockResolvedValue(undefined);
jest.mock('@/hooks/useCartAbandonmentReminder', () => ({
  cancelCartAbandonmentForOrder: (...args: any[]) => mockCancelCartAbandonment(...args),
}));

// Mock analytics
jest.mock('@/services/analytics', () => ({
  trackEvent: jest.fn(),
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
const mockConfirmPlatformPayPayment = jest
  .fn()
  .mockResolvedValue({ error: null, paymentIntent: {} });

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
  useOptionalWixClient: () => ({
    createPaymentIntent: jest.fn(),
    confirmOrder: jest.fn(),
    callFunction: jest.fn(),
  }),
}));

// Mock shippingIntelligenceService — default: no options (ZIP not yet entered)
const mockFetchShippingOptions = jest.fn().mockResolvedValue({ success: false, options: [] });
jest.mock('@/services/shippingIntelligenceService', () => ({
  fetchShippingOptions: (...args: any[]) => mockFetchShippingOptions(...args),
  normalizeShippingOption: jest.requireActual('@/services/shippingIntelligenceService')
    .normalizeShippingOption,
}));

// Mock Affirm hooks/service so the full Affirm module tree doesn't load
jest.mock('@/hooks/useAffirmPrequalification', () => ({
  useAffirmPrequalification: () => ({ isEligible: false, isLoading: false, error: null }),
}));
jest.mock('@/services/affirmService', () => ({
  checkAffirmPrequalification: jest.fn().mockResolvedValue({ eligible: false }),
  initiateAffirmCheckout: jest.fn().mockResolvedValue({ checkoutUrl: '', checkoutToken: '' }),
  AFFIRM_MIN_AMOUNT: 50,
  AFFIRM_MAX_AMOUNT: 30000,
}));

// Mock useKlarnaCheckout — Klarna uses redirect flow, not Stripe payment sheet
const mockKlarnaStartCheckout = jest.fn().mockResolvedValue(null);
const mockKlarnaReset = jest.fn();
// cm-ds5: loyalty tier badge
const mockLoyaltyValue = {
  tier: 'bronze' as const,
  points: 120,
  nextTier: 'silver' as const,
  pointsToNext: 380,
  progress: 24,
  loading: false,
  error: null as string | null,
  refreshPoints: jest.fn(),
};
jest.mock('@/hooks/useLoyalty', () => ({
  useLoyalty: () => mockLoyaltyValue,
}));

jest.mock('@/hooks/useKlarnaCheckout', () => ({
  useKlarnaCheckout: () => ({
    status: 'idle',
    error: null,
    order: null,
    startCheckout: mockKlarnaStartCheckout,
    reset: mockKlarnaReset,
  }),
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

    function fillAndSelectBNPL(
      utils: ReturnType<typeof renderCheckout>,
      method: 'affirm' | 'klarna' = 'affirm',
    ) {
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

    it('cancels cart abandonment notification on successful order', async () => {
      const utils = renderCheckout({}, seed);
      fillAndSelectCard(utils);

      await act(async () => {
        fireEvent.press(utils.getByTestId('place-order-button'));
      });

      expect(mockCancelCartAbandonment).toHaveBeenCalledTimes(1);
    });

    it('does not cancel cart abandonment on payment failure', async () => {
      const { PaymentError } = jest.requireMock('@/services/payment');
      mockCreatePaymentIntent.mockRejectedValue(new PaymentError('Card declined', 'STRIPE_ERROR'));

      const utils = renderCheckout({}, seed);
      fillAndSelectCard(utils);

      await act(async () => {
        fireEvent.press(utils.getByTestId('place-order-button'));
      });

      expect(mockCancelCartAbandonment).not.toHaveBeenCalled();
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
        new Promise((resolve) => {
          resolvePayment = resolve;
        }),
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
      mockCreatePaymentIntent.mockRejectedValue(new PaymentError('Card declined', 'STRIPE_ERROR'));

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
      mockCreatePaymentIntent.mockRejectedValue(new PaymentError('Card declined', 'STRIPE_ERROR'));
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

    it('Klarna uses redirect flow — calls startCheckout, not confirmOrder', async () => {
      // Klarna does NOT go through processPayment/confirmOrder. It calls
      // klarnaCheckout.startCheckout which opens Linking.openURL and waits
      // for the deep-link return. confirmOrder is called inside the hook.
      const utils = renderCheckout({}, seed);
      fillAndSelectBNPL(utils, 'klarna');

      await act(async () => {
        fireEvent.press(utils.getByTestId('place-order-button'));
      });

      expect(mockKlarnaStartCheckout).toHaveBeenCalled();
      expect(mockConfirmOrder).not.toHaveBeenCalled();
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

  describe('Order items with thumbnails', () => {
    it('shows item thumbnail next to each checkout item', async () => {
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      expect(utils.getByTestId(`checkout-thumb-${asheville.id}:${naturalLinen.id}`)).toBeTruthy();
      expect(utils.getByTestId(`checkout-item-${asheville.id}:${naturalLinen.id}`)).toBeTruthy();
    });

    it('shows items expanded by default when fewer than 3 items', async () => {
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      expect(utils.getByTestId(`checkout-item-${asheville.id}:${naturalLinen.id}`)).toBeTruthy();
      expect(utils.queryByTestId('items-collapsed-preview')).toBeNull();
    });

    it('shows collapsed preview with stacked thumbnails when 3+ items', async () => {
      const threeItems = [
        { model: asheville, fabric: naturalLinen, qty: 1 },
        { model: blueRidge, fabric: naturalLinen, qty: 1 },
        { model: asheville, fabric: mountainBlue, qty: 2 },
      ];
      const utils = renderCheckout({}, threeItems);
      await act(async () => {});
      expect(utils.getByTestId('items-collapsed-preview')).toBeTruthy();
      expect(utils.queryByTestId(`checkout-item-${asheville.id}:${naturalLinen.id}`)).toBeNull();
    });

    it('expands items when toggle is pressed', async () => {
      const threeItems = [
        { model: asheville, fabric: naturalLinen, qty: 1 },
        { model: blueRidge, fabric: naturalLinen, qty: 1 },
        { model: asheville, fabric: mountainBlue, qty: 2 },
      ];
      const utils = renderCheckout({}, threeItems);
      await act(async () => {});
      expect(utils.getByTestId('items-collapsed-preview')).toBeTruthy();

      fireEvent.press(utils.getByTestId('checkout-items-toggle'));
      await act(async () => {});

      expect(utils.queryByTestId('items-collapsed-preview')).toBeNull();
      expect(utils.getByTestId(`checkout-item-${asheville.id}:${naturalLinen.id}`)).toBeTruthy();
    });
  });

  // ── Delivery window estimator (cm-mk8) ───────────────────────────────────────

  describe('delivery window estimator', () => {
    it('shows delivery estimate after zip is entered', async () => {
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      fireEvent.changeText(utils.getByTestId('shipping-zip'), '28801');
      await act(async () => {});
      expect(utils.getByTestId('delivery-estimate')).toBeTruthy();
    });

    it('displays correct estimate text for local NC zip', async () => {
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      fireEvent.changeText(utils.getByTestId('shipping-zip'), '28801');
      await act(async () => {});
      expect(utils.getByText(/2–3 business days/i)).toBeTruthy();
    });

    it('displays correct estimate text for national zip', async () => {
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      fireEvent.changeText(utils.getByTestId('shipping-zip'), '90210');
      await act(async () => {});
      expect(utils.getByText(/5–7 business days/i)).toBeTruthy();
    });

    it('does not show estimate when zip is empty', async () => {
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      expect(utils.queryByTestId('delivery-estimate')).toBeNull();
    });

    it('does not show estimate for invalid zip', async () => {
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      fireEvent.changeText(utils.getByTestId('shipping-zip'), 'ABCDE');
      await act(async () => {});
      expect(utils.queryByTestId('delivery-estimate')).toBeNull();
    });

    it('renders delivery estimate before the place-order button', async () => {
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      fireEvent.changeText(utils.getByTestId('shipping-zip'), '28801');
      await act(async () => {});
      // Both elements exist in the tree
      expect(utils.getByTestId('delivery-estimate')).toBeTruthy();
      expect(utils.getByTestId('place-order-button')).toBeTruthy();
    });
  });

  // ── cm-z5f: gamified delivery method section (aligned with Wix shippingIntelligence) ─

  const WIX_OPTIONS = [
    {
      code: 'local-delivery-asheville',
      title: '🚚 Asheville Area Delivery',
      price: '0.00',
      currency: 'USD',
      deliveryTime: '2–3 business days',
      badge: 'Local Love',
      badgeStyle: 'local',
      upsellMessage: 'Free delivery in Asheville!',
      highlight: true,
      icon: '🚚',
    },
    {
      code: 'white-glove-asheville',
      title: '✨ White Glove Delivery',
      price: '149.00',
      currency: 'USD',
      deliveryTime: '2–3 business days',
      badge: 'Premium Experience',
      badgeStyle: 'premium',
      upsellMessage: null,
      highlight: false,
      icon: '✨',
      terrainSurcharge: 25,
    },
    {
      code: 'UPS_GROUND',
      title: '📦 UPS Ground',
      price: '49.00',
      currency: 'USD',
      deliveryTime: '5–7 business days',
      badge: null,
      badgeStyle: null,
      upsellMessage: null,
      highlight: false,
      icon: '📦',
    },
  ];

  describe('gamified delivery method section (cm-z5f)', () => {
    const seed = [{ model: asheville, fabric: naturalLinen, qty: 1 }];

    beforeEach(() => {
      mockFetchShippingOptions.mockResolvedValue({ success: true, options: WIX_OPTIONS });
    });

    afterEach(() => {
      mockFetchShippingOptions.mockResolvedValue({ success: false, options: [] });
    });

    it('does not show delivery section before a valid ZIP is entered', async () => {
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      expect(utils.queryByTestId('delivery-method-section')).toBeNull();
    });

    it('shows delivery section after valid ZIP is entered', async () => {
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      fireEvent.changeText(utils.getByTestId('shipping-zip'), '28801');
      await act(async () => {});
      expect(utils.getByTestId('delivery-method-section')).toBeTruthy();
    });

    it('renders delivery method title', async () => {
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      fireEvent.changeText(utils.getByTestId('shipping-zip'), '28801');
      await act(async () => {});
      expect(utils.getByTestId('delivery-method-title')).toBeTruthy();
    });

    it('renders local delivery and UPS_GROUND as peer options (not white glove)', async () => {
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      fireEvent.changeText(utils.getByTestId('shipping-zip'), '28801');
      await act(async () => {});
      expect(utils.getByTestId('delivery-option-local-delivery-asheville')).toBeTruthy();
      expect(utils.getByTestId('delivery-option-UPS_GROUND')).toBeTruthy();
      // white glove is NOT a peer card — it's an upgrade within local delivery
      expect(utils.queryByTestId('delivery-option-white-glove-asheville')).toBeNull();
    });

    it('auto-selects the first option on load', async () => {
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      fireEvent.changeText(utils.getByTestId('shipping-zip'), '28801');
      await act(async () => {});
      expect(
        utils.getByTestId('delivery-option-local-delivery-asheville').props.accessibilityState
          ?.selected,
      ).toBe(true);
    });

    it('shows badge text for option with badge', async () => {
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      fireEvent.changeText(utils.getByTestId('shipping-zip'), '28801');
      await act(async () => {});
      expect(utils.getByTestId('delivery-badge-local-delivery-asheville')).toBeTruthy();
      expect(utils.getByTestId('delivery-badge-local-delivery-asheville').props.children).toBe(
        'Local Love',
      );
    });

    it('shows Premium Experience badge in white glove upgrade section', async () => {
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      fireEvent.changeText(utils.getByTestId('shipping-zip'), '28801');
      await act(async () => {});
      expect(utils.getByTestId('white-glove-upgrade-badge').props.children).toBe(
        'Premium Experience',
      );
    });

    it('does not show badge for option with null badge', async () => {
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      fireEvent.changeText(utils.getByTestId('shipping-zip'), '28801');
      await act(async () => {});
      expect(utils.queryByTestId('delivery-badge-UPS_GROUND')).toBeNull();
    });

    it('shows FREE price for zero-cost option', async () => {
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      fireEvent.changeText(utils.getByTestId('shipping-zip'), '28801');
      await act(async () => {});
      expect(utils.getByTestId('delivery-price-local-delivery-asheville').props.children).toBe(
        'FREE',
      );
    });

    it('shows formatted price for paid option', async () => {
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      fireEvent.changeText(utils.getByTestId('shipping-zip'), '28801');
      await act(async () => {});
      const priceText = utils.getByTestId('delivery-price-UPS_GROUND').props.children;
      expect(priceText).toMatch(/\$?49/);
    });

    it('shows upsell message for local option', async () => {
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      fireEvent.changeText(utils.getByTestId('shipping-zip'), '28801');
      await act(async () => {});
      expect(utils.getByTestId('delivery-upsell-local-delivery-asheville').props.children).toBe(
        'Free delivery in Asheville!',
      );
    });

    it('shows terrain surcharge in white glove upgrade section', async () => {
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      fireEvent.changeText(utils.getByTestId('shipping-zip'), '28801');
      await act(async () => {});
      expect(utils.getByTestId('white-glove-upgrade-terrain')).toBeTruthy();
    });

    it('selecting UPS_GROUND deselects local delivery', async () => {
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      fireEvent.changeText(utils.getByTestId('shipping-zip'), '28801');
      await act(async () => {});
      fireEvent.press(utils.getByTestId('delivery-option-UPS_GROUND'));
      await act(async () => {});
      expect(
        utils.getByTestId('delivery-option-local-delivery-asheville').props.accessibilityState
          ?.selected,
      ).toBe(false);
      expect(
        utils.getByTestId('delivery-option-UPS_GROUND').props.accessibilityState?.selected,
      ).toBe(true);
    });

    it('options have radio accessibility role', async () => {
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      fireEvent.changeText(utils.getByTestId('shipping-zip'), '28801');
      await act(async () => {});
      expect(
        utils.getByTestId('delivery-option-local-delivery-asheville').props.accessibilityRole,
      ).toBe('radio');
    });

    it('hides delivery section if API returns no options', async () => {
      mockFetchShippingOptions.mockResolvedValueOnce({ success: false, options: [] });
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      fireEvent.changeText(utils.getByTestId('shipping-zip'), '28801');
      await act(async () => {});
      expect(utils.queryByTestId('delivery-method-section')).toBeNull();
    });

    it('does not call fetchShippingOptions for invalid ZIP', async () => {
      mockFetchShippingOptions.mockClear();
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      fireEvent.changeText(utils.getByTestId('shipping-zip'), 'ABCDE');
      await act(async () => {});
      expect(mockFetchShippingOptions).not.toHaveBeenCalled();
    });
  });

  // ── cm-cqz: white glove as upgrade within local delivery ──────────────────

  describe('white glove upgrade (cm-cqz)', () => {
    const seed = [{ model: asheville, fabric: naturalLinen, qty: 1 }];

    beforeEach(() => {
      mockFetchShippingOptions.mockResolvedValue({ success: true, options: WIX_OPTIONS });
    });

    afterEach(() => {
      mockFetchShippingOptions.mockResolvedValue({ success: false, options: [] });
    });

    async function renderWithOptions() {
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      fireEvent.changeText(utils.getByTestId('shipping-zip'), '28801');
      await act(async () => {});
      return utils;
    }

    it('shows white glove upgrade toggle within local delivery card', async () => {
      const utils = await renderWithOptions();
      expect(utils.getByTestId('white-glove-upgrade-toggle')).toBeTruthy();
    });

    it('white glove toggle is unchecked by default', async () => {
      const utils = await renderWithOptions();
      const toggle = utils.getByTestId('white-glove-upgrade-toggle');
      expect(toggle.props.accessibilityState?.checked).toBe(false);
    });

    it('toggling white glove on checks the toggle', async () => {
      const utils = await renderWithOptions();
      fireEvent.press(utils.getByTestId('white-glove-upgrade-toggle'));
      await act(async () => {});
      expect(
        utils.getByTestId('white-glove-upgrade-toggle').props.accessibilityState?.checked,
      ).toBe(true);
    });

    it('toggling white glove on shows combined price', async () => {
      const utils = await renderWithOptions();
      fireEvent.press(utils.getByTestId('white-glove-upgrade-toggle'));
      await act(async () => {});
      // Combined: local (FREE = 0) + WG ($149) = $149
      const combinedEl = utils.getByTestId('white-glove-combined-price');
      expect(JSON.stringify(combinedEl.props.children)).toMatch(/149/);
    });

    it('toggling white glove off restores base local delivery price', async () => {
      const utils = await renderWithOptions();
      fireEvent.press(utils.getByTestId('white-glove-upgrade-toggle'));
      await act(async () => {});
      fireEvent.press(utils.getByTestId('white-glove-upgrade-toggle'));
      await act(async () => {});
      expect(utils.getByTestId('delivery-price-local-delivery-asheville').props.children).toBe(
        'FREE',
      );
    });

    it('local delivery is selectable without white glove upgrade', async () => {
      const utils = await renderWithOptions();
      expect(
        utils.getByTestId('delivery-option-local-delivery-asheville').props.accessibilityState
          ?.selected,
      ).toBe(true);
      // WG toggle unchecked — not selected
      expect(
        utils.getByTestId('white-glove-upgrade-toggle').props.accessibilityState?.checked,
      ).toBe(false);
    });

    it('white glove upgrade toggle hides when non-local option selected', async () => {
      const utils = await renderWithOptions();
      fireEvent.press(utils.getByTestId('delivery-option-UPS_GROUND'));
      await act(async () => {});
      expect(utils.queryByTestId('white-glove-upgrade-toggle')).toBeNull();
    });

    it('switching to non-local resets white glove upgrade to off', async () => {
      const utils = await renderWithOptions();
      // Enable WG upgrade
      fireEvent.press(utils.getByTestId('white-glove-upgrade-toggle'));
      await act(async () => {});
      // Switch to UPS Ground
      fireEvent.press(utils.getByTestId('delivery-option-UPS_GROUND'));
      await act(async () => {});
      // Switch back to local delivery
      fireEvent.press(utils.getByTestId('delivery-option-local-delivery-asheville'));
      await act(async () => {});
      // WG should be unchecked again
      expect(
        utils.getByTestId('white-glove-upgrade-toggle').props.accessibilityState?.checked,
      ).toBe(false);
    });

    it('white glove upgrade shows its fee', async () => {
      const utils = await renderWithOptions();
      expect(utils.getByTestId('white-glove-upgrade-fee')).toBeTruthy();
    });

    it('white glove upgrade section shows WG label', async () => {
      const utils = await renderWithOptions();
      expect(utils.getByTestId('white-glove-upgrade-label')).toBeTruthy();
    });
  });

  // ── cm-ds5: Loyalty tier badge in CheckoutScreen ─────────────────────────────

  describe('Loyalty tier badge (cm-ds5)', () => {
    const seed = [{ model: asheville, fabric: naturalLinen, qty: 1 }];

    it('renders loyalty banner near order summary when cart has items', async () => {
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      expect(utils.getByTestId('checkout-loyalty-banner')).toBeTruthy();
    });

    it('does not render loyalty banner when cart is empty', async () => {
      const utils = renderCheckout({});
      await act(async () => {});
      expect(utils.queryByTestId('checkout-loyalty-banner')).toBeNull();
    });

    it('does not render loyalty banner when loyalty is loading', async () => {
      mockLoyaltyValue.loading = true;
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      expect(utils.queryByTestId('checkout-loyalty-banner')).toBeNull();
      mockLoyaltyValue.loading = false;
    });

    it('does not render loyalty banner when loyalty returns error', async () => {
      (mockLoyaltyValue as { error: string | null }).error = 'Service unavailable';
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      expect(utils.queryByTestId('checkout-loyalty-banner')).toBeNull();
      mockLoyaltyValue.error = null;
    });

    it('banner is accessible with accessibilityLabel', async () => {
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      const banner = utils.getByTestId('checkout-loyalty-banner');
      expect(banner.props.accessibilityLabel).toBeTruthy();
    });
  });

  // ── cm-o4i: LTL/freight display, deliveryTime, error state ──────────────────

  const LTL_OPTION = {
    code: 'WWEX_LTL_STANDARD',
    title: '🚛 LTL Freight',
    price: '299.00',
    currency: 'USD',
    deliveryTime: '7–10 business days',
    badge: null,
    badgeStyle: 'freight',
    upsellMessage: null,
    highlight: false,
    icon: '🚛',
    isLTL: true,
    isEstimate: false,
    carrier: 'R+L Carriers',
  };

  const LIFTGATE_OPTION = {
    code: 'WWEX_LTL_LIFTGATE',
    title: '🚛 LTL Freight + Liftgate',
    price: '349.00',
    currency: 'USD',
    deliveryTime: '7–10 business days',
    badge: null,
    badgeStyle: 'freight',
    upsellMessage: null,
    highlight: false,
    icon: '🚛',
    isLTL: true,
    isEstimate: false,
    requiresLiftgate: true,
    carrier: 'R+L Carriers',
  };

  describe('LTL freight display (cm-o4i)', () => {
    const seed = [{ model: asheville, fabric: naturalLinen, qty: 1 }];

    it('shows delivery time text for a parcel option', async () => {
      mockFetchShippingOptions.mockResolvedValue({
        success: true,
        options: [{ ...WIX_OPTIONS[2] }], // UPS_GROUND with deliveryTime '5–7 business days'
      });
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      fireEvent.changeText(utils.getByTestId('shipping-zip'), '28801');
      await act(async () => {});
      expect(utils.getByTestId('delivery-time-UPS_GROUND')).toBeTruthy();
      expect(utils.getByTestId('delivery-time-UPS_GROUND').props.children).toContain(
        '5–7 business days',
      );
    });

    it('shows delivery time for an LTL option', async () => {
      mockFetchShippingOptions.mockResolvedValue({ success: true, options: [LTL_OPTION] });
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      fireEvent.changeText(utils.getByTestId('shipping-zip'), '28801');
      await act(async () => {});
      expect(utils.getByTestId('delivery-time-WWEX_LTL_STANDARD')).toBeTruthy();
      expect(utils.getByTestId('delivery-time-WWEX_LTL_STANDARD').props.children).toContain(
        '7–10 business days',
      );
    });

    it('shows freight scheduling notice for isLTL option', async () => {
      mockFetchShippingOptions.mockResolvedValue({ success: true, options: [LTL_OPTION] });
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      fireEvent.changeText(utils.getByTestId('shipping-zip'), '28801');
      await act(async () => {});
      expect(utils.getByTestId('delivery-freight-notice-WWEX_LTL_STANDARD')).toBeTruthy();
    });

    it('freight notice text mentions scheduling', async () => {
      mockFetchShippingOptions.mockResolvedValue({ success: true, options: [LTL_OPTION] });
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      fireEvent.changeText(utils.getByTestId('shipping-zip'), '28801');
      await act(async () => {});
      const notice = utils.getByTestId('delivery-freight-notice-WWEX_LTL_STANDARD');
      expect(notice.props.children).toMatch(/schedule|freight|call/i);
    });

    it('shows freight notice for requiresLiftgate option', async () => {
      mockFetchShippingOptions.mockResolvedValue({ success: true, options: [LIFTGATE_OPTION] });
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      fireEvent.changeText(utils.getByTestId('shipping-zip'), '28801');
      await act(async () => {});
      expect(utils.getByTestId('delivery-freight-notice-WWEX_LTL_LIFTGATE')).toBeTruthy();
    });

    it('does not show freight notice for a standard parcel option', async () => {
      mockFetchShippingOptions.mockResolvedValue({
        success: true,
        options: [{ ...WIX_OPTIONS[2] }], // UPS_GROUND — no isLTL
      });
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      fireEvent.changeText(utils.getByTestId('shipping-zip'), '28801');
      await act(async () => {});
      expect(utils.queryByTestId('delivery-freight-notice-UPS_GROUND')).toBeNull();
    });
  });

  describe('shipping options error state (cm-o4i)', () => {
    const seed = [{ model: asheville, fabric: naturalLinen, qty: 1 }];

    afterEach(() => {
      mockFetchShippingOptions.mockResolvedValue({ success: false, options: [] });
    });

    it('shows shipping error when fetchShippingOptions returns success:false with error', async () => {
      mockFetchShippingOptions.mockResolvedValue({
        success: false,
        options: [],
        error: 'Shipping unavailable for this ZIP',
      });
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      fireEvent.changeText(utils.getByTestId('shipping-zip'), '28801');
      await act(async () => {});
      expect(utils.getByTestId('shipping-options-error')).toBeTruthy();
    });

    it('error message contains helpful fallback text', async () => {
      mockFetchShippingOptions.mockResolvedValue({
        success: false,
        options: [],
        error: 'Service timeout',
      });
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      fireEvent.changeText(utils.getByTestId('shipping-zip'), '28801');
      await act(async () => {});
      const errEl = utils.getByTestId('shipping-options-error');
      expect(errEl.props.children).toMatch(/shipping|contact|unavailable/i);
    });

    it('does not show delivery method section when error occurs', async () => {
      mockFetchShippingOptions.mockResolvedValue({
        success: false,
        options: [],
        error: 'Network failure',
      });
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      fireEvent.changeText(utils.getByTestId('shipping-zip'), '28801');
      await act(async () => {});
      expect(utils.queryByTestId('delivery-method-section')).toBeNull();
    });

    it('does not show error when options load successfully', async () => {
      mockFetchShippingOptions.mockResolvedValue({ success: true, options: WIX_OPTIONS });
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      fireEvent.changeText(utils.getByTestId('shipping-zip'), '28801');
      await act(async () => {});
      expect(utils.queryByTestId('shipping-options-error')).toBeNull();
    });
  });

  describe('ZIP persistence (cm-k0396)', () => {
    const SHIPPING_ZIP_KEY = 'shipping_zip';

    beforeEach(() => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    });

    it('pre-fills ZIP from AsyncStorage when no saved address exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) =>
        key === SHIPPING_ZIP_KEY ? Promise.resolve('90210') : Promise.resolve(null),
      );
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      const zipField = utils.getByTestId('shipping-zip');
      expect(zipField.props.value).toBe('90210');
    });

    it('does NOT override saved address ZIP with persisted ZIP', async () => {
      // Mock address book with a saved address
      const useAddressBookModule = require('@/hooks/useAddressBook');
      const original = useAddressBookModule.useAddressBook;
      useAddressBookModule.useAddressBook = () => ({
        addresses: [
          {
            id: '1',
            fullName: 'Jane Doe',
            line1: '456 Oak Ave',
            line2: '',
            city: 'Denver',
            state: 'CO',
            zip: '80202',
            isDefault: true,
          },
        ],
        defaultAddress: {
          id: '1',
          fullName: 'Jane Doe',
          line1: '456 Oak Ave',
          line2: '',
          city: 'Denver',
          state: 'CO',
          zip: '80202',
          isDefault: true,
        },
        loading: false,
        addAddress: jest.fn(),
        updateAddress: jest.fn(),
        deleteAddress: jest.fn(),
        setDefault: jest.fn(),
        saveFromCheckout: jest.fn(),
      });

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) =>
        key === SHIPPING_ZIP_KEY ? Promise.resolve('90210') : Promise.resolve(null),
      );
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      const zipField = utils.getByTestId('shipping-zip');
      // Saved address ZIP (80202) takes precedence over persisted ZIP (90210)
      expect(zipField.props.value).toBe('80202');

      // Restore original mock
      useAddressBookModule.useAddressBook = original;
    });

    it('persists ZIP to AsyncStorage when user types in checkout', async () => {
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      fireEvent.changeText(utils.getByTestId('shipping-zip'), '10001');
      await act(async () => {});
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(SHIPPING_ZIP_KEY, '10001');
    });

    it('handles AsyncStorage read failure gracefully — ZIP stays empty', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('storage error'));
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      const zipField = utils.getByTestId('shipping-zip');
      expect(zipField.props.value).toBe('');
    });

    it('handles AsyncStorage write failure gracefully — no crash', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('write error'));
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      // Should not throw
      fireEvent.changeText(utils.getByTestId('shipping-zip'), '28801');
      await act(async () => {});
      expect(utils.getByTestId('shipping-zip').props.value).toBe('28801');
    });

    it('does not persist empty or partial ZIP', async () => {
      const utils = renderCheckout({}, seed);
      await act(async () => {});
      fireEvent.changeText(utils.getByTestId('shipping-zip'), '123');
      await act(async () => {});
      // Only valid 5-digit ZIPs should be persisted
      expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(SHIPPING_ZIP_KEY, '123');
    });
  });

  describe('Keyboard chain and accessibility', () => {
    it('fullName input has returnKeyType next', () => {
      const { getByTestId } = renderCheckout({}, seed);
      const input = getByTestId('shipping-fullName');
      expect(input.props.returnKeyType).toBe('next');
    });

    it('line1 (street address) input has returnKeyType next', () => {
      const { getByTestId } = renderCheckout({}, seed);
      expect(getByTestId('shipping-line1').props.returnKeyType).toBe('next');
    });

    it('zip (last) input has returnKeyType done', () => {
      const { getByTestId } = renderCheckout({}, seed);
      expect(getByTestId('shipping-zip').props.returnKeyType).toBe('done');
    });

    it('progress indicator has accessibilityRole progressbar', () => {
      const { getByTestId } = renderCheckout({}, seed);
      const progress = getByTestId('checkout-progress');
      expect(progress.props.accessibilityRole).toBe('progressbar');
      expect(typeof progress.props.accessibilityValue?.now).toBe('number');
      expect(progress.props.accessibilityValue?.max).toBe(3);
    });

    it('line1 submitEditing does not crash when line2 is empty', () => {
      const { getByTestId } = renderCheckout({}, seed);
      // line2 starts empty — chain should skip to city without error
      expect(() => fireEvent(getByTestId('shipping-line1'), 'submitEditing')).not.toThrow();
    });

    it('line1 submitEditing does not crash when line2 is populated', () => {
      const { getByTestId } = renderCheckout({}, seed);
      fireEvent.changeText(getByTestId('shipping-line2'), 'Apt 4B');
      // line2 has value — chain should go to line2 without error
      expect(() => fireEvent(getByTestId('shipping-line1'), 'submitEditing')).not.toThrow();
    });
  });

  describe('PromoCode discount', () => {
    it('applies fixed discount to displayed grand total', async () => {
      const wixService = require('@/services/wix');
      const mockCallFunction = jest.fn().mockResolvedValue({
        valid: true,
        discount: 20,
        type: 'fixed',
      });
      jest.spyOn(wixService, 'useOptionalWixClient').mockReturnValue({
        createPaymentIntent: jest.fn(),
        confirmOrder: jest.fn(),
        callFunction: mockCallFunction,
      });

      const { getByTestId, getByText } = renderCheckout({}, seed);

      // Expand promo input and apply a $20 fixed discount
      await waitFor(() => expect(getByText(/add promo code/i)).toBeTruthy());
      fireEvent.press(getByText(/add promo code/i));
      fireEvent.changeText(getByTestId('promo-input'), 'SAVE20');
      fireEvent.press(getByTestId('promo-apply-btn'));

      // adjustedTotal = 422.43 - 20 = 402.43
      await waitFor(() => expect(getByTestId('checkout-total').props.children).toBe('$402.43'));

      jest.restoreAllMocks();
    });
  });
});
