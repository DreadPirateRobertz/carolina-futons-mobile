/**
 * TDD tests for wixWebhook — Wix webhook HMAC-SHA256 signature verification.
 *
 * Security rules (load-bearing order):
 *  1. Buffer raw body BEFORE any parsing
 *  2. Compute HMAC-SHA256 over raw bytes
 *  3. Constant-time compare (no == timing attacks)
 *  4. Unmarshal JSON only AFTER verification passes
 *
 * Covers:
 *  - Valid signature passes verification
 *  - Tampered body rejected
 *  - Wrong secret rejected
 *  - Missing/empty signature rejected
 *  - Signature encoding: hex and base64 variants
 *  - Empty body guard
 *  - No request body logging (function has no console side effects)
 *
 * Bead: cm-1s7 (zhora security note)
 */

import { createHmac } from 'crypto';
import { verifyWixWebhookHmac, verifyWixWebhookHmacBase64 } from '../wixWebhook';

const SECRET = 'test-webhook-secret-abc123';

function makeHexSig(body: string | Buffer, secret = SECRET): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

function makeBase64Sig(body: string | Buffer, secret = SECRET): string {
  return createHmac('sha256', secret).update(body).digest('base64');
}

// ── verifyWixWebhookHmac (hex) ────────────────────────────────────────────────

describe('verifyWixWebhookHmac — hex encoded', () => {
  it('returns true for a valid signature over a string body', () => {
    const body = '{"event":"order.paid","orderId":"ord-123"}';
    const sig = makeHexSig(body);
    expect(verifyWixWebhookHmac(Buffer.from(body), sig, SECRET)).toBe(true);
  });

  it('returns true for a valid signature over a Buffer body', () => {
    const body = Buffer.from('{"type":"subscription","id":"sub-1"}');
    const sig = makeHexSig(body);
    expect(verifyWixWebhookHmac(body, sig, SECRET)).toBe(true);
  });

  it('returns false when body has been tampered', () => {
    const original = '{"event":"order.paid","orderId":"ord-123"}';
    const tampered = '{"event":"order.paid","orderId":"ord-999"}';
    const sig = makeHexSig(original);
    expect(verifyWixWebhookHmac(Buffer.from(tampered), sig, SECRET)).toBe(false);
  });

  it('returns false when signature uses wrong secret', () => {
    const body = '{"event":"order.paid"}';
    const sig = makeHexSig(body, 'wrong-secret');
    expect(verifyWixWebhookHmac(Buffer.from(body), sig, SECRET)).toBe(false);
  });

  it('returns false for empty signature string', () => {
    const body = '{"event":"order.paid"}';
    expect(verifyWixWebhookHmac(Buffer.from(body), '', SECRET)).toBe(false);
  });

  it('returns false for a completely malformed signature (not hex)', () => {
    const body = '{"event":"test"}';
    expect(verifyWixWebhookHmac(Buffer.from(body), 'not-a-hex-string!!', SECRET)).toBe(false);
  });

  it('returns false for empty body with valid signature of empty string', () => {
    const sig = makeHexSig('');
    // Empty body is rejected before signature check
    expect(verifyWixWebhookHmac(Buffer.from(''), sig, SECRET)).toBe(false);
  });

  it('returns true for body containing literal "null" string with correct sig', () => {
    // "null" is a valid 4-byte body — should verify correctly
    const body = 'null';
    const sig = makeHexSig(body);
    expect(verifyWixWebhookHmac(Buffer.from(body), sig, SECRET)).toBe(true);
  });

  it('is case-insensitive for hex signatures (upper vs lower)', () => {
    const body = '{"event":"order.paid"}';
    const sigLower = makeHexSig(body);
    const sigUpper = sigLower.toUpperCase();
    expect(verifyWixWebhookHmac(Buffer.from(body), sigUpper, SECRET)).toBe(true);
  });

  it('does not throw on any input — never surfaces internal errors', () => {
    expect(() => verifyWixWebhookHmac(Buffer.from('x'), 'badsig', SECRET)).not.toThrow();
    expect(() => verifyWixWebhookHmac(Buffer.alloc(0), '', '')).not.toThrow();
  });
});

// ── verifyWixWebhookHmacBase64 ────────────────────────────────────────────────

describe('verifyWixWebhookHmacBase64 — base64 encoded', () => {
  it('returns true for a valid base64 signature', () => {
    const body = '{"event":"order.paid","orderId":"ord-123"}';
    const sig = makeBase64Sig(body);
    expect(verifyWixWebhookHmacBase64(Buffer.from(body), sig, SECRET)).toBe(true);
  });

  it('returns false for tampered body', () => {
    const original = '{"event":"order.paid"}';
    const tampered = '{"event":"order.tampered"}';
    const sig = makeBase64Sig(original);
    expect(verifyWixWebhookHmacBase64(Buffer.from(tampered), sig, SECRET)).toBe(false);
  });

  it('returns false for wrong secret', () => {
    const body = '{"event":"test"}';
    const sig = makeBase64Sig(body, 'wrong-secret');
    expect(verifyWixWebhookHmacBase64(Buffer.from(body), sig, SECRET)).toBe(false);
  });

  it('returns false for empty signature', () => {
    const body = '{"event":"test"}';
    expect(verifyWixWebhookHmacBase64(Buffer.from(body), '', SECRET)).toBe(false);
  });

  it('returns false for empty body', () => {
    const sig = makeBase64Sig('');
    expect(verifyWixWebhookHmacBase64(Buffer.from(''), sig, SECRET)).toBe(false);
  });

  it('does not throw on malformed base64', () => {
    expect(() =>
      verifyWixWebhookHmacBase64(Buffer.from('x'), '!!!not-base64', SECRET),
    ).not.toThrow();
  });
});

// ── No side-effect logging ────────────────────────────────────────────────────

describe('security: no body logging', () => {
  it('verifyWixWebhookHmac does not call console.log or console.error', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const body = '{"event":"order.paid","secret":"SENSITIVE"}';
    const sig = makeHexSig(body);
    verifyWixWebhookHmac(Buffer.from(body), sig, SECRET);

    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();

    logSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
