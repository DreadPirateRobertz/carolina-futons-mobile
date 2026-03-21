/**
 * TDD tests for bnplService — Buy Now Pay Later installment logic.
 *
 * Covers:
 *  - getBNPLInstallments: correct 4-payment split for Klarna and Affirm
 *  - isBNPLEligible: min/max purchase limits per provider
 *  - BNPL_PROVIDERS: metadata shape and completeness
 *  - Edge cases: zero total, fractional cents, at-boundary eligibility,
 *    rounding consistency, negative total guard
 *
 * Bead: cm-1s7
 */

import {
  getBNPLInstallments,
  isBNPLEligible,
  BNPL_PROVIDERS,
  type BNPLInstallment,
  type BNPLProvider,
} from '../bnplService';

// ── getBNPLInstallments ───────────────────────────────────────────────────────

describe('getBNPLInstallments', () => {
  it('returns 4 installments for Klarna', () => {
    const result = getBNPLInstallments(200, 'klarna');
    expect(result).toHaveLength(4);
  });

  it('returns 4 installments for Affirm', () => {
    const result = getBNPLInstallments(200, 'affirm');
    expect(result).toHaveLength(4);
  });

  it('each installment is total/4 for even amounts (Klarna)', () => {
    const result = getBNPLInstallments(200, 'klarna');
    result.forEach((inst) => {
      expect(inst.amount).toBe(50);
    });
  });

  it('each installment is total/4 for even amounts (Affirm)', () => {
    const result = getBNPLInstallments(200, 'affirm');
    result.forEach((inst) => {
      expect(inst.amount).toBe(50);
    });
  });

  it('installment amounts sum exactly to total', () => {
    const total = 199.99;
    const result = getBNPLInstallments(total, 'klarna');
    const sum = result.reduce((acc, inst) => Math.round((acc + inst.amount) * 100) / 100, 0);
    expect(sum).toBeCloseTo(total, 2);
  });

  it('handles fractional cents — sum still equals total', () => {
    const total = 100.01;
    const result = getBNPLInstallments(total, 'klarna');
    const sum = result.reduce((acc, inst) => acc + inst.amount * 100, 0);
    // Allow ±1 cent rounding error
    expect(Math.abs(sum - total * 100)).toBeLessThanOrEqual(1);
  });

  it('first installment is due today (daysFromNow === 0)', () => {
    const result = getBNPLInstallments(200, 'klarna');
    expect(result[0].daysFromNow).toBe(0);
  });

  it('subsequent installments are spaced by 14 days for Klarna', () => {
    const result = getBNPLInstallments(200, 'klarna');
    expect(result[1].daysFromNow).toBe(14);
    expect(result[2].daysFromNow).toBe(28);
    expect(result[3].daysFromNow).toBe(42);
  });

  it('subsequent installments are spaced by 30 days for Affirm', () => {
    const result = getBNPLInstallments(200, 'affirm');
    expect(result[1].daysFromNow).toBe(30);
    expect(result[2].daysFromNow).toBe(60);
    expect(result[3].daysFromNow).toBe(90);
  });

  it('each installment has a label string', () => {
    const result = getBNPLInstallments(200, 'klarna');
    result.forEach((inst, i) => {
      expect(typeof inst.label).toBe('string');
      expect(inst.label.length).toBeGreaterThan(0);
    });
  });

  it('throws for negative total', () => {
    expect(() => getBNPLInstallments(-1, 'klarna')).toThrow();
  });

  it('throws for zero total', () => {
    expect(() => getBNPLInstallments(0, 'klarna')).toThrow();
  });
});

// ── isBNPLEligible ────────────────────────────────────────────────────────────

describe('isBNPLEligible', () => {
  describe('klarna', () => {
    it('returns true for a typical checkout total', () => {
      expect(isBNPLEligible(300, 'klarna')).toBe(true);
    });

    it('returns false below minimum ($35)', () => {
      expect(isBNPLEligible(34.99, 'klarna')).toBe(false);
    });

    it('returns true at exact minimum ($35)', () => {
      expect(isBNPLEligible(35, 'klarna')).toBe(true);
    });

    it('returns false above maximum ($10,000)', () => {
      expect(isBNPLEligible(10000.01, 'klarna')).toBe(false);
    });

    it('returns true at exact maximum ($10,000)', () => {
      expect(isBNPLEligible(10000, 'klarna')).toBe(true);
    });
  });

  describe('affirm', () => {
    it('returns true for a typical checkout total', () => {
      expect(isBNPLEligible(300, 'affirm')).toBe(true);
    });

    it('returns false below minimum ($50)', () => {
      expect(isBNPLEligible(49.99, 'affirm')).toBe(false);
    });

    it('returns true at exact minimum ($50)', () => {
      expect(isBNPLEligible(50, 'affirm')).toBe(true);
    });

    it('returns false above maximum ($30,000)', () => {
      expect(isBNPLEligible(30000.01, 'affirm')).toBe(false);
    });

    it('returns true at exact maximum ($30,000)', () => {
      expect(isBNPLEligible(30000, 'affirm')).toBe(true);
    });
  });
});

// ── BNPL_PROVIDERS metadata ───────────────────────────────────────────────────

describe('BNPL_PROVIDERS', () => {
  it('contains klarna entry', () => {
    expect(BNPL_PROVIDERS).toHaveProperty('klarna');
  });

  it('contains affirm entry', () => {
    expect(BNPL_PROVIDERS).toHaveProperty('affirm');
  });

  it('each provider has required display fields', () => {
    for (const [key, provider] of Object.entries(BNPL_PROVIDERS)) {
      expect(provider).toHaveProperty('displayName');
      expect(provider).toHaveProperty('tagline');
      expect(provider).toHaveProperty('minAmount');
      expect(provider).toHaveProperty('maxAmount');
      expect(provider).toHaveProperty('installmentCount');
      expect((provider as BNPLProvider).installmentCount).toBe(4);
    }
  });

  it('klarna min is less than affirm min', () => {
    expect(BNPL_PROVIDERS.klarna.minAmount).toBeLessThan(BNPL_PROVIDERS.affirm.minAmount);
  });
});
