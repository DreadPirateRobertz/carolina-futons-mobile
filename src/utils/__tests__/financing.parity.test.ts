/**
 * BNPL parity tests — cm-0im
 *
 * Verifies mobile financing.ts matches web financingCalc.web.js exactly.
 *
 * Web source: cfutons/src/backend/financingCalc.web.js
 *
 * Key deltas from previous mobile behavior:
 *  - Terms: [6, 12, 18, 24] months (was [3, 6, 12])
 *  - APR: 0% for 6/12mo, 4.99% for 18mo, 9.99% for 24mo (was flat 9.99%)
 *  - Per-term min prices (was flat $300)
 *  - Max price: $10,000 per term
 *  - Afterpay max: $1,000 (was $2,000)
 *  - Afterpay rounding: last installment absorbs remainder (web: payment 4)
 */

import {
  calculateMonthlyPayment,
  isFinancingEligible,
  getFinancingTerms,
  isAfterpayEligible,
  getAfterpayInstallments,
  FINANCING_TERMS,
  AFTERPAY_MAX_AMOUNT,
  TERM_PLANS,
} from '../financing';

// ── Term plan configuration ───────────────────────────────────────────────────

describe('TERM_PLANS configuration — must match web', () => {
  it('exports 4 term plans: 6, 12, 18, 24 months', () => {
    expect(TERM_PLANS.map((p) => p.months)).toEqual([6, 12, 18, 24]);
  });

  it('6-month plan: 0% APR, min $200, max $10000', () => {
    const plan = TERM_PLANS.find((p) => p.months === 6)!;
    expect(plan.apr).toBe(0);
    expect(plan.minPrice).toBe(200);
    expect(plan.maxPrice).toBe(10000);
  });

  it('12-month plan: 0% APR, min $500, max $10000', () => {
    const plan = TERM_PLANS.find((p) => p.months === 12)!;
    expect(plan.apr).toBe(0);
    expect(plan.minPrice).toBe(500);
    expect(plan.maxPrice).toBe(10000);
  });

  it('18-month plan: 4.99% APR, min $750, max $10000', () => {
    const plan = TERM_PLANS.find((p) => p.months === 18)!;
    expect(plan.apr).toBe(4.99);
    expect(plan.minPrice).toBe(750);
    expect(plan.maxPrice).toBe(10000);
  });

  it('24-month plan: 9.99% APR, min $500, max $10000', () => {
    const plan = TERM_PLANS.find((p) => p.months === 24)!;
    expect(plan.apr).toBe(9.99);
    expect(plan.minPrice).toBe(500);
    expect(plan.maxPrice).toBe(10000);
  });

  it('FINANCING_TERMS constant is [6, 12, 18, 24]', () => {
    expect([...FINANCING_TERMS]).toEqual([6, 12, 18, 24]);
  });
});

// ── isFinancingEligible ───────────────────────────────────────────────────────

describe('isFinancingEligible — web threshold $200', () => {
  it('returns true at $200 (6-month plan min)', () => {
    expect(isFinancingEligible(200)).toBe(true);
  });

  it('returns false below $200', () => {
    expect(isFinancingEligible(199)).toBe(false);
    expect(isFinancingEligible(100)).toBe(false);
    expect(isFinancingEligible(0)).toBe(false);
  });

  it('returns true at $500 (unlocks 12-month plan)', () => {
    expect(isFinancingEligible(500)).toBe(true);
  });

  it('returns true at $750 (unlocks 18-month plan)', () => {
    expect(isFinancingEligible(750)).toBe(true);
  });

  it('returns false for negative prices', () => {
    expect(isFinancingEligible(-1)).toBe(false);
  });

  it('returns false above $10,000 (over max for all plans)', () => {
    expect(isFinancingEligible(10001)).toBe(false);
  });
});

// ── calculateMonthlyPayment ───────────────────────────────────────────────────

