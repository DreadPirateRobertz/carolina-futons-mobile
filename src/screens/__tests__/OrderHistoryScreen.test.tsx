import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { OrderHistoryScreen } from '../OrderHistoryScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { MOCK_ORDERS, type Order } from '@/data/orders';
import { futonModelId } from '@/data/productId';
import { darkPalette, typography } from '@/theme/tokens';

const mockRefresh = jest.fn();
const mockUseOrders = jest.fn();
jest.mock('@/hooks/useOrders', () => ({
  ...jest.requireActual('@/hooks/useOrders'),
  useOrders: () => mockUseOrders(),
}));

jest.mock('@/hooks/useCart', () => ({
  ...jest.requireActual('@/hooks/useCart'),
  useCart: () => ({
    addItem: jest.fn(),
    items: [],
    itemCount: 0,
    subtotal: 0,
    syncing: false,
    removeItem: jest.fn(),
    updateQuantity: jest.fn(),
    clearCart: jest.fn(),
    pendingSync: 0,
    isSyncing: false,
    loadItems: jest.fn(),
    syncError: null,
    clearSyncError: jest.fn(),
  }),
}));

jest.mock('@/hooks/useFutonModels', () => ({
  ...jest.requireActual('@/hooks/useFutonModels'),
  useFutonModels: () => ({
    models: [],
    fabrics: [],
    isLoading: false,
    error: null,
    getModel: jest.fn((id: string) => ({ id, name: `Model ${id}`, basePrice: 349 })),
    getModelById: jest.fn((id: string) => ({ id, name: `Model ${id}`, basePrice: 349 })),
    getFabric: jest.fn((id: string) => ({ id, name: `Fabric ${id}`, price: 0 })),
    getModelForProduct: jest.fn(),
    refresh: jest.fn(),
  }),
}));

function renderOrderHistory(props: Partial<React.ComponentProps<typeof OrderHistoryScreen>> = {}) {
  return render(
    <ThemeProvider>
      <OrderHistoryScreen {...props} />
    </ThemeProvider>,
  );
}

