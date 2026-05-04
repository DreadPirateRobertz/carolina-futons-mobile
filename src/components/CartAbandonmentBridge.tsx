/**
 * Bridge component that connects cart state with abandonment hooks.
 *
 * Rendered inside both CartProvider and NotificationProvider to access both
 * contexts. Wires:
 *  - 24hr reminder (useCartAbandonmentReminder)
 *  - 1hr recovery push with web email dedup (useCartAbandonmentRecovery, hq-8k690)
 *
 * When itemCount transitions to 0 from non-zero (checkout completed), both
 * hooks' onOrderPlaced() are called to cancel scheduled pushes and clear
 * dedup state. On any other itemCount change, normal cart activity callbacks
 * fire.
 */
import { useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { useCart } from '@/hooks/useCart';
import { useNotifications } from '@/hooks/useNotifications';
import { useCartAbandonmentReminder } from '@/hooks/useCartAbandonmentReminder';
import { useCartAbandonmentRecovery } from '@/hooks/useCartAbandonmentRecovery';
import { AuthContext } from '@/hooks/useAuth';
import { emitCartAbandoned } from '@/services/crossRigEventBus';
import { getWixClientSingleton } from '@/services/wix/wixClientSingleton';

export function CartAbandonmentBridge() {
  const { items, itemCount, subtotal } = useCart();
  const { preferences, permissionStatus } = useNotifications();
  const authCtx = useContext(AuthContext);
  const userId = authCtx?.user?.id ?? null;
  const pushPermitted = permissionStatus === 'granted' && preferences.cartRecovery;

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
  const { onCartChanged, onOrderPlaced: onReminderOrderPlaced } = useCartAbandonmentReminder({
    itemCount,
    cartRemindersEnabled: preferences.cartReminders,
    permissionGranted: pushPermitted,
  });

  const onAbandoned = useCallback(
    (cartTotal: number, itemCount: number) => {
      emitCartAbandoned(
        getWixClientSingleton(),
        { cartTotal, itemCount },
        { memberId: userId ?? '' },
      ).catch(() => {});
    },
    [userId],
  );

  // 1hr recovery push (hq-8k690)
  const { onCartActivity, onOrderPlaced: onRecoveryOrderPlaced } = useCartAbandonmentRecovery({
    items,
    subtotal,
    cartId,
    userId,
    pushPermitted,
    onAbandoned,
  });

  const isFirstRender = useRef(true);
  const prevItemCount = useRef(itemCount);

  useEffect(() => {
    // Skip initial mount to avoid scheduling on app launch
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevItemCount.current = itemCount;
      return;
    }

    const prev = prevItemCount.current;
    prevItemCount.current = itemCount;

    // Cart emptied after having items — checkout completed or all items removed.
    // Cancel any scheduled push and clear dedup state on both hooks.
    if (itemCount === 0 && prev > 0) {
      void onReminderOrderPlaced();
      void onRecoveryOrderPlaced();
      return;
    }

    onCartChanged();
    onCartActivity();
  }, [itemCount, cartId, onCartChanged, onCartActivity, onReminderOrderPlaced, onRecoveryOrderPlaced]);

  return null;
}
