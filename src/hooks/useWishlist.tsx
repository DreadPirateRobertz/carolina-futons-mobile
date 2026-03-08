/**
 * Wishlist hook and context provider.
 *
 * Lets users save products they are interested in, persists selections to
 * AsyncStorage, and tracks the price at time of save so the UI can highlight
 * price drops. Also provides a shareable text summary of the wishlist.
 *
 * When wrapped in a ConnectivityProvider, add/remove mutations are
 * automatically queued when offline and replayed on reconnect with LWW
 * (Last-Write-Wins) conflict resolution.
 *
 * @module useWishlist
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useReducer,
  useEffect,
  useRef,
  useState,
} from 'react';
import { PRODUCTS, type Product } from '@/data/products';
import { useOptionalConnectivity } from './useConnectivity';
import {
  enqueue,
  loadQueue,
  getQueue,
  replay,
  registerExecutor,
  clearExecutors,
  compactByLWW,
} from '@/services/offlineQueue';
import type { ReplayResult } from '@/services/offlineQueue';
import { useOptionalWixClient } from '@/services/wix/wixProvider';

/**
 * A single wishlist entry, storing the product ID, timestamp, and
 * the price when the item was saved (used for price-drop detection).
 */
export interface WishlistItem {
  productId: string;
  addedAt: number; // timestamp
  savedPrice: number; // price when added, for price-drop detection
}

/** Internal state managed by the wishlist reducer. */
interface WishlistState {
  items: WishlistItem[];
}

/**
 * Discriminated union of wishlist reducer actions.
 *
 * - `ADD` — adds a product (no-op if already present)
 * - `REMOVE` — removes a product by ID
 * - `CLEAR` — empties the entire wishlist
 * - `LOAD` — hydrates from persisted storage on mount
 */
type WishlistAction =
  | { type: 'ADD'; productId: string; price: number }
  | { type: 'REMOVE'; productId: string }
  | { type: 'CLEAR' }
  | { type: 'LOAD'; items: WishlistItem[] };

function wishlistReducer(state: WishlistState, action: WishlistAction): WishlistState {
  switch (action.type) {
    case 'ADD': {
      if (state.items.some((i) => i.productId === action.productId)) return state;
      return {
        items: [
          ...state.items,
          { productId: action.productId, addedAt: Date.now(), savedPrice: action.price },
        ],
      };
    }
    case 'REMOVE':
      return { items: state.items.filter((i) => i.productId !== action.productId) };
    case 'CLEAR':
      return { items: [] };
    case 'LOAD':
      return { items: action.items };
    default:
      return state;
  }
}

const STORAGE_KEY = 'cfutons_wishlist';

