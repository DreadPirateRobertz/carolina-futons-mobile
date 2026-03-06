import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { MOCK_ORDERS, ORDER_STATUS_CONFIG, type Order, type OrderStatus } from '@/data/orders';
import { getWixClientInstance } from '@/services/wix/singleton';

// Re-export for screens
export { ORDER_STATUS_CONFIG };
export type { Order, OrderStatus };

interface UseOrdersReturn {
  orders: Order[];
  isLoading: boolean;
  error: Error | null;
  statusFilter: OrderStatus | null;
  setStatusFilter: (status: OrderStatus | null) => void;
  getOrder: (orderId: string) => Order | undefined;
  refresh: () => void;
}

/**
 * Fetch and manage order history.
 * Tries Wix eCommerce API first, falls back to MOCK_ORDERS.
 */
export function useOrders(): UseOrdersReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | null>(null);
  const [fetchedOrders, setFetchedOrders] = useState<Order[] | null>(null);
  const mounted = useRef(true);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const client = getWixClientInstance();
    if (client) {
      try {
        const result = await client.queryOrders({ limit: 100 });
        if (mounted.current) {
          setFetchedOrders(result.orders);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        if (mounted.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    }

    // Fallback to mock
    if (mounted.current) {
      setFetchedOrders(null);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    loadOrders();
    return () => {
      mounted.current = false;
    };
  }, [loadOrders]);

  // Use fetched orders or mock, sorted by date descending
  const allOrders = useMemo(() => {
    const source = fetchedOrders ?? MOCK_ORDERS;
    return [...source].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [fetchedOrders]);

  const orders = useMemo(
    () => (statusFilter ? allOrders.filter((o) => o.status === statusFilter) : allOrders),
    [allOrders, statusFilter],
  );

  const getOrder = useCallback(
    (orderId: string): Order | undefined => {
      return allOrders.find((o) => o.id === orderId);
    },
    [allOrders],
  );

  return { orders, isLoading, error, statusFilter, setStatusFilter, getOrder, refresh: loadOrders };
}
