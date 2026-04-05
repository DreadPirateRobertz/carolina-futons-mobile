/**
 * Tests for financing calculator utility.
 */
import {
  calculateMonthlyPayment,
  isFinancingEligible,
  getFinancingTerms,
  FINANCING_THRESHOLD,
  FINANCING_APR,
  FINANCING_TERMS,
} from '../financing';

describe('Financing calculator', () => {
  describe('isFinancingEligible', () => {
    it('returns true at $200 (6-month plan min)', () => {
      expect(isFinancingEligible(200)).toBe(true);
      expect(isFinancingEligible(1000)).toBe(true);
    });

    it('returns false below $200 (no plan covers it)', () => {
      expect(isFinancingEligible(199)).toBe(false);
      expect(isFinancingEligible(100)).toBe(false);
      expect(isFinancingEligible(0)).toBe(false);
    });

    it('returns false for negative prices', () => {
      expect(isFinancingEligible(-100)).toBe(false);
    });

    it('threshold is $200 (web MIN_FINANCING_AMOUNT)', () => {
      expect(FINANCING_THRESHOLD).toBe(200);
    });
  });

  describe('calculateMonthlyPayment', () => {
    it('0% APR: monthly = price / months (no interest)', () => {
      expect(calculateMonthlyPayment(600, 6, 0)).toBe(100);
      expect(calculateMonthlyPayment(600, 12, 0)).toBe(50);
    });

    it('0% APR: non-even division rounds to 2dp', () => {
      const payment = calculateMonthlyPayment(100, 6, 0);
      expect(payment).toBeCloseTo(16.67, 2);
    });

    it('4.99% APR: uses amortization formula', () => {
      const payment = calculateMonthlyPayment(999, 18, 4.99);
      expect(payment).toBeGreaterThan(999 / 18);
      expect(payment).toBeLessThan(70);
    });

    it('9.99% APR: 24 months calculates correctly', () => {
      const payment = calculateMonthlyPayment(1200, 24, 9.99);
      expect(payment).toBeGreaterThan(1200 / 24);
      expect(payment).toBeLessThan(60);
    });

    it('returns a number rounded to 2 decimal places', () => {
      const payment = calculateMonthlyPayment(349, 18, 4.99);
      const decimals = payment.toString().split('.')[1];
      expect(!decimals || decimals.length <= 2).toBe(true);
    });

    it('returns a positive number', () => {
      expect(calculateMonthlyPayment(600, 6, 0)).toBeGreaterThan(0);
      expect(calculateMonthlyPayment(600, 24, 9.99)).toBeGreaterThan(0);
    });
  });

  describe('getFinancingTerms', () => {
    it('returns 6/12/24-month plans for $500 (below 18mo min $750)', () => {
      const terms = getFinancingTerms(500);
      expect(terms.map((t) => t.months)).toEqual([6, 12, 24]);
    });

    it('returns all 4 plans for $750+', () => {
      const terms = getFinancingTerms(750);
      expect(terms).toHaveLength(4);
      expect(terms.map((t) => t.months)).toEqual([6, 12, 18, 24]);
    });

    it('each term includes months, monthlyPayment, apr, isZeroInterest, label, description', () => {
      const terms = getFinancingTerms(1000);
      for (const term of terms) {
        expect(term.months).toBeDefined();
        expect(term.monthlyPayment).toBeGreaterThan(0);
        expect(typeof term.apr).toBe('number');
        expect(typeof term.isZeroInterest).toBe('boolean');
        expect(typeof term.label).toBe('string');
        expect(typeof term.description).toBe('string');
      }
    });

    it('6-month term has 0% APR and higher monthly than 12-month for same price', () => {
      const terms = getFinancingTerms(1200);
      const t6 = terms.find((t) => t.months === 6)!;
      const t12 = terms.find((t) => t.months === 12)!;
      expect(t6.apr).toBe(0);
      expect(t12.apr).toBe(0);
      expect(t6.monthlyPayment).toBeGreaterThan(t12.monthlyPayment);
    });

    it('returns empty array for ineligible price', () => {
      expect(getFinancingTerms(100)).toEqual([]);
      expect(getFinancingTerms(199)).toEqual([]);
    });

    it('returns empty array above $10,000', () => {
      expect(getFinancingTerms(10001)).toEqual([]);
    });
  });

  describe('APR configuration', () => {
    it('legacy FINANCING_APR constant is preserved at 9.99%', () => {
      expect(FINANCING_APR).toBe(0.0999);
    });

    it('FINANCING_TERMS is [6, 12, 18, 24]', () => {
      expect([...FINANCING_TERMS]).toEqual([6, 12, 18, 24]);
    });
  });
});
