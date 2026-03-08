import { COLLECTIONS, type EditorialCollection } from '../collections';
import { PRODUCTS } from '../products';
import { type ProductId } from '../productId';

describe('collections data', () => {
  it('has at least 3 collections', () => {
    expect(COLLECTIONS.length).toBeGreaterThanOrEqual(3);
  });

  it('each collection has required fields', () => {
    for (const col of COLLECTIONS) {
      expect(col.id).toBeTruthy();
      expect(col.slug).toBeTruthy();
      expect(col.title).toBeTruthy();
      expect(col.subtitle).toBeTruthy();
      expect(col.description.length).toBeGreaterThan(20);
      expect(col.heroImage.uri).toBeTruthy();
      expect(col.heroImage.alt).toBeTruthy();
      expect(col.mood.length).toBeGreaterThan(0);
      expect(col.productIds.length).toBeGreaterThan(0);
    }
  });

  it('all slugs are unique', () => {
    const slugs = COLLECTIONS.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('all product references are valid', () => {
    const productIds = new Set(PRODUCTS.map((p) => p.id as string));
    for (const col of COLLECTIONS) {
      for (const pid of col.productIds) {
        expect(productIds.has(pid as ProductId)).toBe(true);
      }
    }
  });

  it('has at least one featured collection', () => {
    expect(COLLECTIONS.some((c) => c.featured)).toBe(true);
  });
});
