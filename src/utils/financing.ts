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
  const payment = (price * (monthlyRate * factor)) / (factor - 1);
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

// ── Afterpay (Pay in 4) ───────────────────────────────────────────────────────

/** Maximum price eligible for Afterpay Pay in 4 */
export const AFTERPAY_MAX_AMOUNT = 2000;

/** Number of Afterpay installments */
export const AFTERPAY_INSTALLMENT_COUNT = 4;

export interface AfterpayInstallment {
  number: number;
  amount: number;
  label: string;
}

/** Returns true if the price is eligible for Afterpay Pay in 4. */
export function isAfterpayEligible(price: number): boolean {
  return price > 0 && price <= AFTERPAY_MAX_AMOUNT;
}

/**
 * Returns 4 equal installments for Afterpay Pay in 4.
 * First installment absorbs any rounding remainder so all 4 sum exactly to price.
 * Labels: Today, In 2 weeks, In 4 weeks, In 6 weeks.
 */
export function getAfterpayInstallments(price: number): AfterpayInstallment[] {
  if (!isAfterpayEligible(price)) return [];

  const base = Math.floor((price / AFTERPAY_INSTALLMENT_COUNT) * 100) / 100;
  const first = Math.round((price - base * 3) * 100) / 100;
  const labels = ['Today', 'In 2 weeks', 'In 4 weeks', 'In 6 weeks'];

  return Array.from({ length: AFTERPAY_INSTALLMENT_COUNT }, (_, i) => ({
    number: i + 1,
    amount: i === 0 ? first : base,
    label: labels[i],
  }));
}
