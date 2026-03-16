import { useEffect, useRef, useCallback } from 'react';
import { useWishlist, type WishlistItem } from './useWishlist';
import { useAuth } from './useAuth';
import { useConnectivity } from './useConnectivity';
import { useOfflineSync } from './useOfflineSync';
import { WishlistSyncService } from '@/services/wishlistSyncService';
import type { WixClient } from '@/services/wix/wixClient';
import type { Product } from '@/data/products';
import { captureMessage, captureException } from '@/services/crashReporting';

interface UseSyncedWishlistOptions {
  client: WixClient | null;
}

/** Validate that a value is a well-formed WishlistItem. */
function isValidWishlistItem(item: unknown): item is WishlistItem {
  if (item == null || typeof item !== 'object') return false;
  const o = item as Record<string, unknown>;
  return (
    typeof o.productId === 'string' &&
    o.productId.length > 0 &&
    typeof o.addedAt === 'number' &&
    typeof o.savedPrice === 'number' &&
    o.savedPrice >= 0
  );
}

/** Validate and filter server wishlist items. Returns only well-formed items. */
export function validateServerWishlistItems(items: unknown): WishlistItem[] | null {
  if (!Array.isArray(items)) return null;
  const valid = items.filter(isValidWishlistItem);
  if (items.length > 0 && valid.length === 0) return null;
  return valid;
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
    let cancelled = false;

    (async () => {
      try {
        const serverState = await service.pullWishlist(userId);
        if (!serverState || cancelled) return;

        const result = service.resolveConflict(
          { items: wishlist.items, serverTimestamp: lastServerTimestamp.current },
          serverState,
        );

        if (result.source === 'server') {
          const validItems = validateServerWishlistItems(result.items);
          if (validItems === null) {
            captureMessage(
              '[useSyncedWishlist] Server returned malformed items, keeping local state',
              'warning',
            );
            return;
          }
          if (validItems.length === 0 && wishlist.items.length > 0) {
            captureMessage(
              '[useSyncedWishlist] Server wishlist is empty but local has items, keeping local state',
              'warning',
            );
            return;
          }
          if (cancelled) return;
          lastServerTimestamp.current = serverState.serverTimestamp;
          wishlist.loadItems(validItems);
        }
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)), 'warning', {
          action: 'wishlist-pull',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isOnline, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const pushIfOnline = useCallback(
    (items: typeof wishlist.items) => {
      if (!syncService.current || !user?.id) return;

      if (isOnline) {
        syncService.current
          .pushWishlist(user.id, items)
          .then((serverTs) => {
            lastServerTimestamp.current = serverTs;
          })
          .catch((err) => {
            captureException(err instanceof Error ? err : new Error(String(err)), 'warning', {
              action: 'wishlist-push',
            });
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
      syncService.current
        .pushWishlist(user.id, [])
        .then((serverTs) => {
          lastServerTimestamp.current = serverTs;
        })
        .catch((err) => {
          captureException(err instanceof Error ? err : new Error(String(err)), 'warning', {
            action: 'wishlist-clear',
          });
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
