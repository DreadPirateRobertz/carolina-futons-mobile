/**
 * Shopping cart hook and context provider.
 *
 * Manages cart state (add, remove, update quantity, clear) through a reducer,
 * persists items to AsyncStorage for cross-session continuity, merges with
 * the server-side Wix cart on authentication, and exposes computed values
 * like `itemCount` and `subtotal`. Quantity is capped at 10 per line item
 * to match warehouse fulfillment limits.
 *
 * @module useCart
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { FutonModel, Fabric } from '@/data/futons';
import { FUTON_MODELS, FABRICS } from '@/data/futons';
import { AuthContext } from '@/hooks/useAuth';
import { WixClient } from '@/services/wix/wixClient';
import { getWixConfig, isWixConfigured } from '@/services/wix/config';
import type { WixCartLineItem } from '@/services/wix/wixClient';

/**
 * A single line item in the cart, keyed by `model:fabric` composite ID.
 */
export interface CartItem {
  id: string; // `${model.id}:${fabric.id}`
  model: FutonModel;
  fabric: Fabric;
  quantity: number;
  unitPrice: number; // basePrice + fabric.price
}

/** Internal state managed by the cart reducer. */
interface CartState {
  items: CartItem[];
}

/**
 * Discriminated union of cart reducer actions.
 *
 * - `ADD_ITEM` — adds a new line item or increments quantity of an existing one
 * - `REMOVE_ITEM` — deletes a line item by composite ID
 * - `UPDATE_QUANTITY` — sets quantity for a line item (removes if <= 0)
 * - `CLEAR` — empties the entire cart
 * - `LOAD` — hydrates the cart from persisted storage on mount
 */
type CartAction =
  | { type: 'ADD_ITEM'; model: FutonModel; fabric: Fabric; quantity: number }
  | { type: 'REMOVE_ITEM'; itemId: string }
  | { type: 'UPDATE_QUANTITY'; itemId: string; quantity: number }
  | { type: 'CLEAR' }
  | { type: 'LOAD'; items: CartItem[] };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const itemId = `${action.model.id}:${action.fabric.id}`;
      const unitPrice = action.model.basePrice + action.fabric.price;
      const existing = state.items.find((i) => i.id === itemId);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === itemId ? { ...i, quantity: Math.min(10, i.quantity + action.quantity) } : i,
          ),
        };
      }
      return {
        items: [
          ...state.items,
          {
            id: itemId,
            model: action.model,
            fabric: action.fabric,
            quantity: action.quantity,
            unitPrice,
          },
        ],
      };
    }
    case 'REMOVE_ITEM':
      return { items: state.items.filter((i) => i.id !== action.itemId) };
    case 'UPDATE_QUANTITY': {
      if (action.quantity <= 0) {
        return { items: state.items.filter((i) => i.id !== action.itemId) };
      }
      return {
        items: state.items.map((i) =>
          i.id === action.itemId ? { ...i, quantity: Math.min(10, action.quantity) } : i,
        ),
      };
    }
    case 'CLEAR':
      return { items: [] };
    case 'LOAD':
      return { items: action.items };
    default:
      return state;
  }
}

