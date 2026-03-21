/**
 * Payment service — handles Stripe payment intent creation and order submission.
 *
 * All calls go through the WixClient which handles auth, retry, and
 * base URL resolution.
 *
 * Security boundary (CLIENT ↔ SERVER):
 *
 *  CLIENT (this module + usePayment):
 *   - Amount and product-ID validation (defence-in-depth before API call)
 *   - Idempotency key generation — passed to the Wix backend so it can forward
 *     to Stripe, preventing duplicate charges on network-error retries
 *   - PII scrubbing before crash reporting
 *   - Post-checkout navigation allowlist
 *   - Stripe publishable key only — the secret key NEVER appears client-side
 *
 *  SERVER (Wix eCommerce backend) — NOT this module's responsibility:
 *   1. Re-validate amount and currency server-side; never trust client values
 *   3. Confirm payment intent status === 'succeeded' before order fulfilment
 *   4. Verify Stripe-Signature on webhook payloads; reject unverified events
 *   5. Store payment intent ID; check for replay attacks before confirmation
 *
 * The server MUST perform items 1, 3, 4, 5 independently of the client.
 */

import type { CartItem } from '@/hooks/useCart';
import { WixApiError, type WixClient } from '@/services/wix';
import { calculateTax } from '@/services/taxService';
import { calculateShipping } from '@/services/shippingService';
import { validateCheckoutAmount, validateProductIds } from '@/services/checkoutSecurity';

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
 * Shipping is free above $499 or for CF+ premium members; tax is a flat 7% (NC rate).
 */
export function calculateTotals(subtotal: number, isPremium = false): OrderTotals {
  const shipping = isPremium || subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + shipping + tax) * 100) / 100;
  return { subtotal, shipping, tax, total };
}

/**
 * Precise totals for checkout — uses real tax rates + shipping calculation.
 * Use this at checkout time. Use calculateTotals() for quick cart estimates.
 */
export async function calculateCheckoutTotals(
  subtotal: number,
  isPremium: boolean,
  shippingAddress: { state: string; zip: string; country: string },
): Promise<OrderTotals & { taxJurisdiction: string; freeShippingApplied: boolean }> {
  const [taxResult, shippingResult] = await Promise.all([
    calculateTax({ subtotal, shippingAddress }),
    calculateShipping({ subtotal, shippingZip: shippingAddress.zip, isPremium }),
  ]);

  const total =
    Math.round((subtotal + shippingResult.shippingCost + taxResult.taxAmount) * 100) / 100;

  return {
    subtotal,
    shipping: shippingResult.shippingCost,
    tax: taxResult.taxAmount,
    total,
    taxJurisdiction: taxResult.jurisdiction,
    freeShippingApplied: shippingResult.freeShippingApplied,
  };
}

/**
 * Create a Stripe PaymentIntent via the Wix eCommerce Payments API.
 * Returns the client secret needed by the Stripe SDK to confirm payment.
 *
 * @param idempotencyKey - Client-generated stable key (UUID v4) for this
 *   checkout session. Passed to the Wix backend which forwards it to Stripe
 *   as `Idempotency-Key`, preventing duplicate charges on network retries.
 *   Should remain constant across retries of the same cart; change it when
 *   the cart contents change.
 */
export async function createPaymentIntent(
  client: WixClient,
  items: CartItem[],
  totals: OrderTotals,
  idempotencyKey?: string,
): Promise<PaymentIntentResponse> {
  // Client-side validation before submitting to payment API.
  // Server MUST re-validate independently — these are defence-in-depth guards.
  if (!validateCheckoutAmount(totals.total)) {
    throw new PaymentError(
      `Invalid checkout amount: ${totals.total}`,
      'INTENT_FAILED',
    );
  }
  if (!validateProductIds(items.map((i) => i.id))) {
    throw new PaymentError('Invalid product IDs in cart', 'INTENT_FAILED');
  }

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
      idempotencyKey,
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

export type PaymentErrorCode =
  | 'INTENT_FAILED'
  | 'CONFIRM_FAILED'
  | 'NETWORK_ERROR'
  | 'CANCELLED'
  | 'STRIPE_ERROR'
  | 'NETWORK_ERROR';

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
