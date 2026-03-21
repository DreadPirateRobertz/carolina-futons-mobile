/**
 * TDD tests for affirmWebhook — Affirm BNPL webhook security handler.
 *
 * Security rules (load-bearing order per dutch/predator review):
 *  1. HMAC-SHA256 signature verification BEFORE any payload processing
 *  2. Constant-time compare (no timing attacks)
 *  3. Order ownership (IDOR) check AFTER HMAC passes
 *  4. Idempotency — reject duplicate event IDs
 *  5. Unmarshal JSON ONLY after all checks pass
 *
 * Covers:
 *  - Valid HMAC hex signature accepted
 *  - Invalid/tampered signature rejected with 400
 *  - Missing signature header rejected with 400
 *  - Wrong secret rejected
 *  - Empty body rejected
 *  - Order ownership check (IDOR): mismatched orderId rejected
 *  - Idempotency: already-processed event IDs are no-ops
 *  - First-seen events ARE processed and stored
 *  - handleAffirmWebhook: full handler wiring in correct security order
 *  - charge.confirmed events trigger fulfillment callback
 *  - charge.rejected events do NOT trigger fulfillment callback
 *  - Payload with non-string orderId rejected
 *  - Handler returns { processed: false, reason } for all rejections
 *
 * Bead: cm-d7l
 */

import { createHmac } from 'crypto';
import {
  verifyAffirmSignature,
  isOurOrder,
  handleAffirmWebhook,
  clearProcessedEvents,
  type AffirmWebhookPayload,
} from '../affirmWebhook';

const SECRET = 'test-affirm-webhook-secret-xyz';
const OUR_ORDER_PREFIX = 'cf-';

function makeHmacSig(body: string, secret = SECRET): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

function makePayload(overrides?: Partial<AffirmWebhookPayload>): AffirmWebhookPayload {
  return {
    event_id: 'evt-abc123',
    event_type: 'charge.confirmed',
    created: 1700000000,
    data: {
      charge_id: 'Q3AF-LMNO',
      order_id: 'cf-ord-555',
      amount: 49900, // $499 in cents
      currency: 'USD',
    },
    ...overrides,
  };
}

// ── verifyAffirmSignature ────────────────────────────────────────────────────

describe('verifyAffirmSignature', () => {
  it('returns true for valid HMAC-SHA256 hex signature', () => {
    const body = JSON.stringify(makePayload());
    const sig = makeHmacSig(body);
    expect(verifyAffirmSignature(Buffer.from(body), sig, SECRET)).toBe(true);
  });

  it('returns false when body is tampered after signing', () => {
    const original = JSON.stringify(makePayload());
    const tampered = JSON.stringify(makePayload({ event_id: 'evt-evil' }));
    const sig = makeHmacSig(original);
    expect(verifyAffirmSignature(Buffer.from(tampered), sig, SECRET)).toBe(false);
  });

  it('returns false when signature uses wrong secret', () => {
    const body = JSON.stringify(makePayload());
    const sig = makeHmacSig(body, 'wrong-secret');
    expect(verifyAffirmSignature(Buffer.from(body), sig, SECRET)).toBe(false);
  });

  it('returns false for empty signature string', () => {
    const body = JSON.stringify(makePayload());
    expect(verifyAffirmSignature(Buffer.from(body), '', SECRET)).toBe(false);
  });

  it('returns false for undefined/null signature', () => {
    const body = JSON.stringify(makePayload());
    expect(verifyAffirmSignature(Buffer.from(body), undefined as any, SECRET)).toBe(false);
    expect(verifyAffirmSignature(Buffer.from(body), null as any, SECRET)).toBe(false);
  });

  it('returns false for empty body', () => {
    const sig = makeHmacSig('');
    expect(verifyAffirmSignature(Buffer.from(''), sig, SECRET)).toBe(false);
  });

  it('returns false when signature has wrong hex length', () => {
    const body = JSON.stringify(makePayload());
    expect(verifyAffirmSignature(Buffer.from(body), 'deadbeef', SECRET)).toBe(false);
  });

  it('works correctly with Buffer body (not just string)', () => {
    const body = JSON.stringify(makePayload());
    const buf = Buffer.from(body, 'utf8');
    const sig = createHmac('sha256', SECRET).update(buf).digest('hex');
    expect(verifyAffirmSignature(buf, sig, SECRET)).toBe(true);
  });
});