/** Shape of the value exposed by CartContext to consumers. */
interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  syncing: boolean;
  addItem: (model: FutonModel, fabric: Fabric, quantity: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const CART_STORAGE_KEY = 'cfutons_cart';

/**
 * Convert a Wix server cart line item to a local CartItem, if the
 * referenced product and variant exist in the local catalog.
 */
function serverLineItemToCartItem(lineItem: WixCartLineItem): CartItem | null {
  const modelId = lineItem.catalogReference.catalogItemId;
  const fabricId = lineItem.catalogReference.options?.variantId;

  const model = FUTON_MODELS.find((m) => m.id === modelId);
  if (!model) return null;

  const fabric = fabricId
    ? FABRICS.find((f) => f.id === fabricId)
    : FABRICS[0];
  if (!fabric) return null;

  return {
    id: `${model.id}:${fabric.id}`,
    model,
    fabric,
    quantity: Math.min(10, Math.max(1, lineItem.quantity)),
    unitPrice: model.basePrice + fabric.price,
  };
}

/**
 * Merge local cart items with server cart items.
 * For items present in both, keeps the higher quantity (capped at 10).
 * Items unique to either side are included in the result.
 */
export function mergeCartItems(local: CartItem[], server: CartItem[]): CartItem[] {
  const merged = [...local];
  for (const serverItem of server) {
    const existingIdx = merged.findIndex((i) => i.id === serverItem.id);
    if (existingIdx >= 0) {
      merged[existingIdx] = {
        ...merged[existingIdx],
        quantity: Math.min(10, Math.max(merged[existingIdx].quantity, serverItem.quantity)),
      };
    } else {
      merged.push(serverItem);
    }
  }
  return merged;
}

/**
 * Context provider that manages cart state and persists it to AsyncStorage.
 * Merges with the server-side Wix cart when the user authenticates.
 *
 * Wrap the app root with this provider so all screens can access the cart.
 *
 * @param props.children - Child components that may consume cart context.
 *
 * @example
 * <CartProvider>
 *   <App />
 * </CartProvider>
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });
  const [syncing, setSyncing] = useState(false);
  const authCtx = useContext(AuthContext);
  const user = authCtx?.user ?? null;
  const prevUserRef = useRef<typeof user>(null);
  const itemsRef = useRef(state.items);
  itemsRef.current = state.items;

  // Load from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const AsyncStorage = await import('@react-native-async-storage/async-storage').then(
          (m) => m.default,
        );
        const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
        if (stored) {
          const parsed: unknown = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const valid = parsed.filter(
              (item): item is CartItem =>
                item != null &&
                typeof item === 'object' &&
                typeof (item as CartItem).id === 'string' &&
                typeof (item as CartItem).quantity === 'number' &&
                typeof (item as CartItem).unitPrice === 'number',
            );
            if (valid.length > 0) {
              dispatch({ type: 'LOAD', items: valid });
            }
          }
        }
      } catch {
        // AsyncStorage not available — operate in-memory
      }
    })();
  }, []);

  // Persist to AsyncStorage whenever items change
  useEffect(() => {
    (async () => {
      try {
        const AsyncStorage = await import('@react-native-async-storage/async-storage').then(
          (m) => m.default,
        );
        await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.items));
      } catch {
        // no-op
      }
    })();
  }, [state.items]);

  // Merge with server cart when user authenticates
  useEffect(() => {
    if (user && !prevUserRef.current) {
      let cancelled = false;
      (async () => {
        if (!isWixConfigured()) return;
        setSyncing(true);
        try {
          const client = new WixClient(getWixConfig());
          const serverCart = await client.getCart();

          if (cancelled) return;

          // Convert server line items to local CartItem format
          const serverItems: CartItem[] = [];
          for (const lineItem of serverCart.lineItems) {
            const cartItem = serverLineItemToCartItem(lineItem);
            if (cartItem) {
              serverItems.push(cartItem);
            }
          }

          // Merge local and server items
          const localItems = itemsRef.current;
          const merged = mergeCartItems(localItems, serverItems);

          // Only dispatch if merge actually changed anything
          if (JSON.stringify(merged) !== JSON.stringify(localItems)) {
            dispatch({ type: 'LOAD', items: merged });
          }

          // Push local-only items to server
          const serverItemIds = new Set(serverItems.map((i) => i.id));
          for (const localItem of localItems) {
            if (!serverItemIds.has(localItem.id)) {
              await client.addToCart(
                localItem.model.id,
                localItem.quantity,
                localItem.fabric.id,
              );
            }
          }
        } catch {
          // Server sync failed — continue with local cart only
        } finally {
          if (!cancelled) setSyncing(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
    prevUserRef.current = user;
  }, [user]);

  const addItem = useCallback((model: FutonModel, fabric: Fabric, quantity: number) => {
    dispatch({ type: 'ADD_ITEM', model, fabric, quantity });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    dispatch({ type: 'REMOVE_ITEM', itemId });
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', itemId, quantity });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR' });
  }, []);

  const itemCount = useMemo(
    () => state.items.reduce((sum, i) => sum + i.quantity, 0),
    [state.items],
  );

  const subtotal = useMemo(
    () => state.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    [state.items],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items: state.items,
      itemCount,
      subtotal,
      syncing,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    }),
    [state.items, itemCount, subtotal, syncing, addItem, removeItem, updateQuantity, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/**
 * Accesses shopping cart state and mutation actions.
 *
 * Must be called from within a `CartProvider`.
 *
 * @returns Object containing `{ items, itemCount, subtotal, syncing, addItem, removeItem, updateQuantity, clearCart }`
 *
 * @example
 * const { items, addItem, subtotal } = useCart();
 */
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}
