/**
 * @module productBadgeTypes
 *
 * Shared badge type constants aligned with the cfutons web ProductBadges CMS
 * collection (melania's badge system, PR #657). Keeps visual language consistent
 * across web and mobile.
 *
 * Web badge types (from badgeHelpers.js):
 *   NEW, BESTSELLER, LOW_STOCK, SALE, CF_PLUS_EXCLUSIVE
 */

export const PRODUCT_BADGE_TYPES = {
  NEW: 'NEW',
  BESTSELLER: 'BESTSELLER',
  LOW_STOCK: 'LOW_STOCK',
  SALE: 'SALE',
  CF_PLUS_EXCLUSIVE: 'CF_PLUS_EXCLUSIVE',
} as const;

export type ProductBadgeType = (typeof PRODUCT_BADGE_TYPES)[keyof typeof PRODUCT_BADGE_TYPES];

/** Maps legacy free-form badge strings (product data) to typed constants */
export function normalizeBadgeType(badge: string | undefined | null): ProductBadgeType | null {
  if (!badge) return null;
  const upper = badge.toUpperCase().replace(/\s+/g, '_');
  if (upper in PRODUCT_BADGE_TYPES) return upper as ProductBadgeType;
  // Legacy string mapping
  const legacyMap: Record<string, ProductBadgeType> = {
    NEW: 'NEW',
    SALE: 'SALE',
    BESTSELLER: 'BESTSELLER',
    PREMIUM: 'CF_PLUS_EXCLUSIVE',
    'CF+': 'CF_PLUS_EXCLUSIVE',
    LOW_STOCK: 'LOW_STOCK',
    'LOW STOCK': 'LOW_STOCK',
  };
  return legacyMap[badge.toUpperCase()] ?? null;
}
