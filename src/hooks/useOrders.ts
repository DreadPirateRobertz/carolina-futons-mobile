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
import {
  MOCK_ORDERS,
  ORDER_STATUS_CONFIG,
  getTrackingUrl,
  type Order,
  type OrderStatus,
} from '@/data/orders';
import { cacheOrders, loadCachedOrders } from '@/services/orderCache';
import { useOptionalWixClient } from '@/services/wix/wixProvider';
import type { WixOrderResponse } from '@/services/wix/wixClient';
import { futonModelId } from '@/data/productId';

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

/** Map Wix order status string to local OrderStatus. */
function mapWixStatus(status: string): OrderStatus {
  switch (status.toUpperCase()) {
    case 'INITIALIZED':
    case 'APPROVED':
      return 'processing';
    case 'FULFILLED':
      return 'delivered';
    case 'CANCELED':
      return 'cancelled';
    default:
      return 'processing';
  }
}

/** Transform a Wix eCommerce order response into the local Order shape. */
export function transformWixOrder(wix: WixOrderResponse): Order {
  const logistics = wix.shippingInfo?.logistics;
  const dest = logistics?.shippingDestination;
  const trackingInfo = logistics?.trackingInfo;
  const status = mapWixStatus(wix.status);

  const items = wix.lineItems.map((li) => ({
    id: li._id,
    modelId: futonModelId(li.catalogReference.catalogItemId),
    modelName: li.productName?.translated ?? '',
    fabricId: '',
    fabricName: '',
    fabricColor: '#888888',
    quantity: li.quantity,
    unitPrice: parseFloat(li.price?.amount ?? '0'),
    lineTotal: parseFloat(li.totalPrice?.amount ?? '0'),
  }));

  const tracking = trackingInfo
    ? {
        carrier: trackingInfo.shippingProvider,
        trackingNumber: trackingInfo.trackingNumber,
        url:
          trackingInfo.trackingLink ||
          getTrackingUrl(trackingInfo.shippingProvider, trackingInfo.trackingNumber),
        estimatedDelivery: logistics?.deliveryTime,
      }
    : undefined;

  // If tracking exists, status should be at least 'shipped' (unless delivered/cancelled)
  const finalStatus = tracking && status === 'processing' ? 'shipped' : status;

  return {
    id: wix._id,
    orderNumber: `CF-${wix.number}`,
    status: finalStatus,
    createdAt: wix._createdDate,
    updatedAt: wix._updatedDate,
    items,
    subtotal: parseFloat(wix.priceSummary?.subtotal?.amount ?? '0'),
    shipping: parseFloat(wix.priceSummary?.shipping?.amount ?? '0'),
    tax: parseFloat(wix.priceSummary?.tax?.amount ?? '0'),
    total: parseFloat(wix.priceSummary?.total?.amount ?? '0'),
    shippingAddress: {
      name: dest?.contactDetails
        ? `${dest.contactDetails.firstName} ${dest.contactDetails.lastName}`
        : '',
      street: dest?.address?.addressLine1 ?? '',
      city: dest?.address?.city ?? '',
      state: dest?.address?.subdivision ?? '',
      zip: dest?.address?.postalCode ?? '',
    },
    paymentMethod: wix.billingInfo?.paymentMethod ?? '',
    tracking,
  };
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
  const wixClient = useOptionalWixClient();

  const fetchOrders = useCallback(
    async (cancelled: { current: boolean }) => {
      // 1. Serve cached orders instantly (offline-first)
      try {
        const cached = await loadCachedOrders();
        if (!cancelled.current && cached && cached.orders.length > 0) {
          setAllOrders(sortOrders(cached.orders));
        }
      } catch {
        // Cache miss is fine — continue to fresh data
      }

      // 2. Try Wix API first, fall back to mock data
      try {
        let fresh: Order[];
        if (wixClient) {
          const result = await wixClient.queryOrders({ limit: 100 });
          fresh = result.orders.map(transformWixOrder);
        } else {
          fresh = MOCK_ORDERS;
        }
        if (!cancelled.current) {
          const sorted = sortOrders(fresh);
          setAllOrders(sorted);
          setIsLoading(false);
          // 3. Persist fresh orders for offline viewing
          await cacheOrders(fresh);
        }
      } catch (err) {
        if (!cancelled.current) {
          // On API failure, keep showing cached/mock data
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    },
    [wixClient],
  );

  useEffect(() => {
    mountedRef.current = true;
    const cancelled = { current: false };
    fetchOrders(cancelled);
    return () => {
      cancelled.current = true;
      mountedRef.current = false;
    };
  }, [fetchOrders]);

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
    setError(null);
    const cancelled = { current: false };
    fetchOrders(cancelled);
  }, [fetchOrders]);

  return { orders, isLoading, error, statusFilter, setStatusFilter, getOrder, refresh };
}
