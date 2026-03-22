/**
 * @module deliveryEstimate
 *
 * Estimates shipping window based on destination ZIP code prefix — cm-mk8.
 *
 * Tiers (origin: NC):
 *   Local   270–299 (NC/SC)             → 2–3 business days
 *   Mid     200–399 (Southeast/Mid-Atl) → 3–5 business days
 *   National everything else            → 5–7 business days
 *
 * TODO(stilgar): Wire real shipping estimate API when available.
 */

const ZIP_RE = /^\d{5}(-\d{4})?$/;

/**
 * Returns a human-readable delivery estimate string for the given ZIP code,
 * or null if the ZIP is missing or invalid.
 */
export function getDeliveryEstimate(zip: string): string | null {
  const trimmed = zip.trim();
  if (!ZIP_RE.test(trimmed)) return null;

  const prefix = parseInt(trimmed.slice(0, 3), 10);

  if (prefix >= 270 && prefix <= 299) {
    return '2–3 business days';
  }
  if (prefix >= 200 && prefix <= 399) {
    return '3–5 business days';
  }
  return '5–7 business days';
}
