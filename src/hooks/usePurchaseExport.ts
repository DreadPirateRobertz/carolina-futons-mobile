/**
 * @module usePurchaseExport
 *
 * Emails the authenticated member their full order history via a Wix
 * backend webMethod (/_functions/sendOrderHistoryEmail). (hq-a0d)
 *
 * State machine: idle → sending → sent | error
 * Empty history is sent as an empty orders array — the backend handles
 * the copy ("no orders yet"). Unauthenticated calls are silently ignored.
 */
import { useState, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { useOrders } from './useOrders';
import { useOptionalWixClient } from '@/services/wix';
import { captureException } from '@/services/crashReporting';
import type { Order } from '@/data/orders';

export type PurchaseExportStatus = 'idle' | 'sending' | 'sent' | 'error';

export interface PurchaseExportState {
  status: PurchaseExportStatus;
  error: string | null;
  sendExport: () => Promise<void>;
}

interface FormattedLineItem {
  name: string;
  fabric: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface FormattedOrder {
  orderNumber: string;
  status: string;
  date: string;
  items: FormattedLineItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

interface SendOrderHistoryEmailPayload {
  recipientEmail: string;
  memberName: string;
  exportDate: string;
  orders: FormattedOrder[];
}

function formatOrder(order: Order): FormattedOrder {
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    date: order.createdAt,
    items: order.items.map((li) => ({
      name: li.modelName,
      fabric: li.fabricName,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      lineTotal: li.lineTotal,
    })),
    subtotal: order.subtotal,
    shipping: order.shipping,
    tax: order.tax,
    total: order.total,
  };
}

export function usePurchaseExport(): PurchaseExportState {
  const { user } = useAuth();
  const { orders } = useOrders();
  const wixClient = useOptionalWixClient();

  const [status, setStatus] = useState<PurchaseExportStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const sendingRef = useRef(false);

  const sendExport = useCallback(async () => {
    // Unauthenticated — silent no-op
    if (!user) return;

    // Deduplicate concurrent taps
    if (sendingRef.current) return;

    // Service not available
    if (!wixClient) {
      setStatus('error');
      setError('Service unavailable. Please try again later.');
      return;
    }

    sendingRef.current = true;
    setStatus('sending');
    setError(null);

    try {
      const payload: SendOrderHistoryEmailPayload = {
        recipientEmail: user.email,
        memberName: user.displayName,
        exportDate: new Date().toISOString(),
        orders: orders.map(formatOrder),
      };

      await wixClient.callFunction('/_functions/sendOrderHistoryEmail', 'POST', payload);
      setStatus('sent');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to send export. Please try again.';
      setStatus('error');
      setError(message);
      captureException(err instanceof Error ? err : new Error(message));
    } finally {
      sendingRef.current = false;
    }
  }, [user, orders, wixClient]);

  return { status, error, sendExport };
}
