import {
  PRODUCTS,
  CATEGORIES,
  SORT_OPTIONS,
  type Product,
  type CategoryInfo,
  getStockStatus,
} from '../products';
import { productId } from '../productId';

describe('Product catalog data integrity', () => {
  it('has at least 10 products', () => {
    expect(PRODUCTS.length).toBeGreaterThanOrEqual(10);
  });

  it('each product has all required fields', () => {
    for (const p of PRODUCTS) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.slug).toBeTruthy();
      expect(p.category).toBeTruthy();
      expect(p.price).toBeGreaterThan(0);
      expect(p.description).toBeTruthy();
      expect(p.shortDescription).toBeTruthy();
      expect(p.images.length).toBeGreaterThan(0);
      expect(typeof p.rating).toBe('number');
      expect(typeof p.reviewCount).toBe('number');
      expect(typeof p.inStock).toBe('boolean');
      expect(Array.isArray(p.fabricOptions)).toBe(true);
      expect(typeof p.dimensions.width).toBe('number');
      expect(typeof p.dimensions.depth).toBe('number');
      expect(typeof p.dimensions.height).toBe('number');
    }
  });

  it('has unique product IDs', () => {
    const ids = PRODUCTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has unique product slugs', () => {
    const slugs = PRODUCTS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('all products have valid categories', () => {
    const validCategories = CATEGORIES.map((c) => c.id);
    for (const p of PRODUCTS) {
      expect(validCategories).toContain(p.category);
    }
  });

  it('ratings are between 0 and 5', () => {
    for (const p of PRODUCTS) {
      expect(p.rating).toBeGreaterThanOrEqual(0);
      expect(p.rating).toBeLessThanOrEqual(5);
    }
  });

  it('originalPrice is greater than price when present', () => {
    const saleProducts = PRODUCTS.filter((p) => p.originalPrice !== undefined);
    expect(saleProducts.length).toBeGreaterThan(0);
    for (const p of saleProducts) {
      expect(p.originalPrice).toBeGreaterThan(p.price);
    }
  });

  it('images have uri and alt text', () => {
    for (const p of PRODUCTS) {
      for (const img of p.images) {
        expect(img.uri).toBeTruthy();
        expect(img.alt).toBeTruthy();
      }
    }
  });

  it('has products with badges', () => {
    const badgedProducts = PRODUCTS.filter((p) => p.badge);
    expect(badgedProducts.length).toBeGreaterThan(0);
  });

  it('has at least one product per main category', () => {
    const categoriesWithProducts = new Set(PRODUCTS.map((p) => p.category));
    expect(categoriesWithProducts.size).toBeGreaterThanOrEqual(4);
  });
});

describe('Categories data', () => {
  it('has at least 4 categories', () => {
    expect(CATEGORIES.length).toBeGreaterThanOrEqual(4);
  });

  it('each category has id, label, and count', () => {
    for (const cat of CATEGORIES) {
      expect(cat.id).toBeTruthy();
      expect(cat.label).toBeTruthy();
      expect(typeof cat.count).toBe('number');
      expect(cat.count).toBeGreaterThan(0);
    }
  });

  it('has unique category IDs', () => {
    const ids = CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Sort options', () => {
  it('has at least 4 sort options', () => {
    expect(SORT_OPTIONS.length).toBeGreaterThanOrEqual(4);
  });

  it('each option has value and label', () => {
    for (const opt of SORT_OPTIONS) {
      expect(opt.value).toBeTruthy();
      expect(opt.label).toBeTruthy();
    }
  });

  it('includes featured as first option', () => {
    expect(SORT_OPTIONS[0].value).toBe('featured');
  });

  it('has unique sort values', () => {
    const values = SORT_OPTIONS.map((o) => o.value);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe('Type contracts', () => {
  it('Product shape matches interface', () => {
    const p: Product = PRODUCTS[0];
    expect(typeof p.id).toBe('string');
    expect(typeof p.name).toBe('string');
    expect(typeof p.slug).toBe('string');
    expect(typeof p.category).toBe('string');
    expect(typeof p.price).toBe('number');
    expect(typeof p.description).toBe('string');
    expect(typeof p.shortDescription).toBe('string');
    expect(Array.isArray(p.images)).toBe(true);
    expect(typeof p.rating).toBe('number');
    expect(typeof p.reviewCount).toBe('number');
    expect(typeof p.inStock).toBe('boolean');
    expect(Array.isArray(p.fabricOptions)).toBe(true);
    expect(typeof p.dimensions).toBe('object');
  });

  it('CategoryInfo shape matches interface', () => {
    const c: CategoryInfo = CATEGORIES[0];
    expect(typeof c.id).toBe('string');
    expect(typeof c.label).toBe('string');
    expect(typeof c.count).toBe('number');
  });
});

describe('getStockStatus', () => {
  const baseProduct: Product = {
    id: productId('test-product'),
    name: 'Test',
    slug: 'test',
    category: 'futons',
    price: 100,
    description: 'Test',
    shortDescription: 'Test',
    images: [{ uri: 'https://example.com/img.jpg', alt: 'Test' }],
    rating: 4.0,
    reviewCount: 10,
    inStock: true,
    fabricOptions: [],
    dimensions: { width: 50, depth: 30, height: 30 },
  };

  it('returns in_stock for product with inStock=true and no stockCount', () => {
    expect(getStockStatus(baseProduct)).toBe('in_stock');
  });

  it('returns in_stock for product with stockCount >= 5', () => {
    expect(getStockStatus({ ...baseProduct, stockCount: 10 })).toBe('in_stock');
  });

  it('returns low_stock for product with stockCount < 5', () => {
    expect(getStockStatus({ ...baseProduct, stockCount: 3 })).toBe('low_stock');
  });

  it('returns low_stock for stockCount = 1', () => {
    expect(getStockStatus({ ...baseProduct, stockCount: 1 })).toBe('low_stock');
  });

  it('returns out_of_stock for product with inStock=false', () => {
    expect(getStockStatus({ ...baseProduct, inStock: false })).toBe('out_of_stock');
  });

  it('returns out_of_stock for inStock=false even with stockCount > 0', () => {
    expect(getStockStatus({ ...baseProduct, inStock: false, stockCount: 5 })).toBe('out_of_stock');
  });

  it('returns in_stock at threshold boundary (stockCount = 5)', () => {
    expect(getStockStatus({ ...baseProduct, stockCount: 5 })).toBe('in_stock');
  });
});
