/**
 * TDD tests for useOrderHistory (hq-xdn).
 *
 * Covers:
 *  - Filter: statusFilter default, setStatusFilter, filtering logic, empty result
 *  - Reorder: handleReorder sets preview, handleConfirmReorder calls addItem,
 *    handleDismissSheet clears without cart mutation
 *  - Edge cases: OOS orders, empty items, filter while sheet open
 */

import { renderHook, act } from '@testing-library/react-native';
import { useOrderHistory } from '../useOrderHistory';
import type { Order, OrderStatus } from '@/data/orders';
import type { ReorderPreview, ReorderLineItem } from '@/services/reorderService';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockSetStatusFilter = jest.fn();
const mockRefresh = jest.fn();
const mockAddItem = jest.fn();
const mockGetModel = jest.fn();
const mockGetFabric = jest.fn();
const mockBuildReorderPreview = jest.fn();

jest.mock('@/hooks/useOrders', () => ({
  useOrders: () => mockUseOrdersReturn(),
}));

jest.mock('@/hooks/useCart', () => ({
  useCart: () => ({ addItem: mockAddItem }),
}));

jest.mock('@/hooks/useFutonModels', () => ({
  useFutonModels: () => ({ getModel: mockGetModel, getFabric: mockGetFabric }),
}));

jest.mock('@/services/reorderService', () => ({
  buildReorderPreview: (...args: unknown[]) => mockBuildReorderPreview(...args),
}));

// ── Shared fixtures ────────────────────────────────────────────────────────────

const LINE_ITEM = {
  id: 'li-1',
  modelId: 'asheville-full' as any,
  modelName: 'The Asheville',
  fabricId: 'natural-linen',
  fabricName: 'Natural Linen',
  fabricColor: '#D4C5A9',
  quantity: 2,
  unitPrice: 349,
  lineTotal: 698,
};

const ADDR = { name: 'Test', street: '1 Main', city: 'Asheville', state: 'NC', zip: '28801' };

const ORDER_DELIVERED: Order = {
  id: 'ord-1',
  orderNumber: 'CF-2026-0001',
  status: 'delivered',
  createdAt: '2026-02-10T00:00:00Z',
  updatedAt: '2026-02-15T00:00:00Z',
  items: [LINE_ITEM],
  subtotal: 698,
  shipping: 49,
  tax: 55.84,
  total: 802.84,
  shippingAddress: ADDR,
  paymentMethod: 'Visa ····1234',
};

const ORDER_PROCESSING: Order = {
  ...ORDER_DELIVERED,
  id: 'ord-2',
  orderNumber: 'CF-2026-0002',
  status: 'processing',
};

const ORDER_CANCELLED: Order = {
  ...ORDER_DELIVERED,
  id: 'ord-3',
  orderNumber: 'CF-2026-0003',
  status: 'cancelled',
};

const ORDER_SHIPPED: Order = {
  ...ORDER_DELIVERED,
  id: 'ord-4',
  orderNumber: 'CF-2026-0004',
  status: 'shipped',
};

const MODEL = { id: 'asheville-full', name: 'The Asheville', basePrice: 349 };
const FABRIC = { id: 'natural-linen', name: 'Natural Linen', price: 0 };

const FULL_PREVIEW: ReorderPreview = {
  available: [{ lineItem: LINE_ITEM, model: MODEL as any, fabric: FABRIC as any }],
  unavailable: [],
};

const ALL_OOS_PREVIEW: ReorderPreview = {
  available: [],
  unavailable: [LINE_ITEM],
};

// Factory for the useOrders mock return value — avoids retyping in every test
let mockUseOrdersState: {
  orders: Order[];
  isLoading: boolean;
  error: Error | null;
  statusFilter: OrderStatus | null;
  setStatusFilter: jest.Mock;
  getOrder: jest.Mock;
  refresh: jest.Mock;
};

function mockUseOrdersReturn() {
  return mockUseOrdersState;
}

