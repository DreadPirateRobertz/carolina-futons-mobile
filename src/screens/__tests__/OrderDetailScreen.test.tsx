import React from 'react';
import { Linking } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { OrderDetailScreen } from '../OrderDetailScreen';
import { CartProvider, useCart } from '@/hooks/useCart';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { MOCK_ORDERS } from '@/data/orders';
import { Text, View } from 'react-native';

jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve(true));

function renderOrderDetail(
  props: Partial<React.ComponentProps<typeof OrderDetailScreen>> & { orderId: string },
) {
  return render(
    <ThemeProvider>
      <CartProvider>
        <OrderDetailScreen {...props} />
      </CartProvider>
    </ThemeProvider>,
  );
}

/** Helper to read cart state after re-order */
function CartReader({ testID }: { testID: string }) {
  const { itemCount, subtotal } = useCart();
  return (
    <View testID={testID}>
      <Text testID="cart-count">{itemCount}</Text>
      <Text testID="cart-subtotal">{subtotal}</Text>
    </View>
  );
}

function renderWithCartReader(
  props: Partial<React.ComponentProps<typeof OrderDetailScreen>> & { orderId: string },
) {
  return render(
    <ThemeProvider>
      <CartProvider>
        <OrderDetailScreen {...props} />
        <CartReader testID="cart-reader" />
      </CartProvider>
    </ThemeProvider>,
  );
}

const deliveredOrder = MOCK_ORDERS[0]; // ord-001, delivered, has tracking

