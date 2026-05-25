/**
 * Deeper edge-case tests for OrderHistoryScreen (cm-mbe).
 *
 * Complements orderHistoryScreen.edgeCases.test.tsx (cm-7ou) by covering gaps:
 *  - Empty history — EmptyState rendering, illustration, CTA wiring
 *  - onStartShopping — present/absent/press behavior
 *  - Cancelled / processing status rendering (no reorder button)
 *  - Pull-to-refresh — refresh control wired to hook refresh
 *  - Many items summary — 10-item order
 *  - Filter tab a11y — accessibilityState.selected per active/inactive
 *  - Header role + testID override
 *  - Mixed-status list — reorder visibility on delivered only
 *  - FlatList perf props — windowSize, maxToRenderPerBatch, initialNumToRender
 */

import React from 'react';
import { act, render, fireEvent } from '@testing-library/react-native';
import { OrderHistoryScreen } from '../OrderHistoryScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { Order } from '@/data/orders';

// ── Module mocks ──────────────────────────────────────────────────────────────

const mockRefresh = jest.fn();
const mockUseOrders = jest.fn();

jest.mock('@/hooks/useOrders', () => ({
  ...jest.requireActual('@/hooks/useOrders'),
  useOrders: () => mockUseOrders(),
}));

jest.mock('@/hooks/usePurchaseExport', () => ({
  usePurchaseExport: () => ({
    status: 'idle',
    error: null,
    sendExport: jest.fn(),
  }),
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

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ADDR = { name: 'Test', street: '1 Main', city: 'Asheville', state: 'NC', zip: '28801' };

const LINE_ITEM_BASE = {
  id: 'li-1',
  modelId: 'asheville-full' as any,
  modelName: 'The Asheville',
  fabricId: 'natural-linen',
  fabricName: 'Natural Linen',
  fabricColor: '#D4C5A9',
  quantity: 1,
  unitPrice: 349,
  lineTotal: 349,
};

function makeOrder(overrides: Partial<Order> & { id: string }): Order {
  return {
    orderNumber: `CF-2026-${overrides.id}`,
    status: 'delivered',
    createdAt: '2026-02-10T00:00:00Z',
    updatedAt: '2026-02-10T00:00:00Z',
    items: [LINE_ITEM_BASE],
    subtotal: 349,
    shipping: 49,
    tax: 27.86,
    total: 425.86,
    shippingAddress: ADDR,
    paymentMethod: 'Visa ····1234',
    ...overrides,
  };
}

const DELIVERED = makeOrder({ id: 'ord-d', orderNumber: 'CF-2026-D001' });
const CANCELLED = makeOrder({ id: 'ord-x', orderNumber: 'CF-2026-X001', status: 'cancelled' });
const PROCESSING = makeOrder({ id: 'ord-p', orderNumber: 'CF-2026-P001', status: 'processing' });

function makeBaseHook(overrides = {}) {
  return {
    orders: [DELIVERED],
    isLoading: false,
    error: null,
    refresh: mockRefresh,
    statusFilter: null,
    setStatusFilter: jest.fn(),
    getOrder: jest.fn(),
    ...overrides,
  };
}

function renderScreen(props: Partial<React.ComponentProps<typeof OrderHistoryScreen>> = {}) {
  return render(
    <ThemeProvider>
      <OrderHistoryScreen {...props} />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOrders.mockReturnValue(makeBaseHook());
});

// ── Empty history (ListEmptyComponent) ────────────────────────────────────────

describe('OrderHistoryScreen — empty history', () => {
  it('renders empty state when hook returns no orders', () => {
    mockUseOrders.mockReturnValue(makeBaseHook({ orders: [] }));
    const { getByTestId } = renderScreen();
    expect(getByTestId('orders-empty-state')).toBeTruthy();
  });

  it('renders the orders illustration in the empty state', () => {
    mockUseOrders.mockReturnValue(makeBaseHook({ orders: [] }));
    const { getByTestId } = renderScreen();
    expect(getByTestId('orders-illustration')).toBeTruthy();
  });

  it('still renders the filter tab bar when empty', () => {
    mockUseOrders.mockReturnValue(makeBaseHook({ orders: [] }));
    const { getByTestId } = renderScreen();
    expect(getByTestId('filter-tab-bar')).toBeTruthy();
  });

  it('still renders the export button when empty', () => {
    mockUseOrders.mockReturnValue(makeBaseHook({ orders: [] }));
    const { getByTestId } = renderScreen();
    expect(getByTestId('export-history-button')).toBeTruthy();
  });

  it('renders empty state when prop orders is an empty array', () => {
    const { getByTestId } = renderScreen({ orders: [] });
    expect(getByTestId('orders-empty-state')).toBeTruthy();
  });
});

// ── onStartShopping CTA wiring ────────────────────────────────────────────────

describe('OrderHistoryScreen — onStartShopping CTA', () => {
  it('renders Start Shopping action when handler is provided and list is empty', () => {
    mockUseOrders.mockReturnValue(makeBaseHook({ orders: [] }));
    const onStartShopping = jest.fn();
    const { getByText } = renderScreen({ onStartShopping });
    expect(getByText('Start Shopping')).toBeTruthy();
  });

  it('does NOT render Start Shopping action when handler is omitted', () => {
    mockUseOrders.mockReturnValue(makeBaseHook({ orders: [] }));
    const { queryByText } = renderScreen();
    expect(queryByText('Start Shopping')).toBeNull();
  });

  it('calls onStartShopping when CTA is pressed', () => {
    mockUseOrders.mockReturnValue(makeBaseHook({ orders: [] }));
    const onStartShopping = jest.fn();
    const { getByText } = renderScreen({ onStartShopping });
    fireEvent.press(getByText('Start Shopping'));
    expect(onStartShopping).toHaveBeenCalledTimes(1);
  });
});

// ── Cancelled / processing status rendering ───────────────────────────────────

describe('OrderHistoryScreen — cancelled status order', () => {
  it('does NOT show Reorder button on a cancelled order', () => {
    const { queryByTestId } = renderScreen({ orders: [CANCELLED] });
    expect(queryByTestId('order-reorder-ord-x')).toBeNull();
  });

  it('renders status badge for a cancelled order', () => {
    const { getByTestId } = renderScreen({ orders: [CANCELLED] });
    expect(getByTestId('order-status-ord-x')).toBeTruthy();
  });
});

describe('OrderHistoryScreen — processing status order', () => {
  it('does NOT show Reorder button on a processing order', () => {
    const { queryByTestId } = renderScreen({ orders: [PROCESSING] });
    expect(queryByTestId('order-reorder-ord-p')).toBeNull();
  });

  it('renders status badge for a processing order', () => {
    const { getByTestId } = renderScreen({ orders: [PROCESSING] });
    expect(getByTestId('order-status-ord-p')).toBeTruthy();
  });
});

// ── Mixed-status list ─────────────────────────────────────────────────────────

describe('OrderHistoryScreen — mixed status list', () => {
  it('shows Reorder only on delivered cards within a mixed list', () => {
    const { getByTestId, queryByTestId } = renderScreen({
      orders: [DELIVERED, CANCELLED, PROCESSING],
    });
    expect(getByTestId('order-reorder-ord-d')).toBeTruthy();
    expect(queryByTestId('order-reorder-ord-x')).toBeNull();
    expect(queryByTestId('order-reorder-ord-p')).toBeNull();
  });

  it('renders a card for each order in the mixed list', () => {
    const { getByTestId } = renderScreen({ orders: [DELIVERED, CANCELLED, PROCESSING] });
    expect(getByTestId('order-card-ord-d')).toBeTruthy();
    expect(getByTestId('order-card-ord-x')).toBeTruthy();
    expect(getByTestId('order-card-ord-p')).toBeTruthy();
  });

  it('renders Reorder buttons on multiple delivered orders', () => {
    const d1 = makeOrder({ id: 'ord-d1' });
    const d2 = makeOrder({ id: 'ord-d2' });
    const d3 = makeOrder({ id: 'ord-d3' });
    const { getByTestId } = renderScreen({ orders: [d1, d2, d3] });
    expect(getByTestId('order-reorder-ord-d1')).toBeTruthy();
    expect(getByTestId('order-reorder-ord-d2')).toBeTruthy();
    expect(getByTestId('order-reorder-ord-d3')).toBeTruthy();
  });
});

// ── Item summary — large item count ───────────────────────────────────────────

describe('OrderHistoryScreen — many items summary', () => {
  it('formats summary as "Name + 9 more" for a 10-item order', () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      ...LINE_ITEM_BASE,
      id: `li-${i}`,
      modelName: i === 0 ? 'The Asheville' : `Model ${i}`,
    }));
    const order = makeOrder({ id: 'ord-many', items });
    const { getByTestId } = renderScreen({ orders: [order] });
    expect(getByTestId('order-items-ord-many').props.children).toBe('The Asheville + 9 more');
  });
});

