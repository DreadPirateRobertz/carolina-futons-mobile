import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CheckoutScreen } from '../CheckoutScreen';
import { CartProvider, useCart } from '@/hooks/useCart';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { FUTON_MODELS, FABRICS } from '@/data/futons';
import { typography } from '@/theme/tokens';

// Mock @stripe/stripe-react-native
jest.mock('@stripe/stripe-react-native', () => ({
  useStripe: () => ({
    initPaymentSheet: jest.fn().mockResolvedValue({ error: null }),
    presentPaymentSheet: jest.fn().mockResolvedValue({ error: null }),
  }),
  StripeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock the payment service
jest.mock('@/services/payment', () => ({
  calculateTotals: (subtotal: number) => {
    const shipping = subtotal >= 499 ? 0 : 49;
    const tax = Math.round(subtotal * 0.07 * 100) / 100;
    const total = subtotal + shipping + tax;
    return { subtotal, shipping, tax, total };
  },
  createPaymentIntent: jest.fn(),
  confirmOrder: jest.fn(),
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
      <ThemeProvider>
        <CartProvider>
          {seedItems && <CartSeeder items={seedItems} />}
          {children}
        </CartProvider>
      </ThemeProvider>
    );
  }

  return render(<CheckoutScreen {...props} />, { wrapper: Wrapper });
}

const seed = [{ model: asheville, fabric: naturalLinen, qty: 1 }];

describe('CheckoutScreen', () => {
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
});
