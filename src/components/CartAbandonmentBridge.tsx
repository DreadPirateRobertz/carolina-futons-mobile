/**
 * Bridge component that connects cart state with abandonment hooks.
 *
 * Rendered inside both CartProvider and NotificationProvider to access both
 * contexts. Wires:
 *  - 24hr reminder (useCartAbandonmentReminder)
 *  - 1hr recovery push with web email dedup (useCartAbandonmentRecovery, hq-8k690)
 */
import { useContext, useEffect, useMemo, useRef } from 'react';
import { useCart } from '@/hooks/useCart';
import { useNotifications } from '@/hooks/useNotifications';
import { useCartAbandonmentReminder } from '@/hooks/useCartAbandonmentReminder';
import { useCartAbandonmentRecovery } from '@/hooks/useCartAbandonmentRecovery';
import { AuthContext } from '@/hooks/useAuth';

export function CartAbandonmentBridge() {
  const { items, itemCount, subtotal } = useCart();
  const { preferences, permissionStatus } = useNotifications();
  const authCtx = useContext(AuthContext);
  const userId = authCtx?.user?.id ?? null;
  const pushPermitted = permissionStatus === 'granted';

  // Stable cart ID derived from sorted item IDs — changes when cart composition changes.
  const cartId = useMemo(
    () =>
      items.length > 0
        ? items
            .map((i) => i.id)
            .sort()
            .join('|')
        : '',
    [items],
  );

  // 24hr reminder
  const { onCartChanged } = useCartAbandonmentReminder({
    itemCount,
    cartRemindersEnabled: preferences.cartReminders,
    permissionGranted: pushPermitted,
  });

  // 1hr recovery push (hq-8k690)
  const { onCartActivity } = useCartAbandonmentRecovery({
    items,
    subtotal,
    cartId,
    userId,
    pushPermitted,
  });

  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip initial mount to avoid scheduling on app launch
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    onCartChanged();
    onCartActivity();
  }, [itemCount, onCartChanged, onCartActivity]);

  return null;
}
