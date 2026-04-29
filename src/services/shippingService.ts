/**
 * Shipping cost calculation service.
 *
 * Currently uses flat-rate fallback. Designed for drop-in replacement
 * with UPS Rating API for zone-based shipping rates.
 */

export interface ShippingInput {
  subtotal: number;
  shippingZip: string;
  isPremium: boolean;
  itemWeightLbs: number;
}

export interface ShippingResult {
  shippingCost: number;
  freeShippingApplied: boolean;
  freeShippingReason?: 'threshold' | 'premium';
  fallback: boolean;
  estimatedDays: number;
  deliveryTier: 'parcel' | 'ltl' | 'freight' | 'white_glove';
}

const FREE_SHIPPING_THRESHOLD = 499;
const FLAT_RATE_FALLBACK = 49.99;

const LTL_THRESHOLD_LBS = 70;
const FREIGHT_THRESHOLD_LBS = 500;

function isNcZip(zip: string): boolean {
  return zip.startsWith('27') || zip.startsWith('28');
}

function resolveDeliveryTier(zip: string, weightLbs: number): ShippingResult['deliveryTier'] {
  if (isNcZip(zip)) return 'white_glove';
  if (weightLbs < LTL_THRESHOLD_LBS) return 'parcel';
  if (weightLbs <= FREIGHT_THRESHOLD_LBS) return 'ltl';
  return 'freight';
}

/**
 * Calculate shipping cost for an order.
 *
 * Free shipping for premium members or orders >= $499.
 * Delivery tier is weight-based: parcel (<70 lbs), LTL (70–500 lbs),
 * freight (>500 lbs). NC zip codes always receive white-glove delivery.
 * CFW mirrors this same logic via /api/delivery-zone (cf-eihx) — mobile
 * applies tiers locally, no live endpoint call needed.
 */
export async function calculateShipping(input: ShippingInput): Promise<ShippingResult> {
  const { subtotal, shippingZip, isPremium, itemWeightLbs } = input;

  if (itemWeightLbs < 0) {
    throw new Error(`[shippingService] itemWeightLbs must be >= 0, got ${itemWeightLbs}`);
  }

  const deliveryTier = resolveDeliveryTier(shippingZip, itemWeightLbs);

  if (isPremium) {
    return {
      shippingCost: 0,
      freeShippingApplied: true,
      freeShippingReason: 'premium',
      fallback: false,
      estimatedDays: 5,
      deliveryTier,
    };
  }

  if (subtotal >= FREE_SHIPPING_THRESHOLD) {
    return {
      shippingCost: 0,
      freeShippingApplied: true,
      freeShippingReason: 'threshold',
      fallback: false,
      estimatedDays: 5,
      deliveryTier,
    };
  }

  return {
    shippingCost: FLAT_RATE_FALLBACK,
    freeShippingApplied: false,
    fallback: true,
    estimatedDays: 7,
    deliveryTier,
  };
}
