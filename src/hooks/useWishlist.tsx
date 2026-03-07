/**
 * Wishlist hook and context provider.
 *
 * Lets users save products they are interested in, persists selections to
 * AsyncStorage, and tracks the price at time of save so the UI can highlight
 * price drops. Also provides a shareable text summary of the wishlist.
 *
 * @module useWishlist
 */

import React, { createContext, useContext, useCallback, useMemo, useReducer, useEffect } from 'react';
import { PRODUCTS, type Product } from '@/data/products';

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
 * @param props.children - Child components that may consume wishlist context.
 * @param props.initialItems - Optional seed items, mainly for tests.
 *
 * @example
 * <WishlistProvider>
 *   <App />
 * </WishlistProvider>
 */
export function WishlistProvider({ children, initialItems }: WishlistProviderProps) {
  const [state, dispatch] = useReducer(wishlistReducer, {
    items: initialItems ?? [],
  });

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

  const isInWishlist = useCallback(
    (productId: string) => state.items.some((i) => i.productId === productId),
    [state.items],
  );

  const add = useCallback((product: Product) => {
    dispatch({ type: 'ADD', productId: product.id, price: product.price });
  }, []);

  const remove = useCallback((productId: string) => {
    dispatch({ type: 'REMOVE', productId });
  }, []);

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
    dispatch({ type: 'CLEAR' });
  }, []);

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
    () => ({ items: state.items, count, isInWishlist, toggle, add, remove, clear, getProducts, getShareText }),
    [state.items, count, isInWishlist, toggle, add, remove, clear, getProducts, getShareText],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

/**
 * Accesses wishlist state and actions for adding, removing, and sharing saved products.
 *
 * Must be called from within a `WishlistProvider`.
 *
 * @returns Object containing `{ items, count, isInWishlist, toggle, add, remove, clear, getProducts, getShareText }`
 *
 * @example
 * const { toggle, isInWishlist, count } = useWishlist();
 */
export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return ctx;
}
