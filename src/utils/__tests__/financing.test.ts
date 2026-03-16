/**
 * Tests for financing calculator utility.
 */
import {
  calculateMonthlyPayment,
  isFinancingEligible,
  getFinancingTerms,
  FINANCING_THRESHOLD,
  FINANCING_APR,
} from '../financing';

describe('Financing calculator', () => {
  describe('isFinancingEligible', () => {
    it('returns true for prices above threshold', () => {
      expect(isFinancingEligible(300)).toBe(true);
      expect(isFinancingEligible(1000)).toBe(true);
    });

    it('returns false for prices at or below threshold', () => {
      expect(isFinancingEligible(299)).toBe(false);
      expect(isFinancingEligible(100)).toBe(false);
      expect(isFinancingEligible(0)).toBe(false);
    });

    it('returns false for negative prices', () => {
      expect(isFinancingEligible(-100)).toBe(false);
    });

    it('threshold is 299 dollars', () => {
      expect(FINANCING_THRESHOLD).toBe(299);
    });
  });

  describe('calculateMonthlyPayment', () => {
    it('calculates monthly payment with APR for 3 months', () => {
      const payment = calculateMonthlyPayment(300, 3);
      // With 9.99% APR, monthly rate = 0.0999/12 ≈ 0.008325
      // Payment should be slightly more than price/months
      expect(payment).toBeGreaterThan(100);
      expect(payment).toBeLessThan(110); // reasonable markup
    });

    it('calculates monthly payment for 6 months', () => {
      const payment = calculateMonthlyPayment(600, 6);
      expect(payment).toBeGreaterThan(100);
      expect(payment).toBeLessThan(115);
    });

    it('calculates monthly payment for 12 months', () => {
      const payment = calculateMonthlyPayment(1200, 12);
      expect(payment).toBeGreaterThan(100);
      expect(payment).toBeLessThan(115);
    });

    it('returns a number rounded to 2 decimal places', () => {
      const payment = calculateMonthlyPayment(349, 6);
      const decimals = payment.toString().split('.')[1];
      expect(!decimals || decimals.length <= 2).toBe(true);
    });

    it('handles exact division cleanly', () => {
      const payment = calculateMonthlyPayment(300, 3);
      expect(typeof payment).toBe('number');
      expect(payment).toBeGreaterThan(0);
    });
  });

  describe('getFinancingTerms', () => {
    it('returns all 3 term options for eligible price', () => {
      const terms = getFinancingTerms(500);
      expect(terms).toHaveLength(3);
      expect(terms.map((t) => t.months)).toEqual([3, 6, 12]);
    });

    it('each term has months and monthlyPayment', () => {
      const terms = getFinancingTerms(500);
      for (const term of terms) {
        expect(term.months).toBeDefined();
        expect(term.monthlyPayment).toBeDefined();
        expect(term.monthlyPayment).toBeGreaterThan(0);
      }
    });

    it('shorter terms have higher monthly payments', () => {
      const terms = getFinancingTerms(500);
      expect(terms[0].monthlyPayment).toBeGreaterThan(terms[1].monthlyPayment);
      expect(terms[1].monthlyPayment).toBeGreaterThan(terms[2].monthlyPayment);
    });

    it('returns empty array for ineligible price', () => {
      expect(getFinancingTerms(100)).toEqual([]);
      expect(getFinancingTerms(299)).toEqual([]);
    });
  });

  describe('APR configuration', () => {
    it('APR is 9.99%', () => {
      expect(FINANCING_APR).toBe(0.0999);
    });
  });
});
