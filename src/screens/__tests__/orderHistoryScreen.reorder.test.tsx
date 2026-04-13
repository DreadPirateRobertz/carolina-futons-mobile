/**
 * TDD tests for OrderHistoryScreen reorder CTA — cm-7ot / updated cm-bjq.
 *
 * cm-7ot: Reorder button presence + accessibility.
 * cm-bjq: Reorder now opens a confirmation sheet; addItem is called only after
 *         the user presses Confirm. Tests updated to simulate the two-step flow.
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { OrderHistoryScreen } from '../OrderHistoryScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { MOCK_ORDERS, type Order } from '@/data/orders';
import { futonModelId } from '@/data/productId';
import { FUTON_MODELS, FABRICS } from '@/data/futons';

// ── useOrders mock ────────────────────────────────────────────
const mockRefresh = jest.fn();
const mockUseOrders = jest.fn();
jest.mock('@/hooks/useOrders', () => ({
  ...jest.requireActual('@/hooks/useOrders'),
  useOrders: () => mockUseOrders(),
}));

// ── useCart mock ──────────────────────────────────────────────
const mockAddItem = jest.fn();
jest.mock('@/hooks/useCart', () => ({
  ...jest.requireActual('@/hooks/useCart'),
  useCart: () => ({
    addItem: mockAddItem,
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

function renderOrderHistory(props: Partial<React.ComponentProps<typeof OrderHistoryScreen>> = {}) {
  return render(
    <ThemeProvider>
      <OrderHistoryScreen {...props} />
    </ThemeProvider>,
  );
}

const SORTED_ORDERS = [...MOCK_ORDERS].sort(
  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
);

const BASE_HOOK_STATE = {
  orders: SORTED_ORDERS,
  isLoading: false,
  error: null,
  refresh: mockRefresh,
  statusFilter: null,
  setStatusFilter: jest.fn(),
  getOrder: jest.fn(),
};

// Flush pending React state updates between tests to prevent
// "Cannot log after tests are done" from unresolved async effects.
afterEach(async () => {
  await act(async () => {});
});

describe('OrderHistoryScreen — reorder CTA (cm-7ot)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOrders.mockReturnValue(BASE_HOOK_STATE);
  });

  describe('Reorder button presence', () => {
    it('renders a reorder button only on delivered order cards', () => {
      const { getByTestId, queryByTestId } = renderOrderHistory();
      for (const order of MOCK_ORDERS) {
        if (order.status === 'delivered') {
          expect(getByTestId(`order-reorder-${order.id}`)).toBeTruthy();
        } else {
          expect(queryByTestId(`order-reorder-${order.id}`)).toBeNull();
        }
      }
    });

    it('reorder button has correct accessibility label', () => {
      const { getByTestId } = renderOrderHistory();
      const btn = getByTestId('order-reorder-ord-001');
      expect(btn.props.accessibilityLabel).toMatch(/reorder/i);
    });

    it('reorder button has accessibility role "button"', () => {
      const { getByTestId } = renderOrderHistory();
      const btn = getByTestId('order-reorder-ord-001');
      expect(btn.props.accessibilityRole).toBe('button');
    });
  });

  describe('Reorder action — adds items to cart', () => {
    // cm-bjq: Reorder opens a confirmation sheet. addItem is called only after
    // the user confirms. Tests simulate the full two-step flow.

    it('calls addItem for each line item when reorder is confirmed', async () => {
      const { getByTestId } = renderOrderHistory();
      fireEvent.press(getByTestId('order-reorder-ord-001'));
      await waitFor(() => getByTestId('reorder-confirm-btn'));
      fireEvent.press(getByTestId('reorder-confirm-btn'));

      const order = MOCK_ORDERS.find((o) => o.id === 'ord-001')!;
      expect(mockAddItem).toHaveBeenCalledTimes(order.items.length);
    });

    it('passes correct model to addItem', async () => {
      const { getByTestId } = renderOrderHistory();
      fireEvent.press(getByTestId('order-reorder-ord-001'));
      await waitFor(() => getByTestId('reorder-confirm-btn'));
      fireEvent.press(getByTestId('reorder-confirm-btn'));

      const order = MOCK_ORDERS.find((o) => o.id === 'ord-001')!;
      const expectedModel = FUTON_MODELS.find((m) => m.id === order.items[0].modelId);
      expect(mockAddItem).toHaveBeenCalledWith(
        expectedModel,
        expect.anything(),
        order.items[0].quantity,
      );
    });

    it('passes correct fabric to addItem', async () => {
      const { getByTestId } = renderOrderHistory();
      fireEvent.press(getByTestId('order-reorder-ord-001'));
      await waitFor(() => getByTestId('reorder-confirm-btn'));
      fireEvent.press(getByTestId('reorder-confirm-btn'));

      const order = MOCK_ORDERS.find((o) => o.id === 'ord-001')!;
      const expectedFabric = FABRICS.find((f) => f.id === order.items[0].fabricId);
      expect(mockAddItem).toHaveBeenCalledWith(
        expect.anything(),
        expectedFabric,
        order.items[0].quantity,
      );
    });

    it('passes correct quantity to addItem', async () => {
      const { getByTestId } = renderOrderHistory();
      fireEvent.press(getByTestId('order-reorder-ord-001'));
      await waitFor(() => getByTestId('reorder-confirm-btn'));
      fireEvent.press(getByTestId('reorder-confirm-btn'));

      const order = MOCK_ORDERS.find((o) => o.id === 'ord-001')!;
      expect(mockAddItem).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        order.items[0].quantity,
      );
    });

    it('adds all items for a multi-item delivered order', async () => {
      const multiItemOrder = MOCK_ORDERS.find(
        (o) => o.items.length > 1 && o.status === 'delivered',
      );
      if (!multiItemOrder) return; // skip if fixture lacks such an order

      const { getByTestId } = renderOrderHistory();
      fireEvent.press(getByTestId(`order-reorder-${multiItemOrder.id}`));
      await waitFor(() => getByTestId('reorder-confirm-btn'));
      fireEvent.press(getByTestId('reorder-confirm-btn'));

      expect(mockAddItem).toHaveBeenCalledTimes(multiItemOrder.items.length);
    });

    it('does not call addItem when sheet is dismissed without confirming', async () => {
      const { getByTestId } = renderOrderHistory();
      fireEvent.press(getByTestId('order-reorder-ord-001'));
      await waitFor(() => getByTestId('reorder-sheet-close'));
      fireEvent.press(getByTestId('reorder-sheet-close'));
      expect(mockAddItem).not.toHaveBeenCalled();
    });

    it('does not call addItem when reorder is pressed but not yet confirmed', async () => {
      const { getByTestId } = renderOrderHistory();
      fireEvent.press(getByTestId('order-reorder-ord-001'));
      await waitFor(() => getByTestId('reorder-sheet'));
      // Sheet is open but Confirm not pressed yet
      expect(mockAddItem).not.toHaveBeenCalled();
    });

    it('does not call addItem for items whose catalog model is not found', async () => {
      const orderWithUnknownProduct: Order = {
        ...MOCK_ORDERS[0],
        id: 'ord-unknown',
        items: [
          {
            ...MOCK_ORDERS[0].items[0],
            modelId: futonModelId('nonexistent-model-xyz'),
          },
        ],
      };
      const { getByTestId } = renderOrderHistory({ orders: [orderWithUnknownProduct] });
      fireEvent.press(getByTestId('order-reorder-ord-unknown'));
      await waitFor(() => getByTestId('reorder-sheet'));
      // Confirm is disabled (all OOS) — pressing it should be a no-op
      fireEvent.press(getByTestId('reorder-confirm-btn'));
      expect(mockAddItem).not.toHaveBeenCalled();
    });
  });

  describe('Reorder button does not interfere with card navigation', () => {
    it('pressing card (not reorder button) still calls onSelectOrder', () => {
      const onSelectOrder = jest.fn();
      const { getByTestId } = renderOrderHistory({ onSelectOrder });
      fireEvent.press(getByTestId('order-card-ord-001'));
      expect(onSelectOrder).toHaveBeenCalledWith('ord-001');
      expect(mockAddItem).not.toHaveBeenCalled();
    });
  });
});
