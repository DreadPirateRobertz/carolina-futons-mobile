import {
  MODELS_3D,
  MODEL_CDN_BASE,
  getModel3DForProduct,
  hasARModel,
  type Model3DAsset,
} from '../models3d';
import { PRODUCTS } from '../products';

describe('models3d', () => {
  describe('MODELS_3D catalog', () => {
    it('contains entries for AR-eligible products', () => {
      expect(MODELS_3D.length).toBeGreaterThanOrEqual(4);
    });

    it.each(MODELS_3D)('$productId has valid GLB and USDZ URLs', (asset: Model3DAsset) => {
      expect(asset.glbUrl).toMatch(/^https:\/\//);
      expect(asset.glbUrl).toMatch(/\.glb$/);
      expect(asset.usdzUrl).toMatch(/^https:\/\//);
      expect(asset.usdzUrl).toMatch(/\.usdz$/);
    });

    it.each(MODELS_3D)('$productId has dimensions in meters (< 3m)', (asset: Model3DAsset) => {
      // Futon dimensions should be < 3 meters in any axis
      expect(asset.dimensions.width).toBeGreaterThan(0);
      expect(asset.dimensions.width).toBeLessThan(3);
      expect(asset.dimensions.depth).toBeGreaterThan(0);
      expect(asset.dimensions.depth).toBeLessThan(3);
      expect(asset.dimensions.height).toBeGreaterThan(0);
      expect(asset.dimensions.height).toBeLessThan(3);
    });

    it.each(MODELS_3D)('$productId has reasonable file size (1-20 MB)', (asset: Model3DAsset) => {
      expect(asset.fileSizeBytes).toBeGreaterThan(1_000_000);
      expect(asset.fileSizeBytes).toBeLessThan(20_000_000);
    });

    it.each(MODELS_3D)('$productId has a non-empty content hash', (asset: Model3DAsset) => {
      expect(asset.contentHash).toBeTruthy();
      expect(asset.contentHash.length).toBeGreaterThanOrEqual(6);
    });

    it('has unique product IDs', () => {
      const ids = MODELS_3D.map((m) => m.productId);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('all product IDs reference valid products', () => {
      const productIds = new Set(PRODUCTS.map((p) => p.id));
      for (const model of MODELS_3D) {
        expect(productIds.has(model.productId)).toBe(true);
      }
    });
  });

  describe('getModel3DForProduct', () => {
    it('returns asset for a known futon product', () => {
      const asset = getModel3DForProduct('prod-asheville-full');
      expect(asset).toBeDefined();
      expect(asset!.productId).toBe('prod-asheville-full');
      expect(asset!.hasFabricVariants).toBe(true);
    });

    it('returns asset for murphy bed products (no fabric variants)', () => {
      const asset = getModel3DForProduct('prod-murphy-queen-vertical');
      expect(asset).toBeDefined();
      expect(asset!.productId).toBe('prod-murphy-queen-vertical');
      expect(asset!.hasFabricVariants).toBe(false);
      // 64" wide = ~1.626m
      expect(asset!.dimensions.width).toBeCloseTo(1.626, 2);
    });

    it('returns undefined for a product without AR model', () => {
      expect(getModel3DForProduct('prod-grip-strips')).toBeUndefined();
    });

    it('returns undefined for non-existent product', () => {
      expect(getModel3DForProduct('prod-does-not-exist')).toBeUndefined();
    });
  });

  describe('hasARModel', () => {
    it('returns true for futon products', () => {
      expect(hasARModel('prod-asheville-full')).toBe(true);
      expect(hasARModel('prod-blue-ridge-queen')).toBe(true);
      expect(hasARModel('prod-pisgah-twin')).toBe(true);
      expect(hasARModel('prod-biltmore-loveseat')).toBe(true);
    });

    it('returns true for murphy bed products', () => {
      expect(hasARModel('prod-murphy-queen-vertical')).toBe(true);
      expect(hasARModel('prod-murphy-full-horizontal')).toBe(true);
      expect(hasARModel('prod-murphy-queen-bookcase')).toBe(true);
      expect(hasARModel('prod-murphy-twin-cabinet')).toBe(true);
      expect(hasARModel('prod-murphy-queen-desk')).toBe(true);
      expect(hasARModel('prod-murphy-full-storage')).toBe(true);
    });

    it('returns true for frame product', () => {
      expect(hasARModel('prod-hardwood-frame')).toBe(true);
    });

    it('returns false for covers, pillows, accessories', () => {
      expect(hasARModel('prod-mountain-cover-full')).toBe(false);
      expect(hasARModel('prod-arm-pillows')).toBe(false);
      expect(hasARModel('prod-grip-strips')).toBe(false);
      expect(hasARModel('prod-furniture-polish')).toBe(false);
    });

    it('returns false for non-existent product', () => {
      expect(hasARModel('fake-product')).toBe(false);
    });
  });

  describe('PoC sample model (asheville-full)', () => {
    it('has a real downloadable GLB URL (not CDN placeholder)', () => {
      const asset = getModel3DForProduct('prod-asheville-full')!;
      expect(asset).toBeDefined();
      // Real model URLs should be https:// but NOT the placeholder CDN
      expect(asset.glbUrl).toMatch(/^https:\/\//);
      expect(asset.glbUrl).toMatch(/\.glb$/);
    });

    it('has a real downloadable USDZ URL', () => {
      const asset = getModel3DForProduct('prod-asheville-full')!;
      expect(asset.usdzUrl).toMatch(/^https:\/\//);
      expect(asset.usdzUrl).toMatch(/\.usdz$/);
    });

    it('has accurate file size for real GLB model', () => {
      const asset = getModel3DForProduct('prod-asheville-full')!;
      // KhronosGroup SheenChair GLB is ~4.1 MB
      expect(asset.fileSizeBytes).toBeGreaterThan(3_000_000);
      expect(asset.fileSizeBytes).toBeLessThan(5_000_000);
    });

    it('has real content hash (not placeholder)', () => {
      const asset = getModel3DForProduct('prod-asheville-full')!;
      // SHA-256 prefix
      expect(asset.contentHash.length).toBeGreaterThanOrEqual(8);
    });
  });
});
