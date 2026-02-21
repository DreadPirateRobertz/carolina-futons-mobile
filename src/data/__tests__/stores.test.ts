import {
  STORES,
  APPOINTMENT_TYPES,
  isStoreOpen,
  calculateDistance,
  formatPhone,
  type Store,
} from '../stores';

describe('stores data', () => {
  describe('STORES', () => {
    it('has at least one store', () => {
      expect(STORES.length).toBeGreaterThan(0);
    });

    it('every store has required fields', () => {
      for (const store of STORES) {
        expect(store.id).toBeTruthy();
        expect(store.name).toBeTruthy();
        expect(store.address).toBeTruthy();
        expect(store.city).toBeTruthy();
        expect(store.state).toBeTruthy();
        expect(store.zip).toMatch(/^\d{5}$/);
        expect(store.phone).toBeTruthy();
        expect(store.email).toContain('@');
        expect(typeof store.latitude).toBe('number');
        expect(typeof store.longitude).toBe('number');
        expect(store.hours.length).toBeGreaterThan(0);
      }
    });

    it('every store has unique id', () => {
      const ids = STORES.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('stores are in NC or SC', () => {
      for (const store of STORES) {
        expect(['NC', 'SC']).toContain(store.state);
      }
    });
  });

  describe('APPOINTMENT_TYPES', () => {
    it('has consultation, measurement, and pickup', () => {
      const values = APPOINTMENT_TYPES.map((t) => t.value);
      expect(values).toContain('consultation');
      expect(values).toContain('measurement');
      expect(values).toContain('pickup');
    });
  });

  describe('isStoreOpen', () => {
    const store: Store = {
      ...STORES[0],
      hours: [
        { day: 'Monday', open: '10:00', close: '18:00' },
        { day: 'Tuesday', open: '10:00', close: '18:00' },
        { day: 'Wednesday', open: '10:00', close: '18:00' },
        { day: 'Thursday', open: '10:00', close: '20:00' },
        { day: 'Friday', open: '10:00', close: '20:00' },
        { day: 'Saturday', open: '09:00', close: '18:00' },
        { day: 'Sunday', open: '12:00', close: '17:00' },
      ],
    };

    it('returns true during open hours', () => {
      // Wednesday at 14:00
      const date = new Date('2026-02-18T14:00:00');
      expect(isStoreOpen(store, date)).toBe(true);
    });

    it('returns false before opening', () => {
      // Wednesday at 08:00
      const date = new Date('2026-02-18T08:00:00');
      expect(isStoreOpen(store, date)).toBe(false);
    });

    it('returns false after closing', () => {
      // Wednesday at 19:00
      const date = new Date('2026-02-18T19:00:00');
      expect(isStoreOpen(store, date)).toBe(false);
    });

    it('returns false for closed days', () => {
      const closedSunday: Store = {
        ...store,
        hours: [
          ...store.hours.filter((h) => h.day !== 'Sunday'),
          { day: 'Sunday', open: '', close: '', closed: true },
        ],
      };
      // Sunday at 14:00
      const date = new Date('2026-02-22T14:00:00');
      expect(isStoreOpen(closedSunday, date)).toBe(false);
    });

    it('returns true at exactly opening time', () => {
      // Wednesday at 10:00
      const date = new Date('2026-02-18T10:00:00');
      expect(isStoreOpen(store, date)).toBe(true);
    });

    it('returns false at exactly closing time', () => {
      // Wednesday at 18:00
      const date = new Date('2026-02-18T18:00:00');
      expect(isStoreOpen(store, date)).toBe(false);
    });
  });

  describe('calculateDistance', () => {
    it('returns 0 for same coordinates', () => {
      expect(calculateDistance(35.5, -82.5, 35.5, -82.5)).toBe(0);
    });

    it('calculates distance between Asheville and Charlotte', () => {
      // ~130 miles
      const dist = calculateDistance(35.5946, -82.554, 35.2271, -80.8431);
      expect(dist).toBeGreaterThan(90);
      expect(dist).toBeLessThan(130);
    });

    it('returns positive number', () => {
      const dist = calculateDistance(35.0, -82.0, 36.0, -83.0);
      expect(dist).toBeGreaterThan(0);
    });
  });

  describe('formatPhone', () => {
    it('formats 10-digit phone number', () => {
      expect(formatPhone('8285550100')).toBe('(828) 555-0100');
    });

    it('strips non-digits before formatting', () => {
      expect(formatPhone('828-555-0100')).toBe('(828) 555-0100');
    });

    it('returns original for non-10-digit', () => {
      expect(formatPhone('5550100')).toBe('5550100');
    });
  });
});
