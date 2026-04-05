/**
 * @module useOrderHistory
 *
 * Presentation hook for the order history screen (hq-xdn).
 * Composes useOrders (data + filter), useCart (reorder add-to-cart),
 * and useFutonModels (catalog lookup) into a single surface.
 *
 * The screen becomes a pure presentation layer — all state and
 * business logic lives here.
 */
import { useState, useCallback } from 'react';
import { useOrders, type Order, type OrderStatus } from './useOrders';
import { useCart } from './useCart';
import { useFutonModels } from './useFutonModels';
import {
  buildReorderPreview,
  type ReorderPreview,
  type ReorderLineItem,
} from '@/services/reorderService';

export interface UseOrderHistoryReturn {
  /** Filtered order list (already sorted newest-first by useOrders). */
  orders: Order[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;

  /** Active status filter — null means "All". */
  statusFilter: OrderStatus | null;
  setStatusFilter: (status: OrderStatus | null) => void;

  /** Reorder sheet state — null means sheet is closed. */
  sheetOrder: Order | null;
  reorderPreview: ReorderPreview | null;

  /** Opens the reorder sheet for the given order. */
  handleReorder: (order: Order) => void;
  /** Adds available items to cart and closes the sheet. */
  handleConfirmReorder: (items: ReorderLineItem[]) => void;
  /** Closes the sheet without touching the cart. */
  handleDismissSheet: () => void;
}

export function useOrderHistory(): UseOrderHistoryReturn {
  const { orders, isLoading, error, refresh, statusFilter, setStatusFilter } = useOrders();
  const { addItem } = useCart();
  const { getModel, getFabric } = useFutonModels();

  const [sheetOrder, setSheetOrder] = useState<Order | null>(null);
  const [reorderPreview, setReorderPreview] = useState<ReorderPreview | null>(null);

  const handleReorder = useCallback(
    (order: Order) => {
      const preview = buildReorderPreview(order.items, getModel, getFabric);
      setSheetOrder(order);
      setReorderPreview(preview);
    },
    [getModel, getFabric],
  );

  const handleConfirmReorder = useCallback(
    (items: ReorderLineItem[]) => {
      for (const { model, fabric, lineItem } of items) {
        addItem(model, fabric, lineItem.quantity);
      }
      setSheetOrder(null);
      setReorderPreview(null);
    },
    [addItem],
  );

  const handleDismissSheet = useCallback(() => {
    setSheetOrder(null);
    setReorderPreview(null);
  }, []);

  return {
    orders,
    isLoading,
    error,
    refresh,
    statusFilter,
    setStatusFilter,
    sheetOrder,
    reorderPreview,
    handleReorder,
    handleConfirmReorder,
    handleDismissSheet,
  };
}
