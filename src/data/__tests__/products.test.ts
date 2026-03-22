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

describe('Product video URIs (cm-9g0)', () => {
  const WIX_VIDEO_BASE = 'https://video.wixstatic.com/video/';

  function findBySlug(slug: string): Product | undefined {
    return PRODUCTS.find((p) => p.slug === slug);
  }

  it('existing products have correct video URIs', () => {
    expect(findBySlug('asheville-full-futon')?.videoUri).toBe(
      `${WIX_VIDEO_BASE}e04e89_ea16ef6edfe64c03a5bfdd0ee468ab7f/1080p/mp4/file.mp4`,
    );
    expect(findBySlug('blue-ridge-queen-futon')?.videoUri).toBe(
      `${WIX_VIDEO_BASE}e04e89_8483b56d2ef5417c95242c821934e2b2/1080p/mp4/file.mp4`,
    );
  });

  it('pisgah-twin-futon has Alpine video', () => {
    expect(findBySlug('pisgah-twin-futon')?.videoUri).toBe(
      `${WIX_VIDEO_BASE}e04e89_dba4fc2f08ee4a42906dcb76bcb9b31a/1080p/mp4/file.mp4`,
    );
  });

  it('biltmore-loveseat has Asheville frame video', () => {
    expect(findBySlug('biltmore-loveseat')?.videoUri).toBe(
      `${WIX_VIDEO_BASE}e04e89_c2e8bedf07c74b249894fffffc0564b7/1080p/mp4/file.mp4`,
    );
  });

  it('hendersonville-queen-murphy-cabinet-bed has Northampton video', () => {
    expect(findBySlug('hendersonville-queen-murphy-cabinet-bed')?.videoUri).toBe(
      `${WIX_VIDEO_BASE}e04e89_c1969fc88dcb4c829f3840b250f19166/1080p/mp4/file.mp4`,
    );
  });

  it('appalachian-full-horizontal-murphy-cabinet has Mountainnaire video', () => {
    expect(findBySlug('appalachian-full-horizontal-murphy-cabinet')?.videoUri).toBe(
      `${WIX_VIDEO_BASE}e04e89_b6c0b062855d432a91698f3460b74552/1080p/mp4/file.mp4`,
    );
  });

  it('smoky-mountain-queen-bookcase-murphy has Flagstaff video', () => {
    expect(findBySlug('smoky-mountain-queen-bookcase-murphy')?.videoUri).toBe(
      `${WIX_VIDEO_BASE}e04e89_973ed5df7eb34c1d9ad7c1697e8d0f72/1080p/mp4/file.mp4`,
    );
  });

  it('brevard-twin-cabinet-bed has Maricopa video', () => {
    expect(findBySlug('brevard-twin-cabinet-bed')?.videoUri).toBe(
      `${WIX_VIDEO_BASE}e04e89_b10b923982664fa39409244ac93dadcf/1080p/mp4/file.mp4`,
    );
  });

  it('chimney-rock-queen-desk-murphy has Studio Conversion video', () => {
    expect(findBySlug('chimney-rock-queen-desk-murphy')?.videoUri).toBe(
      `${WIX_VIDEO_BASE}e04e89_d9ffa580eb5a4fa784bc6bb6a6105257/1080p/mp4/file.mp4`,
    );
  });

  it('nantahala-full-storage-murphy has WallHugger Conversion video', () => {
    expect(findBySlug('nantahala-full-storage-murphy')?.videoUri).toBe(
      `${WIX_VIDEO_BASE}e04e89_d49b6de8f0b4471bb132c612497fd53c/1080p/mp4/file.mp4`,
    );
  });

  it('mountain-weave-cover has MoonGlider Conversion video', () => {
    expect(findBySlug('mountain-weave-cover')?.videoUri).toBe(
      `${WIX_VIDEO_BASE}e04e89_b8d2371453a0487abf8224d6256bdfe0/1080p/mp4/file.mp4`,
    );
  });

  it('all videoUri fields use the correct Wix CDN format', () => {
    const videoed = PRODUCTS.filter((p) => p.videoUri);
    expect(videoed.length).toBeGreaterThanOrEqual(11);
    for (const p of videoed) {
      expect(p.videoUri).toMatch(
        /^https:\/\/video\.wixstatic\.com\/video\/e04e89_[a-f0-9]+\/1080p\/mp4\/file\.mp4$/,
      );
    }
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
