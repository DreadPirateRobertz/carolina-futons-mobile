/**
 * Refund service — handles Stripe refund requests via Wix backend.
 *
 * Stub implementation. Will call the Wix eCommerce Payments refund
 * endpoint when the backend API is ready.
 */

import { captureException } from '@/services/crashReporting';

/**
 * Request a refund for a Stripe PaymentIntent via the Wix backend.
 *
 * Currently a stub that throws — will be wired to:
 * POST /ecom/v1/payments/refund { paymentIntentId }
 */
export async function refundPayment(paymentIntentId: string): Promise<{ refundId: string }> {
  try {
    // TODO: Call Wix eCommerce refund endpoint
    // const data = await wixClient.post('/ecom/v1/payments/refund', { paymentIntentId });
    // return { refundId: data.refundId };
    throw new Error(`Refund not implemented for ${paymentIntentId}`);
  } catch (err) {
    captureException(err instanceof Error ? err : new Error(String(err)), 'error', {
      action: 'refundPayment',
      paymentIntentId,
    });
    throw err;
  }
}
