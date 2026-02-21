import { STORES, type Store, getStoreById, getStoresByService } from '../stores';

describe('stores data', () => {
  describe('STORES', () => {
    it('exports a non-empty array of stores', () => {
      expect(Array.isArray(STORES)).toBe(true);
      expect(STORES.length).toBeGreaterThan(0);
    });

    it('each store has required fields', () => {
      for (const store of STORES) {
        expect(store.id).toBeTruthy();
        expect(store.name).toBeTruthy();
        expect(store.address).toBeTruthy();
        expect(store.phone).toBeTruthy();
        expect(store.coordinates).toBeDefined();
        expect(store.coordinates.latitude).toBeDefined();
        expect(store.coordinates.longitude).toBeDefined();
        expect(store.hours).toBeDefined();
        expect(Array.isArray(store.services)).toBe(true);
      }
    });

    it('each store has valid coordinates', () => {
      for (const store of STORES) {
        expect(store.coordinates.latitude).toBeGreaterThanOrEqual(-90);
        expect(store.coordinates.latitude).toBeLessThanOrEqual(90);
        expect(store.coordinates.longitude).toBeGreaterThanOrEqual(-180);
        expect(store.coordinates.longitude).toBeLessThanOrEqual(180);
      }
    });

    it('each store has unique ID', () => {
      const ids = STORES.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('stores are in North Carolina', () => {
      for (const store of STORES) {
        expect(store.address).toContain('NC');
      }
    });
  });

  describe('getStoreById', () => {
    it('returns store for valid ID', () => {
      const store = getStoreById(STORES[0].id);
      expect(store).toBeDefined();
      expect(store!.id).toBe(STORES[0].id);
    });

    it('returns undefined for invalid ID', () => {
      expect(getStoreById('nonexistent')).toBeUndefined();
    });
  });

  describe('getStoresByService', () => {
    it('filters stores by service', () => {
      const showrooms = getStoresByService('showroom');
      expect(showrooms.length).toBeGreaterThan(0);
      for (const store of showrooms) {
        expect(store.services).toContain('showroom');
      }
    });

    it('returns empty array for nonexistent service', () => {
      expect(getStoresByService('nonexistent')).toHaveLength(0);
    });
  });
});
