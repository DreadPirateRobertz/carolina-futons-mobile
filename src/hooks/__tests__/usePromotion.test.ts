/**
 * TDD tests for usePromotion hook.
 * Spec: fetch promotions from Wix CMS "Promotions" collection,
 * fall back to static LAUNCH_PROMOS on error/empty/no-client.
 */
import { renderHook, act } from '@testing-library/react-native';
import { usePromotion } from '../usePromotion';

const mockQueryData = jest.fn();
const mockUseOptionalWixClient = jest.fn();

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => mockUseOptionalWixClient(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

const CMS_PROMO_ITEMS = [
  {
    _id: 'cms-promo-1',
    title: 'Summer Sale',
    subtitle: '30% off select frames',
    ctaText: 'Shop Sale',
    deepLink: 'carolinafutons://shop?sale=summer',
    emoji: '☀️',
    accentColor: '#FFB347',
    active: true,
    sortOrder: 1,
  },
  {
    _id: 'cms-promo-2',
    title: 'New Arrivals',
    subtitle: 'Fresh styles just landed',
    ctaText: 'Explore',
    deepLink: 'carolinafutons://collections/new-arrivals',
    emoji: '🆕',
    accentColor: '#5B8FA8',
    active: true,
    sortOrder: 2,
  },
];

beforeEach(() => {
  mockQueryData.mockReset();
  mockUseOptionalWixClient.mockReturnValue({ queryData: mockQueryData });
});

describe('usePromotion', () => {
  describe('happy path — CMS data available', () => {
    it('returns items transformed from CMS', async () => {
      mockQueryData.mockResolvedValue({ items: CMS_PROMO_ITEMS, totalResults: 2 });
      const { result } = renderHook(() => usePromotion());
      await act(async () => {});
      expect(result.current.items).toHaveLength(2);
      expect(result.current.items[0].title).toBe('Summer Sale');
      expect(result.current.items[0].id).toBe('cms-promo-1');
    });

    it('maps all PromoBannerItem fields from CMS item', async () => {
      mockQueryData.mockResolvedValue({ items: [CMS_PROMO_ITEMS[0]], totalResults: 1 });
      const { result } = renderHook(() => usePromotion());
      await act(async () => {});
      const item = result.current.items[0];
      expect(item.id).toBe('cms-promo-1');
      expect(item.title).toBe('Summer Sale');
      expect(item.subtitle).toBe('30% off select frames');
      expect(item.ctaText).toBe('Shop Sale');
      expect(item.deepLink).toBe('carolinafutons://shop?sale=summer');
      expect(item.emoji).toBe('☀️');
      expect(item.accentColor).toBe('#FFB347');
    });

    it('resolves isLoading to false after fetch', async () => {
      mockQueryData.mockResolvedValue({ items: CMS_PROMO_ITEMS, totalResults: 2 });
      const { result } = renderHook(() => usePromotion());
      await act(async () => {});
      expect(result.current.isLoading).toBe(false);
    });

    it('error is null on successful fetch', async () => {
      mockQueryData.mockResolvedValue({ items: CMS_PROMO_ITEMS, totalResults: 2 });
      const { result } = renderHook(() => usePromotion());
      await act(async () => {});
      expect(result.current.error).toBeNull();
    });
  });

  describe('fallback — no Wix client', () => {
    it('returns static LAUNCH_PROMOS when Wix client is null', async () => {
      mockUseOptionalWixClient.mockReturnValue(null);
      const { result } = renderHook(() => usePromotion());
      await act(async () => {});
      expect(result.current.items.length).toBeGreaterThanOrEqual(1);
      expect(result.current.error).toBeNull();
    });
  });

  describe('edge case — empty CMS result', () => {
    it('falls back to static LAUNCH_PROMOS when CMS returns empty array', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
      const { result } = renderHook(() => usePromotion());
      await act(async () => {});
      expect(result.current.items.length).toBeGreaterThanOrEqual(1);
    });

    it('isLoading is false after empty CMS response', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
      const { result } = renderHook(() => usePromotion());
      await act(async () => {});
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('edge case — network error', () => {
    it('falls back to static LAUNCH_PROMOS on network error', async () => {
      mockQueryData.mockRejectedValue(new Error('Network error'));
      const { result } = renderHook(() => usePromotion());
      await act(async () => {});
      expect(result.current.items.length).toBeGreaterThanOrEqual(1);
    });

    it('exposes error on network failure', async () => {
      mockQueryData.mockRejectedValue(new Error('Network error'));
      const { result } = renderHook(() => usePromotion());
      await act(async () => {});
      expect(result.current.error).toBeInstanceOf(Error);
    });

    it('isLoading is false after network error', async () => {
      mockQueryData.mockRejectedValue(new Error('Network error'));
      const { result } = renderHook(() => usePromotion());
      await act(async () => {});
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('edge case — single promotion', () => {
    it('returns exactly one item when CMS has single active promotion', async () => {
      mockQueryData.mockResolvedValue({ items: [CMS_PROMO_ITEMS[0]], totalResults: 1 });
      const { result } = renderHook(() => usePromotion());
      await act(async () => {});
      expect(result.current.items).toHaveLength(1);
    });
  });

  describe('edge case — malformed CMS data', () => {
    it('falls back to static promos when CMS returns items with missing required fields', async () => {
      mockQueryData.mockResolvedValue({
        items: [{ _id: 'bad-item' }], // missing title, subtitle, etc.
        totalResults: 1,
      });
      const { result } = renderHook(() => usePromotion());
      await act(async () => {});
      // Should not throw; static promos or partial data returned
      expect(result.current.items.length).toBeGreaterThanOrEqual(1);
      expect(result.current.items[0].id).toBeDefined();
    });
  });

  describe('refresh', () => {
    it('exposes a refresh function', async () => {
      mockQueryData.mockResolvedValue({ items: CMS_PROMO_ITEMS, totalResults: 2 });
      const { result } = renderHook(() => usePromotion());
      await act(async () => {});
      expect(typeof result.current.refresh).toBe('function');
    });

    it('re-fetches CMS data when refresh is called', async () => {
      mockQueryData.mockResolvedValue({ items: CMS_PROMO_ITEMS, totalResults: 2 });
      const { result } = renderHook(() => usePromotion());
      await act(async () => {});
      expect(mockQueryData).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refresh();
      });
      expect(mockQueryData).toHaveBeenCalledTimes(2);
    });
  });
});