// ── isOurOrder ───────────────────────────────────────────────────────────────

describe('isOurOrder', () => {
  it(`returns true for order IDs starting with "${OUR_ORDER_PREFIX}"`, () => {
    expect(isOurOrder('cf-ord-123')).toBe(true);
    expect(isOurOrder('cf-order-abc-def')).toBe(true);
  });

  it('returns false for order IDs not belonging to our store', () => {
    expect(isOurOrder('other-store-123')).toBe(false);
    expect(isOurOrder('ord-123')).toBe(false);
    expect(isOurOrder('')).toBe(false);
  });

  it('returns false for order IDs that are just the prefix', () => {
    expect(isOurOrder('cf-')).toBe(false);
  });

  it('is case-sensitive', () => {
    expect(isOurOrder('CF-ord-123')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isOurOrder(null as any)).toBe(false);
    expect(isOurOrder(undefined as any)).toBe(false);
    expect(isOurOrder(123 as any)).toBe(false);
  });
});

// ── Idempotency ──────────────────────────────────────────────────────────────

describe('handleAffirmWebhook — idempotency', () => {
  beforeEach(() => {
    clearProcessedEvents();
  });

  it('processes a first-seen event and calls fulfillment callback', async () => {
    const payload = makePayload();
    const body = JSON.stringify(payload);
    const sig = makeHmacSig(body);
    const onFulfill = jest.fn().mockResolvedValue(undefined);

    const result = await handleAffirmWebhook(Buffer.from(body), sig, SECRET, onFulfill);

    expect(result.processed).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(onFulfill).toHaveBeenCalledTimes(1);
    expect(onFulfill).toHaveBeenCalledWith(payload);
  });

  it('rejects a duplicate event ID without calling fulfillment again', async () => {
    const payload = makePayload();
    const body = JSON.stringify(payload);
    const sig = makeHmacSig(body);
    const onFulfill = jest.fn().mockResolvedValue(undefined);

    // First call — process normally
    await handleAffirmWebhook(Buffer.from(body), sig, SECRET, onFulfill);
    // Second call — same event_id — should be a no-op
    const result = await handleAffirmWebhook(Buffer.from(body), sig, SECRET, onFulfill);

    expect(result.processed).toBe(false);
    expect(result.reason).toBe('already_processed');
    expect(onFulfill).toHaveBeenCalledTimes(1); // NOT called again
  });

  it('processes different event IDs independently', async () => {
    const payload1 = makePayload({ event_id: 'evt-111' });
    const payload2 = makePayload({ event_id: 'evt-222' });
    const body1 = JSON.stringify(payload1);
    const body2 = JSON.stringify(payload2);
    const onFulfill = jest.fn().mockResolvedValue(undefined);

    await handleAffirmWebhook(Buffer.from(body1), makeHmacSig(body1), SECRET, onFulfill);
    await handleAffirmWebhook(Buffer.from(body2), makeHmacSig(body2), SECRET, onFulfill);

    expect(onFulfill).toHaveBeenCalledTimes(2);
  });
});

// ── handleAffirmWebhook — full security order ────────────────────────────────

