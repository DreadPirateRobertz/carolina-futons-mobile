import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { StatusBar } from 'react-native';
import { OrderConfirmationScreen } from '../OrderConfirmationScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { OrderConfirmation } from '@/services/payment';

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

const mockOrder: OrderConfirmation = {
  orderId: 'ord_123',
  orderNumber: 'CF-20260301-001',
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
  createdAt: '2026-03-01T12:00:00Z',
  estimatedDelivery: 'March 15-20, 2026',
};

function renderConfirmation(
  props: Partial<React.ComponentProps<typeof OrderConfirmationScreen>> = {},
) {
  return render(
    <ThemeProvider>
      <OrderConfirmationScreen order={mockOrder} {...props} />
    </ThemeProvider>,
  );
}

describe('OrderConfirmationScreen', () => {
  describe('Rendering', () => {
    it('renders with default testID', () => {
      const { getByTestId } = renderConfirmation();
      expect(getByTestId('order-confirmation-screen')).toBeTruthy();
    });

    it('accepts custom testID', () => {
      const { getByTestId } = renderConfirmation({ testID: 'my-confirm' });
      expect(getByTestId('my-confirm')).toBeTruthy();
    });

    it('shows confirmation title', () => {
      const { getByTestId } = renderConfirmation();
      expect(getByTestId('confirmation-title')).toBeTruthy();
    });

    it('displays "Order Confirmed!" heading', () => {
      const { getByText } = renderConfirmation();
      expect(getByText('Order Confirmed!')).toBeTruthy();
    });

    it('renders StatusBar with dark-content barStyle (hq-w7m3n)', () => {
      const { UNSAFE_getByType } = renderConfirmation();
      const statusBar = UNSAFE_getByType(StatusBar);
      expect(statusBar.props.barStyle).toBe('dark-content');
    });
  });

  describe('Order details', () => {
    it('shows order number', () => {
      const { getByTestId } = renderConfirmation();
      const orderNumber = getByTestId('order-number');
      expect(orderNumber.props.children).toEqual(['#', 'CF-20260301-001']);
    });

    it('shows order items', () => {
      const { getByTestId } = renderConfirmation();
      expect(getByTestId('confirmation-item-asheville-full:natural-linen')).toBeTruthy();
    });

    it('shows correct total', () => {
      const { getByTestId } = renderConfirmation();
      expect(getByTestId('confirmation-total').props.children).toBe('$422.43');
    });

    it('shows estimated delivery', () => {
      const { getByTestId, getByText } = renderConfirmation();
      expect(getByTestId('estimated-delivery')).toBeTruthy();
      expect(getByText('March 15-20, 2026')).toBeTruthy();
    });
  });

  describe('Actions', () => {
    it('renders continue shopping button when callback provided', () => {
      const { getByTestId } = renderConfirmation({ onContinueShopping: jest.fn() });
      expect(getByTestId('continue-shopping-button')).toBeTruthy();
    });

    it('calls onContinueShopping when pressed', () => {
      const onContinueShopping = jest.fn();
      const { getByTestId } = renderConfirmation({ onContinueShopping });
      fireEvent.press(getByTestId('continue-shopping-button'));
      expect(onContinueShopping).toHaveBeenCalledTimes(1);
    });

    it('renders view orders button when callback provided', () => {
      const { getByTestId } = renderConfirmation({ onViewOrders: jest.fn() });
      expect(getByTestId('view-orders-button')).toBeTruthy();
    });

    it('calls onViewOrders when pressed', () => {
      const onViewOrders = jest.fn();
      const { getByTestId } = renderConfirmation({ onViewOrders });
      fireEvent.press(getByTestId('view-orders-button'));
      expect(onViewOrders).toHaveBeenCalledTimes(1);
    });

    it('does not render action buttons when callbacks not provided', () => {
      const { queryByTestId } = renderConfirmation();
      expect(queryByTestId('continue-shopping-button')).toBeNull();
      expect(queryByTestId('view-orders-button')).toBeNull();
    });
  });

  describe('Multiple items', () => {
    it('shows all items in order', () => {
      const multiOrder: OrderConfirmation = {
        ...mockOrder,
        items: [
          ...mockOrder.items,
          {
            id: 'blue-ridge-queen:mountain-blue',
            model: {
              id: 'blue-ridge-queen',
              name: 'Blue Ridge Queen',
              basePrice: 449,
            } as OrderConfirmation['items'][0]['model'],
            fabric: {
              id: 'mountain-blue',
              name: 'Mountain Blue',
              color: '#5B8FA8',
              price: 29,
            } as OrderConfirmation['items'][0]['fabric'],
            quantity: 2,
            unitPrice: 478,
          },
        ],
      };
      const { getByTestId } = renderConfirmation({ order: multiOrder });
      expect(getByTestId('confirmation-item-asheville-full:natural-linen')).toBeTruthy();
      expect(getByTestId('confirmation-item-blue-ridge-queen:mountain-blue')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has header role on title', () => {
      const { getByTestId } = renderConfirmation();
      expect(getByTestId('confirmation-title').props.accessibilityRole).toBe('header');
    });

    it('has accessibility label on order number', () => {
      const { getByTestId } = renderConfirmation();
      expect(getByTestId('order-number').props.accessibilityLabel).toBe(
        'Order number CF-20260301-001',
      );
    });

    it('action buttons have accessibility roles', () => {
      const { getByTestId } = renderConfirmation({
        onContinueShopping: jest.fn(),
        onViewOrders: jest.fn(),
      });
      expect(getByTestId('continue-shopping-button').props.accessibilityRole).toBe('button');
      expect(getByTestId('view-orders-button').props.accessibilityRole).toBe('button');
    });
  });

  describe('Share Order', () => {
    let shareSpy: jest.SpyInstance;
    let shareOrderSpy: jest.SpyInstance;

    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Share } = require('react-native');
      shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const analytics = require('@/services/analytics');
      shareOrderSpy = jest.spyOn(analytics.events, 'shareOrder').mockImplementation(() => {});
    });

    afterEach(() => {
      shareSpy.mockRestore();
      shareOrderSpy.mockRestore();
    });

    it('renders share order button', () => {
      const { getByTestId } = renderConfirmation();
      expect(getByTestId('share-order-button')).toBeTruthy();
    });

    it('share order button has correct accessibility role and label', () => {
      const { getByTestId } = renderConfirmation();
      const btn = getByTestId('share-order-button');
      expect(btn.props.accessibilityRole).toBe('button');
      expect(btn.props.accessibilityLabel).toMatch(/share.*order/i);
    });

    it('share order button has accessibilityHint (cm-a11y-shipping)', () => {
      const { getByTestId } = renderConfirmation();
      const btn = getByTestId('share-order-button');
      expect(btn.props.accessibilityHint).toBeTruthy();
    });

    it('calls Share.share with order number on press', async () => {
      const { getByTestId } = renderConfirmation();
      fireEvent.press(getByTestId('share-order-button'));
      await waitFor(() => expect(shareSpy).toHaveBeenCalled());
      const call = shareSpy.mock.calls[0][0] as { message: string };
      expect(call.message).toContain('CF-20260301-001');
    });

    it('fires shareOrder analytics event on successful share', async () => {
      const { getByTestId } = renderConfirmation();
      fireEvent.press(getByTestId('share-order-button'));
      await waitFor(() => expect(shareOrderSpy).toHaveBeenCalledWith('ord_123'));
    });

    it('does not fire analytics when user cancels share', async () => {
      shareSpy.mockResolvedValueOnce({ action: 'dismissedAction' });
      const { getByTestId } = renderConfirmation();
      fireEvent.press(getByTestId('share-order-button'));
      await waitFor(() => expect(shareSpy).toHaveBeenCalled());
      expect(shareOrderSpy).not.toHaveBeenCalled();
    });

    it('does not throw when Share.share rejects', async () => {
      shareSpy.mockRejectedValueOnce(new Error('unavailable'));
      const { getByTestId } = renderConfirmation();
      fireEvent.press(getByTestId('share-order-button'));
      await new Promise((r) => setTimeout(r, 50));
      // no crash
    });
  });
});
