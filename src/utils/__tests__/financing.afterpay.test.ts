/**
 * Tests for Afterpay installment calculation added to financing utils.
 * TDD — written before implementation.
 *
 * Bead: cfutons_mobile-lub
 */
import {
  isAfterpayEligible,
  getAfterpayInstallments,
  AFTERPAY_MAX_AMOUNT,
  AFTERPAY_INSTALLMENT_COUNT,
} from '../financing';

describe('Afterpay installment calculator', () => {
  describe('isAfterpayEligible', () => {
    it('returns true for $1 (minimum valid purchase)', () => {
      expect(isAfterpayEligible(1)).toBe(true);
    });

    it('returns true for typical futon price ($500)', () => {
      expect(isAfterpayEligible(500)).toBe(true);
    });

    it('returns true at the maximum allowed amount', () => {
      expect(isAfterpayEligible(AFTERPAY_MAX_AMOUNT)).toBe(true);
    });

    it('returns false above maximum amount', () => {
      expect(isAfterpayEligible(AFTERPAY_MAX_AMOUNT + 1)).toBe(false);
    });

    it('returns false for zero', () => {
      expect(isAfterpayEligible(0)).toBe(false);
    });

    it('returns false for negative price', () => {
      expect(isAfterpayEligible(-50)).toBe(false);
    });

    it('max amount is $2000', () => {
      expect(AFTERPAY_MAX_AMOUNT).toBe(2000);
    });

    it('installment count is 4', () => {
      expect(AFTERPAY_INSTALLMENT_COUNT).toBe(4);
    });
  });

  describe('getAfterpayInstallments', () => {
    it('returns 4 installments for eligible price', () => {
      expect(getAfterpayInstallments(400)).toHaveLength(4);
    });

    it('returns empty array for ineligible price (above max)', () => {
      expect(getAfterpayInstallments(3000)).toEqual([]);
    });

    it('returns empty array for zero price', () => {
      expect(getAfterpayInstallments(0)).toEqual([]);
    });

    it('installments sum to the total price', () => {
      const installments = getAfterpayInstallments(400);
      const sum = installments.reduce(
        (acc: number, inst: { amount: number }) => acc + inst.amount,
        0,
      );
      expect(Math.round(sum * 100) / 100).toBe(400);
    });

    it('installments sum correctly for odd price (rounding)', () => {
      const installments = getAfterpayInstallments(399);
      const sum = installments.reduce(
        (acc: number, inst: { amount: number }) => acc + inst.amount,
        0,
      );
      expect(Math.round(sum * 100) / 100).toBe(399);
    });

    it('each installment has number, amount, and label', () => {
      const installments = getAfterpayInstallments(400);
      for (const inst of installments) {
        expect(inst.number).toBeDefined();
        expect(inst.amount).toBeGreaterThan(0);
        expect(typeof inst.label).toBe('string');
        expect(inst.label.length).toBeGreaterThan(0);
      }
    });

    it('installments are numbered 1 through 4', () => {
      const installments = getAfterpayInstallments(400);
      expect(installments.map((i) => i.number)).toEqual([1, 2, 3, 4]);
    });

    it('first installment label is "Today"', () => {
      const installments = getAfterpayInstallments(400);
      expect(installments[0].label).toBe('Today');
    });

    it('second installment label is "In 2 weeks"', () => {
      const installments = getAfterpayInstallments(400);
      expect(installments[1].label).toBe('In 2 weeks');
    });

    it('third installment label is "In 4 weeks"', () => {
      const installments = getAfterpayInstallments(400);
      expect(installments[2].label).toBe('In 4 weeks');
    });

    it('fourth installment label is "In 6 weeks"', () => {
      const installments = getAfterpayInstallments(400);
      expect(installments[3].label).toBe('In 6 weeks');
    });

    it('installments 2-4 are equal for evenly divisible price', () => {
      const installments = getAfterpayInstallments(400);
      expect(installments[1].amount).toBe(installments[2].amount);
      expect(installments[2].amount).toBe(installments[3].amount);
    });

    it('each installment amount is rounded to 2 decimal places', () => {
      const installments = getAfterpayInstallments(399);
      for (const inst of installments) {
        const str = inst.amount.toString();
        const decimals = str.split('.')[1];
        expect(!decimals || decimals.length <= 2).toBe(true);
      }
    });

    it('returns empty array for negative price', () => {
      expect(getAfterpayInstallments(-100)).toEqual([]);
    });
  });
});
