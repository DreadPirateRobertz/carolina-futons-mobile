/**
 * @module checkoutSecurity
 *
 * Client-side security validation for the checkout flow.
 *
 * Security boundary:
 * - CLIENT (this module): amount/ID validation, PII scrubbing, nav allowlist
 * - SERVER (Wix backend): CSRF token validation, session fixation prevention,
 *   server-side amount/ID re-validation, authoritative fraud checks
 *
 * The client guards are a first line of defence; the server MUST re-validate
 * all inputs independently and never trust client-computed values.
 */

/** Minimum Stripe charge amount in dollars (Stripe minimum is $0.50). */
const MIN_AMOUNT = 0.5;
/** Maximum single checkout amount — orders above this require manual review. */
const MAX_AMOUNT = 99_999;

/**
 * Validate a checkout amount before submitting to the payment API.
 * Rejects zero, negative, non-finite, out-of-range, or sub-cent amounts.
 */
export function validateCheckoutAmount(amount: number): boolean {
  if (!Number.isFinite(amount)) return false;
  if (amount < MIN_AMOUNT) return false;
  if (amount > MAX_AMOUNT) return false;
  // Reject amounts with more than 2 decimal places (not a valid monetary value)
  if (Math.round(amount * 100) !== amount * 100) return false;
  return true;
}

/**
 * Allowlist of characters permitted in product/variant IDs.
 * Matches alphanumerics, hyphens, underscores, and colons (variant separator).
 */
const SAFE_ID_PATTERN = /^[a-zA-Z0-9\-_:]+$/;
const MAX_ID_LENGTH = 128;

/**
 * Validate a list of product IDs before submitting to the payment API.
 * Rejects empty lists, empty IDs, IDs with injection patterns, or oversized IDs.
 */
export function validateProductIds(ids: string[]): boolean {
  if (ids.length === 0) return false;
  return ids.every((id) => {
    if (!id || id.length === 0) return false;
    if (id.length > MAX_ID_LENGTH) return false;
    if (!SAFE_ID_PATTERN.test(id)) return false;
    return true;
  });
}

/**
 * Patterns that suggest card numbers (16 digits, optionally separated by
 * spaces or dashes in groups of 4).
 */
const CARD_NUMBER_PATTERNS = [
  /\b\d{16}\b/g,
  /\b\d{4}[\s-]\d{4}[\s-]\d{4}[\s-]\d{4}\b/g,
];

/**
 * Patterns that suggest AmEx card numbers (15 digits, optionally in 4-6-5
 * format separated by spaces or dashes).
 */
const AMEX_NUMBER_PATTERNS = [
  /\b\d{15}\b/g,
  /\b\d{4}[\s-]\d{6}[\s-]\d{5}\b/g,
];
const AMEX_REPLACEMENT = '[AMEX_REDACTED]';

/**
 * Pattern that suggests a CVV value immediately preceded by "cvv:" label.
 * Matches 3–4 digit values (Amex uses 4).
 */
const CVV_PATTERN = /\bcvv:\s*\d{3,4}\b/gi;
const CVV_REPLACEMENT = 'cvv: [REDACTED]';
const CARD_REPLACEMENT = '[CARD REDACTED]';

/**
 * Scrub PII (card numbers, CVV patterns) from an error message before it is
 * passed to crash reporting or logging infrastructure.
 */
export function scrubPiiFromError(message: string): string {
  if (!message) return message;

  let scrubbed = message;

  // Redact CVV patterns first (more specific match)
  scrubbed = scrubbed.replace(CVV_PATTERN, CVV_REPLACEMENT);

  // Redact AmEx card number patterns (15-digit, before generic 16-digit pass)
  for (const pattern of AMEX_NUMBER_PATTERNS) {
    scrubbed = scrubbed.replace(pattern, AMEX_REPLACEMENT);
  }

  // Redact standard 16-digit card number patterns
  for (const pattern of CARD_NUMBER_PATTERNS) {
    scrubbed = scrubbed.replace(pattern, CARD_REPLACEMENT);
  }

  return scrubbed;
}

/**
 * Screens that are valid navigation targets after checkout completes.
 * Any post-checkout navigation MUST be validated against this allowlist.
 */
const POST_CHECKOUT_ALLOWLIST = new Set([
  'PaymentConfirmation',
  'OrderSuccess',
  'OrderConfirmation',
  'Tabs',
  'OrderHistory',
  'OrderDetail',
]);

/**
 * Validate that a post-checkout navigation target is an allowed screen.
 * Prevents open-redirect style attacks if screen names are ever derived
 * from external input (deep links, push notification payloads).
 */
export function isAllowedPostCheckoutScreen(screenName: string): boolean {
  if (!screenName) return false;
  // Reject any string that isn't a clean alphanumeric/word name
  if (!/^[A-Za-z]+$/.test(screenName)) return false;
  return POST_CHECKOUT_ALLOWLIST.has(screenName);
}