describe('OrderHistoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Real useOrders returns orders sorted newest-first
    const sortedOrders = [...MOCK_ORDERS].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    mockUseOrders.mockReturnValue({
      orders: sortedOrders,
      isLoading: false,
      error: null,
      refresh: mockRefresh,
      statusFilter: null,
      setStatusFilter: jest.fn(),
      getOrder: jest.fn(),
    });
  });

  describe('With orders (default mock data)', () => {
    it('renders with default testID', () => {
      const { getByTestId } = renderOrderHistory();
      expect(getByTestId('order-history-screen')).toBeTruthy();
    });

    it('accepts custom testID', () => {
      const { getByTestId } = renderOrderHistory({ testID: 'my-orders' });
      expect(getByTestId('my-orders')).toBeTruthy();
    });

    it('shows My Orders header', () => {
      const { getByTestId } = renderOrderHistory();
      expect(getByTestId('order-history-header')).toBeTruthy();
    });

    it('renders order list', () => {
      const { getByTestId } = renderOrderHistory();
      expect(getByTestId('order-list')).toBeTruthy();
    });

    it('renders order cards for all mock orders', () => {
      const { getByTestId } = renderOrderHistory();
      for (const order of MOCK_ORDERS) {
        expect(getByTestId(`order-card-${order.id}`)).toBeTruthy();
      }
    });

    it('shows order number on each card', () => {
      const { getByTestId } = renderOrderHistory();
      for (const order of MOCK_ORDERS) {
        expect(getByTestId(`order-number-${order.id}`).props.children).toBe(order.orderNumber);
      }
    });

    it('shows status badge on each card', () => {
      const { getByTestId } = renderOrderHistory();
      expect(getByTestId('order-status-ord-001')).toBeTruthy();
      expect(getByTestId('order-status-ord-003')).toBeTruthy();
    });

    it('shows order total on each card', () => {
      const { getByTestId } = renderOrderHistory();
      expect(getByTestId('order-total-ord-001').props.children).toBe('$404.46');
      expect(getByTestId('order-total-ord-002').props.children).toBe('$1129.92');
    });

    it('shows item summary on each card', () => {
      const { getByTestId } = renderOrderHistory();
      // Single-item order
      expect(getByTestId('order-items-ord-001').props.children).toBe('The Asheville');
      // Multi-item order
      expect(getByTestId('order-items-ord-002').props.children).toBe('The Blue Ridge + 1 more');
    });

    it('orders are sorted newest-first', () => {
      const { getByTestId } = renderOrderHistory();
      const list = getByTestId('order-list');
      // The first rendered card should be the most recent order (ord-003)
      const firstCard = list.props.data[0];
      expect(firstCard.id).toBe('ord-003');
    });
  });

  describe('Empty state', () => {
    it('shows empty state when no orders', () => {
      const { getByTestId } = renderOrderHistory({ orders: [] });
      expect(getByTestId('orders-empty-state')).toBeTruthy();
    });

    it('shows Start Shopping action when onStartShopping provided', () => {
      const onStartShopping = jest.fn();
      const { getByTestId } = renderOrderHistory({
        orders: [],
        onStartShopping,
      });
      const action = getByTestId('orders-empty-state-action');
      fireEvent.press(action);
      expect(onStartShopping).toHaveBeenCalledTimes(1);
    });

    it('does not show action when onStartShopping not provided', () => {
      const { queryByTestId } = renderOrderHistory({ orders: [] });
      expect(queryByTestId('orders-empty-state-action')).toBeNull();
    });
  });

  describe('Interactions', () => {
    it('calls onSelectOrder with order id when card pressed', () => {
      const onSelectOrder = jest.fn();
      const { getByTestId } = renderOrderHistory({ onSelectOrder });
      fireEvent.press(getByTestId('order-card-ord-001'));
      expect(onSelectOrder).toHaveBeenCalledWith('ord-001');
    });

    it('calls onSelectOrder for different orders', () => {
      const onSelectOrder = jest.fn();
      const { getByTestId } = renderOrderHistory({ onSelectOrder });
      fireEvent.press(getByTestId('order-card-ord-003'));
      expect(onSelectOrder).toHaveBeenCalledWith('ord-003');
    });

    it('order cards have accessibility labels', () => {
      const { getByTestId } = renderOrderHistory();
      const card = getByTestId('order-card-ord-001');
      expect(card.props.accessibilityLabel).toContain('CF-2026-0147');
      expect(card.props.accessibilityLabel).toContain('$404.46');
    });
  });

  describe('Hook Integration (useOrders)', () => {
    it('renders mock orders from useOrders hook when no orders prop given', () => {
      const { getByTestId } = renderOrderHistory();
      // Should render orders from the hook (same as MOCK_ORDERS)
      expect(getByTestId('order-list')).toBeTruthy();
      expect(getByTestId('order-card-ord-001')).toBeTruthy();
    });

    it('orders prop overrides hook data', () => {
      const { queryByTestId, getByTestId } = renderOrderHistory({
        orders: [],
      });
      expect(getByTestId('orders-empty-state')).toBeTruthy();
      expect(queryByTestId('order-card-ord-001')).toBeNull();
    });
  });

  describe('Visual polish — dark editorial', () => {
    it('uses dark editorial background', () => {
      const { getByTestId } = renderOrderHistory();
      const screen = getByTestId('order-history-screen');
      const flat = [screen.props.style]
        .flat(Infinity)
        .reduce(
          (acc: Record<string, unknown>, s: Record<string, unknown> | undefined) =>
            s ? { ...acc, ...s } : acc,
          {},
        );
      expect(flat.backgroundColor).toBe(darkPalette.background);
    });

    it('header title uses heading fontFamily', () => {
      const { getByTestId } = renderOrderHistory();
      const header = getByTestId('order-history-header');
      const styles = Array.isArray(header.props.style)
        ? Object.assign({}, ...header.props.style)
        : header.props.style;
      expect(styles.fontFamily).toBe(typography.headingFamily);
    });

    it('header title uses light text on dark bg', () => {
      const { getByTestId } = renderOrderHistory();
      const header = getByTestId('order-history-header');
      const styles = Array.isArray(header.props.style)
        ? Object.assign({}, ...header.props.style)
        : header.props.style;
      expect(styles.color).toBe(darkPalette.textPrimary);
    });

    it('order cards use dark surface background', () => {
      const { getByTestId } = renderOrderHistory();
      const card = getByTestId('order-card-ord-001');
      const flat = [card.props.style]
        .flat(Infinity)
        .reduce(
          (acc: Record<string, unknown>, s: Record<string, unknown> | undefined) =>
            s ? { ...acc, ...s } : acc,
          {},
        );
      expect(flat.backgroundColor).toBe(darkPalette.surface);
    });
  });

  describe('Custom orders prop', () => {
    const customOrders: Order[] = [
      {
        id: 'custom-1',
        orderNumber: 'TEST-001',
        status: 'processing',
        createdAt: '2026-02-21T00:00:00Z',
        updatedAt: '2026-02-21T00:00:00Z',
        items: [
          {
            id: 'cli-1',
            modelId: futonModelId('asheville-full'),
            modelName: 'The Asheville',
            fabricId: 'natural-linen',
            fabricName: 'Natural Linen',
            fabricColor: '#D4C5A9',
            quantity: 1,
            unitPrice: 349,
            lineTotal: 349,
          },
        ],
        subtotal: 349,
        shipping: 49,
        tax: 24.43,
        total: 422.43,
        shippingAddress: {
          name: 'Test',
          street: '1 Main St',
          city: 'Testville',
          state: 'NC',
          zip: '28000',
        },
        paymentMethod: 'Visa ····1234',
      },
    ];

    it('renders custom orders instead of mock data', () => {
      const { getByTestId, queryByTestId } = renderOrderHistory({
        orders: customOrders,
      });
      expect(getByTestId('order-card-custom-1')).toBeTruthy();
      expect(queryByTestId('order-card-ord-001')).toBeNull();
    });
  });

  describe('Error state (cm-s1y — branded illustration)', () => {
    it('shows error state when useOrders returns an error', () => {
      mockUseOrders.mockReturnValue({
        orders: [],
        isLoading: false,
        error: new Error('API unavailable'),
        refresh: mockRefresh,
        statusFilter: null,
        setStatusFilter: jest.fn(),
        getOrder: jest.fn(),
      });
      const { getByTestId } = renderOrderHistory();
      expect(getByTestId('order-history-error')).toBeTruthy();
    });

    it('shows branded mountain illustration in error state', () => {
      mockUseOrders.mockReturnValue({
        orders: [],
        isLoading: false,
        error: new Error('API unavailable'),
        refresh: mockRefresh,
        statusFilter: null,
        setStatusFilter: jest.fn(),
        getOrder: jest.fn(),
      });
      const { getByTestId } = renderOrderHistory();
      expect(getByTestId('order-history-error-illustration')).toBeTruthy();
    });

    it('shows retry button in error state', () => {
      mockUseOrders.mockReturnValue({
        orders: [],
        isLoading: false,
        error: new Error('API unavailable'),
        refresh: mockRefresh,
        statusFilter: null,
        setStatusFilter: jest.fn(),
        getOrder: jest.fn(),
      });
      const { getByTestId } = renderOrderHistory();
      expect(getByTestId('order-history-retry')).toBeTruthy();
    });

    it('calls refresh when retry is pressed', () => {
      mockUseOrders.mockReturnValue({
        orders: [],
        isLoading: false,
        error: new Error('API unavailable'),
        refresh: mockRefresh,
        statusFilter: null,
        setStatusFilter: jest.fn(),
        getOrder: jest.fn(),
      });
      const { getByTestId } = renderOrderHistory();
      fireEvent.press(getByTestId('order-history-retry'));
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('pull-to-refresh', () => {
    it('FlatList has refreshControl configured', () => {
      const { getByTestId } = renderOrderHistory();
      const flatList = getByTestId('order-list');
      expect(flatList.props.refreshControl).toBeTruthy();
    });

    it('FlatList has refreshControl on empty order list', () => {
      mockUseOrders.mockReturnValue({
        orders: [],
        isLoading: false,
        error: null,
        refresh: mockRefresh,
        statusFilter: null,
        setStatusFilter: jest.fn(),
        getOrder: jest.fn(),
      });
      const { getByTestId } = renderOrderHistory();
      const flatList = getByTestId('order-list');
      expect(flatList.props.refreshControl).toBeTruthy();
    });

    it('PTR onRefresh calls orders.refresh()', () => {
      const { getByTestId } = renderOrderHistory();
      const flatList = getByTestId('order-list');
      const { onRefresh } = flatList.props.refreshControl.props;
      onRefresh();
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });
});
