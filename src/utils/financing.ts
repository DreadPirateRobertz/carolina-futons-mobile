/**
 * Financing calculator for monthly payment breakdowns.
 *
 * Static calculation (no Affirm/Afterpay SDK). Uses standard amortization
 * formula with a fixed APR. Products over $299 qualify for financing.
 */

/** Minimum price to qualify for financing */
export const FINANCING_THRESHOLD = 299;

/** Annual percentage rate for financing calculations */
export const FINANCING_APR = 0.0999;

/** Available financing term lengths in months */
export const FINANCING_TERMS = [3, 6, 12] as const;

export type FinancingTerm = (typeof FINANCING_TERMS)[number];

export interface FinancingOption {
  months: FinancingTerm;
  monthlyPayment: number;
}

/**
 * Returns true if the price qualifies for financing.
 */
export function isFinancingEligible(price: number): boolean {
  return price > FINANCING_THRESHOLD;
}

/**
 * Calculates the monthly payment using standard amortization formula.
 *
 * Formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
 * where P = principal, r = monthly rate, n = number of months
 */
export function calculateMonthlyPayment(price: number, months: number): number {
  const monthlyRate = FINANCING_APR / 12;
  const factor = Math.pow(1 + monthlyRate, months);
  const payment = price * (monthlyRate * factor) / (factor - 1);
  return Math.round(payment * 100) / 100;
}

/**
 * Returns all financing term options for a given price.
 * Returns empty array if price is not eligible.
 */
export function getFinancingTerms(price: number): FinancingOption[] {
  if (!isFinancingEligible(price)) return [];

  return FINANCING_TERMS.map((months) => ({
    months,
    monthlyPayment: calculateMonthlyPayment(price, months),
  }));
}
