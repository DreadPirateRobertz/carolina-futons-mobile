/**
 * Shopping cart hook and context provider.
 *
 * Manages cart state (add, remove, update quantity, clear) through a reducer,
 * persists items to AsyncStorage for cross-session continuity, and exposes
 * computed values like `itemCount` and `subtotal`. Quantity is capped at 10
 * per line item to match warehouse fulfillment limits.
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
} from 'react';
import type { FutonModel, Fabric } from '@/data/futons';

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
  addItem: (model: FutonModel, fabric: Fabric, quantity: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const CART_STORAGE_KEY = 'cfutons_cart';

/**
 * Context provider that manages cart state and persists it to AsyncStorage.
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

  // Load from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const AsyncStorage = await import('@react-native-async-storage/async-storage').then(
          (m) => m.default,
        );
        const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as CartItem[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            dispatch({ type: 'LOAD', items: parsed });
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
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    }),
    [state.items, itemCount, subtotal, addItem, removeItem, updateQuantity, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/**
 * Accesses shopping cart state and mutation actions.
 *
 * Must be called from within a `CartProvider`.
 *
 * @returns Object containing `{ items, itemCount, subtotal, addItem, removeItem, updateQuantity, clearCart }`
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
