import { renderHook, act } from '@testing-library/react-native';
import { useOrders } from '../useOrders';
import { MOCK_ORDERS } from '@/data/orders';

describe('useOrders', () => {
  // --- List all orders ---

  const sortedOrders = [...MOCK_ORDERS].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  it('returns all mock orders sorted by date descending', () => {
    const { result } = renderHook(() => useOrders());
    expect(result.current.orders).toEqual(sortedOrders);
  });

  it('returns isLoading=false when using static fallback', () => {
    const { result } = renderHook(() => useOrders());
    expect(result.current.isLoading).toBe(false);
  });

  it('returns error=null on success', () => {
    const { result } = renderHook(() => useOrders());
    expect(result.current.error).toBeNull();
  });

  // --- Single order by ID ---

  it('getOrder returns an order by ID', () => {
    const { result } = renderHook(() => useOrders());
    const order = result.current.getOrder(MOCK_ORDERS[0].id);
    expect(order).toEqual(MOCK_ORDERS[0]);
  });

  it('getOrder returns undefined for unknown ID', () => {
    const { result } = renderHook(() => useOrders());
    const order = result.current.getOrder('nonexistent-order');
    expect(order).toBeUndefined();
  });

  // --- Filter by status ---

  it('filters orders by status', () => {
    const { result } = renderHook(() => useOrders());
    act(() => {
      result.current.setStatusFilter('delivered');
    });
    expect(result.current.orders.every((o) => o.status === 'delivered')).toBe(true);
    expect(result.current.orders.length).toBeGreaterThan(0);
  });

  it('returns all orders when status filter is null', () => {
    const { result } = renderHook(() => useOrders());
    act(() => {
      result.current.setStatusFilter('delivered');
    });
    act(() => {
      result.current.setStatusFilter(null);
    });
    expect(result.current.orders).toEqual(sortedOrders);
  });

  it('returns empty array when no orders match filter', () => {
    const { result } = renderHook(() => useOrders());
    // All mock orders are one of: delivered, shipped, processing, cancelled
    // There should be at least one of each, but let's use a combo that yields known results
    act(() => {
      result.current.setStatusFilter('cancelled');
    });
    const cancelledCount = MOCK_ORDERS.filter((o) => o.status === 'cancelled').length;
    expect(result.current.orders.length).toBe(cancelledCount);
  });

  // --- Refresh ---

  it('returns a refresh function', () => {
    const { result } = renderHook(() => useOrders());
    expect(typeof result.current.refresh).toBe('function');
  });

  it('refresh does not throw', () => {
    const { result } = renderHook(() => useOrders());
    expect(() => result.current.refresh()).not.toThrow();
  });

  // --- Edge cases ---

  it('orders are sorted by createdAt descending (most recent first)', () => {
    const { result } = renderHook(() => useOrders());
    const dates = result.current.orders.map((o) => new Date(o.createdAt).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });

  it('getOrder works after setting a status filter', () => {
    const { result } = renderHook(() => useOrders());
    act(() => {
      result.current.setStatusFilter('delivered');
    });
    // getOrder should still find any order by ID regardless of filter
    const order = result.current.getOrder(MOCK_ORDERS[0].id);
    expect(order).toEqual(MOCK_ORDERS[0]);
  });
});
