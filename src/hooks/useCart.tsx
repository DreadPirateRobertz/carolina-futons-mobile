import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import type { FutonModel, Fabric } from '@/data/futons';

export interface CartItem {
  id: string; // `${model.id}:${fabric.id}`
  model: FutonModel;
  fabric: Fabric;
  quantity: number;
  unitPrice: number; // basePrice + fabric.price
}

interface CartState {
  items: CartItem[];
}

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

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}