// ── testID prop ───────────────────────────────────────────────────────────────

describe('OrderHistoryScreen — testID prop', () => {
  it('applies default testID "order-history-screen" when not provided', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('order-history-screen')).toBeTruthy();
  });

  it('overrides the default testID when prop is given', () => {
    const { getByTestId, queryByTestId } = renderScreen({ testID: 'custom-history' });
    expect(getByTestId('custom-history')).toBeTruthy();
    expect(queryByTestId('order-history-screen')).toBeNull();
  });

  it('default testID also applies on the loading skeleton path', () => {
    mockUseOrders.mockReturnValue(makeBaseHook({ isLoading: true, orders: [] }));
    const { getByTestId } = renderScreen();
    expect(getByTestId('order-history-screen')).toBeTruthy();
  });

  it('default testID also applies on the error path', () => {
    mockUseOrders.mockReturnValue(makeBaseHook({ error: new Error('boom'), orders: [] }));
    const { getByTestId } = renderScreen();
    expect(getByTestId('order-history-screen')).toBeTruthy();
  });
});

// ── Header ────────────────────────────────────────────────────────────────────

describe('OrderHistoryScreen — header', () => {
  it('renders the My Orders header', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('order-history-header').props.children).toBe('My Orders');
  });

  it('header has accessibilityRole header', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('order-history-header').props.accessibilityRole).toBe('header');
  });
});

