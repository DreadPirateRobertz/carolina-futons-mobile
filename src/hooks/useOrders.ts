import { useMemo, useCallback } from 'react';
import { MOCK_ORDERS, type Order } from '@/data/orders';

interface UseOrdersReturn {
  orders: Order[];
  isLoading: boolean;
  error: Error | null;
  getOrderById: (id: string) => Order | undefined;
}

/**
 * Provides order data for order history and detail screens.
 * Uses static data now; designed for drop-in Wix API replacement.
 */
export function useOrders(): UseOrdersReturn {
  const orders = useMemo(() => MOCK_ORDERS, []);

  const getOrderById = useCallback(
    (id: string) => orders.find((o) => o.id === id),
    [orders],
  );

  return { orders, isLoading: false, error: null, getOrderById };
}

interface UseOrderByIdReturn {
  order: Order | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Looks up a single order by ID.
 */
export function useOrderById(orderId: string | undefined): UseOrderByIdReturn {
  const order = useMemo(() => {
    if (!orderId) return null;
    return MOCK_ORDERS.find((o) => o.id === orderId) ?? null;
  }, [orderId]);

  return { order, isLoading: false, error: null };
}
