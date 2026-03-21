/**
 * @module wixWebhook
 *
 * Wix webhook HMAC-SHA256 signature verification utility.
 *
 * SECURITY RULES (order is load-bearing — per zhora security note):
 *  1. Buffer raw body BEFORE any parsing (streaming breaks the hash)
 *  2. Compute HMAC-SHA256 over raw Buffer
 *  3. Constant-time compare via crypto.timingSafeEqual (NO == timing attacks)
 *  4. Unmarshal JSON ONLY after verification passes
 *
 * Two variants are provided:
 *  - verifyWixWebhookHmac: expects hex-encoded X-Wix-Signature-256 header
 *  - verifyWixWebhookHmacBase64: expects base64-encoded signature
 *    (Wix may use either depending on endpoint — check their webhook docs)
 *
 * IMPORTANT: No request body logging in Wix HTTP proxy functions.
 * Never log the raw body or signature — it may contain PII or credentials.
 *
 * Usage:
 *   const rawBody = Buffer.from(req.body);  // buffer BEFORE parsing
 *   const sig = req.headers['x-wix-signature-256'];
 *   if (!verifyWixWebhookHmac(rawBody, sig, WIX_WEBHOOK_SECRET)) {
 *     return res.status(401).end();
 *   }
 *   const event = JSON.parse(rawBody.toString());  // parse AFTER verify
 *
 * Bead: cm-1s7
 */

import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verify a Wix webhook signature encoded as hex (X-Wix-Signature-256).
 *
 * Returns false (never throws) for any invalid/malformed input so that
 * callers can safely reject without try/catch.
 */
export function verifyWixWebhookHmac(body: Buffer, signature: string, secret: string): boolean {
  // Reject empty body — no meaningful payload to verify
  if (!body || body.length === 0) return false;
  // Reject missing or empty signature
  if (!signature) return false;

  try {
    const expected = createHmac('sha256', secret).update(body).digest();
    const received = Buffer.from(signature.toLowerCase(), 'hex');

    // Ensure same length before timingSafeEqual (it throws on different lengths)
    if (expected.length !== received.length) return false;

    return timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}

/**
 * Verify a Wix webhook signature encoded as base64.
 * Use when the webhook endpoint sends a base64-encoded digest.
 *
 * Returns false (never throws) for any invalid/malformed input.
 */
export function verifyWixWebhookHmacBase64(
  body: Buffer,
  signature: string,
  secret: string,
): boolean {
  // Reject empty body
  if (!body || body.length === 0) return false;
  // Reject missing or empty signature
  if (!signature) return false;

  try {
    const expected = createHmac('sha256', secret).update(body).digest();
    const received = Buffer.from(signature, 'base64');

    if (expected.length !== received.length) return false;

    return timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}
