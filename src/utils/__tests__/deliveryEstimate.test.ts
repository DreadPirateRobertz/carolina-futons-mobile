/**
 * Tests for getDeliveryEstimate utility — cm-mk8.
 *
 * Covers:
 * - Local (NC/SC, prefix 270–299): 2–3 business days
 * - Mid-range (Southeast/Mid-Atlantic, prefix 200–399 excl. local): 3–5 business days
 * - National (everything else): 5–7 business days
 * - Empty / whitespace zip → null
 * - Invalid format → null
 */
import { getDeliveryEstimate } from '../deliveryEstimate';

describe('getDeliveryEstimate', () => {
  describe('returns null for missing or invalid zip', () => {
    it('returns null for empty string', () => {
      expect(getDeliveryEstimate('')).toBeNull();
    });

    it('returns null for whitespace-only string', () => {
      expect(getDeliveryEstimate('   ')).toBeNull();
    });

    it('returns null for non-numeric string', () => {
      expect(getDeliveryEstimate('ABCDE')).toBeNull();
    });

    it('returns null for too-short zip', () => {
      expect(getDeliveryEstimate('2880')).toBeNull();
    });

    it('returns null for zip with letters mixed in', () => {
      expect(getDeliveryEstimate('2880A')).toBeNull();
    });
  });

  describe('local tier — NC/SC (prefix 270–299) — 2–3 business days', () => {
    it('returns 2-3 days for 28801 (Asheville, NC)', () => {
      expect(getDeliveryEstimate('28801')).toBe('2–3 business days');
    });

    it('returns 2-3 days for 27601 (Raleigh, NC)', () => {
      expect(getDeliveryEstimate('27601')).toBe('2–3 business days');
    });

    it('returns 2-3 days for 29201 (Columbia, SC)', () => {
      expect(getDeliveryEstimate('29201')).toBe('2–3 business days');
    });

    it('returns 2-3 days for 28000 (start of local range)', () => {
      expect(getDeliveryEstimate('28000')).toBe('2–3 business days');
    });

    it('accepts zip+4 format (28801-1234)', () => {
      expect(getDeliveryEstimate('28801-1234')).toBe('2–3 business days');
    });
  });

  describe('mid tier — Southeast/Mid-Atlantic (prefix 200–399, non-local) — 3–5 business days', () => {
    it('returns 3-5 days for 20001 (Washington DC)', () => {
      expect(getDeliveryEstimate('20001')).toBe('3–5 business days');
    });

    it('returns 3-5 days for 30301 (Atlanta, GA)', () => {
      expect(getDeliveryEstimate('30301')).toBe('3–5 business days');
    });

    it('returns 3-5 days for 35004 (Alabama)', () => {
      expect(getDeliveryEstimate('35004')).toBe('3–5 business days');
    });

    it('returns 3-5 days for 39901 (end of mid range)', () => {
      expect(getDeliveryEstimate('39901')).toBe('3–5 business days');
    });
  });

  describe('national tier — all other prefixes — 5–7 business days', () => {
    it('returns 5-7 days for 10001 (New York, NY)', () => {
      expect(getDeliveryEstimate('10001')).toBe('5–7 business days');
    });

    it('returns 5-7 days for 60601 (Chicago, IL)', () => {
      expect(getDeliveryEstimate('60601')).toBe('5–7 business days');
    });

    it('returns 5-7 days for 90210 (Beverly Hills, CA)', () => {
      expect(getDeliveryEstimate('90210')).toBe('5–7 business days');
    });

    it('returns 5-7 days for 00501 (lowest US zip, Holtsville NY area)', () => {
      expect(getDeliveryEstimate('00501')).toBe('5–7 business days');
    });

    it('returns 5-7 days for 99950 (highest US zip, Ketchikan AK)', () => {
      expect(getDeliveryEstimate('99950')).toBe('5–7 business days');
    });

    it('returns 5-7 days for 40001 (Kentucky)', () => {
      expect(getDeliveryEstimate('40001')).toBe('5–7 business days');
    });
  });
});
