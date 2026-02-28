import { renderHook } from '@testing-library/react-native';
import { useOrders, useOrderById } from '../useOrders';
import { MOCK_ORDERS } from '@/data/orders';

describe('useOrders', () => {
  it('returns all orders', () => {
    const { result } = renderHook(() => useOrders());
    expect(result.current.orders).toEqual(MOCK_ORDERS);
  });

  it('returns isLoading as false (static data)', () => {
    const { result } = renderHook(() => useOrders());
    expect(result.current.isLoading).toBe(false);
  });

  it('returns error as null (static data)', () => {
    const { result } = renderHook(() => useOrders());
    expect(result.current.error).toBeNull();
  });

  it('provides getOrderById that finds an order', () => {
    const { result } = renderHook(() => useOrders());
    const order = result.current.getOrderById('ord-001');
    expect(order).toBeDefined();
    expect(order?.orderNumber).toBe('CF-2026-0147');
  });

  it('getOrderById returns undefined for unknown id', () => {
    const { result } = renderHook(() => useOrders());
    expect(result.current.getOrderById('nonexistent')).toBeUndefined();
  });

  it('returns stable references across re-renders', () => {
    const { result, rerender } = renderHook(() => useOrders());
    const first = result.current;
    rerender({});
    expect(result.current.orders).toBe(first.orders);
    expect(result.current.getOrderById).toBe(first.getOrderById);
  });
});

describe('useOrderById', () => {
  it('returns matching order', () => {
    const { result } = renderHook(() => useOrderById('ord-002'));
    expect(result.current.order).toBeDefined();
    expect(result.current.order?.orderNumber).toBe('CF-2026-0163');
  });

  it('returns null for unknown order id', () => {
    const { result } = renderHook(() => useOrderById('bad-id'));
    expect(result.current.order).toBeNull();
  });

  it('returns null when id is undefined', () => {
    const { result } = renderHook(() => useOrderById(undefined));
    expect(result.current.order).toBeNull();
  });

  it('returns isLoading false and error null', () => {
    const { result } = renderHook(() => useOrderById('ord-001'));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