describe('OrderDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with default testID', () => {
      const { getByTestId } = renderOrderDetail({ orderId: 'ord-001' });
      expect(getByTestId('order-detail-screen')).toBeTruthy();
    });

    it('accepts custom testID', () => {
      const { getByTestId } = renderOrderDetail({
        orderId: 'ord-001',
        testID: 'my-detail',
      });
      expect(getByTestId('my-detail')).toBeTruthy();
    });

    it('shows order number in header', () => {
      const { getByTestId } = renderOrderDetail({ orderId: 'ord-001' });
      expect(getByTestId('order-detail-header').props.children).toBe(deliveredOrder.orderNumber);
    });

    it('shows status badge', () => {
      const { getByTestId } = renderOrderDetail({ orderId: 'ord-001' });
      expect(getByTestId('order-detail-status')).toBeTruthy();
    });

    it('shows order date', () => {
      const { getByTestId } = renderOrderDetail({ orderId: 'ord-001' });
      expect(getByTestId('order-detail-date')).toBeTruthy();
    });
  });

  describe('Order not found', () => {
    it('shows not found message for invalid order id', () => {
      const { getByTestId } = renderOrderDetail({ orderId: 'nonexistent' });
      expect(getByTestId('order-not-found')).toBeTruthy();
    });
  });

  describe('Back button', () => {
    it('renders back button when onBack provided', () => {
      const { getByTestId } = renderOrderDetail({
        orderId: 'ord-001',
        onBack: jest.fn(),
      });
      expect(getByTestId('order-detail-back')).toBeTruthy();
    });

    it('does not render back when onBack not provided', () => {
      const { queryByTestId } = renderOrderDetail({ orderId: 'ord-001' });
      expect(queryByTestId('order-detail-back')).toBeNull();
    });

    it('calls onBack when pressed', () => {
      const onBack = jest.fn();
      const { getByTestId } = renderOrderDetail({ orderId: 'ord-001', onBack });
      fireEvent.press(getByTestId('order-detail-back'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Line items', () => {
    it('renders line items for single-item order', () => {
      const { getByTestId } = renderOrderDetail({ orderId: 'ord-001' });
      expect(getByTestId('order-line-item-li-001')).toBeTruthy();
    });

    it('renders line items for multi-item order', () => {
      const { getByTestId } = renderOrderDetail({ orderId: 'ord-002' });
      expect(getByTestId('order-line-item-li-002')).toBeTruthy();
      expect(getByTestId('order-line-item-li-003')).toBeTruthy();
    });
  });

  describe('Totals', () => {
    it('shows totals card', () => {
      const { getByTestId } = renderOrderDetail({ orderId: 'ord-001' });
      expect(getByTestId('order-detail-totals')).toBeTruthy();
    });

    it('shows correct total for delivered order', () => {
      const { getByTestId } = renderOrderDetail({ orderId: 'ord-001' });
      expect(getByTestId('order-detail-total').props.children).toBe('$404.46');
    });

    it('shows correct total for multi-item order', () => {
      const { getByTestId } = renderOrderDetail({ orderId: 'ord-002' });
      expect(getByTestId('order-detail-total').props.children).toBe('$1129.92');
    });
  });

  describe('Shipping address', () => {
    it('shows shipping address', () => {
      const { getByTestId } = renderOrderDetail({ orderId: 'ord-001' });
      expect(getByTestId('order-shipping-address')).toBeTruthy();
    });

    it('shows correct address', () => {
      const { getByText } = renderOrderDetail({ orderId: 'ord-001' });
      expect(getByText('Jane Smith')).toBeTruthy();
      expect(getByText('123 Blue Ridge Pkwy')).toBeTruthy();
    });
  });

  describe('Payment', () => {
    it('shows payment method', () => {
      const { getByTestId } = renderOrderDetail({ orderId: 'ord-001' });
      expect(getByTestId('order-payment-method').props.children).toBe('Visa ····4242');
    });

    it('shows BNPL payment for Affirm order', () => {
      const { getByTestId } = renderOrderDetail({ orderId: 'ord-002' });
      expect(getByTestId('order-payment-method').props.children).toBe('Affirm (4 payments)');
    });
  });

  describe('Tracking', () => {
    it('shows tracking card for shipped/delivered orders', () => {
      const { getByTestId } = renderOrderDetail({ orderId: 'ord-001' });
      expect(getByTestId('order-tracking-card')).toBeTruthy();
    });

    it('does not show tracking for processing order', () => {
      const { queryByTestId } = renderOrderDetail({ orderId: 'ord-003' });
      expect(queryByTestId('order-tracking-card')).toBeNull();
    });

    it('shows tracking number as link', () => {
      const { getByTestId } = renderOrderDetail({ orderId: 'ord-001' });
      expect(getByTestId('tracking-link')).toBeTruthy();
    });

    it('opens carrier URL when tracking pressed', () => {
      const { getByTestId } = renderOrderDetail({ orderId: 'ord-001' });
      fireEvent.press(getByTestId('tracking-link'));
      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://www.ups.com/track?tracknum=1Z999AA10123456784',
      );
    });

    it('shows estimated delivery', () => {
      const { getByTestId } = renderOrderDetail({ orderId: 'ord-001' });
      expect(getByTestId('tracking-eta')).toBeTruthy();
    });

    it('tracking link has accessibility attributes', () => {
      const { getByTestId } = renderOrderDetail({ orderId: 'ord-001' });
      const link = getByTestId('tracking-link');
      expect(link.props.accessibilityRole).toBe('link');
      expect(link.props.accessibilityLabel).toContain('UPS');
    });
  });

  describe('Re-order', () => {
    it('shows re-order button for non-cancelled orders', () => {
      const { getByTestId } = renderOrderDetail({ orderId: 'ord-001' });
      expect(getByTestId('reorder-button')).toBeTruthy();
    });

    it('does not show re-order button for cancelled orders', () => {
      const { queryByTestId } = renderOrderDetail({ orderId: 'ord-004' });
      expect(queryByTestId('reorder-button')).toBeNull();
    });

    it('adds items to cart when re-order pressed', () => {
      const onReorderSuccess = jest.fn();
      const { getByTestId } = renderWithCartReader({
        orderId: 'ord-001',
        onReorderSuccess,
      });
      fireEvent.press(getByTestId('reorder-button'));
      // Order ord-001 has 1 item: The Asheville, Mountain Blue ($378)
      expect(getByTestId('cart-count').props.children).toBe(1);
      expect(getByTestId('cart-subtotal').props.children).toBe(378);
      expect(onReorderSuccess).toHaveBeenCalledTimes(1);
    });

    it('adds multi-item order to cart', () => {
      const { getByTestId } = renderWithCartReader({ orderId: 'ord-002' });
      fireEvent.press(getByTestId('reorder-button'));
      // ord-002: Blue Ridge Espresso (1) + Pisgah Natural Linen (2) = 3 items
      expect(getByTestId('cart-count').props.children).toBe(3);
    });

    it('re-order button has accessibility label', () => {
      const { getByTestId } = renderOrderDetail({ orderId: 'ord-001' });
      expect(getByTestId('reorder-button').props.accessibilityLabel).toBe('Re-order these items');
    });
  });

  describe('Hook Integration (useOrders / useFutonModels)', () => {
    it('finds order via hook when no orders prop given', () => {
      const { getByTestId } = renderOrderDetail({ orderId: 'ord-001' });
      expect(getByTestId('order-detail-header').props.children).toBe('CF-2026-0147');
    });

    it('orders prop overrides hook data', () => {
      const { getByTestId } = renderOrderDetail({
        orderId: 'ord-001',
        orders: MOCK_ORDERS,
      });
      expect(getByTestId('order-detail-header').props.children).toBe('CF-2026-0147');
    });

    it('reorder resolves model and fabric via useFutonModels hook', () => {
      const onReorderSuccess = jest.fn();
      const { getByTestId } = renderWithCartReader({
        orderId: 'ord-001',
        onReorderSuccess,
      });
      fireEvent.press(getByTestId('reorder-button'));
      expect(getByTestId('cart-count').props.children).toBe(1);
      expect(onReorderSuccess).toHaveBeenCalled();
    });
  });
});
