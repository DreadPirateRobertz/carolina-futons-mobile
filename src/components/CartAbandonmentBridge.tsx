/**
 * Bridge component that connects cart state with the abandonment reminder hook.
 *
 * Rendered inside both CartProvider and NotificationProvider to access both
 * contexts. Calls onCartChanged whenever cart items change, and exposes
 * onOrderPlaced for checkout flow.
 */
import { useEffect, useRef } from 'react';
import { useCart } from '@/hooks/useCart';
import { useNotifications } from '@/hooks/useNotifications';
import { useCartAbandonmentReminder } from '@/hooks/useCartAbandonmentReminder';

export function CartAbandonmentBridge() {
  const { itemCount } = useCart();
  const { preferences, permissionStatus } = useNotifications();

  const { onCartChanged } = useCartAbandonmentReminder({
    itemCount,
    cartRemindersEnabled: preferences.cartReminders,
    permissionGranted: permissionStatus === 'granted',
  });

  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip initial mount to avoid scheduling on app launch
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    onCartChanged();
  }, [itemCount, onCartChanged]);

  return null;
}