describe('handleAffirmWebhook — security validation', () => {
  beforeEach(() => {
    clearProcessedEvents();
  });

  it('rejects request with invalid HMAC — does NOT call fulfillment', async () => {
    const payload = makePayload();
    const body = JSON.stringify(payload);
    const onFulfill = jest.fn();

    const result = await handleAffirmWebhook(Buffer.from(body), 'bad-signature', SECRET, onFulfill);

    expect(result.processed).toBe(false);
    expect(result.reason).toBe('invalid_signature');
    expect(onFulfill).not.toHaveBeenCalled();
  });

  it('rejects request with missing signature header', async () => {
    const payload = makePayload();
    const body = JSON.stringify(payload);
    const onFulfill = jest.fn();

    const result = await handleAffirmWebhook(
      Buffer.from(body),
      undefined as any,
      SECRET,
      onFulfill,
    );

    expect(result.processed).toBe(false);
    expect(result.reason).toBe('invalid_signature');
    expect(onFulfill).not.toHaveBeenCalled();
  });

  it('rejects order IDs that do not belong to our store (IDOR guard)', async () => {
    const payload = makePayload({
      data: {
        charge_id: 'Q3AF-EVIL',
        order_id: 'other-store-9999',
        amount: 49900,
        currency: 'USD',
      },
    });
    const body = JSON.stringify(payload);
    const sig = makeHmacSig(body);
    const onFulfill = jest.fn();

    const result = await handleAffirmWebhook(Buffer.from(body), sig, SECRET, onFulfill);

    expect(result.processed).toBe(false);
    expect(result.reason).toBe('order_not_ours');
    expect(onFulfill).not.toHaveBeenCalled();
  });

  it('rejects empty body before HMAC check', async () => {
    const onFulfill = jest.fn();
    const result = await handleAffirmWebhook(Buffer.from(''), makeHmacSig(''), SECRET, onFulfill);

    expect(result.processed).toBe(false);
    expect(result.reason).toBe('empty_body');
    expect(onFulfill).not.toHaveBeenCalled();
  });

  it('rejects non-JSON body (passes HMAC but fails parse)', async () => {
    const body = 'not-json';
    const sig = makeHmacSig(body);
    const onFulfill = jest.fn();

    const result = await handleAffirmWebhook(Buffer.from(body), sig, SECRET, onFulfill);

    expect(result.processed).toBe(false);
    expect(result.reason).toBe('invalid_payload');
    expect(onFulfill).not.toHaveBeenCalled();
  });

  it('rejects payload missing required event_id field', async () => {
    const payload = makePayload();
    const { event_id: _eventId, ...payloadWithoutId } = payload;
    const body = JSON.stringify(payloadWithoutId);
    const sig = makeHmacSig(body);
    const onFulfill = jest.fn();

    const result = await handleAffirmWebhook(Buffer.from(body), sig, SECRET, onFulfill);

    expect(result.processed).toBe(false);
    expect(result.reason).toBe('invalid_payload');
    expect(onFulfill).not.toHaveBeenCalled();
  });

  it('does NOT call fulfillment for charge.rejected events', async () => {
    const payload = makePayload({ event_type: 'charge.rejected' });
    const body = JSON.stringify(payload);
    const sig = makeHmacSig(body);
    const onFulfill = jest.fn();

    const result = await handleAffirmWebhook(Buffer.from(body), sig, SECRET, onFulfill);

    expect(result.processed).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(onFulfill).not.toHaveBeenCalled();
  });

  it('does NOT call fulfillment for charge.cancelled events', async () => {
    const payload = makePayload({ event_type: 'charge.cancelled' });
    const body = JSON.stringify(payload);
    const sig = makeHmacSig(body);
    const onFulfill = jest.fn();

    const result = await handleAffirmWebhook(Buffer.from(body), sig, SECRET, onFulfill);

    expect(result.processed).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(onFulfill).not.toHaveBeenCalled();
  });
});

// ── No SSRF from payload ─────────────────────────────────────────────────────

describe('handleAffirmWebhook — no SSRF from payload', () => {
  beforeEach(() => {
    clearProcessedEvents();
  });

  it('passes charge_id through without modification (no URL construction)', async () => {
    // Verifies that malicious charge_id values don't become URLs
    const payload = makePayload({
      data: {
        charge_id: 'http://evil.com/steal?token=abc',
        order_id: 'cf-ord-555',
        amount: 49900,
        currency: 'USD',
      },
    });
    const body = JSON.stringify(payload);
    const sig = makeHmacSig(body);
    const onFulfill = jest.fn().mockResolvedValue(undefined);

    // The handler should pass the payload to onFulfill — the caller is responsible
    // for not using charge_id as a URL. Verify it's not treated as a URL internally.
    const result = await handleAffirmWebhook(Buffer.from(body), sig, SECRET, onFulfill);

    expect(result.processed).toBe(true);
    // onFulfill receives the raw payload — consumer must sanitise before URL use
    expect(onFulfill).toHaveBeenCalledWith(payload);
  });
});
