/**
 * Payment service — handles Stripe payment intent creation and order submission.
 *
 * In production, all calls go through our backend API which creates Stripe
 * PaymentIntents server-side. The mobile app never touches the Stripe secret key.
 */

import type { CartItem } from '@/hooks/useCart';

// Backend API base URL — in production this comes from env config
const API_BASE = 'https://api.carolinafutons.com/v1';

const SHIPPING_THRESHOLD = 499;
const SHIPPING_COST = 49;
const TAX_RATE = 0.07;

export type PaymentMethod = 'apple-pay' | 'google-pay' | 'affirm' | 'klarna' | 'card';

export interface OrderTotals {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  ephemeralKey: string;
  customerId: string;
}

export interface OrderConfirmation {
  orderId: string;
  orderNumber: string;
  items: CartItem[];
  totals: OrderTotals;
  paymentMethod: PaymentMethod;
  createdAt: string;
  estimatedDelivery: string;
}

export function calculateTotals(subtotal: number): OrderTotals {
  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = subtotal + shipping + tax;
  return { subtotal, shipping, tax, total };
}

/**
 * Create a Stripe PaymentIntent via our backend.
 * Returns the client secret needed by the Stripe SDK to confirm payment.
 */
export async function createPaymentIntent(
  items: CartItem[],
  totals: OrderTotals,
): Promise<PaymentIntentResponse> {
  const response = await fetch(`${API_BASE}/payments/create-intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: items.map((item) => ({
        id: item.id,
        name: item.model.name,
        fabric: item.fabric.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      totals,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Payment service unavailable' }));
    throw new PaymentError(error.message ?? 'Failed to initialize payment', 'INTENT_FAILED');
  }

  return response.json();
}

/**
 * Confirm the order after successful payment.
 * Backend verifies the payment succeeded and creates the order record.
 */
export async function confirmOrder(
  paymentIntentId: string,
  items: CartItem[],
  totals: OrderTotals,
  paymentMethod: PaymentMethod,
): Promise<OrderConfirmation> {
  const response = await fetch(`${API_BASE}/orders/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paymentIntentId,
      items: items.map((item) => ({
        id: item.id,
        modelId: item.model.id,
        modelName: item.model.name,
        fabricId: item.fabric.id,
        fabricName: item.fabric.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      totals,
      paymentMethod,
    }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: 'Failed to confirm order' }));
    throw new PaymentError(error.message ?? 'Order confirmation failed', 'CONFIRM_FAILED');
  }

  return response.json();
}

export type PaymentErrorCode = 'INTENT_FAILED' | 'CONFIRM_FAILED' | 'CANCELLED' | 'STRIPE_ERROR';

export class PaymentError extends Error {
  code: PaymentErrorCode;

  constructor(message: string, code: PaymentErrorCode) {
    super(message);
    this.name = 'PaymentError';
    this.code = code;
  }
}
