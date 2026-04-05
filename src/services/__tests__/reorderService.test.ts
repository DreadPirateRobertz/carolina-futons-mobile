/**
 * TDD tests for reorderService — cm-bjq.
 *
 * Tests: all in stock, partial OOS, all OOS, empty order,
 * discontinued model, discontinued fabric, stock checker injection.
 */
import { buildReorderPreview, type StockChecker } from '../reorderService';
import { type OrderLineItem } from '@/data/orders';
import { futonModelId } from '@/data/productId';
import { FUTON_MODELS, FABRICS, type FutonModel, type Fabric } from '@/data/futons';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MODEL_A = FUTON_MODELS[0] as FutonModel;
const FABRIC_A = FABRICS[0] as Fabric;
const MODEL_B = FUTON_MODELS[1] as FutonModel;
const FABRIC_B = FABRICS[1] as Fabric;

const makeLineItem = (
  id: string,
  modelId: string,
  fabricId: string,
  quantity = 1,
): OrderLineItem => ({
  id,
  modelId: futonModelId(modelId),
  modelName: 'Test Model',
  fabricId,
  fabricName: 'Test Fabric',
  fabricColor: '#000000',
  quantity,
  unitPrice: 400,
  lineTotal: 400 * quantity,
});

const getModel = (id: string) => FUTON_MODELS.find((m) => m.id === id);
const getFabric = (id: string) => FABRICS.find((f) => f.id === id);

const alwaysInStock: StockChecker = () => true;
const alwaysOOS: StockChecker = () => false;

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('buildReorderPreview', () => {
  describe('all items available', () => {
    it('places all items in available when all are in catalog and in stock', () => {
      const items = [
        makeLineItem('li-1', MODEL_A.id, FABRIC_A.id),
        makeLineItem('li-2', MODEL_B.id, FABRIC_B.id),
      ];
      const { available, unavailable } = buildReorderPreview(
        items,
        getModel,
        getFabric,
        alwaysInStock,
      );
      expect(available).toHaveLength(2);
      expect(unavailable).toHaveLength(0);
    });

    it('includes the correct model reference for each available item', () => {
      const items = [makeLineItem('li-1', MODEL_A.id, FABRIC_A.id)];
      const { available } = buildReorderPreview(items, getModel, getFabric, alwaysInStock);
      expect(available[0].model).toEqual(MODEL_A);
    });

    it('includes the correct fabric reference for each available item', () => {
      const items = [makeLineItem('li-1', MODEL_A.id, FABRIC_A.id)];
      const { available } = buildReorderPreview(items, getModel, getFabric, alwaysInStock);
      expect(available[0].fabric).toEqual(FABRIC_A);
    });

    it('preserves the original lineItem on available items', () => {
      const lineItem = makeLineItem('li-1', MODEL_A.id, FABRIC_A.id, 3);
      const { available } = buildReorderPreview([lineItem], getModel, getFabric, alwaysInStock);
      expect(available[0].lineItem).toBe(lineItem);
    });

    it('returns empty unavailable list when all items are in stock', () => {
      const items = [makeLineItem('li-1', MODEL_A.id, FABRIC_A.id)];
      const { unavailable } = buildReorderPreview(items, getModel, getFabric, alwaysInStock);
      expect(unavailable).toHaveLength(0);
    });
  });

  describe('all items unavailable', () => {
    it('places all items in unavailable when stock checker returns false', () => {
      const items = [
        makeLineItem('li-1', MODEL_A.id, FABRIC_A.id),
        makeLineItem('li-2', MODEL_B.id, FABRIC_B.id),
      ];
      const { available, unavailable } = buildReorderPreview(
        items,
        getModel,
        getFabric,
        alwaysOOS,
      );
      expect(available).toHaveLength(0);
      expect(unavailable).toHaveLength(2);
    });

    it('places item in unavailable when model is not found in catalog', () => {
      const items = [makeLineItem('li-1', 'nonexistent-model-xyz', FABRIC_A.id)];
      const { available, unavailable } = buildReorderPreview(
        items,
        getModel,
        getFabric,
        alwaysInStock,
      );
      expect(available).toHaveLength(0);
      expect(unavailable).toHaveLength(1);
    });

    it('places item in unavailable when fabric is not found in catalog', () => {
      const items = [makeLineItem('li-1', MODEL_A.id, 'nonexistent-fabric-xyz')];
      const { available, unavailable } = buildReorderPreview(
        items,
        getModel,
        getFabric,
        alwaysInStock,
      );
      expect(available).toHaveLength(0);
      expect(unavailable).toHaveLength(1);
    });

    it('preserves the original lineItem in unavailable', () => {
      const lineItem = makeLineItem('li-1', 'nonexistent-model-xyz', FABRIC_A.id);
      const { unavailable } = buildReorderPreview([lineItem], getModel, getFabric, alwaysInStock);
      expect(unavailable[0]).toBe(lineItem);
    });
  });

  describe('partial availability', () => {
    it('splits items correctly between available and unavailable', () => {
      const items = [
        makeLineItem('li-1', MODEL_A.id, FABRIC_A.id), // in stock
        makeLineItem('li-2', 'discontinued-model', FABRIC_B.id), // not in catalog
        makeLineItem('li-3', MODEL_B.id, FABRIC_B.id), // in stock
      ];
      const { available, unavailable } = buildReorderPreview(
        items,
        getModel,
        getFabric,
        alwaysInStock,
      );
      expect(available).toHaveLength(2);
      expect(unavailable).toHaveLength(1);
    });

    it('stock checker is called only for items found in catalog', () => {
      const stockChecker = jest.fn().mockReturnValue(true);
      const items = [
        makeLineItem('li-1', MODEL_A.id, FABRIC_A.id),
        makeLineItem('li-2', 'nonexistent-xyz', FABRIC_A.id), // not in catalog — skip check
      ];
      buildReorderPreview(items, getModel, getFabric, stockChecker);
      // Only called once (for the item that exists in catalog)
      expect(stockChecker).toHaveBeenCalledTimes(1);
    });

    it('stock checker receives modelId and fabricId', () => {
      const stockChecker = jest.fn().mockReturnValue(true);
      const items = [makeLineItem('li-1', MODEL_A.id, FABRIC_A.id)];
      buildReorderPreview(items, getModel, getFabric, stockChecker);
      expect(stockChecker).toHaveBeenCalledWith(MODEL_A.id, FABRIC_A.id);
    });
  });

  describe('empty order', () => {
    it('returns empty available and unavailable for an empty items array', () => {
      const { available, unavailable } = buildReorderPreview([], getModel, getFabric, alwaysInStock);
      expect(available).toHaveLength(0);
      expect(unavailable).toHaveLength(0);
    });
  });

  describe('default stock checker', () => {
    it('defaults to treating all catalog items as in stock when no checker provided', () => {
      const items = [makeLineItem('li-1', MODEL_A.id, FABRIC_A.id)];
      const { available } = buildReorderPreview(items, getModel, getFabric);
      expect(available).toHaveLength(1);
    });
  });
});
