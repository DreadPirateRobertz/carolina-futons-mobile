/**
 * Deeper edge-case tests for OrderHistoryScreen (cm-7ou).
 *
 * Covers gaps not addressed by the base test suite:
 *  - Skeleton loading state (isLoading flag, prop-override suppression)
 *  - Error state suppressed when orders prop is provided
 *  - Item summary: 0 / 1 / 2 / 3+ items
 *  - Date formatting output
 *  - onSelectOrder absent — card tap is safe no-op
 *  - Prop order sorting (newest-first)
 *  - Shipped-status orders (no reorder button, status badge present)
 *  - Accessibility completeness on order cards
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
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

const LINE_ITEM_A = {
  id: 'li-a',
  modelId: 'asheville-full' as any,
  modelName: 'The Asheville',
  fabricId: 'natural-linen',
  fabricName: 'Natural Linen',
  fabricColor: '#D4C5A9',
  quantity: 1,
  unitPrice: 349,
  lineTotal: 349,
};

const LINE_ITEM_B = {
  ...LINE_ITEM_A,
  id: 'li-b',
  modelName: 'The Blue Ridge',
};

const LINE_ITEM_C = {
  ...LINE_ITEM_A,
  id: 'li-c',
  modelName: 'The Pisgah',
};

function makeOrder(overrides: Partial<Order> & { id: string }): Order {
  return {
    orderNumber: `CF-2026-${overrides.id}`,
    status: 'delivered',
    createdAt: '2026-02-10T00:00:00Z',
    updatedAt: '2026-02-10T00:00:00Z',
    items: [LINE_ITEM_A],
    subtotal: 349,
    shipping: 49,
    tax: 27.86,
    total: 425.86,
    shippingAddress: ADDR,
    paymentMethod: 'Visa ····1234',
    ...overrides,
  };
}

const DELIVERED_ORDER = makeOrder({ id: 'ord-edge-1' });

const SHIPPED_ORDER = makeOrder({ id: 'ord-edge-2', orderNumber: 'CF-2026-0002', status: 'shipped' });

function makeBaseHook(overrides = {}) {
  return {
    orders: [DELIVERED_ORDER],
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

// ── Skeleton loading state ────────────────────────────────────────────────────

describe('OrderHistoryScreen — skeleton loading state', () => {
  it('renders skeleton when isLoading and no orders prop', () => {
    mockUseOrders.mockReturnValue(makeBaseHook({ isLoading: true, orders: [] }));
    const { getByTestId } = renderScreen();
    expect(getByTestId('skeleton-order-list')).toBeTruthy();
  });

  it('does not render the order list while loading (no prop)', () => {
    mockUseOrders.mockReturnValue(makeBaseHook({ isLoading: true, orders: [] }));
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('order-list')).toBeNull();
  });

  it('does NOT render skeleton when orders prop is provided even if hook is loading', () => {
    mockUseOrders.mockReturnValue(makeBaseHook({ isLoading: true, orders: [] }));
    const { queryByTestId, getByTestId } = renderScreen({ orders: [DELIVERED_ORDER] });
    expect(queryByTestId('skeleton-order-list')).toBeNull();
    expect(getByTestId('order-list')).toBeTruthy();
  });

  it('does not render skeleton when isLoading is false', () => {
    mockUseOrders.mockReturnValue(makeBaseHook({ isLoading: false }));
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('skeleton-order-list')).toBeNull();
  });
});

// ── Error state suppression when orders prop provided ─────────────────────────

describe('OrderHistoryScreen — error state with orders prop', () => {
  it('does NOT show error screen when orders prop is present even if hook errors', () => {
    mockUseOrders.mockReturnValue(makeBaseHook({ error: new Error('API down'), orders: [] }));
    const { queryByTestId, getByTestId } = renderScreen({ orders: [DELIVERED_ORDER] });
    expect(queryByTestId('order-history-error')).toBeNull();
    expect(getByTestId('order-list')).toBeTruthy();
  });

  it('does NOT show skeleton when prop orders given and hook is loading with error', () => {
    mockUseOrders.mockReturnValue(
      makeBaseHook({ isLoading: true, error: new Error('API down'), orders: [] }),
    );
    const { queryByTestId } = renderScreen({ orders: [DELIVERED_ORDER] });
    expect(queryByTestId('skeleton-order-list')).toBeNull();
    expect(queryByTestId('order-history-error')).toBeNull();
  });

  it('shows error screen when hook errors and NO orders prop', () => {
    mockUseOrders.mockReturnValue(makeBaseHook({ error: new Error('Network'), orders: [] }));
    const { getByTestId } = renderScreen();
    expect(getByTestId('order-history-error')).toBeTruthy();
  });
});

// ── Item summary edge cases ───────────────────────────────────────────────────

describe('OrderHistoryScreen — item summary', () => {
  it('shows "No items" when order has zero items', () => {
    const emptyItemsOrder = makeOrder({ id: 'ord-empty-items', items: [] });
    const { getByTestId } = renderScreen({ orders: [emptyItemsOrder] });
    expect(getByTestId('order-items-ord-empty-items').props.children).toBe('No items');
  });

  it('shows model name only for single-item order', () => {
    const singleOrder = makeOrder({ id: 'ord-single', items: [LINE_ITEM_A] });
    const { getByTestId } = renderScreen({ orders: [singleOrder] });
    expect(getByTestId('order-items-ord-single').props.children).toBe('The Asheville');
  });

  it('shows "Name + 1 more" for a two-item order', () => {
    const twoItemOrder = makeOrder({
      id: 'ord-two',
      items: [LINE_ITEM_A, LINE_ITEM_B],
    });
    const { getByTestId } = renderScreen({ orders: [twoItemOrder] });
    expect(getByTestId('order-items-ord-two').props.children).toBe('The Asheville + 1 more');
  });

  it('shows "Name + 2 more" for a three-item order', () => {
    const threeItemOrder = makeOrder({
      id: 'ord-three',
      items: [LINE_ITEM_A, LINE_ITEM_B, LINE_ITEM_C],
    });
    const { getByTestId } = renderScreen({ orders: [threeItemOrder] });
    expect(getByTestId('order-items-ord-three').props.children).toBe('The Asheville + 2 more');
  });
});

// ── Date formatting ───────────────────────────────────────────────────────────

describe('OrderHistoryScreen — date formatting', () => {
  it('renders a human-readable date (not raw ISO string)', () => {
    const order = makeOrder({ id: 'ord-date', createdAt: '2026-02-10T14:30:00Z' });
    const { getByTestId } = renderScreen({ orders: [order] });
    const dateText = getByTestId('order-date-ord-date').props.children as string;
    // Should not be the raw ISO string
    expect(dateText).not.toContain('T14:30:00Z');
    // Should contain a year
    expect(dateText).toContain('2026');
  });

  it('date text contains a month abbreviation', () => {
    const order = makeOrder({ id: 'ord-date2', createdAt: '2026-04-15T00:00:00Z' });
    const { getByTestId } = renderScreen({ orders: [order] });
    const dateText = getByTestId('order-date-ord-date2').props.children as string;
    expect(dateText).toContain('Apr');
  });
});

// ── onSelectOrder absent ──────────────────────────────────────────────────────

describe('OrderHistoryScreen — onSelectOrder not provided', () => {
  it('pressing an order card without onSelectOrder handler does not throw', () => {
    const { getByTestId } = renderScreen({ orders: [DELIVERED_ORDER] });
    expect(() => fireEvent.press(getByTestId('order-card-ord-edge-1'))).not.toThrow();
  });
});

// ── Prop order sorting ────────────────────────────────────────────────────────

describe('OrderHistoryScreen — prop order sorting', () => {
  it('sorts prop orders newest-first by createdAt', () => {
    const older = makeOrder({ id: 'ord-older', createdAt: '2026-01-01T00:00:00Z' });
    const newer = makeOrder({ id: 'ord-newer', createdAt: '2026-03-01T00:00:00Z' });
    // Pass older first intentionally to confirm sorting flips them
    const { getByTestId } = renderScreen({ orders: [older, newer] });
    const list = getByTestId('order-list');
    expect(list.props.data[0].id).toBe('ord-newer');
    expect(list.props.data[1].id).toBe('ord-older');
  });

  it('handles single prop order without sorting error', () => {
    const { getByTestId } = renderScreen({ orders: [DELIVERED_ORDER] });
    expect(getByTestId('order-card-ord-edge-1')).toBeTruthy();
  });

  it('handles same-timestamp orders without throwing', () => {
    const a = makeOrder({ id: 'ord-ts-a', createdAt: '2026-02-10T00:00:00Z' });
    const b = makeOrder({ id: 'ord-ts-b', createdAt: '2026-02-10T00:00:00Z' });
    expect(() => renderScreen({ orders: [a, b] })).not.toThrow();
  });
});

// ── Shipped status ────────────────────────────────────────────────────────────

describe('OrderHistoryScreen — shipped status order', () => {
  it('does NOT show Reorder button on a shipped order', () => {
    const { queryByTestId } = renderScreen({ orders: [SHIPPED_ORDER] });
    expect(queryByTestId('order-reorder-ord-edge-2')).toBeNull();
  });

  it('renders status badge for a shipped order', () => {
    const { getByTestId } = renderScreen({ orders: [SHIPPED_ORDER] });
    expect(getByTestId('order-status-ord-edge-2')).toBeTruthy();
  });

  it('renders card for a shipped order', () => {
    const { getByTestId } = renderScreen({ orders: [SHIPPED_ORDER] });
    expect(getByTestId('order-card-ord-edge-2')).toBeTruthy();
  });
});

// ── Accessibility on order cards ──────────────────────────────────────────────

describe('OrderHistoryScreen — order card accessibility', () => {
  it('order card has accessibilityRole button', () => {
    const { getByTestId } = renderScreen({ orders: [DELIVERED_ORDER] });
    expect(getByTestId('order-card-ord-edge-1').props.accessibilityRole).toBe('button');
  });

  it('order card accessibilityLabel contains order number', () => {
    const { getByTestId } = renderScreen({ orders: [DELIVERED_ORDER] });
    expect(getByTestId('order-card-ord-edge-1').props.accessibilityLabel).toContain(
      DELIVERED_ORDER.orderNumber,
    );
  });

  it('order card accessibilityLabel contains formatted price', () => {
    const { getByTestId } = renderScreen({ orders: [DELIVERED_ORDER] });
    const label = getByTestId('order-card-ord-edge-1').props.accessibilityLabel as string;
    // Price $425.86 should appear in some form
    expect(label).toContain('425.86');
  });

  it('order number text node renders the order number', () => {
    const { getByTestId } = renderScreen({ orders: [DELIVERED_ORDER] });
    expect(getByTestId('order-number-ord-edge-1').props.children).toBe(
      DELIVERED_ORDER.orderNumber,
    );
  });

  it('reorder button on delivered order has accessibilityRole button', () => {
    const { getByTestId } = renderScreen({ orders: [DELIVERED_ORDER] });
    expect(getByTestId('order-reorder-ord-edge-1').props.accessibilityRole).toBe('button');
  });

  it('reorder button on delivered order has an accessibilityLabel', () => {
    const { getByTestId } = renderScreen({ orders: [DELIVERED_ORDER] });
    const label = getByTestId('order-reorder-ord-edge-1').props.accessibilityLabel as string;
    expect(label).toBeTruthy();
    expect(label.toLowerCase()).toContain('reorder');
  });
});
