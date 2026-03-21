import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { OrderSuccessScreen } from '../OrderSuccessScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderScreen(
  props: Partial<React.ComponentProps<typeof OrderSuccessScreen>> = {},
) {
  return render(
    <ThemeProvider>
      <OrderSuccessScreen
        orderId="ord_stripe_pi_123"
        orderNumber="CF-20260320-042"
        onContinueShopping={jest.fn()}
        onViewOrders={jest.fn()}
        {...props}
      />
    </ThemeProvider>,
  );
}

describe('OrderSuccessScreen', () => {
  describe('rendering', () => {
    it('renders the screen root', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('order-success-screen')).toBeTruthy();
    });

    it('shows order number', () => {
      const { getByText } = renderScreen();
      expect(getByText('CF-20260320-042')).toBeTruthy();
    });

    it('shows success heading', () => {
      const { getByText } = renderScreen();
      expect(getByText(/order confirmed/i)).toBeTruthy();
    });

    it('shows continue shopping CTA', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('continue-shopping-btn')).toBeTruthy();
    });

    it('shows view orders CTA', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('view-orders-btn')).toBeTruthy();
    });
  });

  describe('interactions', () => {
    it('calls onContinueShopping when button is pressed', () => {
      const onContinueShopping = jest.fn();
      const { getByTestId } = renderScreen({ onContinueShopping });
      fireEvent.press(getByTestId('continue-shopping-btn'));
      expect(onContinueShopping).toHaveBeenCalledTimes(1);
    });

    it('calls onViewOrders when button is pressed', () => {
      const onViewOrders = jest.fn();
      const { getByTestId } = renderScreen({ onViewOrders });
      fireEvent.press(getByTestId('view-orders-btn'));
      expect(onViewOrders).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('renders without onViewOrders without crashing', () => {
      const { getByTestId } = renderScreen({ onViewOrders: undefined });
      expect(getByTestId('order-success-screen')).toBeTruthy();
    });

    it('renders with very long order number without crashing', () => {
      const { getByTestId } = renderScreen({ orderNumber: 'CF-' + '9'.repeat(30) });
      expect(getByTestId('order-success-screen')).toBeTruthy();
    });

    it('renders with minimal props (no orderId displayed to user)', () => {
      const { getByTestId } = renderScreen({ orderId: '', orderNumber: 'CF-20260320-000' });
      expect(getByTestId('order-success-screen')).toBeTruthy();
    });
  });
});
