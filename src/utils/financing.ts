/**
 * Financing calculator for monthly payment breakdowns.
 *
 * Aligned with web financingCalc.web.js (cm-0im):
 *  - Terms: 6 / 12 / 18 / 24 months (was 3 / 6 / 12)
 *  - APR: 0% for 6 & 12 mo, 4.99% for 18 mo, 9.99% for 24 mo (was flat 9.99%)
 *  - Per-term price eligibility windows
 *  - Afterpay max: $1,000 with $35 minimum (was $2,000 / $1)
 */

// ── Term plans — matches web TERM_PLANS ───────────────────────────────────────

export interface TermPlan {
  months: number;
  apr: number;
  label: string;
  description: string;
  minPrice: number;
  maxPrice: number;
}

export const TERM_PLANS: readonly TermPlan[] = [
  {
    months: 6,
    apr: 0,
    label: '6 Months',
    description: '0% APR for 6 months',
    minPrice: 200,
    maxPrice: 10000,
  },
  {
    months: 12,
    apr: 0,
    label: '12 Months',
    description: '0% APR for 12 months',
    minPrice: 500,
    maxPrice: 10000,
  },
  {
    months: 18,
    apr: 4.99,
    label: '18 Months',
    description: '4.99% APR for 18 months',
    minPrice: 750,
    maxPrice: 10000,
  },
  {
    months: 24,
    apr: 9.99,
    label: '24 Months',
    description: '9.99% APR for 24 months',
    minPrice: 500,
    maxPrice: 10000,
  },
] as const;

/** Available financing term lengths in months */
export const FINANCING_TERMS = [6, 12, 18, 24] as const;

export type FinancingTerm = (typeof FINANCING_TERMS)[number];

/** Minimum price to qualify for any financing plan (web MIN_FINANCING_AMOUNT) */
export const FINANCING_THRESHOLD = 200;

export interface FinancingOption {
  months: FinancingTerm;
  monthlyPayment: number;
  apr: number;
  isZeroInterest: boolean;
  label: string;
  description: string;
}

/**
 * Returns true if the price qualifies for at least one financing plan.
 */
export function isFinancingEligible(price: number): boolean {
  return TERM_PLANS.some((plan) => price >= plan.minPrice && price <= plan.maxPrice);
}

/**
 * Calculates the monthly payment for a given price, term length, and APR.
 *
 * apr=0: simple division M = P / n (interest-free)
 * apr>0: standard amortization M = P * [r(1+r)^n] / [(1+r)^n - 1]
 *   where r = apr/100/12, n = months
 *
 * Matches web amortize() in financingCalc.web.js.
 */
export function calculateMonthlyPayment(price: number, months: number, apr: number): number {
  if (apr === 0) {
    return Math.round((price / months) * 100) / 100;
  }
  const r = apr / 100 / 12;
  const factor = Math.pow(1 + r, months);
  const payment = (price * (r * factor)) / (factor - 1);
  return Math.round(payment * 100) / 100;
}

/**
 * Returns all financing term options applicable to a given price.
 * Returns empty array if no plan covers this price.
 */
export function getFinancingTerms(price: number): FinancingOption[] {
  return TERM_PLANS.filter((plan) => price >= plan.minPrice && price <= plan.maxPrice).map(
    (plan) => ({
      months: plan.months as FinancingTerm,
      monthlyPayment: calculateMonthlyPayment(price, plan.months, plan.apr),
      apr: plan.apr,
      isZeroInterest: plan.apr === 0,
      label: plan.label,
      description: plan.description,
    }),
  );
}

// ── Afterpay (Pay in 4) ───────────────────────────────────────────────────────

/** Maximum price eligible for Afterpay Pay in 4 (matches web) */
export const AFTERPAY_MAX_AMOUNT = 1000;

/** Minimum price eligible for Afterpay Pay in 4 (matches web AFTERPAY.minAmount) */
export const AFTERPAY_MIN_AMOUNT = 35;

/** Number of Afterpay installments */
export const AFTERPAY_INSTALLMENT_COUNT = 4;

export interface AfterpayInstallment {
  number: number;
  amount: number;
  label: string;
}

/** Returns true if the price is eligible for Afterpay Pay in 4. */
export function isAfterpayEligible(price: number): boolean {
  return price >= AFTERPAY_MIN_AMOUNT && price <= AFTERPAY_MAX_AMOUNT;
}

/**
 * Returns 4 installments for Afterpay Pay in 4.
 * Installments 1–3 each = roundCents(price / 4).
 * Installment 4 absorbs any rounding remainder.
 * Matches web calculateAfterpay() rounding strategy.
 * Labels: Today, In 2 weeks, In 4 weeks, In 6 weeks.
 */
export function getAfterpayInstallments(price: number): AfterpayInstallment[] {
  if (!isAfterpayEligible(price)) return [];

  const installmentAmount = Math.round((price / AFTERPAY_INSTALLMENT_COUNT) * 100) / 100;
  const lastAmount =
    Math.round((price - installmentAmount * (AFTERPAY_INSTALLMENT_COUNT - 1)) * 100) / 100;
  const labels = ['Today', 'In 2 weeks', 'In 4 weeks', 'In 6 weeks'];

  return Array.from({ length: AFTERPAY_INSTALLMENT_COUNT }, (_, i) => ({
    number: i + 1,
    amount: i < AFTERPAY_INSTALLMENT_COUNT - 1 ? installmentAmount : lastAmount,
    label: labels[i],
  }));
}

// ── Legacy export — kept for any callers that referenced the old flat APR ─────

/** @deprecated Use TERM_PLANS for per-term APR. Preserved for backward compatibility. */
export const FINANCING_APR = 0.0999;