describe('calculateMonthlyPayment — amortization matches web amortize()', () => {
  // Web: apr=0 → M = P/n (simple division, no interest)
  it('0% APR: monthly = price / months (no interest)', () => {
    expect(calculateMonthlyPayment(600, 6, 0)).toBe(100);
    expect(calculateMonthlyPayment(600, 12, 0)).toBe(50);
    expect(calculateMonthlyPayment(1200, 6, 0)).toBe(200);
    expect(calculateMonthlyPayment(1200, 12, 0)).toBe(100);
  });

  // Web: apr>0 → standard amortization formula, roundCents(result)
  it('4.99% APR: $999 for 18 months', () => {
    // r = 4.99/100/12 = 0.0041583…
    // factor = (1+r)^18
    const r = 4.99 / 100 / 12;
    const n = 18;
    const P = 999;
    const factor = Math.pow(1 + r, n);
    const expected = Math.round(((P * (r * factor)) / (factor - 1)) * 100) / 100;
    expect(calculateMonthlyPayment(P, n, 4.99)).toBe(expected);
  });

  it('9.99% APR: $800 for 24 months', () => {
    const r = 9.99 / 100 / 12;
    const n = 24;
    const P = 800;
    const factor = Math.pow(1 + r, n);
    const expected = Math.round(((P * (r * factor)) / (factor - 1)) * 100) / 100;
    expect(calculateMonthlyPayment(P, n, 9.99)).toBe(expected);
  });

  it('0% APR: result rounded to 2 decimal places', () => {
    const result = calculateMonthlyPayment(100, 6, 0);
    expect(result).toBeCloseTo(16.67, 2);
  });

  it('result is always rounded to 2 decimal places', () => {
    const result = calculateMonthlyPayment(349, 6, 4.99);
    const str = result.toString();
    const decimals = str.split('.')[1];
    expect(!decimals || decimals.length <= 2).toBe(true);
  });
});

// ── getFinancingTerms ─────────────────────────────────────────────────────────

describe('getFinancingTerms — returns web-aligned plan options', () => {
  it('$200 product: only 6-month plan (below 12mo min of $500)', () => {
    const terms = getFinancingTerms(200);
    expect(terms.map((t) => t.months)).toEqual([6]);
  });

  it('$500 product: 6-month and 12-month and 24-month plans (below 18mo min $750)', () => {
    const terms = getFinancingTerms(500);
    expect(terms.map((t) => t.months)).toEqual([6, 12, 24]);
  });

  it('$750 product: 6, 12, 18, 24-month plans', () => {
    const terms = getFinancingTerms(750);
    expect(terms.map((t) => t.months)).toEqual([6, 12, 18, 24]);
  });

  it('$1000 product: all 4 plans', () => {
    const terms = getFinancingTerms(1000);
    expect(terms).toHaveLength(4);
    expect(terms.map((t) => t.months)).toEqual([6, 12, 18, 24]);
  });

  it('returns empty array below $200', () => {
    expect(getFinancingTerms(199)).toEqual([]);
    expect(getFinancingTerms(0)).toEqual([]);
  });

  it('returns empty array above $10,000', () => {
    expect(getFinancingTerms(10001)).toEqual([]);
  });

  it('each term includes apr, isZeroInterest, label, description', () => {
    const terms = getFinancingTerms(750);
    for (const term of terms) {
      expect(typeof term.apr).toBe('number');
      expect(typeof term.isZeroInterest).toBe('boolean');
      expect(typeof term.label).toBe('string');
      expect(typeof term.description).toBe('string');
    }
  });

  it('6-month term: isZeroInterest=true, apr=0', () => {
    const term = getFinancingTerms(750).find((t) => t.months === 6)!;
    expect(term.isZeroInterest).toBe(true);
    expect(term.apr).toBe(0);
  });

  it('12-month term: isZeroInterest=true, apr=0', () => {
    const term = getFinancingTerms(750).find((t) => t.months === 12)!;
    expect(term.isZeroInterest).toBe(true);
    expect(term.apr).toBe(0);
  });

  it('18-month term: isZeroInterest=false, apr=4.99', () => {
    const term = getFinancingTerms(750).find((t) => t.months === 18)!;
    expect(term.isZeroInterest).toBe(false);
    expect(term.apr).toBe(4.99);
  });

  it('24-month term: isZeroInterest=false, apr=9.99', () => {
    const term = getFinancingTerms(750).find((t) => t.months === 24)!;
    expect(term.isZeroInterest).toBe(false);
    expect(term.apr).toBe(9.99);
  });

  it('6-month, 0% APR: monthly = price / 6 exactly', () => {
    const term = getFinancingTerms(600).find((t) => t.months === 6)!;
    expect(term.monthlyPayment).toBe(100);
  });

  it('12-month, 0% APR: monthly = price / 12 exactly', () => {
    const term = getFinancingTerms(600).find((t) => t.months === 12)!;
    expect(term.monthlyPayment).toBe(50);
  });

  it('labels match web: "6 Months", "12 Months", "18 Months", "24 Months"', () => {
    const terms = getFinancingTerms(1000);
    expect(terms[0].label).toBe('6 Months');
    expect(terms[1].label).toBe('12 Months');
    expect(terms[2].label).toBe('18 Months');
    expect(terms[3].label).toBe('24 Months');
  });

  it('descriptions match web', () => {
    const terms = getFinancingTerms(1000);
    expect(terms[0].description).toBe('0% APR for 6 months');
    expect(terms[1].description).toBe('0% APR for 12 months');
    expect(terms[2].description).toBe('4.99% APR for 18 months');
    expect(terms[3].description).toBe('9.99% APR for 24 months');
  });
});

