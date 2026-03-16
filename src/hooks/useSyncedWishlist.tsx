import { useEffect, useRef, useCallback } from 'react';
import { useWishlist } from './useWishlist';
import { useAuth } from './useAuth';
import { useConnectivity } from './useConnectivity';
import { useOfflineSync } from './useOfflineSync';
import { WishlistSyncService } from '@/services/wishlistSyncService';
import type { WixClient } from '@/services/wix/wixClient';
import type { Product } from '@/data/products';

interface UseSyncedWishlistOptions {
  client: WixClient | null;
}

export function useSyncedWishlist({ client }: UseSyncedWishlistOptions) {
  const wishlist = useWishlist();
  const { user, isAuthenticated } = useAuth();
  const { isOnline } = useConnectivity();
  const syncService = useRef(client ? new WishlistSyncService(client) : null);
  const lastServerTimestamp = useRef(0);
  const hasPulled = useRef(false);

  useEffect(() => {
    syncService.current = client ? new WishlistSyncService(client) : null;
  }, [client]);

  const { pendingCount, isSyncing, queueAction, syncNow } = useOfflineSync({
    onSync: async (actions) => {
      if (!syncService.current || !user?.id) return;
      const wishlistActions = actions.filter((a) => a.domain === 'wishlist');
      if (wishlistActions.length > 0) {
        const serverTs = await syncService.current.replayActions(user.id, wishlistActions);
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
        const serverState = await service.pullWishlist(userId);
        if (!serverState) return;

        const result = service.resolveConflict(
          { items: wishlist.items, serverTimestamp: lastServerTimestamp.current },
          serverState,
        );

        if (result.source === 'server') {
          if (!Array.isArray(result.items)) {
            console.warn('[useSyncedWishlist] Server returned malformed items, keeping local state');
            return;
          }
          lastServerTimestamp.current = serverState.serverTimestamp;
          wishlist.loadItems(result.items);
        }
      } catch (err) {
        console.warn('[useSyncedWishlist] Server pull failed, continuing with local state:', err);
      }
    })();
  }, [isAuthenticated, isOnline, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const pushIfOnline = useCallback(
    (items: typeof wishlist.items) => {
      if (!syncService.current || !user?.id) return;

      if (isOnline) {
        syncService.current.pushWishlist(user.id, items).then((serverTs) => {
          lastServerTimestamp.current = serverTs;
        }).catch((err) => {
          console.warn('[useSyncedWishlist] Push failed, will retry on next sync:', err);
        });
      } else {
        queueAction('wishlist', 'SYNC', { items });
      }
    },
    [isOnline, user?.id, queueAction],
  );

  const add = useCallback(
    (product: Product) => {
      wishlist.add(product);
      setTimeout(() => pushIfOnline(wishlist.items), 0);
    },
    [wishlist, pushIfOnline],
  );

  const remove = useCallback(
    (productId: string) => {
      wishlist.remove(productId);
      setTimeout(() => pushIfOnline(wishlist.items), 0);
    },
    [wishlist, pushIfOnline],
  );

  const toggle = useCallback(
    (product: Product) => {
      wishlist.toggle(product);
      setTimeout(() => pushIfOnline(wishlist.items), 0);
    },
    [wishlist, pushIfOnline],
  );

  const clear = useCallback(() => {
    wishlist.clear();
    if (syncService.current && user?.id && isOnline) {
      syncService.current.pushWishlist(user.id, []).then((serverTs) => {
        lastServerTimestamp.current = serverTs;
      }).catch((err) => {
        console.warn('[useSyncedWishlist] Clear push failed:', err);
      });
    } else if (user?.id) {
      queueAction('wishlist', 'SYNC', { items: [] });
    }
  }, [wishlist, isOnline, user?.id, queueAction]);

  return {
    ...wishlist,
    add,
    remove,
    toggle,
    clear,
    pendingCount,
    isSyncing,
    syncNow,
  };
}
