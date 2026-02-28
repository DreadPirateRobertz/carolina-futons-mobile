/**
 * Tests for OrderDetailScreen refactor: verifying it uses useOrders hook
 * instead of importing MOCK_ORDERS directly.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { OrderDetailScreen } from '../OrderDetailScreen';
import { CartProvider } from '@/hooks/useCart';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { MOCK_ORDERS } from '@/data/orders';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));

// Mock useOrders hook
const mockUseOrders = jest.fn();
const mockUseOrderById = jest.fn();
jest.mock('@/hooks/useOrders', () => ({
  useOrders: (...args: any[]) => mockUseOrders(...args),
  useOrderById: (...args: any[]) => mockUseOrderById(...args),
}));

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

describe('OrderDetailScreen hook integration', () => {
  const deliveredOrder = MOCK_ORDERS[0]; // ord-001

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOrderById.mockReturnValue({
      order: deliveredOrder,
      isLoading: false,
      error: null,
    });
  });

  it('calls useOrderById with the order id', () => {
    renderOrderDetail({ orderId: 'ord-001' });
    expect(mockUseOrderById).toHaveBeenCalledWith('ord-001');
  });

  it('renders normally when hook returns order', () => {
    const { getByTestId } = renderOrderDetail({ orderId: 'ord-001' });
    expect(getByTestId('order-detail-screen')).toBeTruthy();
    expect(getByTestId('order-detail-header')).toBeTruthy();
  });

  it('shows loading state when order is loading', () => {
    mockUseOrderById.mockReturnValue({
      order: null,
      isLoading: true,
      error: null,
    });

    const { getByTestId, getByText } = renderOrderDetail({ orderId: 'ord-001' });
    expect(getByTestId('order-loading')).toBeTruthy();
    expect(getByText(/loading/i)).toBeTruthy();
  });

  it('shows error state when order fails to load', () => {
    mockUseOrderById.mockReturnValue({
      order: null,
      isLoading: false,
      error: new Error('Server error'),
    });

    const { getByTestId, getByText } = renderOrderDetail({ orderId: 'ord-001' });
    expect(getByTestId('order-error')).toBeTruthy();
    expect(getByText(/couldn't load/i)).toBeTruthy();
  });

  it('shows not-found when hook returns null order without error', () => {
    mockUseOrderById.mockReturnValue({
      order: null,
      isLoading: false,
      error: null,
    });

    const { getByTestId } = renderOrderDetail({ orderId: 'nonexistent' });
    expect(getByTestId('order-not-found')).toBeTruthy();
  });

  it('resolves orderId from route params', () => {
    renderOrderDetail({ orderId: '', route: { params: { orderId: 'ord-002' } } });
    expect(mockUseOrderById).toHaveBeenCalledWith('ord-002');
  });
});
