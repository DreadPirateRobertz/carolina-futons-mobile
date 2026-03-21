/**
 * @module bnplService
 *
 * Buy Now Pay Later (BNPL) installment logic for Klarna and Affirm.
 *
 * Provides:
 *  - BNPL_PROVIDERS: metadata about each provider (limits, display name, tagline)
 *  - isBNPLEligible: whether a given total is within a provider's min/max range
 *  - getBNPLInstallments: calculate a 4-payment installment schedule
 *
 * Stripe handles the actual payment presentation via initPaymentSheet with
 * paymentMethodTypes: ['klarna'] or ['afterpay_clearpay']. This module handles
 * the UI display logic only — no Stripe API calls here.
 *
 * Loyalty points: awarded on order_confirmed, NOT on BNPL authorization.
 * This is per Melania directive — BNPL auth is not a completed purchase.
 *
 * Bead: cm-1s7
 */

export type BNPLProviderKey = 'klarna' | 'affirm';

export interface BNPLProvider {
  displayName: string;
  tagline: string;
  minAmount: number;
  maxAmount: number;
  installmentCount: number;
  /** Interval between installments in days */
  intervalDays: number;
}

export interface BNPLInstallment {
  /** Installment number (1-based) */
  number: number;
  amount: number;
  /** Days from today this payment is due */
  daysFromNow: number;
  /** Human-readable label, e.g. "Today", "In 2 weeks" */
  label: string;
}

export const BNPL_PROVIDERS: Record<BNPLProviderKey, BNPLProvider> = {
  klarna: {
    displayName: 'Klarna',
    tagline: 'Pay in 4 interest-free installments',
    minAmount: 35,
    maxAmount: 10000,
    installmentCount: 4,
    intervalDays: 14,
  },
  affirm: {
    displayName: 'Affirm',
    tagline: 'Buy now, pay over time',
    minAmount: 50,
    maxAmount: 30000,
    installmentCount: 4,
    intervalDays: 30,
  },
};

/**
 * Whether the given total is eligible for BNPL with the specified provider.
 */
export function isBNPLEligible(total: number, provider: BNPLProviderKey): boolean {
  const config = BNPL_PROVIDERS[provider];
  return total >= config.minAmount && total <= config.maxAmount;
}

/**
 * Calculate a 4-payment installment schedule for a given total.
 * The first payment is due today; subsequent payments follow the provider's interval.
 *
 * Rounding: the first installment absorbs any remainder so that
 * installments 2-4 are exactly equal and the sum equals the total.
 *
 * @throws if total is zero or negative
 */
export function getBNPLInstallments(total: number, provider: BNPLProviderKey): BNPLInstallment[] {
  if (total <= 0) {
    throw new Error(`BNPL total must be positive, got ${total}`);
  }

  const config = BNPL_PROVIDERS[provider];
  const count = config.installmentCount;
  const intervalDays = config.intervalDays;

  // Calculate base installment (floor to 2 decimal places)
  const base = Math.floor((total / count) * 100) / 100;
  // First installment absorbs rounding remainder
  const first = Math.round((total - base * (count - 1)) * 100) / 100;

  return Array.from({ length: count }, (_, i) => {
    const daysFromNow = i * intervalDays;
    let label: string;
    if (daysFromNow === 0) {
      label = 'Today';
    } else if (daysFromNow < 30) {
      const weeks = daysFromNow / 7;
      label = `In ${weeks === 1 ? '1 week' : `${weeks} weeks`}`;
    } else {
      const months = Math.round(daysFromNow / 30);
      label = `In ${months === 1 ? '1 month' : `${months} months`}`;
    }

    return {
      number: i + 1,
      amount: i === 0 ? first : base,
      daysFromNow,
      label,
    };
  });
}
