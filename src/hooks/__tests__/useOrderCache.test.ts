import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  cacheOrders,
  loadCachedOrders,
  clearOrderCache,
  ORDER_CACHE_KEY,
} from '@/services/orderCache';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockRemoveItem = AsyncStorage.removeItem as jest.Mock;

const SAMPLE_ORDERS = [
  {
    id: 'order-1',
    status: 'delivered',
    createdAt: '2026-02-20T12:00:00Z',
    items: [{ productId: 'prod-1', quantity: 1, price: 499 }],
    total: 499,
  },
  {
    id: 'order-2',
    status: 'shipped',
    createdAt: '2026-02-25T14:00:00Z',
    items: [{ productId: 'prod-2', quantity: 2, price: 299 }],
    total: 598,
  },
];

describe('orderCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('cacheOrders', () => {
    it('stores orders to AsyncStorage', async () => {
      mockSetItem.mockResolvedValue(undefined);
      await cacheOrders(SAMPLE_ORDERS as any);
      expect(mockSetItem).toHaveBeenCalledWith(
        ORDER_CACHE_KEY,
        expect.any(String),
      );
      const stored = JSON.parse(mockSetItem.mock.calls[0][1]);
      expect(stored.orders).toHaveLength(2);
      expect(stored.cachedAt).toBeDefined();
    });

    it('handles storage write errors gracefully', async () => {
      mockSetItem.mockRejectedValue(new Error('disk full'));
      // Should not throw
      await expect(cacheOrders(SAMPLE_ORDERS as any)).resolves.not.toThrow();
    });
  });

  describe('loadCachedOrders', () => {
    it('returns cached orders when available', async () => {
      const cached = JSON.stringify({
        orders: SAMPLE_ORDERS,
        cachedAt: new Date().toISOString(),
      });
      mockGetItem.mockResolvedValue(cached);
      const result = await loadCachedOrders();
      expect(result).not.toBeNull();
      expect(result!.orders).toHaveLength(2);
      expect(result!.orders[0].id).toBe('order-1');
    });

    it('returns null when no cache exists', async () => {
      mockGetItem.mockResolvedValue(null);
      const result = await loadCachedOrders();
      expect(result).toBeNull();
    });

    it('returns null for corrupted cache data', async () => {
      mockGetItem.mockResolvedValue('not-json{{{');
      const result = await loadCachedOrders();
      expect(result).toBeNull();
    });

    it('handles storage read errors gracefully', async () => {
      mockGetItem.mockRejectedValue(new Error('Storage error'));
      const result = await loadCachedOrders();
      expect(result).toBeNull();
    });

    it('returns null for cache missing orders field', async () => {
      mockGetItem.mockResolvedValue(JSON.stringify({ cachedAt: 'now' }));
      const result = await loadCachedOrders();
      expect(result).toBeNull();
    });
  });

  describe('clearOrderCache', () => {
    it('removes order cache from AsyncStorage', async () => {
      mockRemoveItem.mockResolvedValue(undefined);
      await clearOrderCache();
      expect(mockRemoveItem).toHaveBeenCalledWith(ORDER_CACHE_KEY);
    });

    it('handles removal errors gracefully', async () => {
      mockRemoveItem.mockRejectedValue(new Error('fail'));
      await expect(clearOrderCache()).resolves.not.toThrow();
    });
  });
});
