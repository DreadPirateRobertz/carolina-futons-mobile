/**
 * Tests for hq-mky: Order history filter tabs + delivered-only reorder CTA.
 *
 * Covers:
 *  - Filter tabs render (All / Pending / Delivered / Cancelled)
 *  - Active tab is visually marked
 *  - Tapping a tab calls setStatusFilter with correct value
 *  - Empty state shown when filter yields no orders
 *  - Reorder CTA visible only on delivered orders
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { OrderHistoryScreen } from '../OrderHistoryScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { type Order } from '@/data/orders';

const mockSetStatusFilter = jest.fn();
const mockRefresh = jest.fn();
const mockUseOrders = jest.fn();

jest.mock('@/hooks/useOrders', () => ({
  ...jest.requireActual('@/hooks/useOrders'),
  useOrders: () => mockUseOrders(),
  ORDER_STATUS_CONFIG: {
    processing: { label: 'Processing', colorToken: 'mountainBlue' },
    shipped: { label: 'Shipped', colorToken: 'mountainBlue' },
    delivered: { label: 'Delivered', colorToken: 'success' },
    cancelled: { label: 'Cancelled', colorToken: 'muted' },
  },
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

const DELIVERED_ORDER: Order = {
  id: 'ord-delivered',
  orderNumber: 'CF-2026-0001',
  status: 'delivered',
  createdAt: '2026-02-10T00:00:00Z',
  updatedAt: '2026-02-15T00:00:00Z',
  items: [
    {
      id: 'li-1',
      modelId: 'asheville-full' as any,
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
  tax: 27.86,
  total: 425.86,
  shippingAddress: { name: 'Test', street: '1 Main', city: 'Asheville', state: 'NC', zip: '28801' },
  paymentMethod: 'Visa ····1234',
};

const PROCESSING_ORDER: Order = {
  ...DELIVERED_ORDER,
  id: 'ord-processing',
  orderNumber: 'CF-2026-0002',
  status: 'processing',
};

const CANCELLED_ORDER: Order = {
  ...DELIVERED_ORDER,
  id: 'ord-cancelled',
  orderNumber: 'CF-2026-0003',
  status: 'cancelled',
};

function makeHookReturn(
  orders: Order[],
  statusFilter: string | null = null,
) {
  return {
    orders,
    isLoading: false,
    error: null,
    refresh: mockRefresh,
    statusFilter,
    setStatusFilter: mockSetStatusFilter,
    getOrder: jest.fn(),
  };
}

function renderScreen(props: Partial<React.ComponentProps<typeof OrderHistoryScreen>> = {}) {
  return render(
    <ThemeProvider>
      <OrderHistoryScreen {...props} />
    </ThemeProvider>,
  );
}

describe('OrderHistoryScreen — filter tabs (hq-mky)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOrders.mockReturnValue(
      makeHookReturn([DELIVERED_ORDER, PROCESSING_ORDER, CANCELLED_ORDER]),
    );
  });

  describe('Filter tab rendering', () => {
    it('renders All filter tab', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('filter-tab-all')).toBeTruthy();
    });

    it('renders Pending filter tab', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('filter-tab-pending')).toBeTruthy();
    });

    it('renders Delivered filter tab', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('filter-tab-delivered')).toBeTruthy();
    });

    it('renders Cancelled filter tab', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('filter-tab-cancelled')).toBeTruthy();
    });

    it('All tab is active by default (no filter)', () => {
      const { getByTestId } = renderScreen();
      const allTab = getByTestId('filter-tab-all');
      expect(allTab.props.accessibilityState?.selected).toBe(true);
    });

    it('Delivered tab is active when statusFilter is delivered', () => {
      mockUseOrders.mockReturnValue(
        makeHookReturn([DELIVERED_ORDER], 'delivered'),
      );
      const { getByTestId } = renderScreen();
      expect(getByTestId('filter-tab-delivered').props.accessibilityState?.selected).toBe(true);
      expect(getByTestId('filter-tab-all').props.accessibilityState?.selected).toBe(false);
    });
  });

  describe('Filter tab interactions', () => {
    it('tapping Pending calls setStatusFilter with processing', () => {
      const { getByTestId } = renderScreen();
      fireEvent.press(getByTestId('filter-tab-pending'));
      expect(mockSetStatusFilter).toHaveBeenCalledWith('processing');
    });

    it('tapping Delivered calls setStatusFilter with delivered', () => {
      const { getByTestId } = renderScreen();
      fireEvent.press(getByTestId('filter-tab-delivered'));
      expect(mockSetStatusFilter).toHaveBeenCalledWith('delivered');
    });

    it('tapping Cancelled calls setStatusFilter with cancelled', () => {
      const { getByTestId } = renderScreen();
      fireEvent.press(getByTestId('filter-tab-cancelled'));
      expect(mockSetStatusFilter).toHaveBeenCalledWith('cancelled');
    });

    it('tapping All calls setStatusFilter with null', () => {
      mockUseOrders.mockReturnValue(makeHookReturn([DELIVERED_ORDER], 'delivered'));
      const { getByTestId } = renderScreen();
      fireEvent.press(getByTestId('filter-tab-all'));
      expect(mockSetStatusFilter).toHaveBeenCalledWith(null);
    });
  });

  describe('Empty state per filter', () => {
    it('shows empty state when filter yields no orders', () => {
      mockUseOrders.mockReturnValue(makeHookReturn([], 'delivered'));
      const { getByTestId } = renderScreen();
      expect(getByTestId('orders-empty-state')).toBeTruthy();
    });

    it('empty state shown even when unfiltered list has orders', () => {
      // Filter is active but no orders match — hook returns [] after filter
      mockUseOrders.mockReturnValue(makeHookReturn([], 'cancelled'));
      const { getByTestId } = renderScreen();
      expect(getByTestId('orders-empty-state')).toBeTruthy();
    });

    it('does not show empty state when filtered list has orders', () => {
      mockUseOrders.mockReturnValue(makeHookReturn([DELIVERED_ORDER], 'delivered'));
      const { queryByTestId } = renderScreen();
      expect(queryByTestId('orders-empty-state')).toBeNull();
    });
  });

  describe('Reorder CTA — delivered orders only (hq-mky AC)', () => {
    it('shows Reorder button on delivered order', () => {
      mockUseOrders.mockReturnValue(makeHookReturn([DELIVERED_ORDER]));
      const { getByTestId } = renderScreen();
      expect(getByTestId('order-reorder-ord-delivered')).toBeTruthy();
    });

    it('does NOT show Reorder button on processing order', () => {
      mockUseOrders.mockReturnValue(makeHookReturn([PROCESSING_ORDER]));
      const { queryByTestId } = renderScreen();
      expect(queryByTestId('order-reorder-ord-processing')).toBeNull();
    });

    it('does NOT show Reorder button on cancelled order', () => {
      mockUseOrders.mockReturnValue(makeHookReturn([CANCELLED_ORDER]));
      const { queryByTestId } = renderScreen();
      expect(queryByTestId('order-reorder-ord-cancelled')).toBeNull();
    });

    it('shows Reorder on delivered, hides on others in mixed list', () => {
      mockUseOrders.mockReturnValue(
        makeHookReturn([DELIVERED_ORDER, PROCESSING_ORDER, CANCELLED_ORDER]),
      );
      const { getByTestId, queryByTestId } = renderScreen();
      expect(getByTestId('order-reorder-ord-delivered')).toBeTruthy();
      expect(queryByTestId('order-reorder-ord-processing')).toBeNull();
      expect(queryByTestId('order-reorder-ord-cancelled')).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('filter tabs have accessibilityRole button', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('filter-tab-all').props.accessibilityRole).toBe('tab');
    });

    it('filter tab row has accessibilityRole tablist', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('filter-tab-bar').props.accessibilityRole).toBe('tablist');
    });
  });
});
