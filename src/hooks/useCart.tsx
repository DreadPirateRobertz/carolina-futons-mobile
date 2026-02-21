import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
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
  | { type: 'CLEAR' };

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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

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
