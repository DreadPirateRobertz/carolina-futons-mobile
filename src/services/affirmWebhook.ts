/**
 * @module affirmWebhook
 *
 * Affirm BNPL webhook security handler.
 *
 * Security rules (load-bearing order — per dutch/predator review):
 *  1. Reject empty body immediately
 *  2. HMAC-SHA256 signature verification BEFORE any payload parsing
 *  3. Constant-time compare via timingSafeEqual (no timing attacks)
 *  4. Unmarshal JSON ONLY after HMAC passes
 *  5. Order ownership (IDOR) check: verify orderId belongs to our store
 *  6. Idempotency: reject duplicate event_id values
 *  7. Event-type routing: only trigger fulfillment on charge.confirmed
 *
 * IMPORTANT: No logging of raw body or signature — may contain PII.
 *
 * The AFFIRM_WEBHOOK_SECRET must be stored in env vars (never hardcoded).
 * Header: X-Affirm-Hmac-Sha256 — hex-encoded HMAC-SHA256 of raw body.
 *
 * Bead: cm-d7l
 */

import { createHmac, timingSafeEqual } from 'crypto';

/** Our order ID prefix — all Carolina Futons orders start with this. */
const CF_ORDER_PREFIX = 'cf-';

/** Minimum length of a valid order ID (prefix + at least one char). */
const MIN_ORDER_ID_LENGTH = CF_ORDER_PREFIX.length + 1;

/** In-memory processed event tracker for idempotency.
 * Exposed via clearProcessedEvents() for test isolation only.
 * In production, use a persistent store (AsyncStorage or Wix DB). */
const processedEventIds = new Set<string>();

/** Clear the in-memory event tracker. For test use only. */
export function clearProcessedEvents(): void {
  processedEventIds.clear();
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type AffirmEventType = 'charge.confirmed' | 'charge.rejected' | 'charge.cancelled';

export interface AffirmWebhookData {
  charge_id: string;
  order_id: string;
  amount: number; // in cents
  currency: string;
}

export interface AffirmWebhookPayload {
  event_id: string;
  event_type: AffirmEventType;
  created: number;
  data: AffirmWebhookData;
}

export interface WebhookHandlerResult {
  processed: boolean;
  /** Set when processed=false — describes why. */
  reason?:
    | 'empty_body'
    | 'invalid_signature'
    | 'invalid_payload'
    | 'order_not_ours'
    | 'already_processed';
}

// ── HMAC verification ─────────────────────────────────────────────────────────

/**
 * Verify the Affirm webhook HMAC-SHA256 signature.
 *
 * Affirm sends: X-Affirm-Hmac-Sha256: <hex-encoded HMAC of raw body>
 *
 * Returns false (never throws) for any invalid input.
 */
export function verifyAffirmSignature(
  body: Buffer,
  signature: string | undefined | null,
  secret: string,
): boolean {
  if (!body || body.length === 0) return false;
  if (!signature || typeof signature !== 'string') return false;

  try {
    const expected = createHmac('sha256', secret).update(body).digest();
    const received = Buffer.from(signature.toLowerCase(), 'hex');

    // timingSafeEqual requires equal lengths — length mismatch means wrong signature
    if (expected.length !== received.length || received.length === 0) return false;

    return timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}

// ── Ownership check (IDOR guard) ──────────────────────────────────────────────

/**
 * Confirm the order ID in a webhook payload belongs to our store.
 * Prevents IDOR: an attacker cannot trigger fulfillment for another store's order.
 *
 * Returns false for null, undefined, non-string, or unrecognised prefix.
 */
export function isOurOrder(orderId: unknown): boolean {
  if (!orderId || typeof orderId !== 'string') return false;
  if (orderId.length < MIN_ORDER_ID_LENGTH) return false;
  return orderId.startsWith(CF_ORDER_PREFIX);
}

// ── Payload validation ────────────────────────────────────────────────────────

function isValidPayload(obj: unknown): obj is AffirmWebhookPayload {
  if (!obj || typeof obj !== 'object') return false;
  const p = obj as Record<string, unknown>;
  return (
    typeof p.event_id === 'string' &&
    p.event_id.length > 0 &&
    typeof p.event_type === 'string' &&
    typeof p.created === 'number' &&
    !!p.data &&
    typeof p.data === 'object' &&
    typeof (p.data as Record<string, unknown>).order_id === 'string'
  );
}

// ── Main handler ──────────────────────────────────────────────────────────────

/**
 * Handle an incoming Affirm webhook with full security checks.
 *
 * Security order:
 *  1. Empty body guard
 *  2. HMAC verification (reject unsigned/tampered payloads with reason=invalid_signature)
 *  3. JSON parse (reject malformed with reason=invalid_payload)
 *  4. Payload field validation (require event_id, event_type, data.order_id)
 *  5. Order ownership IDOR check (reason=order_not_ours)
 *  6. Idempotency check (reason=already_processed)
 *  7. Route by event_type — call onFulfill only for charge.confirmed
 *
 * @param rawBody - Raw request body Buffer (must be buffered BEFORE any parsing)
 * @param signature - Value of X-Affirm-Hmac-Sha256 header
 * @param secret - Affirm webhook secret (from AFFIRM_WEBHOOK_SECRET env var)
 * @param onFulfill - Called with the verified payload for charge.confirmed events
 */
export async function handleAffirmWebhook(
  rawBody: Buffer,
  signature: string | undefined | null,
  secret: string,
  onFulfill: (payload: AffirmWebhookPayload) => Promise<void>,
): Promise<WebhookHandlerResult> {
  // Step 1: Empty body guard
  if (!rawBody || rawBody.length === 0) {
    return { processed: false, reason: 'empty_body' };
  }

  // Step 2: HMAC verification — BEFORE any parsing
  if (!verifyAffirmSignature(rawBody, signature, secret)) {
    return { processed: false, reason: 'invalid_signature' };
  }

  // Step 3: Parse JSON — only after HMAC passes
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return { processed: false, reason: 'invalid_payload' };
  }

  // Step 4: Validate payload shape
  if (!isValidPayload(payload)) {
    return { processed: false, reason: 'invalid_payload' };
  }

  // Step 5: Order ownership check (IDOR guard)
  if (!isOurOrder(payload.data.order_id)) {
    return { processed: false, reason: 'order_not_ours' };
  }

  // Step 6: Idempotency — skip duplicate events
  if (processedEventIds.has(payload.event_id)) {
    return { processed: false, reason: 'already_processed' };
  }

  // Mark as processed (idempotency fence)
  processedEventIds.add(payload.event_id);

  // Step 7: Route by event type
  if (payload.event_type === 'charge.confirmed') {
    await onFulfill(payload);
  }
  // charge.rejected and charge.cancelled are acknowledged but not fulfilled

  return { processed: true };
}
