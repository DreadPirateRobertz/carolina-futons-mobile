import { productId, futonModelId, productIdToModelId, modelIdToProductId } from '../productId';

describe('productId branded types', () => {
  describe('productId constructor', () => {
    it('creates a ProductId from a string', () => {
      const id = productId('prod-asheville-full');
      expect(id).toBe('prod-asheville-full');
    });

    it('preserves the string value', () => {
      const id = productId('prod-blue-ridge-queen');
      const str: string = id; // branded types are assignable to string
      expect(str).toBe('prod-blue-ridge-queen');
    });
  });

  describe('futonModelId constructor', () => {
    it('creates a FutonModelId from a string', () => {
      const id = futonModelId('asheville-full');
      expect(id).toBe('asheville-full');
    });
  });

  describe('productIdToModelId', () => {
    it('strips the prod- prefix', () => {
      const pid = productId('prod-asheville-full');
      const mid = productIdToModelId(pid);
      expect(mid).toBe('asheville-full');
    });

    it('handles IDs without prod- prefix gracefully', () => {
      const pid = productId('asheville-full');
      const mid = productIdToModelId(pid);
      expect(mid).toBe('asheville-full');
    });
  });

  describe('modelIdToProductId', () => {
    it('adds the prod- prefix', () => {
      const mid = futonModelId('asheville-full');
      const pid = modelIdToProductId(mid);
      expect(pid).toBe('prod-asheville-full');
    });

    it('does not double-prefix', () => {
      const mid = futonModelId('prod-asheville-full');
      const pid = modelIdToProductId(mid);
      expect(pid).toBe('prod-asheville-full');
    });
  });
});
