import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PaymentConfirmationScreen } from '../PaymentConfirmationScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { OrderConfirmation } from '@/services/payment';

const mockOrder: OrderConfirmation = {
  orderId: 'ord_stripe_pi_123',
  orderNumber: 'CF-20260320-042',
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
  totals: {
    subtotal: 349,
    shipping: 49,
    tax: 24.43,
    total: 422.43,
  },
  paymentMethod: 'card',
  createdAt: '2026-03-20T22:00:00Z',
  estimatedDelivery: 'March 30 – April 4, 2026',
};

function renderScreen(
  props: Partial<React.ComponentProps<typeof PaymentConfirmationScreen>> = {},
) {
  return render(
    <ThemeProvider>
      <PaymentConfirmationScreen
        order={mockOrder}
        onSuccess={jest.fn()}
        {...props}
      />
    </ThemeProvider>,
  );
}

describe('PaymentConfirmationScreen', () => {
  describe('success state', () => {
    it('renders the screen root', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('payment-confirmation-screen')).toBeTruthy();
    });

    it('shows the order number', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('payment-order-number').props.children).toBe(mockOrder.orderNumber);
    });

    it('shows subtotal', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('subtotal-value').props.children).toBe('$349.00');
    });

    it('shows shipping cost', () => {
      const { getByText } = renderScreen();
      expect(getByText('$49.00')).toBeTruthy();
    });

    it('shows tax', () => {
      const { getByText } = renderScreen();
      expect(getByText('$24.43')).toBeTruthy();
    });

    it('shows grand total', () => {
      const { getByText } = renderScreen();
      expect(getByText('$422.43')).toBeTruthy();
    });

    it('shows payment method', () => {
      const { getByText } = renderScreen();
      expect(getByText(/card/i)).toBeTruthy();
    });

    it('shows estimated delivery', () => {
      const { getByText } = renderScreen();
      expect(getByText(mockOrder.estimatedDelivery)).toBeTruthy();
    });

    it('shows item name', () => {
      const { getByText } = renderScreen();
      expect(getByText(/Asheville Full/i)).toBeTruthy();
    });

    it('calls onSuccess when continue button is pressed', () => {
      const onSuccess = jest.fn();
      const { getByTestId } = renderScreen({ onSuccess });
      fireEvent.press(getByTestId('continue-btn'));
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('shows free shipping when shipping is zero', () => {
      const freeShipOrder: OrderConfirmation = {
        ...mockOrder,
        totals: { ...mockOrder.totals, shipping: 0, total: 373.43 },
      };
      const { getByText } = renderScreen({ order: freeShipOrder });
      expect(getByText(/free/i)).toBeTruthy();
    });
  });

  describe('error state', () => {
    it('renders error state when error prop is provided', () => {
      const { getByTestId } = renderScreen({ error: 'Payment declined by your bank.' });
      expect(getByTestId('payment-error-view')).toBeTruthy();
    });

    it('shows the error message', () => {
      const { getByText } = renderScreen({ error: 'Payment declined by your bank.' });
      expect(getByText('Payment declined by your bank.')).toBeTruthy();
    });

    it('shows retry button on error', () => {
      const { getByTestId } = renderScreen({ error: 'Network error. Please try again.' });
      expect(getByTestId('retry-btn')).toBeTruthy();
    });

    it('calls onRetry when retry button is pressed', () => {
      const onRetry = jest.fn();
      const { getByTestId } = renderScreen({
        error: 'Network error.',
        onRetry,
      });
      fireEvent.press(getByTestId('retry-btn'));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('does not show continue button in error state', () => {
      const { queryByTestId } = renderScreen({ error: 'Something went wrong.' });
      expect(queryByTestId('continue-btn')).toBeNull();
    });

    it('shows different messages for network vs decline errors', () => {
      const { getByText } = renderScreen({ error: 'Your card was declined.' });
      expect(getByText('Your card was declined.')).toBeTruthy();
    });
  });

  describe('loading state', () => {
    it('renders loading indicator when isLoading is true', () => {
      const { getByTestId } = renderScreen({ isLoading: true });
      expect(getByTestId('payment-loading-indicator')).toBeTruthy();
    });

    it('hides loading indicator when not loading', () => {
      const { queryByTestId } = renderScreen({ isLoading: false });
      expect(queryByTestId('payment-loading-indicator')).toBeNull();
    });

    it('disables continue button while loading', () => {
      const { queryByTestId } = renderScreen({ isLoading: true });
      // Continue button absent during loading
      expect(queryByTestId('continue-btn')).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('renders with zero-item order without crashing', () => {
      const emptyOrder: OrderConfirmation = { ...mockOrder, items: [] };
      const { getByTestId } = renderScreen({ order: emptyOrder });
      expect(getByTestId('payment-confirmation-screen')).toBeTruthy();
    });

    it('renders with multi-item order', () => {
      const multiOrder: OrderConfirmation = {
        ...mockOrder,
        items: [
          ...mockOrder.items,
          {
            ...mockOrder.items[0],
            id: 'blue-ridge-queen:slate-gray',
            quantity: 2,
            unitPrice: 449,
          },
        ],
      };
      const { getByTestId } = renderScreen({ order: multiOrder });
      expect(getByTestId('payment-confirmation-screen')).toBeTruthy();
    });

    it('shows apple-pay as payment method', () => {
      const applePayOrder: OrderConfirmation = { ...mockOrder, paymentMethod: 'apple-pay' };
      const { getByText } = renderScreen({ order: applePayOrder });
      expect(getByText(/apple pay/i)).toBeTruthy();
    });

    it('does not crash when onRetry is absent and retry is pressed', () => {
      const { getByTestId } = renderScreen({ error: 'Oops.' });
      // onRetry not provided — button still renders but press is a no-op
      expect(() => fireEvent.press(getByTestId('retry-btn'))).not.toThrow();
    });
  });
});
