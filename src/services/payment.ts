/**
 * Payment service — handles Stripe payment intent creation and order submission.
 *
 * All calls go through the WixClient which handles auth, retry, and
 * base URL resolution. The mobile app never touches the Stripe secret key.
 */

import type { CartItem } from '@/hooks/useCart';
import { WixApiError, type WixClient } from '@/services/wix';

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

/**
 * Derive shipping, tax, and grand total from a cart subtotal.
 * Shipping is free above $499; tax is a flat 7% (NC rate).
 */
export function calculateTotals(subtotal: number): OrderTotals {
  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + shipping + tax) * 100) / 100;
  return { subtotal, shipping, tax, total };
}

/**
 * Create a Stripe PaymentIntent via the Wix eCommerce Payments API.
 * Returns the client secret needed by the Stripe SDK to confirm payment.
 */
export async function createPaymentIntent(
  client: WixClient,
  items: CartItem[],
  totals: OrderTotals,
): Promise<PaymentIntentResponse> {
  try {
    return await client.createPaymentIntent(
      items.map((item) => ({
        id: item.id,
        name: item.model.name,
        fabric: item.fabric.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      totals,
    );
  } catch (err) {
    if (err instanceof WixApiError) {
      throw new PaymentError(err.message || 'Failed to initialize payment', 'INTENT_FAILED');
    }
    throw err;
  }
}

/**
 * Confirm the order after successful payment.
 * Backend verifies the payment succeeded and creates the order record.
 */
export async function confirmOrder(
  client: WixClient,
  paymentIntentId: string,
  items: CartItem[],
  totals: OrderTotals,
  paymentMethod: PaymentMethod,
): Promise<OrderConfirmation> {
  try {
    const result = await client.confirmOrder(
      paymentIntentId,
      items.map((item) => ({
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
    );
    return result as unknown as OrderConfirmation;
  } catch (err) {
    if (err instanceof WixApiError) {
      throw new PaymentError(err.message || 'Order confirmation failed', 'CONFIRM_FAILED');
    }
    throw err;
  }
}

export type PaymentErrorCode = 'INTENT_FAILED' | 'CONFIRM_FAILED' | 'CANCELLED' | 'STRIPE_ERROR';

/**
 * Typed error for payment failures, carrying a machine-readable code
 * so callers can distinguish cancellation from server errors.
 */
export class PaymentError extends Error {
  code: PaymentErrorCode;

  constructor(message: string, code: PaymentErrorCode) {
    super(message);
    this.name = 'PaymentError';
    this.code = code;
  }
}