function setOrders(orders: Order[], filter: OrderStatus | null = null) {
  mockUseOrdersState = {
    orders,
    isLoading: false,
    error: null,
    statusFilter: filter,
    setStatusFilter: mockSetStatusFilter,
    getOrder: jest.fn((id) => orders.find((o) => o.id === id)),
    refresh: mockRefresh,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  setOrders([ORDER_DELIVERED, ORDER_PROCESSING, ORDER_CANCELLED, ORDER_SHIPPED]);
  mockBuildReorderPreview.mockReturnValue(FULL_PREVIEW);
  mockGetModel.mockReturnValue(MODEL);
  mockGetFabric.mockReturnValue(FABRIC);
  mockAddItem.mockReturnValue(undefined);
});

// ── Filter delegation ──────────────────────────────────────────────────────────

describe('useOrderHistory — filter delegation', () => {
  it('exposes orders from useOrders', () => {
    const { result } = renderHook(() => useOrderHistory());
    expect(result.current.orders).toHaveLength(4);
  });

  it('statusFilter is null by default', () => {
    const { result } = renderHook(() => useOrderHistory());
    expect(result.current.statusFilter).toBeNull();
  });

  it('exposes isLoading from useOrders', () => {
    mockUseOrdersState = { ...mockUseOrdersState, isLoading: true };
    const { result } = renderHook(() => useOrderHistory());
    expect(result.current.isLoading).toBe(true);
  });

  it('exposes error from useOrders', () => {
    const err = new Error('Network');
    mockUseOrdersState = { ...mockUseOrdersState, error: err };
    const { result } = renderHook(() => useOrderHistory());
    expect(result.current.error).toBe(err);
  });

  it('setStatusFilter calls through to useOrders', () => {
    const { result } = renderHook(() => useOrderHistory());
    act(() => {
      result.current.setStatusFilter('delivered');
    });
    expect(mockSetStatusFilter).toHaveBeenCalledWith('delivered');
  });

  it('setStatusFilter(null) clears the filter', () => {
    setOrders([ORDER_DELIVERED], 'delivered');
    const { result } = renderHook(() => useOrderHistory());
    act(() => {
      result.current.setStatusFilter(null);
    });
    expect(mockSetStatusFilter).toHaveBeenCalledWith(null);
  });

  it('setStatusFilter passes processing for Pending', () => {
    const { result } = renderHook(() => useOrderHistory());
    act(() => {
      result.current.setStatusFilter('processing');
    });
    expect(mockSetStatusFilter).toHaveBeenCalledWith('processing');
  });

  it('refresh delegates to useOrders refresh', () => {
    const { result } = renderHook(() => useOrderHistory());
    act(() => {
      result.current.refresh();
    });
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('reflects filtered orders from useOrders (hook does the filtering)', () => {
    setOrders([ORDER_DELIVERED], 'delivered');
    const { result } = renderHook(() => useOrderHistory());
    expect(result.current.orders).toHaveLength(1);
    expect(result.current.orders[0].status).toBe('delivered');
  });

  it('exposes empty orders array when filter yields no matches', () => {
    setOrders([], 'cancelled');
    const { result } = renderHook(() => useOrderHistory());
    expect(result.current.orders).toHaveLength(0);
  });

  it('exposes current statusFilter value', () => {
    setOrders([ORDER_DELIVERED], 'delivered');
    const { result } = renderHook(() => useOrderHistory());
    expect(result.current.statusFilter).toBe('delivered');
  });
});

// ── Reorder — initial state ────────────────────────────────────────────────────

describe('useOrderHistory — reorder initial state', () => {
  it('sheetOrder starts as null', () => {
    const { result } = renderHook(() => useOrderHistory());
    expect(result.current.sheetOrder).toBeNull();
  });

  it('reorderPreview starts as null', () => {
    const { result } = renderHook(() => useOrderHistory());
    expect(result.current.reorderPreview).toBeNull();
  });
});

// ── Reorder — handleReorder ────────────────────────────────────────────────────

describe('useOrderHistory — handleReorder', () => {
  it('sets sheetOrder to the tapped order', () => {
    const { result } = renderHook(() => useOrderHistory());
    act(() => {
      result.current.handleReorder(ORDER_DELIVERED);
    });
    expect(result.current.sheetOrder).toBe(ORDER_DELIVERED);
  });

  it('calls buildReorderPreview with order items and catalog getters', () => {
    const { result } = renderHook(() => useOrderHistory());
    act(() => {
      result.current.handleReorder(ORDER_DELIVERED);
    });
    expect(mockBuildReorderPreview).toHaveBeenCalledWith(
      ORDER_DELIVERED.items,
      mockGetModel,
      mockGetFabric,
    );
  });

  it('sets reorderPreview to the result of buildReorderPreview', () => {
    const { result } = renderHook(() => useOrderHistory());
    act(() => {
      result.current.handleReorder(ORDER_DELIVERED);
    });
    expect(result.current.reorderPreview).toBe(FULL_PREVIEW);
  });

  it('handles order with no items (empty preview)', () => {
    mockBuildReorderPreview.mockReturnValue({ available: [], unavailable: [] });
    const emptyOrder: Order = { ...ORDER_DELIVERED, items: [] };
    const { result } = renderHook(() => useOrderHistory());
    act(() => {
      result.current.handleReorder(emptyOrder);
    });
    expect(result.current.sheetOrder).toBe(emptyOrder);
    expect(result.current.reorderPreview).toEqual({ available: [], unavailable: [] });
  });

  it('replacing an open sheet updates to the new order', () => {
    const { result } = renderHook(() => useOrderHistory());
    act(() => {
      result.current.handleReorder(ORDER_DELIVERED);
    });
    expect(result.current.sheetOrder?.id).toBe('ord-1');

    const secondOrder: Order = { ...ORDER_DELIVERED, id: 'ord-99', orderNumber: 'CF-2026-0099' };
    act(() => {
      result.current.handleReorder(secondOrder);
    });
    expect(result.current.sheetOrder?.id).toBe('ord-99');
  });
});

// ── Reorder — handleConfirmReorder ────────────────────────────────────────────

describe('useOrderHistory — handleConfirmReorder', () => {
  it('calls addItem for each available item', () => {
    const { result } = renderHook(() => useOrderHistory());
    act(() => {
      result.current.handleReorder(ORDER_DELIVERED);
    });

    const items: ReorderLineItem[] = FULL_PREVIEW.available;
    act(() => {
      result.current.handleConfirmReorder(items);
    });

    expect(mockAddItem).toHaveBeenCalledTimes(1);
    expect(mockAddItem).toHaveBeenCalledWith(MODEL, FABRIC, LINE_ITEM.quantity);
  });

  it('calls addItem once per item in a multi-item order', () => {
    const LINE_ITEM_2 = { ...LINE_ITEM, id: 'li-2', modelId: 'chapel-hill-queen' as any };
    const MODEL_2 = { id: 'chapel-hill-queen', name: 'Chapel Hill Queen', basePrice: 449 };
    const multiPreview: ReorderPreview = {
      available: [
        { lineItem: LINE_ITEM, model: MODEL as any, fabric: FABRIC as any },
        { lineItem: LINE_ITEM_2, model: MODEL_2 as any, fabric: FABRIC as any },
      ],
      unavailable: [],
    };
    const { result } = renderHook(() => useOrderHistory());
    act(() => {
      result.current.handleConfirmReorder(multiPreview.available);
    });
    expect(mockAddItem).toHaveBeenCalledTimes(2);
  });

  it('clears sheetOrder after confirm', () => {
    const { result } = renderHook(() => useOrderHistory());
    act(() => {
      result.current.handleReorder(ORDER_DELIVERED);
    });
    act(() => {
      result.current.handleConfirmReorder(FULL_PREVIEW.available);
    });
    expect(result.current.sheetOrder).toBeNull();
  });

  it('clears reorderPreview after confirm', () => {
    const { result } = renderHook(() => useOrderHistory());
    act(() => {
      result.current.handleReorder(ORDER_DELIVERED);
    });
    act(() => {
      result.current.handleConfirmReorder(FULL_PREVIEW.available);
    });
    expect(result.current.reorderPreview).toBeNull();
  });

  it('does not call addItem when available items array is empty (all OOS)', () => {
    const { result } = renderHook(() => useOrderHistory());
    act(() => {
      result.current.handleReorder(ORDER_DELIVERED);
    });
    act(() => {
      result.current.handleConfirmReorder([]);
    });
    expect(mockAddItem).not.toHaveBeenCalled();
  });

  it('only adds available items — skips unavailable ones from preview', () => {
    const partialPreview: ReorderPreview = {
      available: [{ lineItem: LINE_ITEM, model: MODEL as any, fabric: FABRIC as any }],
      unavailable: [{ ...LINE_ITEM, id: 'li-oos' }],
    };
    const { result } = renderHook(() => useOrderHistory());
    act(() => {
      result.current.handleConfirmReorder(partialPreview.available);
    });
    expect(mockAddItem).toHaveBeenCalledTimes(1);
  });
});

// ── Reorder — handleDismissSheet ─────────────────────────────────────────────

describe('useOrderHistory — handleDismissSheet', () => {
  it('clears sheetOrder on dismiss', () => {
    const { result } = renderHook(() => useOrderHistory());
    act(() => {
      result.current.handleReorder(ORDER_DELIVERED);
    });
    act(() => {
      result.current.handleDismissSheet();
    });
    expect(result.current.sheetOrder).toBeNull();
  });

  it('clears reorderPreview on dismiss', () => {
    const { result } = renderHook(() => useOrderHistory());
    act(() => {
      result.current.handleReorder(ORDER_DELIVERED);
    });
    act(() => {
      result.current.handleDismissSheet();
    });
    expect(result.current.reorderPreview).toBeNull();
  });

  it('does NOT call addItem on dismiss', () => {
    const { result } = renderHook(() => useOrderHistory());
    act(() => {
      result.current.handleReorder(ORDER_DELIVERED);
    });
    act(() => {
      result.current.handleDismissSheet();
    });
    expect(mockAddItem).not.toHaveBeenCalled();
  });

  it('dismiss with no sheet open is a no-op', () => {
    const { result } = renderHook(() => useOrderHistory());
    act(() => {
      result.current.handleDismissSheet();
    });
    expect(result.current.sheetOrder).toBeNull();
    expect(mockAddItem).not.toHaveBeenCalled();
  });
});

// ── Filter + reorder interaction ──────────────────────────────────────────────

describe('useOrderHistory — filter and reorder coexistence', () => {
  it('setting a filter while sheet is open preserves sheetOrder', () => {
    const { result } = renderHook(() => useOrderHistory());
    act(() => {
      result.current.handleReorder(ORDER_DELIVERED);
    });
    act(() => {
      result.current.setStatusFilter('delivered');
    });
    // sheetOrder is local state — unaffected by filter change
    expect(result.current.sheetOrder).toBe(ORDER_DELIVERED);
    expect(mockSetStatusFilter).toHaveBeenCalledWith('delivered');
  });

  it('reorder shows Reorder button only on delivered (via statusFilter delivered)', () => {
    setOrders([ORDER_DELIVERED], 'delivered');
    const { result } = renderHook(() => useOrderHistory());
    // Only delivered orders exposed; hook surface is clean
    expect(result.current.orders.every((o) => o.status === 'delivered')).toBe(true);
  });
});

// ── All statuses filter round-trip ────────────────────────────────────────────

describe('useOrderHistory — all status filter values', () => {
  const statuses: Array<OrderStatus | null> = [
    null,
    'processing',
    'shipped',
    'delivered',
    'cancelled',
  ];

  for (const status of statuses) {
    it(`setStatusFilter('${status}') is passed through without error`, () => {
      const { result } = renderHook(() => useOrderHistory());
      act(() => {
        result.current.setStatusFilter(status);
      });
      expect(mockSetStatusFilter).toHaveBeenCalledWith(status);
    });
  }
});
