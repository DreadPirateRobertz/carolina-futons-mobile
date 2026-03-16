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
}

export interface ShippingResult {
  shippingCost: number;
  freeShippingApplied: boolean;
  freeShippingReason?: 'threshold' | 'premium';
  fallback: boolean;
  estimatedDays: number;
}

const FREE_SHIPPING_THRESHOLD = 499;
const FLAT_RATE_FALLBACK = 49.99;

/**
 * Calculate shipping cost for an order.
 *
 * Free shipping for premium members or orders >= $499.
 * Falls back to flat rate until UPS Rating API is wired.
 */
export async function calculateShipping(input: ShippingInput): Promise<ShippingResult> {
  const { subtotal, isPremium } = input;

  if (isPremium) {
    return {
      shippingCost: 0,
      freeShippingApplied: true,
      freeShippingReason: 'premium',
      fallback: false,
      estimatedDays: 5,
    };
  }

  if (subtotal >= FREE_SHIPPING_THRESHOLD) {
    return {
      shippingCost: 0,
      freeShippingApplied: true,
      freeShippingReason: 'threshold',
      fallback: false,
      estimatedDays: 5,
    };
  }

  // TODO: Call UPS Rating API for zone-based rates
  return {
    shippingCost: FLAT_RATE_FALLBACK,
    freeShippingApplied: false,
    fallback: true,
    estimatedDays: 7,
  };
}
