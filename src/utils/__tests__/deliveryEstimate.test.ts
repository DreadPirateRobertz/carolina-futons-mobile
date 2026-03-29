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
import { getDeliveryEstimate, getDeliveryMode, getShippingTier } from '../deliveryEstimate';

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

// ── getDeliveryMode ────────────────────────────────────────────────────────────

const PARCEL_DIMS = { width: 39, depth: 32, height: 31 }; // Pisgah Twin — parcel
const FREIGHT_DIMS = { width: 54, depth: 34, height: 33 }; // Asheville Full — freight
const QUEEN_DIMS = { width: 60, depth: 36, height: 35 }; // Blue Ridge Queen — freight

describe('getDeliveryMode', () => {
  describe('no-zip state', () => {
    it('returns no-zip for empty string', () => {
      expect(getDeliveryMode('', PARCEL_DIMS)).toBe('no-zip');
    });

    it('returns no-zip for whitespace-only', () => {
      expect(getDeliveryMode('   ', PARCEL_DIMS)).toBe('no-zip');
    });

    it('returns no-zip for partial zip (4 digits)', () => {
      expect(getDeliveryMode('2880', PARCEL_DIMS)).toBe('no-zip');
    });

    it('returns no-zip for non-numeric', () => {
      expect(getDeliveryMode('ABCDE', PARCEL_DIMS)).toBe('no-zip');
    });

    it('returns no-zip when no dimensions passed and zip is invalid', () => {
      expect(getDeliveryMode('')).toBe('no-zip');
    });
  });

  describe('freight state — width >= 54 inches', () => {
    it('returns freight for full-size item (54") at national zip', () => {
      expect(getDeliveryMode('10001', FREIGHT_DIMS)).toBe('freight');
    });

    it('returns freight for queen-size item (60") at national zip', () => {
      expect(getDeliveryMode('10001', QUEEN_DIMS)).toBe('freight');
    });

    it('returns freight even for local NC zip when item is freight size', () => {
      expect(getDeliveryMode('28801', FREIGHT_DIMS)).toBe('freight');
    });

    it('returns freight for exactly-54-inch width', () => {
      expect(getDeliveryMode('90210', { width: 54, depth: 30, height: 30 })).toBe('freight');
    });

    it('returns parcel for 53-inch width (just under threshold)', () => {
      expect(getDeliveryMode('90210', { width: 53, depth: 30, height: 30 })).toBe('parcel');
    });
  });

  describe('local state — NC/SC zip, non-freight item', () => {
    it('returns local for NC zip (28801) with small item', () => {
      expect(getDeliveryMode('28801', PARCEL_DIMS)).toBe('local');
    });

    it('returns local for SC zip (29201) with small item', () => {
      expect(getDeliveryMode('29201', PARCEL_DIMS)).toBe('local');
    });

    it('returns local for Raleigh zip (27601)', () => {
      expect(getDeliveryMode('27601', PARCEL_DIMS)).toBe('local');
    });

    it('returns local when no dimensions provided and zip is NC', () => {
      expect(getDeliveryMode('28801')).toBe('local');
    });
  });

  describe('parcel state — non-local, non-freight zip', () => {
    it('returns parcel for NYC zip (10001) with small item', () => {
      expect(getDeliveryMode('10001', PARCEL_DIMS)).toBe('parcel');
    });

    it('returns parcel for Chicago zip (60601)', () => {
      expect(getDeliveryMode('60601', PARCEL_DIMS)).toBe('parcel');
    });

    it('returns parcel for Southeast zip (30301) — mid tier in getDeliveryEstimate', () => {
      expect(getDeliveryMode('30301', PARCEL_DIMS)).toBe('parcel');
    });

    it('returns parcel when no dimensions provided and zip is non-local', () => {
      expect(getDeliveryMode('10001')).toBe('parcel');
    });

    it('accepts zip+4 format for parcel', () => {
      expect(getDeliveryMode('10001-1234', PARCEL_DIMS)).toBe('parcel');
    });
  });
});

// ── getShippingTier ────────────────────────────────────────────────────────────

describe('getShippingTier', () => {
  it('returns null for invalid zip', () => {
    expect(getShippingTier('')).toBeNull();
    expect(getShippingTier('ABCDE')).toBeNull();
    expect(getShippingTier('2880')).toBeNull();
  });

  it('returns "fastest" for NC/SC zip with small item', () => {
    expect(getShippingTier('28801', PARCEL_DIMS)).toBe('fastest');
    expect(getShippingTier('29201', PARCEL_DIMS)).toBe('fastest');
    expect(getShippingTier('27601', PARCEL_DIMS)).toBe('fastest');
  });

  it('returns "fastest" for NC zip with no dimensions', () => {
    expect(getShippingTier('28801')).toBe('fastest');
  });

  it('returns "standard" for non-local parcel zip', () => {
    expect(getShippingTier('10001', PARCEL_DIMS)).toBe('standard');
    expect(getShippingTier('30301', PARCEL_DIMS)).toBe('standard');
    expect(getShippingTier('90210', PARCEL_DIMS)).toBe('standard');
  });

  it('returns "standard" for non-local zip with no dimensions', () => {
    expect(getShippingTier('60601')).toBe('standard');
  });

  it('returns "freight" for freight-size item regardless of zip', () => {
    expect(getShippingTier('28801', FREIGHT_DIMS)).toBe('freight');
    expect(getShippingTier('10001', FREIGHT_DIMS)).toBe('freight');
    expect(getShippingTier('90210', QUEEN_DIMS)).toBe('freight');
  });

  it('returns "freight" for exactly-54-inch item', () => {
    expect(getShippingTier('10001', { width: 54, depth: 30, height: 30 })).toBe('freight');
  });

  it('returns "standard" for 53-inch item (just under freight threshold)', () => {
    expect(getShippingTier('10001', { width: 53, depth: 30, height: 30 })).toBe('standard');
  });
});
