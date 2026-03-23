/**
 * @module affirmService
 *
 * Affirm BNPL SDK — prequalification check and checkout initiation.
 *
 * Flow:
 *  1. checkAffirmPrequalification — fast eligibility check before showing Affirm option.
 *     Skips API call for amounts outside Affirm's [min, max] range.
 *  2. initiateAffirmCheckout — creates an Affirm checkout session via the Wix backend.
 *     Returns a checkout URL to open via Linking.openURL.
 *
 * Security:
 *  - No API keys client-side — all Affirm calls proxied through the Wix backend.
 *  - Amounts converted to cents before transmission.
 *  - checkoutUrl comes from the API response — never constructed from user input (SSRF guard).
 *
 * Bead: cm-d7l
 */

import type { CartItem } from '@/hooks/useCart';
import type { WixClient } from '@/services/wix';
import { BNPL_PROVIDERS } from './bnplService';

/** Minimum order amount in dollars eligible for Affirm. */
export const AFFIRM_MIN_AMOUNT: number = BNPL_PROVIDERS.affirm.minAmount;

/** Maximum order amount in dollars eligible for Affirm. */
export const AFFIRM_MAX_AMOUNT: number = BNPL_PROVIDERS.affirm.maxAmount;

export interface AffirmPrequalResult {
  eligible: boolean;
  error?: string;
}

export interface AffirmCheckoutResult {
  checkoutUrl: string;
  checkoutToken: string;
}

interface AffirmPrequalRequest {
  amount: number; // in cents
}

interface AffirmPrequalResponse {
  eligible: boolean;
  financing_program?: string;
  min_loan_amount?: number;
  max_loan_amount?: number;
}

interface AffirmCheckoutRequest {
  order_id: string;
  amount: number; // in cents
  items: {
    sku: string;
    display_name: string;
    quantity: number;
    unit_price: number; // in cents
  }[];
}

interface AffirmCheckoutResponse {
  checkout_url: string;
  checkout_token: string;
}

/**
 * Check whether the given order amount is eligible for Affirm financing.
 *
 * Short-circuits to ineligible (without an API call) if the amount is
 * outside Affirm's accepted range. This keeps checkout fast for amounts
 * that are obviously ineligible.
 *
 * @param wixClient - Wix backend proxy client (null → ineligible)
 * @param amountDollars - Order total in dollars
 */
export async function checkAffirmPrequalification(
  wixClient: WixClient | null,
  amountDollars: number,
): Promise<AffirmPrequalResult> {
  // Short-circuit: amounts outside Affirm's range are never eligible
  if (amountDollars < AFFIRM_MIN_AMOUNT || amountDollars > AFFIRM_MAX_AMOUNT) {
    return { eligible: false };
  }

  if (!wixClient) {
    return { eligible: false, error: 'Payment service unavailable' };
  }

  try {
    const request: AffirmPrequalRequest = { amount: Math.round(amountDollars * 100) };
    const response: AffirmPrequalResponse = await wixClient.callAffirmPrequal(request);
    return { eligible: !!response.eligible };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Affirm prequalification check failed';
    return { eligible: false, error: message };
  }
}

/**
 * Initiate an Affirm checkout session via the Wix backend.
 * Returns a checkout URL to open with Linking.openURL.
 *
 * Security: the returned checkoutUrl comes directly from the API — it is
 * never constructed by interpolating user-supplied values (SSRF guard).
 *
 * @param wixClient - Wix backend proxy client
 * @param amountDollars - Order total in dollars
 * @param orderId - Our internal order ID (must be a valid CF order)
 * @param items - Cart items to include in the Affirm checkout
 */
export async function initiateAffirmCheckout(
  wixClient: WixClient | null,
  amountDollars: number,
  orderId: string,
  items: CartItem[],
): Promise<AffirmCheckoutResult> {
  if (!wixClient) {
    throw new Error('Payment service unavailable');
  }
  if (!amountDollars || amountDollars <= 0) {
    throw new Error(`Invalid Affirm checkout amount: ${amountDollars}`);
  }
  if (!orderId || orderId.length === 0) {
    throw new Error('Order ID is required for Affirm checkout');
  }
  if (!items || items.length === 0) {
    throw new Error('Cart must not be empty for Affirm checkout');
  }

  const request: AffirmCheckoutRequest = {
    order_id: orderId,
    amount: Math.round(amountDollars * 100),
    items: items.map((item) => ({
      sku: item.sku ?? item.id,
      display_name: `${item.model.name} — ${item.fabric.name}`,
      quantity: item.quantity,
      unit_price: Math.round(item.unitPrice * 100),
    })),
  };

  const response: AffirmCheckoutResponse = await wixClient.initiateAffirmCheckout(request);

  return {
    checkoutUrl: response.checkout_url,
    checkoutToken: response.checkout_token,
  };
}
