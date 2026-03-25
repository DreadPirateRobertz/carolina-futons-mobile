/**
 * Order saga — orchestrates Stripe payment → Wix order creation with
 * automatic rollback (refund) on failure.
 *
 * Saga pattern:
 * 1. Create Stripe PaymentIntent
 * 2. Confirm Wix order (with retries + exponential backoff)
 * 3. On Wix failure after retries: auto-refund Stripe
 * 4. On refund failure: flag for manual resolution
 */

import type { CartItem } from '@/hooks/useCart';
import type { WixClient } from '@/services/wix';
import type { PaymentMethod, OrderTotals } from '@/services/payment';
import { createPaymentIntent, confirmOrder } from '@/services/payment';
import { refundPayment } from '@/services/refund';
import { captureException } from '@/services/crashReporting';

export interface OrderSagaInput {
  client: WixClient;
  items: CartItem[];
  totals: OrderTotals;
  paymentMethod: PaymentMethod;
}

export interface OrderSagaResult {
  status: 'confirmed' | 'rolled_back' | 'refund_failed' | 'payment_failed';
  orderId?: string;
  orderNumber?: string;
  error?: string;
  requiresManualResolution?: boolean;
  paymentIntentId?: string;
}

const MAX_ORDER_RETRIES = 3;
const RETRY_BASE_MS = 500;

function retryDelay(attempt: number): number {
  return RETRY_BASE_MS * Math.pow(2, attempt); // 500, 1000, 2000
}

/**
 * Execute the order saga: payment intent → order creation (with retries) → confirm.
 * Automatically rolls back (refunds) on Wix order creation failure.
 */
export async function executeOrderSaga(input: OrderSagaInput): Promise<OrderSagaResult> {
  const { client, items, totals, paymentMethod } = input;

  // Step 1: Create Stripe PaymentIntent
  let paymentIntentId: string;
  try {
    const intent = await createPaymentIntent(client, items, totals);
    paymentIntentId = intent.paymentIntentId;
  } catch (err) {
    return {
      status: 'payment_failed',
      error: err instanceof Error ? err.message : 'Payment initialization failed',
    };
  }

  // Step 2: Create Wix order with retries
  for (let attempt = 0; attempt < MAX_ORDER_RETRIES; attempt++) {
    try {
      const order = await confirmOrder(client, paymentIntentId, items, totals, paymentMethod);

      return {
        status: 'confirmed',
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        paymentIntentId,
      };
    } catch (err) {
      if (attempt < MAX_ORDER_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay(attempt)));
        continue;
      }

      // All retries exhausted — rollback
      return rollback(paymentIntentId, err);
    }
  }

  // TypeScript exhaustiveness — unreachable
  return { status: 'payment_failed', error: 'Unexpected saga state' };
}

async function rollback(paymentIntentId: string, originalError: unknown): Promise<OrderSagaResult> {
  try {
    await refundPayment(paymentIntentId);
    return {
      status: 'rolled_back',
      error: originalError instanceof Error ? originalError.message : 'Order creation failed',
      paymentIntentId,
    };
  } catch (refundErr) {
    // CRITICAL: Charge exists but no order AND no refund
    captureException(
      refundErr instanceof Error ? refundErr : new Error(String(refundErr)),
      'fatal',
      {
        action: 'orderSaga.rollback',
        paymentIntentId,
        originalError:
          originalError instanceof Error ? originalError.message : String(originalError),
      },
    );

    return {
      status: 'refund_failed',
      error:
        'Payment charged but order and refund both failed. Please contact support for assistance.',
      requiresManualResolution: true,
      paymentIntentId,
    };
  }
}
