/**
 * TDD tests for OrderHistoryScreen — reorder confirmation sheet integration (cm-bjq).
 *
 * Tests: sheet opens on reorder tap, shows correct order, confirms add-to-cart,
 * dismisses without adding, partial/all OOS warnings, empty order.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { OrderHistoryScreen } from '../OrderHistoryScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { MOCK_ORDERS, type Order } from '@/data/orders';
import { futonModelId } from '@/data/productId';
import { FUTON_MODELS, FABRICS } from '@/data/futons';
import type { ReorderPreview } from '@/services/reorderService';

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
    sendExport: jest.fn().mockResolvedValue(undefined),
  }),
}));

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

// Mock buildReorderPreview so tests control stock state
const mockBuildReorderPreview = jest.fn();
jest.mock('@/services/reorderService', () => ({
  ...jest.requireActual('@/services/reorderService'),
  buildReorderPreview: (...args: unknown[]) => mockBuildReorderPreview(...args),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const MODEL_A = FUTON_MODELS[0];
const FABRIC_A = FABRICS[0];

const allAvailablePreview: ReorderPreview = {
  available: MOCK_ORDERS[0].items
    .filter((li) => {
      const m = FUTON_MODELS.find((m) => m.id === li.modelId);
      const f = FABRICS.find((f) => f.id === li.fabricId);
      return m && f;
    })
    .map((li) => ({
      lineItem: li,
      model: FUTON_MODELS.find((m) => m.id === li.modelId) ?? MODEL_A,
      fabric: FABRICS.find((f) => f.id === li.fabricId) ?? FABRIC_A,
    })),
  unavailable: [],
};

const partialOOSPreview: ReorderPreview = {
  available: allAvailablePreview.available.slice(0, 1),
  unavailable: [MOCK_ORDERS[0].items[0]],
};

const allOOSPreview: ReorderPreview = {
  available: [],
  unavailable: MOCK_ORDERS[0].items,
};

const emptyPreview: ReorderPreview = { available: [], unavailable: [] };

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

function renderOrderHistory(props: Partial<React.ComponentProps<typeof OrderHistoryScreen>> = {}) {
  return render(
    <ThemeProvider>
      <OrderHistoryScreen {...props} />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOrders.mockReturnValue(BASE_HOOK_STATE);
  // Default: all items available
  mockBuildReorderPreview.mockReturnValue(allAvailablePreview);
});

// ── Sheet opens ───────────────────────────────────────────────────────────────

describe('OrderHistoryScreen — reorder sheet (cm-bjq)', () => {
  describe('sheet visibility', () => {
    it('confirmation sheet is not visible initially', () => {
      const { queryByTestId } = renderOrderHistory();
      expect(queryByTestId('reorder-sheet')).toBeNull();
    });

    it('shows the confirmation sheet when Reorder is pressed', async () => {
      const { getByTestId } = renderOrderHistory();
      fireEvent.press(getByTestId('order-reorder-ord-001'));
      await waitFor(() => {
        expect(getByTestId('reorder-sheet')).toBeTruthy();
      });
    });

    it('sheet displays the order number of the tapped order', async () => {
      const { getByTestId } = renderOrderHistory();
      fireEvent.press(getByTestId('order-reorder-ord-001'));
      await waitFor(() => {
        const title = getByTestId('reorder-sheet-title');
        expect(title.props.children).toContain('CF-2026-0147');
      });
    });

    it('pressing Reorder on a delivered order shows that order in the sheet', async () => {
      // hq-mky: Reorder CTA is delivered-only; use a delivered order
      const deliveredOrder = MOCK_ORDERS.find((o) => o.status === 'delivered');
      if (!deliveredOrder) return;
      const { getByTestId } = renderOrderHistory();
      fireEvent.press(getByTestId(`order-reorder-${deliveredOrder.id}`));
      await waitFor(() => {
        const title = getByTestId('reorder-sheet-title');
        expect(title.props.children).toContain(deliveredOrder.orderNumber);
      });
    });
  });

  // ── Confirm → adds to cart ────────────────────────────────────────────────

  describe('confirming reorder', () => {
    it('calls addItem for each available item when confirmed', async () => {
      const { getByTestId } = renderOrderHistory();
      fireEvent.press(getByTestId('order-reorder-ord-001'));
      await waitFor(() => getByTestId('reorder-sheet'));
      fireEvent.press(getByTestId('reorder-confirm-btn'));
      expect(mockAddItem).toHaveBeenCalledTimes(allAvailablePreview.available.length);
    });

    it('passes correct model, fabric, and quantity to addItem', async () => {
      const { getByTestId } = renderOrderHistory();
      fireEvent.press(getByTestId('order-reorder-ord-001'));
      await waitFor(() => getByTestId('reorder-sheet'));
      fireEvent.press(getByTestId('reorder-confirm-btn'));

      const firstAvailable = allAvailablePreview.available[0];
      expect(mockAddItem).toHaveBeenCalledWith(
        firstAvailable.model,
        firstAvailable.fabric,
        firstAvailable.lineItem.quantity,
      );
    });

    it('closes the sheet after confirming', async () => {
      const { getByTestId, queryByTestId } = renderOrderHistory();
      fireEvent.press(getByTestId('order-reorder-ord-001'));
      await waitFor(() => getByTestId('reorder-sheet'));
      fireEvent.press(getByTestId('reorder-confirm-btn'));
      await waitFor(() => {
        expect(queryByTestId('reorder-sheet')).toBeNull();
      });
    });
  });

  // ── Dismiss → no cart change ──────────────────────────────────────────────

  describe('dismissing the sheet', () => {
    it('does not call addItem when sheet is dismissed', async () => {
      const { getByTestId } = renderOrderHistory();
      fireEvent.press(getByTestId('order-reorder-ord-001'));
      await waitFor(() => getByTestId('reorder-sheet'));
      fireEvent.press(getByTestId('reorder-sheet-close'));
      expect(mockAddItem).not.toHaveBeenCalled();
    });

    it('closes the sheet when dismiss is pressed', async () => {
      const { getByTestId, queryByTestId } = renderOrderHistory();
      fireEvent.press(getByTestId('order-reorder-ord-001'));
      await waitFor(() => getByTestId('reorder-sheet'));
      fireEvent.press(getByTestId('reorder-sheet-close'));
      await waitFor(() => {
        expect(queryByTestId('reorder-sheet')).toBeNull();
      });
    });
  });

  // ── Partial OOS ───────────────────────────────────────────────────────────

  describe('partial OOS order', () => {
    beforeEach(() => {
      mockBuildReorderPreview.mockReturnValue(partialOOSPreview);
    });

    it('shows the OOS section in the sheet', async () => {
      const { getByTestId } = renderOrderHistory();
      fireEvent.press(getByTestId('order-reorder-ord-001'));
      await waitFor(() => {
        expect(getByTestId('reorder-oos-section')).toBeTruthy();
      });
    });

    it('adds only available items to cart on confirm', async () => {
      const { getByTestId } = renderOrderHistory();
      fireEvent.press(getByTestId('order-reorder-ord-001'));
      await waitFor(() => getByTestId('reorder-sheet'));
      fireEvent.press(getByTestId('reorder-confirm-btn'));
      expect(mockAddItem).toHaveBeenCalledTimes(partialOOSPreview.available.length);
    });
  });

  // ── All OOS ───────────────────────────────────────────────────────────────

  describe('all OOS order', () => {
    beforeEach(() => {
      mockBuildReorderPreview.mockReturnValue(allOOSPreview);
    });

    it('shows the confirmation sheet (not silently rejected)', async () => {
      const { getByTestId } = renderOrderHistory();
      fireEvent.press(getByTestId('order-reorder-ord-001'));
      await waitFor(() => {
        expect(getByTestId('reorder-sheet')).toBeTruthy();
      });
    });

    it('confirm button is disabled when all items are OOS', async () => {
      const { getByTestId } = renderOrderHistory();
      fireEvent.press(getByTestId('order-reorder-ord-001'));
      await waitFor(() => getByTestId('reorder-sheet'));
      const btn = getByTestId('reorder-confirm-btn');
      expect(btn.props.accessibilityState?.disabled ?? btn.props.disabled).toBeTruthy();
    });

    it('does not add any items when all OOS', async () => {
      const { getByTestId } = renderOrderHistory();
      fireEvent.press(getByTestId('order-reorder-ord-001'));
      await waitFor(() => getByTestId('reorder-sheet'));
      fireEvent.press(getByTestId('reorder-confirm-btn'));
      expect(mockAddItem).not.toHaveBeenCalled();
    });
  });

  // ── Empty order ───────────────────────────────────────────────────────────

  describe('empty order', () => {
    it('shows the sheet with empty-order message', async () => {
      mockBuildReorderPreview.mockReturnValue(emptyPreview);
      const emptyOrder: Order = {
        ...MOCK_ORDERS[0],
        id: 'ord-empty',
        items: [],
      };
      const { getByTestId } = renderOrderHistory({ orders: [emptyOrder] });
      fireEvent.press(getByTestId('order-reorder-ord-empty'));
      await waitFor(() => {
        expect(getByTestId('reorder-empty-message')).toBeTruthy();
      });
    });
  });

  // ── Reorder does not navigate ─────────────────────────────────────────────

  describe('reorder vs card tap isolation', () => {
    it('pressing Reorder does not trigger onSelectOrder', async () => {
      const onSelectOrder = jest.fn();
      const { getByTestId } = renderOrderHistory({ onSelectOrder });
      fireEvent.press(getByTestId('order-reorder-ord-001'));
      await waitFor(() => getByTestId('reorder-sheet'));
      expect(onSelectOrder).not.toHaveBeenCalled();
    });

    it('pressing card (not reorder) still calls onSelectOrder', () => {
      const onSelectOrder = jest.fn();
      const { getByTestId } = renderOrderHistory({ onSelectOrder });
      fireEvent.press(getByTestId('order-card-ord-001'));
      expect(onSelectOrder).toHaveBeenCalledWith('ord-001');
      expect(mockAddItem).not.toHaveBeenCalled();
    });
  });
});
