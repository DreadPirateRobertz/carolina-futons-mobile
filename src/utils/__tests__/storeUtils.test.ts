import { isStoreOpen, calculateDistance, formatPhone } from '@/utils/storeUtils';
import type { Store } from '@/data/stores';

const makeStore = (hours: Store['hours']): Store => ({
  id: 'test-store',
  name: 'Test Store',
  address: '123 Main St',
  city: 'Testville',
  state: 'NC',
  zip: '28801',
  phone: '8285550100',
  email: 'test@test.com',
  latitude: 35.5,
  longitude: -82.5,
  hours,
  photos: [],
  features: [],
  description: 'A test store',
});

describe('isStoreOpen', () => {
  const store = makeStore([
    { day: 'Monday', open: '10:00', close: '18:00' },
    { day: 'Tuesday', open: '10:00', close: '18:00' },
    { day: 'Wednesday', open: '10:00', close: '18:00' },
    { day: 'Thursday', open: '10:00', close: '20:00' },
    { day: 'Friday', open: '10:00', close: '20:00' },
    { day: 'Saturday', open: '09:00', close: '18:00' },
    { day: 'Sunday', open: '12:00', close: '17:00' },
  ]);

  it('returns true during open hours', () => {
    const date = new Date('2026-02-18T14:00:00');
    expect(isStoreOpen(store, date)).toBe(true);
  });

  it('returns false before opening', () => {
    const date = new Date('2026-02-18T08:00:00');
    expect(isStoreOpen(store, date)).toBe(false);
  });

  it('returns false after closing', () => {
    const date = new Date('2026-02-18T19:00:00');
    expect(isStoreOpen(store, date)).toBe(false);
  });

  it('returns false for closed days', () => {
    const closedSunday = makeStore([
      ...store.hours.filter((h) => h.day !== 'Sunday'),
      { day: 'Sunday', open: '', close: '', closed: true },
    ]);
    const date = new Date('2026-02-22T14:00:00');
    expect(isStoreOpen(closedSunday, date)).toBe(false);
  });

  it('returns true at exactly opening time', () => {
    const date = new Date('2026-02-18T10:00:00');
    expect(isStoreOpen(store, date)).toBe(true);
  });

  it('returns false at exactly closing time', () => {
    const date = new Date('2026-02-18T18:00:00');
    expect(isStoreOpen(store, date)).toBe(false);
  });
});

describe('calculateDistance', () => {
  it('returns 0 for same coordinates', () => {
    expect(calculateDistance(35.5, -82.5, 35.5, -82.5)).toBe(0);
  });

  it('calculates distance between Asheville and Charlotte', () => {
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
