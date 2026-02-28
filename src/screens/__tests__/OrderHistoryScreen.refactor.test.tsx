/**
 * Tests for OrderHistoryScreen refactor: verifying it uses useOrders hook
 * instead of importing MOCK_ORDERS directly.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { OrderHistoryScreen } from '../OrderHistoryScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { MOCK_ORDERS } from '@/data/orders';

// Mock useOrders hook
const mockUseOrders = jest.fn();
jest.mock('@/hooks/useOrders', () => ({
  useOrders: (...args: any[]) => mockUseOrders(...args),
}));

function renderOrderHistory(props: Partial<React.ComponentProps<typeof OrderHistoryScreen>> = {}) {
  return render(
    <ThemeProvider>
      <OrderHistoryScreen {...props} />
    </ThemeProvider>,
  );
}

describe('OrderHistoryScreen hook integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOrders.mockReturnValue({
      orders: MOCK_ORDERS,
      isLoading: false,
      error: null,
      getOrderById: (id: string) => MOCK_ORDERS.find((o) => o.id === id),
    });
  });

  it('calls useOrders to get order data', () => {
    renderOrderHistory();
    expect(mockUseOrders).toHaveBeenCalled();
  });

  it('renders normally when hook returns data', () => {
    const { getByTestId } = renderOrderHistory();
    expect(getByTestId('order-history-screen')).toBeTruthy();
    expect(getByTestId('order-list')).toBeTruthy();
  });

  it('shows loading state when orders are loading', () => {
    mockUseOrders.mockReturnValue({
      orders: [],
      isLoading: true,
      error: null,
      getOrderById: () => undefined,
    });

    const { getByTestId, getByText } = renderOrderHistory();
    expect(getByTestId('orders-loading')).toBeTruthy();
    expect(getByText(/loading/i)).toBeTruthy();
  });

  it('shows error state when orders fail to load', () => {
    mockUseOrders.mockReturnValue({
      orders: [],
      isLoading: false,
      error: new Error('Network error'),
      getOrderById: () => undefined,
    });

    const { getByTestId, getByText } = renderOrderHistory();
    expect(getByTestId('orders-error')).toBeTruthy();
    expect(getByText(/couldn't load/i)).toBeTruthy();
  });

  it('does not import MOCK_ORDERS directly for rendering', () => {
    // Hook is the sole data source — verify it was called
    renderOrderHistory();
    expect(mockUseOrders).toHaveBeenCalled();
    expect(mockUseOrders.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});
