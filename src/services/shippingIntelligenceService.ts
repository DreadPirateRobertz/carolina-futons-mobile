/**
 * @module shippingIntelligenceService
 *
 * Calls the Wix shippingIntelligence.web.js backend webMethod and maps
 * its response to the UI-ready shape used by CheckoutScreen.
 *
 * Aligns with the WixShippingOption shape from melania's PR #623:
 *   code, title, price, badge, badgeStyle, upsellMessage, highlight,
 *   icon, terrainSurcharge, isLTL, isEstimate
 *
 * cm-z5f
 */

import type { WixClient } from '@/services/wix/wixClient';

const ZIP_RE = /^\d{5}(-\d{4})?$/;

// ── Wix API types (mirrors shippingIntelligence.web.js JSDoc) ────────────────

export interface WixShippingOption {
  /** Unique method code (e.g. 'local-delivery-asheville', 'UPS_GROUND') */
  code: string;
  /** Display title with icon prefix (e.g. '📦 UPS Ground') */
  title: string;
  /** Formatted price string (e.g. '49.00') */
  price: string;
  currency: string;
  /** Human-readable delivery window (e.g. '5–7 business days') */
  deliveryTime: string;
  /** Gamification badge text, or null */
  badge: string | null;
  /** Badge style key: 'premium' | 'freight' | 'local' | 'savings' | null */
  badgeStyle: string | null;
  /** Upsell copy shown below option label, or null */
  upsellMessage: string | null;
  /** Whether to show a highlighted border on this option row */
  highlight: boolean;
  /** Emoji icon for the option */
  icon: string;
  /** Additional terrain surcharge for white-glove in mountain zip codes */
  terrainSurcharge?: number;
  isLTL?: boolean;
  isEstimate?: boolean;
  /** Whether a liftgate truck is required for delivery (cm-o4i) */
  requiresLiftgate?: boolean;
  /** Carrier name returned by the backend (cm-o4i) */
  carrier?: string;
}

export interface WixShippingIntelligenceResult {
  success: boolean;
  options: WixShippingOption[];
  error?: string;
}

// ── Normalized (UI) shape ─────────────────────────────────────────────────────

export interface NormalizedShippingOption {
  /** Unique code from the API — used as selection key */
  id: string;
  label: string;
  /** Price in cents (0 = FREE) */
  priceCents: number;
  badge: string | null;
  badgeStyle: string | null;
  upsellMessage: string | null;
  highlight: boolean;
  icon: string;
  deliveryTime: string;
  terrainSurcharge?: number;
  isLTL?: boolean;
  /** Whether a liftgate truck is required for delivery (cm-o4i) */
  requiresLiftgate?: boolean;
  /** Carrier name (cm-o4i) */
  carrier?: string;
}

export type ShippingCartItem = {
  productId: string;
  quantity: number;
  /** Price in cents */
  price?: number;
};

// ── Service function ──────────────────────────────────────────────────────────

/**
 * Fetch shipping options from the Wix shippingIntelligence backend webMethod.
 *
 * @param client  WixClient instance (handles auth + retry)
 * @param zip     5-digit US ZIP code (accepts ZIP+4 format)
 * @param items   Cart items to quote. Pass empty array or omit for single-product estimate.
 */
export async function fetchShippingOptions(
  client: WixClient,
  zip: string,
  items: ShippingCartItem[] = [],
): Promise<WixShippingIntelligenceResult> {
  if (!ZIP_RE.test(zip.trim())) {
    return { success: false, options: [], error: 'Valid 5-digit ZIP required' };
  }

  try {
    const result = await client.callFunction(
      '/_functions/shippingIntelligence/calculateBundleQuote',
      'POST',
      { zip: zip.trim(), items },
    );
    return result as WixShippingIntelligenceResult;
  } catch (err) {
    return {
      success: false,
      options: [],
      error: err instanceof Error ? err.message : 'Shipping options unavailable',
    };
  }
}

/**
 * Normalize a raw WixShippingOption to the UI-ready NormalizedShippingOption shape.
 * Converts price string to cents, maps code → id, etc.
 */
export function normalizeShippingOption(option: WixShippingOption): NormalizedShippingOption {
  const priceCents = Math.round(parseFloat(option.price) * 100);

  const normalized: NormalizedShippingOption = {
    id: option.code,
    label: option.title,
    priceCents,
    badge: option.badge,
    badgeStyle: option.badgeStyle,
    upsellMessage: option.upsellMessage,
    highlight: option.highlight,
    icon: option.icon,
    deliveryTime: option.deliveryTime,
    isLTL: option.isLTL,
  };

  if (option.terrainSurcharge !== undefined) {
    normalized.terrainSurcharge = option.terrainSurcharge;
  }
  if (option.requiresLiftgate !== undefined) {
    normalized.requiresLiftgate = option.requiresLiftgate;
  }
  if (option.carrier !== undefined) {
    normalized.carrier = option.carrier;
  }

  return normalized;
}
