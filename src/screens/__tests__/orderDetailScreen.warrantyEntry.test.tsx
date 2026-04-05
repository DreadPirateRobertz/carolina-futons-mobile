/**
 * Tests for the "Register Warranty" entry point added to OrderDetailScreen — cm-wrt
 *
 * Covers: button visible only for delivered orders, hidden for other statuses,
 * tapping button calls onWarrantyRegister with correct orderId + orderNumber.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { OrderDetailScreen } from '../OrderDetailScreen';
import { CartProvider } from '@/hooks/useCart';
import { ConnectivityProvider } from '@/hooks/useConnectivity';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { MOCK_ORDERS } from '@/data/orders';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest
  .spyOn(require('react-native').Linking, 'openURL')
  .mockImplementation(() => Promise.resolve(true));

jest.mock('@/hooks/useRatingPrompt', () => ({
  useRatingPrompt: () => ({
    recordDelivery: jest.fn(),
    recordPurchase: jest.fn(),
    toggleDisabled: jest.fn(),
    disabled: false,
  }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderOrderDetail(
  props: Partial<React.ComponentProps<typeof OrderDetailScreen>> & { orderId: string },
) {
  return render(
    <ConnectivityProvider initialOnline={true} skipNetInfo={true}>
      <ThemeProvider>
        <CartProvider>
          <OrderDetailScreen {...props} />
        </CartProvider>
      </ThemeProvider>
    </ConnectivityProvider>,
  );
}

// ord-001 = delivered, ord-002 = shipped, ord-003 = processing, ord-004 = cancelled
const deliveredOrder = MOCK_ORDERS.find((o) => o.status === 'delivered')!;
const shippedOrder = MOCK_ORDERS.find((o) => o.status === 'shipped')!;
const processingOrder = MOCK_ORDERS.find((o) => o.status === 'processing')!;
const cancelledOrder = MOCK_ORDERS.find((o) => o.status === 'cancelled')!;

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Visibility ────────────────────────────────────────────────────────────────

describe('OrderDetailScreen — Register Warranty button visibility', () => {
  it('shows Register Warranty button for delivered orders', () => {
    const { getByTestId } = renderOrderDetail({ orderId: deliveredOrder.id });
    expect(getByTestId('register-warranty-button')).toBeTruthy();
  });

  it('does not show Register Warranty button for shipped orders', () => {
    const { queryByTestId } = renderOrderDetail({ orderId: shippedOrder.id });
    expect(queryByTestId('register-warranty-button')).toBeNull();
  });

  it('does not show Register Warranty button for processing orders', () => {
    const { queryByTestId } = renderOrderDetail({ orderId: processingOrder.id });
    expect(queryByTestId('register-warranty-button')).toBeNull();
  });

  it('does not show Register Warranty button for cancelled orders', () => {
    const { queryByTestId } = renderOrderDetail({ orderId: cancelledOrder.id });
    expect(queryByTestId('register-warranty-button')).toBeNull();
  });
});

// ── Callback ──────────────────────────────────────────────────────────────────

describe('OrderDetailScreen — onWarrantyRegister callback', () => {
  it('calls onWarrantyRegister when button is pressed', () => {
    const onWarrantyRegister = jest.fn();
    const { getByTestId } = renderOrderDetail({
      orderId: deliveredOrder.id,
      onWarrantyRegister,
    });
    fireEvent.press(getByTestId('register-warranty-button'));
    expect(onWarrantyRegister).toHaveBeenCalledTimes(1);
  });

  it('passes orderId and orderNumber to onWarrantyRegister', () => {
    const onWarrantyRegister = jest.fn();
    const { getByTestId } = renderOrderDetail({
      orderId: deliveredOrder.id,
      onWarrantyRegister,
    });
    fireEvent.press(getByTestId('register-warranty-button'));
    expect(onWarrantyRegister).toHaveBeenCalledWith({
      orderId: deliveredOrder.id,
      orderNumber: deliveredOrder.orderNumber,
      productName: expect.any(String),
    });
  });

  it('does not throw when onWarrantyRegister is not provided', () => {
    const { getByTestId } = renderOrderDetail({ orderId: deliveredOrder.id });
    expect(() => fireEvent.press(getByTestId('register-warranty-button'))).not.toThrow();
  });
});
