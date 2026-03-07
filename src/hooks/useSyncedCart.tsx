import { useEffect, useRef, useCallback } from 'react';
import { useCart } from './useCart';
import { useAuth } from './useAuth';
import { useConnectivity } from './useConnectivity';
import { useOfflineSync } from './useOfflineSync';
import { CartSyncService } from '@/services/cartSyncService';
import type { WixClient } from '@/services/wix/wixClient';
import type { FutonModel, Fabric } from '@/data/futons';

interface UseSyncedCartOptions {
  client: WixClient | null;
}

export function useSyncedCart({ client }: UseSyncedCartOptions) {
  const cart = useCart();
  const { user, isAuthenticated } = useAuth();
  const { isOnline } = useConnectivity();
  const syncService = useRef(client ? new CartSyncService(client) : null);
  const lastServerTimestamp = useRef(0);
  const hasPulled = useRef(false);

  // Update sync service if client changes
  useEffect(() => {
    syncService.current = client ? new CartSyncService(client) : null;
  }, [client]);

  const { pendingCount, isSyncing, queueAction, syncNow } = useOfflineSync({
    onSync: async (actions) => {
      if (!syncService.current || !user?.id) return;
      const cartActions = actions.filter((a) => a.domain === 'cart');
      if (cartActions.length > 0) {
        const serverTs = await syncService.current.replayActions(user.id, cartActions);
        lastServerTimestamp.current = serverTs;
      }
    },
  });

  // Pull from server on mount when authenticated + online
  useEffect(() => {
    if (!isAuthenticated || !isOnline || !syncService.current || !user?.id || hasPulled.current) {
      return;
    }

    hasPulled.current = true;
    const service = syncService.current;
    const userId = user.id;

    (async () => {
      try {
        const serverState = await service.pullCart(userId);
        if (!serverState) return;

        const result = service.resolveConflict(
          { items: cart.items, serverTimestamp: lastServerTimestamp.current },
          serverState,
        );

        if (result.source === 'server') {
          lastServerTimestamp.current = serverState.serverTimestamp;
          cart.clearCart();
          // Re-hydrate would need a LOAD dispatch — for now we use the items directly
          // This is a limitation we'll address when modifying CartProvider
        }
      } catch {
        // Server pull failed — continue with local state
      }
    })();
  }, [isAuthenticated, isOnline, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const pushIfOnline = useCallback(
    (items: typeof cart.items) => {
      if (!syncService.current || !user?.id) return;

      if (isOnline) {
        syncService.current.pushCart(user.id, items).then((serverTs) => {
          lastServerTimestamp.current = serverTs;
        }).catch(() => {
          // Push failed — will be caught on next sync
        });
      } else {
        queueAction('cart', 'SYNC', { items });
      }
    },
    [isOnline, user?.id, queueAction],
  );

  const addItem = useCallback(
    (model: FutonModel, fabric: Fabric, quantity: number) => {
      cart.addItem(model, fabric, quantity);
      // We need the updated items after the dispatch, but useReducer is async.
      // Schedule the push for next tick when state has settled.
      setTimeout(() => pushIfOnline(cart.items), 0);
    },
    [cart, pushIfOnline],
  );

  const removeItem = useCallback(
    (itemId: string) => {
      cart.removeItem(itemId);
      setTimeout(() => pushIfOnline(cart.items), 0);
    },
    [cart, pushIfOnline],
  );

  const updateQuantity = useCallback(
    (itemId: string, quantity: number) => {
      cart.updateQuantity(itemId, quantity);
      setTimeout(() => pushIfOnline(cart.items), 0);
    },
    [cart, pushIfOnline],
  );

  const clearCart = useCallback(() => {
    cart.clearCart();
    if (syncService.current && user?.id && isOnline) {
      syncService.current.pushCart(user.id, []).then((serverTs) => {
        lastServerTimestamp.current = serverTs;
      }).catch(() => {});
    } else if (user?.id) {
      queueAction('cart', 'SYNC', { items: [] });
    }
  }, [cart, isOnline, user?.id, queueAction]);

  return {
    ...cart,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    pendingCount,
    isSyncing,
    syncNow,
  };
}
