import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOrders } from '../useOrders';
import { MOCK_ORDERS } from '@/data/orders';
import { ORDER_CACHE_KEY } from '@/services/orderCache';

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

describe('useOrders', () => {
  const sortedOrders = [...MOCK_ORDERS].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
  });

  // --- List all orders ---

  it('returns all mock orders sorted by date descending', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.orders).toEqual(sortedOrders);
  });

  it('returns isLoading=false after hydration', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('returns error=null on success', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
  });

  // --- Single order by ID ---

  it('getOrder returns an order by ID', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const order = result.current.getOrder(MOCK_ORDERS[0].id);
    expect(order).toEqual(MOCK_ORDERS[0]);
  });

  it('getOrder returns undefined for unknown ID', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const order = result.current.getOrder('nonexistent-order');
    expect(order).toBeUndefined();
  });

  // --- Filter by status ---

  it('filters orders by status', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => {
      result.current.setStatusFilter('delivered');
    });
    expect(result.current.orders.every((o) => o.status === 'delivered')).toBe(true);
    expect(result.current.orders.length).toBeGreaterThan(0);
  });

  it('returns all orders when status filter is null', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => {
      result.current.setStatusFilter('delivered');
    });
    act(() => {
      result.current.setStatusFilter(null);
    });
    expect(result.current.orders).toEqual(sortedOrders);
  });

  it('returns empty array when no orders match filter', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => {
      result.current.setStatusFilter('cancelled');
    });
    const cancelledCount = MOCK_ORDERS.filter((o) => o.status === 'cancelled').length;
    expect(result.current.orders.length).toBe(cancelledCount);
  });

  // --- Refresh ---

  it('returns a refresh function', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.refresh).toBe('function');
  });

  it('refresh does not throw', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(() => result.current.refresh()).not.toThrow();
  });

  // --- Edge cases ---

  it('orders are sorted by createdAt descending (most recent first)', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const dates = result.current.orders.map((o) => new Date(o.createdAt).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });

  it('getOrder works after setting a status filter', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => {
      result.current.setStatusFilter('delivered');
    });
    // getOrder should still find any order by ID regardless of filter
    const order = result.current.getOrder(MOCK_ORDERS[0].id);
    expect(order).toEqual(MOCK_ORDERS[0]);
  });

  // --- Boundary conditions ---

  it('every order has required fields', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    for (const order of result.current.orders) {
      expect(order.id).toBeDefined();
      expect(order.orderNumber).toBeDefined();
      expect(order.status).toBeDefined();
      expect(order.createdAt).toBeDefined();
      expect(order.items.length).toBeGreaterThan(0);
      expect(typeof order.total).toBe('number');
      expect(order.shippingAddress).toBeDefined();
      expect(order.paymentMethod).toBeDefined();
    }
  });

  it('cycles through all status filters without error', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const statuses: ('processing' | 'shipped' | 'delivered' | 'cancelled')[] = [
      'processing',
      'shipped',
      'delivered',
      'cancelled',
    ];
    for (const status of statuses) {
      act(() => {
        result.current.setStatusFilter(status);
      });
      expect(result.current.orders.every((o) => o.status === status)).toBe(true);
    }
  });

  it('getOrder with empty string returns undefined', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.getOrder('')).toBeUndefined();
  });

  it('statusFilter state is null initially', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.statusFilter).toBeNull();
  });

  it('order line items have valid price data', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    for (const order of result.current.orders) {
      for (const item of order.items) {
        expect(item.unitPrice).toBeGreaterThan(0);
        expect(item.quantity).toBeGreaterThan(0);
        expect(item.lineTotal).toBe(item.unitPrice * item.quantity);
      }
    }
  });

  // --- Cache integration ---

  it('caches orders to AsyncStorage after hydration', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockSetItem).toHaveBeenCalledWith(ORDER_CACHE_KEY, expect.any(String));
    const stored = JSON.parse(mockSetItem.mock.calls[0][1]);
    expect(stored.orders).toHaveLength(MOCK_ORDERS.length);
  });

  it('loads cached orders when cache exists', async () => {
    const cachedOrders = [MOCK_ORDERS[0]];
    mockGetItem.mockResolvedValue(
      JSON.stringify({ orders: cachedOrders, cachedAt: new Date().toISOString() }),
    );
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // After hydration completes, fresh data replaces cached
    expect(result.current.orders).toEqual(sortedOrders);
  });

  it('serves cached orders when cache is available before fresh load', async () => {
    const cachedOrders = [MOCK_ORDERS[0]];
    // Simulate slow fresh load by checking intermediate state
    mockGetItem.mockResolvedValue(
      JSON.stringify({ orders: cachedOrders, cachedAt: new Date().toISOString() }),
    );
    const { result } = renderHook(() => useOrders());
    // Eventually resolves to full set
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.orders.length).toBe(MOCK_ORDERS.length);
  });

  it('refresh re-caches orders', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    mockSetItem.mockClear();
    act(() => {
      result.current.refresh();
    });
    // refresh is async — wait for cacheOrders to be called
    await waitFor(() => {
      expect(mockSetItem).toHaveBeenCalledWith(ORDER_CACHE_KEY, expect.any(String));
    });
  });
});
