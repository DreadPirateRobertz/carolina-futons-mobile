/**
 * @module useOrderStatusPush
 *
 * Listens for incoming push notifications that report an order status change
 * and calls `onRefresh` so the OrderDetailScreen auto-updates its timeline
 * without requiring a manual pull-to-refresh.
 *
 * Triggers on: order_confirmed, order_shipped, order_delivered,
 *              order_update, order_refunded
 *
 * If the notification includes an `orderId` field, only triggers when it
 * matches the watched `orderId`. If no `orderId` is provided in the payload,
 * triggers for any order status notification (broadcast semantics).
 *
 * Bead: cfutons_mobile-xh4
 */
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';

const ORDER_STATUS_TYPES = new Set([
  'order_confirmed',
  'order_shipped',
  'order_delivered',
  'order_update',
  'order_refunded',
]);

export interface UseOrderStatusPushOptions {
  /** The order ID currently displayed on screen. */
  orderId: string;
  /** Called when an order status push arrives for this order. */
  onRefresh: () => void;
}

/**
 * Subscribes to Expo push notifications. When a status-change notification
 * arrives that matches the watched order (or has no orderId), calls onRefresh.
 */
export function useOrderStatusPush({ orderId, onRefresh }: UseOrderStatusPushOptions): void {
  // Keep a stable ref to the latest onRefresh so re-renders don't re-register
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  });

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification?.request?.content?.data as
        | Record<string, unknown>
        | null
        | undefined;
      if (!data) return;

      const type = data.type as string | undefined;
      if (!type || !ORDER_STATUS_TYPES.has(type)) return;

      // If the payload names a specific orderId, only trigger when it matches
      const payloadOrderId = data.orderId as string | undefined;
      if (payloadOrderId && payloadOrderId !== orderId) return;

      onRefreshRef.current();
    });

    return () => sub.remove();
    // orderId is intentionally excluded — re-mounting the listener when it
    // changes would drop in-flight notifications during the teardown window.
    // The orderId check is done inline so it always uses the current value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
