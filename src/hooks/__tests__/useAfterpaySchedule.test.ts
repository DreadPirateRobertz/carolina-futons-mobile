/**
 * useAfterpaySchedule TDD tests — hq-03t
 *
 * Tests written BEFORE implementation per CLAUDE.md mandate.
 *
 * Hook wraps getAfterpayInstallments with:
 *   - isEligible flag (price within $35–$1,000)
 *   - totalAmount (sum of all installments — must match price)
 *   - 4 installments with fortnightly dueDate (today, +14d, +28d, +42d)
 *   - accessible labels on each installment
 *
 * AC: 4 installments shown, total matches price, accessible.
 */

import { renderHook } from '@testing-library/react-native';
import { useAfterpaySchedule } from '../useAfterpaySchedule';

// Pin "today" for deterministic date assertions
const FAKE_NOW = new Date('2026-04-05T12:00:00Z');

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(FAKE_NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// Eligibility
// ---------------------------------------------------------------------------

describe('useAfterpaySchedule — eligibility', () => {
  it('isEligible true for price in $35–$1,000 range', () => {
    const { result } = renderHook(() => useAfterpaySchedule(299));
    expect(result.current.isEligible).toBe(true);
  });

  it('isEligible true at $1 (min is > 0)', () => {
    const { result } = renderHook(() => useAfterpaySchedule(1));
    expect(result.current.isEligible).toBe(true);
  });

  it('isEligible true at maximum $2,000', () => {
    const { result } = renderHook(() => useAfterpaySchedule(2000));
    expect(result.current.isEligible).toBe(true);
  });

  it('isEligible false above $2,000', () => {
    const { result } = renderHook(() => useAfterpaySchedule(2001));
    expect(result.current.isEligible).toBe(false);
  });

  it('isEligible false for zero', () => {
    const { result } = renderHook(() => useAfterpaySchedule(0));
    expect(result.current.isEligible).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Installment count
// ---------------------------------------------------------------------------

describe('useAfterpaySchedule — installment count', () => {
  it('returns 4 installments for eligible price', () => {
    const { result } = renderHook(() => useAfterpaySchedule(299));
    expect(result.current.installments).toHaveLength(4);
  });

  it('returns empty array for ineligible price', () => {
    const { result } = renderHook(() => useAfterpaySchedule(2001));
    expect(result.current.installments).toHaveLength(0);
  });

  it('installment numbers are 1–4', () => {
    const { result } = renderHook(() => useAfterpaySchedule(299));
    const numbers = result.current.installments.map((i) => i.number);
    expect(numbers).toEqual([1, 2, 3, 4]);
  });
});

// ---------------------------------------------------------------------------
// Total matches price (AC: total matches price)
// ---------------------------------------------------------------------------

describe('useAfterpaySchedule — total matches price', () => {
  it('totalAmount equals price for $299', () => {
    const { result } = renderHook(() => useAfterpaySchedule(299));
    expect(result.current.totalAmount).toBeCloseTo(299, 2);
  });

  it('totalAmount equals price for $500', () => {
    const { result } = renderHook(() => useAfterpaySchedule(500));
    expect(result.current.totalAmount).toBeCloseTo(500, 2);
  });

  it('sum of installment amounts equals totalAmount', () => {
    const { result } = renderHook(() => useAfterpaySchedule(299));
    const sum = result.current.installments.reduce((acc, i) => acc + i.amount, 0);
    expect(sum).toBeCloseTo(result.current.totalAmount, 2);
  });

  it('handles rounding: sum equals price for $100', () => {
    const { result } = renderHook(() => useAfterpaySchedule(100));
    const sum = result.current.installments.reduce((acc, i) => acc + i.amount, 0);
    expect(sum).toBeCloseTo(100, 2);
  });

  it('handles rounding: sum equals price for $199.99', () => {
    const { result } = renderHook(() => useAfterpaySchedule(199.99));
    const sum = result.current.installments.reduce((acc, i) => acc + i.amount, 0);
    expect(sum).toBeCloseTo(199.99, 2);
  });

  it('totalAmount is 0 when ineligible', () => {
    const { result } = renderHook(() => useAfterpaySchedule(2001));
    expect(result.current.totalAmount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Due dates — fortnightly from today (AC: fortnightly payments)
// ---------------------------------------------------------------------------

describe('useAfterpaySchedule — due dates', () => {
  it('installment 1 due date is today', () => {
    const { result } = renderHook(() => useAfterpaySchedule(299));
    const dueDate = result.current.installments[0].dueDate;
    expect(dueDate.toDateString()).toBe(FAKE_NOW.toDateString());
  });

  it('installment 2 due date is today + 14 days', () => {
    const { result } = renderHook(() => useAfterpaySchedule(299));
    const dueDate = result.current.installments[1].dueDate;
    const expected = new Date(FAKE_NOW);
    expected.setDate(expected.getDate() + 14);
    expect(dueDate.toDateString()).toBe(expected.toDateString());
  });

  it('installment 3 due date is today + 28 days', () => {
    const { result } = renderHook(() => useAfterpaySchedule(299));
    const dueDate = result.current.installments[2].dueDate;
    const expected = new Date(FAKE_NOW);
    expected.setDate(expected.getDate() + 28);
    expect(dueDate.toDateString()).toBe(expected.toDateString());
  });

  it('installment 4 due date is today + 42 days', () => {
    const { result } = renderHook(() => useAfterpaySchedule(299));
    const dueDate = result.current.installments[3].dueDate;
    const expected = new Date(FAKE_NOW);
    expected.setDate(expected.getDate() + 42);
    expect(dueDate.toDateString()).toBe(expected.toDateString());
  });
});

// ---------------------------------------------------------------------------
// Accessible labels (AC: accessible)
// ---------------------------------------------------------------------------

describe('useAfterpaySchedule — accessible labels', () => {
  it('each installment has a non-empty label', () => {
    const { result } = renderHook(() => useAfterpaySchedule(299));
    for (const inst of result.current.installments) {
      expect(inst.label).toBeTruthy();
    }
  });

  it('installment 1 label is "Today"', () => {
    const { result } = renderHook(() => useAfterpaySchedule(299));
    expect(result.current.installments[0].label).toBe('Today');
  });

  it('installment 2 label is "In 2 weeks"', () => {
    const { result } = renderHook(() => useAfterpaySchedule(299));
    expect(result.current.installments[1].label).toBe('In 2 weeks');
  });

  it('installment 3 label is "In 4 weeks"', () => {
    const { result } = renderHook(() => useAfterpaySchedule(299));
    expect(result.current.installments[2].label).toBe('In 4 weeks');
  });

  it('installment 4 label is "In 6 weeks"', () => {
    const { result } = renderHook(() => useAfterpaySchedule(299));
    expect(result.current.installments[3].label).toBe('In 6 weeks');
  });
});

// ---------------------------------------------------------------------------
// Reactivity
// ---------------------------------------------------------------------------

describe('useAfterpaySchedule — reactivity', () => {
  it('updates installments when price changes to eligible', () => {
    const { result, rerender } = renderHook(({ price }) => useAfterpaySchedule(price), {
      initialProps: { price: 299 },
    });
    expect(result.current.installments).toHaveLength(4);

    rerender({ price: 500 });
    expect(result.current.totalAmount).toBeCloseTo(500, 2);
  });

  it('clears installments when price becomes ineligible', () => {
    const { result, rerender } = renderHook(({ price }) => useAfterpaySchedule(price), {
      initialProps: { price: 299 },
    });
    expect(result.current.installments).toHaveLength(4);

    rerender({ price: 2500 });
    expect(result.current.installments).toHaveLength(0);
    expect(result.current.isEligible).toBe(false);
  });
});
