/**
 * Tests that every product in the mock catalog has pre-computed blurhash
 * values on all images, ensuring smooth placeholder rendering.
 */
import { PRODUCTS, DEFAULT_PRODUCT_BLURHASH } from '../products';

describe('Product blurhash pre-computation', () => {
  it('every product has at least one image', () => {
    for (const product of PRODUCTS) {
      expect(product.images.length).toBeGreaterThan(0);
    }
  });

  it('every product image has a blurhash string', () => {
    for (const product of PRODUCTS) {
      for (const image of product.images) {
        expect(image.blurhash).toBeDefined();
        expect(typeof image.blurhash).toBe('string');
        expect(image.blurhash!.length).toBeGreaterThan(0);
      }
    }
  });

  it('product blurhash values are unique per product (not all using default)', () => {
    const hashes = PRODUCTS.map((p) => p.images[0]?.blurhash).filter(Boolean);
    const uniqueHashes = new Set(hashes);
    // With 16+ products, we expect at least 5 unique hashes
    // (some products with similar colors may share hashes, which is fine)
    expect(uniqueHashes.size).toBeGreaterThanOrEqual(5);
  });

  it('DEFAULT_PRODUCT_BLURHASH is a valid blurhash string', () => {
    expect(DEFAULT_PRODUCT_BLURHASH).toBeDefined();
    expect(typeof DEFAULT_PRODUCT_BLURHASH).toBe('string');
    expect(DEFAULT_PRODUCT_BLURHASH.length).toBeGreaterThan(0);
  });
});