// ── Afterpay parity ───────────────────────────────────────────────────────────

describe('Afterpay — web parity ($1,000 max, min $35)', () => {
  it('AFTERPAY_MAX_AMOUNT is $1,000 (matching web)', () => {
    expect(AFTERPAY_MAX_AMOUNT).toBe(1000);
  });

  it('eligible at $35 (web minAmount)', () => {
    expect(isAfterpayEligible(35)).toBe(true);
  });

  it('ineligible below $35', () => {
    expect(isAfterpayEligible(34)).toBe(false);
    expect(isAfterpayEligible(0)).toBe(false);
  });

  it('eligible at $1,000', () => {
    expect(isAfterpayEligible(1000)).toBe(true);
  });

  it('ineligible above $1,000', () => {
    expect(isAfterpayEligible(1001)).toBe(false);
    expect(isAfterpayEligible(2000)).toBe(false);
  });

  it('web rounding: last installment absorbs remainder', () => {
    const installments = getAfterpayInstallments(100);
    expect(installments).toHaveLength(4);
    expect(installments[0].amount).toBe(25);
    expect(installments[1].amount).toBe(25);
    expect(installments[2].amount).toBe(25);
    expect(installments[3].amount).toBe(25);
    const sum = installments.reduce((acc, i) => acc + i.amount, 0);
    expect(Math.round(sum * 100) / 100).toBe(100);
  });

  it('rounding: $99.99 — last payment absorbs remainder', () => {
    const installments = getAfterpayInstallments(99.99);
    const base = Math.round((99.99 / 4) * 100) / 100; // 25.00
    expect(installments[0].amount).toBe(base);
    expect(installments[1].amount).toBe(base);
    expect(installments[2].amount).toBe(base);
    expect(installments[3].amount).toBe(Math.round((99.99 - base * 3) * 100) / 100);
    const sum = installments.reduce((acc, i) => acc + i.amount, 0);
    expect(Math.round(sum * 100) / 100).toBe(99.99);
  });

  it('schedule labels: Today, In 2 weeks, In 4 weeks, In 6 weeks', () => {
    const installments = getAfterpayInstallments(200);
    expect(installments[0].label).toBe('Today');
    expect(installments[1].label).toBe('In 2 weeks');
    expect(installments[2].label).toBe('In 4 weeks');
    expect(installments[3].label).toBe('In 6 weeks');
  });

  it('$35 minimum: eligible and returns 4 installments', () => {
    const installments = getAfterpayInstallments(35);
    expect(installments).toHaveLength(4);
    const sum = installments.reduce((acc, i) => acc + i.amount, 0);
    expect(Math.round(sum * 100) / 100).toBe(35);
  });

  it('returns empty array for ineligible prices', () => {
    expect(getAfterpayInstallments(34)).toEqual([]);
    expect(getAfterpayInstallments(1001)).toEqual([]);
  });
});

// ── Concrete math spot-checks matching web ────────────────────────────────────

describe('concrete calculation spot-checks vs web amortize()', () => {
  it('$600 / 6mo / 0% APR → $100.00/mo (web: 600/6)', () => {
    const term = getFinancingTerms(600).find((t) => t.months === 6)!;
    expect(term.monthlyPayment).toBe(100);
  });

  it('$600 / 12mo / 0% APR → $50.00/mo (web: 600/12)', () => {
    const term = getFinancingTerms(600).find((t) => t.months === 12)!;
    expect(term.monthlyPayment).toBe(50);
  });

  it('$999 / 6mo / 0% APR → $166.50/mo', () => {
    const term = getFinancingTerms(999).find((t) => t.months === 6)!;
    expect(term.monthlyPayment).toBe(166.5);
  });

  it('$1000 / 18mo / 4.99% APR — same as web amortize(1000, 18, 4.99)', () => {
    const r = 4.99 / 100 / 12;
    const factor = Math.pow(1 + r, 18);
    const expected = Math.round(((1000 * (r * factor)) / (factor - 1)) * 100) / 100;
    const term = getFinancingTerms(1000).find((t) => t.months === 18)!;
    expect(term.monthlyPayment).toBe(expected);
  });

  it('$1000 / 24mo / 9.99% APR — same as web amortize(1000, 24, 9.99)', () => {
    const r = 9.99 / 100 / 12;
    const factor = Math.pow(1 + r, 24);
    const expected = Math.round(((1000 * (r * factor)) / (factor - 1)) * 100) / 100;
    const term = getFinancingTerms(1000).find((t) => t.months === 24)!;
    expect(term.monthlyPayment).toBe(expected);
  });
});
