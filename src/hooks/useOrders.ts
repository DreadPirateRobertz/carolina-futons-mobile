/**
 * @module useOrders
 *
 * Order history hook with status filtering and lookup. Uses mock data now;
 * the return shape mirrors the Wix eCommerce Orders API for future swap-in.
 */
import { useState, useMemo, useCallback } from 'react';
import { MOCK_ORDERS, ORDER_STATUS_CONFIG, type Order, type OrderStatus } from '@/data/orders';

// Re-export for screens — avoids direct src/data imports
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
 *
 * Currently falls back to MOCK_ORDERS.
 * When WixProvider is available, will fetch from Wix eCommerce API.
 */
export function useOrders(): UseOrdersReturn {
  const [isLoading] = useState(false);
  const [error] = useState<Error | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | null>(null);

  // Sort by createdAt descending (most recent first)
  const allOrders = useMemo(
    () =>
      [...MOCK_ORDERS].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [],
  );

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

  const refresh = useCallback(() => {
    // No-op for static fallback. Will trigger API refetch when integrated.
  }, []);

  return { orders, isLoading, error, statusFilter, setStatusFilter, getOrder, refresh };
}
