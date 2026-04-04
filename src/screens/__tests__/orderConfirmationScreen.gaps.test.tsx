/**
 * OrderConfirmationScreen gap tests — covers:
 *   - pointsEarned > 0 toast path (lines 64-67)
 *   - free shipping 'FREE' display (line 165)
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
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

const baseOrder: OrderConfirmation = {
  orderId: 'ord_gap_1',
  orderNumber: 'CF-GAP-001',
  items: [
    {
      id: 'asheville-full:natural-linen',
      model: { id: 'asheville-full', name: 'Asheville Full', basePrice: 349 } as any,
      fabric: { id: 'natural-linen', name: 'Natural Linen', color: '#C4B5A0', price: 0 } as any,
      quantity: 1,
      unitPrice: 349,
    },
  ],
  totals: { subtotal: 349, shipping: 49, tax: 24.43, total: 422.43 },
  paymentMethod: 'card',
  createdAt: '2026-04-04T12:00:00Z',
  estimatedDelivery: 'April 15-20, 2026',
};

function renderConfirmation(props: Partial<React.ComponentProps<typeof OrderConfirmationScreen>> = {}) {
  return render(
    <ThemeProvider>
      <OrderConfirmationScreen order={baseOrder} {...props} />
    </ThemeProvider>,
  );
}

describe('OrderConfirmationScreen — pointsEarned toast', () => {
  it('renders without crash when pointsEarned is positive', () => {
    const { getByTestId } = renderConfirmation({ pointsEarned: 150 });
    expect(getByTestId('order-confirmation-screen')).toBeTruthy();
  });

  it('toast cleanup runs without error on unmount', () => {
    // Exercises the useEffect branch + clearTimeout cleanup
    jest.useFakeTimers();
    const { unmount } = renderConfirmation({ pointsEarned: 150 });
    // Unmount before timer fires — exercises clearTimeout cleanup function
    unmount();
    jest.useRealTimers();
  });

  it('pointsEarned null does not show toast', () => {
    const { queryByTestId } = renderConfirmation({ pointsEarned: undefined });
    // PointsToast element should not be in tree when pointsEarned is undefined
    expect(queryByTestId('order-points-toast')).toBeNull();
  });
});

describe('OrderConfirmationScreen — free shipping', () => {
  it('shows FREE when shipping cost is 0', () => {
    const freeShippingOrder = {
      ...baseOrder,
      totals: { ...baseOrder.totals, shipping: 0 },
    };
    const { getByText } = renderConfirmation({ order: freeShippingOrder });
    expect(getByText('FREE')).toBeTruthy();
  });

  it('shows formatted shipping price when non-zero', () => {
    const { getByText } = renderConfirmation();
    expect(getByText('$49.00')).toBeTruthy();
  });
});