/** Shape of the value exposed by WishlistContext to consumers. */
interface WishlistContextValue {
  items: WishlistItem[];
  count: number;
  isInWishlist: (productId: string) => boolean;
  toggle: (product: Product) => void;
  add: (product: Product) => void;
  remove: (productId: string) => void;
  clear: () => void;
  getProducts: () => (Product & { savedPrice: number; priceDrop: number })[];
  getShareText: () => string;
  /** Number of wishlist actions pending in the offline queue. */
  pendingSync: number;
  /** Whether a sync replay is currently in progress. */
  isSyncing: boolean;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

/** Props for the WishlistProvider component. */
interface WishlistProviderProps {
  children: React.ReactNode;
  /** Override initial items for testing (bypasses AsyncStorage hydration). */
  initialItems?: WishlistItem[];
}

/**
 * Context provider that manages wishlist state and persists it to AsyncStorage.
 *
 * When a ConnectivityProvider is present as an ancestor, add/remove operations
 * are synced to the Wix CMS when online and queued for replay when offline.
 * Queued actions are compacted via LWW before replay to resolve conflicts.
 *
 * @param props.children - Child components that may consume wishlist context.
 * @param props.initialItems - Optional seed items, mainly for tests.
 *
 * @example
 * <ConnectivityProvider>
 *   <WishlistProvider>
 *     <App />
 *   </WishlistProvider>
 * </ConnectivityProvider>
 */
export function WishlistProvider({ children, initialItems }: WishlistProviderProps) {
  const [state, dispatch] = useReducer(wishlistReducer, {
    items: initialItems ?? [],
  });

  const connectivity = useOptionalConnectivity();
  const isOnline = connectivity?.isOnline ?? true;
  const wixClient = useOptionalWixClient();
  const wixClientRef = useRef(wixClient);
  wixClientRef.current = wixClient;

  const wasOnline = useRef(isOnline);
  const [pendingSync, setPendingSync] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Register Wix executors for offline queue replay
  useEffect(() => {
    if (!connectivity) return; // No connectivity context — skip sync setup

    registerExecutor('WISHLIST_ADD', async (payload) => {
      const client = wixClientRef.current;
      if (!client) return;
      await client.addToWishlist(payload.productId as string, payload.savedPrice as number);
    });

    registerExecutor('WISHLIST_REMOVE', async (payload) => {
      const client = wixClientRef.current;
      if (!client) return;
      await client.removeFromWishlist(payload.productId as string);
    });

    // Load persisted queue on mount
    loadQueue().then((q) => {
      const wishlistPending = q.filter((a) => a.domain === 'wishlist').length;
      setPendingSync(wishlistPending);
    });

    return () => {
      clearExecutors();
    };
  }, [connectivity]);

  // Replay on offline→online transition with LWW compaction
  const replayWishlistQueue = useCallback(async (): Promise<ReplayResult | void> => {
    const wishlistActions = getQueue('wishlist');
    if (wishlistActions.length === 0) return;

    setIsSyncing(true);
    try {
      // Compact contradictory actions (e.g. ADD then REMOVE same product → keep REMOVE)
      compactByLWW('wishlist', 'productId');

      const result = await replay({ maxRetries: 3, baseDelayMs: 1000 });
      setPendingSync(getQueue('wishlist').length);
      return result;
    } finally {
      setIsSyncing(false);
      setPendingSync(getQueue('wishlist').length);
    }
  }, []);

  // Watch for offline→online transition
  useEffect(() => {
    if (!connectivity) return;

    if (!wasOnline.current && isOnline) {
      replayWishlistQueue().catch(() => {
        // Replay failed — actions remain in queue for next attempt
      });
    }
    wasOnline.current = isOnline;
  }, [isOnline, connectivity, replayWishlistQueue]);

  // Persist to AsyncStorage when available
  useEffect(() => {
    // Load on mount (async import to avoid hard dependency)
    (async () => {
      try {
        const AsyncStorage = await import('@react-native-async-storage/async-storage').then(
          (m) => m.default,
        );
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: unknown = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const valid = parsed.filter(
              (item): item is WishlistItem =>
                item != null &&
                typeof item === 'object' &&
                typeof (item as WishlistItem).productId === 'string' &&
                typeof (item as WishlistItem).addedAt === 'number',
            );
            if (valid.length > 0) {
              dispatch({ type: 'LOAD', items: valid });
            }
          }
        }
      } catch {
        // AsyncStorage not installed or not available — operate in-memory
      }
    })();
  }, []);

  // Save whenever items change
  useEffect(() => {
    (async () => {
      try {
        const AsyncStorage = await import('@react-native-async-storage/async-storage').then(
          (m) => m.default,
        );
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
      } catch {
        // no-op
      }
    })();
  }, [state.items]);

  /** Sync a wishlist add to Wix or queue it for later. */
  const syncAdd = useCallback(
    (productId: string, savedPrice: number) => {
      if (!connectivity) return; // No connectivity context — local-only mode

      if (isOnline && wixClientRef.current) {
        // Fire-and-forget: optimistic local update already applied
        wixClientRef.current.addToWishlist(productId, savedPrice).catch(() => {
          // Remote sync failed — enqueue for retry
          enqueue('wishlist', 'WISHLIST_ADD', { productId, savedPrice });
          setPendingSync(getQueue('wishlist').length);
        });
      } else {
        enqueue('wishlist', 'WISHLIST_ADD', { productId, savedPrice });
        setPendingSync(getQueue('wishlist').length);
      }
    },
    [connectivity, isOnline],
  );

  /** Sync a wishlist remove to Wix or queue it for later. */
  const syncRemove = useCallback(
    (productId: string) => {
      if (!connectivity) return;

      if (isOnline && wixClientRef.current) {
        wixClientRef.current.removeFromWishlist(productId).catch(() => {
          enqueue('wishlist', 'WISHLIST_REMOVE', { productId });
          setPendingSync(getQueue('wishlist').length);
        });
      } else {
        enqueue('wishlist', 'WISHLIST_REMOVE', { productId });
        setPendingSync(getQueue('wishlist').length);
      }
    },
    [connectivity, isOnline],
  );

  const isInWishlist = useCallback(
    (productId: string) => state.items.some((i) => i.productId === productId),
    [state.items],
  );

  const add = useCallback(
    (product: Product) => {
      dispatch({ type: 'ADD', productId: product.id, price: product.price });
      syncAdd(product.id, product.price);
    },
    [syncAdd],
  );

  const remove = useCallback(
    (productId: string) => {
      dispatch({ type: 'REMOVE', productId });
      syncRemove(productId);
    },
    [syncRemove],
  );

  const toggle = useCallback(
    (product: Product) => {
      if (isInWishlist(product.id)) {
        remove(product.id);
      } else {
        add(product);
      }
    },
    [isInWishlist, add, remove],
  );

  const clear = useCallback(() => {
    // Queue removes for all current items before clearing
    for (const item of state.items) {
      syncRemove(item.productId);
    }
    dispatch({ type: 'CLEAR' });
  }, [state.items, syncRemove]);

  const getProducts = useCallback(() => {
    return state.items
      .map((item) => {
        const product = PRODUCTS.find((p) => p.id === item.productId);
        if (!product) return null;
        const priceDrop = item.savedPrice - product.price;
        return { ...product, savedPrice: item.savedPrice, priceDrop };
      })
      .filter((p): p is Product & { savedPrice: number; priceDrop: number } => p !== null);
  }, [state.items]);

  const getShareText = useCallback(() => {
    const products = getProducts();
    if (products.length === 0) return '';
    const lines = products.map((p) => `- ${p.name} ($${p.price.toFixed(2)})`);
    return `Check out my Carolina Futons wishlist!\n\n${lines.join('\n')}\n\nShop at carolinafutons.com`;
  }, [getProducts]);

  const count = state.items.length;
  const value = useMemo<WishlistContextValue>(
    () => ({
      items: state.items,
      count,
      isInWishlist,
      toggle,
      add,
      remove,
      clear,
      getProducts,
      getShareText,
      pendingSync,
      isSyncing,
    }),
    [
      state.items,
      count,
      isInWishlist,
      toggle,
      add,
      remove,
      clear,
      getProducts,
      getShareText,
      pendingSync,
      isSyncing,
    ],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

/**
 * Accesses wishlist state and actions for adding, removing, and sharing saved products.
 *
 * Must be called from within a `WishlistProvider`.
 *
 * @returns Object containing `{ items, count, isInWishlist, toggle, add, remove, clear, getProducts, getShareText, pendingSync, isSyncing }`
 *
 * @example
 * const { toggle, isInWishlist, count, pendingSync } = useWishlist();
 */
export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return ctx;
}
