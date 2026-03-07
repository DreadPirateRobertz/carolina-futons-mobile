/**
 * @module useOrders
 *
 * Order history hook with status filtering and lookup. Uses mock data now;
 * the return shape mirrors the Wix eCommerce Orders API for future swap-in.
 *
 * Wires orderCache to persist recent orders to AsyncStorage so users can
 * browse order history while offline. On mount, cached orders are served
 * instantly; fresh data replaces them and is re-cached in the background.
 */
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { MOCK_ORDERS, ORDER_STATUS_CONFIG, type Order, type OrderStatus } from '@/data/orders';
import { cacheOrders, loadCachedOrders } from '@/services/orderCache';

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

function sortOrders(list: Order[]): Order[] {
  return [...list].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/**
 * Fetch and manage order history.
 *
 * On mount, loads cached orders from AsyncStorage for instant display,
 * then resolves fresh orders (currently MOCK_ORDERS, future API) and
 * persists them to the cache for offline access.
 */
export function useOrders(): UseOrdersReturn {
  const [allOrders, setAllOrders] = useState<Order[]>(() => sortOrders(MOCK_ORDERS));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    async function hydrate() {
      // 1. Serve cached orders instantly (offline-first)
      try {
        const cached = await loadCachedOrders();
        if (!cancelled && cached && cached.orders.length > 0) {
          setAllOrders(sortOrders(cached.orders));
        }
      } catch {
        // Cache miss is fine — continue to fresh data
      }

      // 2. Load fresh orders (mock for now, future API call)
      try {
        const fresh = MOCK_ORDERS;
        if (!cancelled) {
          const sorted = sortOrders(fresh);
          setAllOrders(sorted);
          setIsLoading(false);
          // 3. Persist fresh orders for offline viewing
          await cacheOrders(fresh);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    }

    hydrate();

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, []);

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
    setIsLoading(true);
    // Re-run hydration: load fresh → cache
    const fresh = MOCK_ORDERS;
    const sorted = sortOrders(fresh);
    setAllOrders(sorted);
    setIsLoading(false);
    cacheOrders(fresh);
  }, []);

  return { orders, isLoading, error, statusFilter, setStatusFilter, getOrder, refresh };
}