// ── Pull-to-refresh / refresh control ─────────────────────────────────────────

describe('OrderHistoryScreen — refresh control', () => {
  it('mounts a refresh control on the order list', () => {
    const { getByTestId } = renderScreen();
    const flatList = getByTestId('order-list');
    expect(flatList.props.refreshControl).toBeTruthy();
  });

  it('passes the order-refresh-control testID through to the refresh control', () => {
    const { getByTestId } = renderScreen();
    const flatList = getByTestId('order-list');
    expect(flatList.props.refreshControl.props.testID).toBe('order-refresh-control');
  });

  it('triggers the hook refresh when pull-to-refresh fires', () => {
    const { getByTestId } = renderScreen();
    const flatList = getByTestId('order-list');
    act(() => {
      flatList.props.refreshControl.props.onRefresh();
    });
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('exposes the order-list testID for scrolling assertions', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('order-list')).toBeTruthy();
  });
});

// ── Filter tab active/inactive a11y state ─────────────────────────────────────

describe('OrderHistoryScreen — filter tab selected state', () => {
  it('All tab is selected by default (statusFilter null)', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('filter-tab-all').props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );
  });

  it('non-active tabs report selected:false', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('filter-tab-pending').props.accessibilityState).toEqual(
      expect.objectContaining({ selected: false }),
    );
    expect(getByTestId('filter-tab-delivered').props.accessibilityState).toEqual(
      expect.objectContaining({ selected: false }),
    );
    expect(getByTestId('filter-tab-cancelled').props.accessibilityState).toEqual(
      expect.objectContaining({ selected: false }),
    );
  });

  it('Pending tab reports selected:true when statusFilter is processing', () => {
    mockUseOrders.mockReturnValue(makeBaseHook({ statusFilter: 'processing' }));
    const { getByTestId } = renderScreen();
    expect(getByTestId('filter-tab-pending').props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );
    expect(getByTestId('filter-tab-all').props.accessibilityState).toEqual(
      expect.objectContaining({ selected: false }),
    );
  });

  it('every filter tab carries an accessibilityLabel', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('filter-tab-all').props.accessibilityLabel).toBe('Filter by All');
    expect(getByTestId('filter-tab-pending').props.accessibilityLabel).toBe('Filter by Pending');
    expect(getByTestId('filter-tab-delivered').props.accessibilityLabel).toBe(
      'Filter by Delivered',
    );
    expect(getByTestId('filter-tab-cancelled').props.accessibilityLabel).toBe(
      'Filter by Cancelled',
    );
  });
});

// ── FlatList performance props ────────────────────────────────────────────────

describe('OrderHistoryScreen — FlatList perf props', () => {
  it('sets windowSize=5', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('order-list').props.windowSize).toBe(5);
  });

  it('sets maxToRenderPerBatch=8', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('order-list').props.maxToRenderPerBatch).toBe(8);
  });

  it('sets initialNumToRender=6', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('order-list').props.initialNumToRender).toBe(6);
  });

  it('sets updateCellsBatchingPeriod=100', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('order-list').props.updateCellsBatchingPeriod).toBe(100);
  });
});
