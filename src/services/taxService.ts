/**
 * Tax calculation service.
 *
 * Currently uses state-level fallback rates. Designed for drop-in replacement
 * with Stripe Tax API when production tax keys are configured.
 */

export interface TaxInput {
  subtotal: number;
  shippingAddress: { state: string; zip: string; country: string };
}

export interface TaxResult {
  taxAmount: number;
  taxRate: number;
  jurisdiction: string;
  fallback: boolean;
}

const TAX_FREE_STATES = new Set(['OR', 'MT', 'NH', 'DE', 'AK']);

// State-level fallback rates (used until Stripe Tax is wired)
const STATE_TAX_RATES: Record<string, number> = {
  NC: 0.07,
  SC: 0.06,
  VA: 0.053,
  GA: 0.04,
  TN: 0.07,
  FL: 0.06,
  TX: 0.0625,
  NY: 0.04,
  CA: 0.0725,
  PA: 0.06,
  IL: 0.0625,
  OH: 0.0575,
  MI: 0.06,
  NJ: 0.06625,
  WA: 0.065,
};

const DEFAULT_TAX_RATE = 0.07;

/**
 * Calculate sales tax for an order.
 *
 * Returns zero for tax-free states. Uses state-level fallback rates
 * until Stripe Tax API integration is complete.
 */
export async function calculateTax(input: TaxInput): Promise<TaxResult> {
  const { subtotal, shippingAddress } = input;
  const state = shippingAddress.state.toUpperCase();

  if (TAX_FREE_STATES.has(state)) {
    return { taxAmount: 0, taxRate: 0, jurisdiction: state, fallback: false };
  }

  // TODO: Replace with Stripe Tax API call when keys are configured
  const rate = STATE_TAX_RATES[state] ?? DEFAULT_TAX_RATE;
  const taxAmount = Math.round(subtotal * rate * 100) / 100;

  return {
    taxAmount,
    taxRate: rate,
    jurisdiction: state,
    fallback: true,
  };
}
