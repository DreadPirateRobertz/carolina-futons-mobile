import { renderHook, act } from '@testing-library/react-native';
import { useProducts } from '../useProducts';
import { PRODUCTS, CATEGORIES } from '@/data/products';

describe('useProducts', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('returns products', () => {
      const { result } = renderHook(() => useProducts());
      expect(result.current.products.length).toBeGreaterThan(0);
    });

    it('returns categories', () => {
      const { result } = renderHook(() => useProducts());
      expect(result.current.categories).toEqual(CATEGORIES);
    });

    it('starts with empty search', () => {
      const { result } = renderHook(() => useProducts());
      expect(result.current.searchQuery).toBe('');
    });

    it('starts with no category selected', () => {
      const { result } = renderHook(() => useProducts());
      expect(result.current.selectedCategory).toBeNull();
    });

    it('starts with featured sort', () => {
      const { result } = renderHook(() => useProducts());
      expect(result.current.sortBy).toBe('featured');
    });

    it('starts not loading', () => {
      const { result } = renderHook(() => useProducts());
      expect(result.current.isLoading).toBe(false);
    });

    it('returns first page of products (max 8)', () => {
      const { result } = renderHook(() => useProducts());
      expect(result.current.products.length).toBeLessThanOrEqual(8);
    });
  });

  describe('initialCategory', () => {
    it('starts with the given category pre-selected', () => {
      const { result } = renderHook(() => useProducts({ initialCategory: 'futons' }));
      expect(result.current.selectedCategory).toBe('futons');
      expect(result.current.products.every((p) => p.category === 'futons')).toBe(true);
    });

    it('returns only products from the initial category', () => {
      const futonCount = PRODUCTS.filter((p) => p.category === 'futons').length;
      const { result } = renderHook(() => useProducts({ initialCategory: 'futons' }));
      expect(result.current.products.length).toBe(futonCount);
    });

    it('allows changing category after initialization', () => {
      const { result } = renderHook(() => useProducts({ initialCategory: 'futons' }));
      act(() => result.current.setSelectedCategory('covers'));
      expect(result.current.selectedCategory).toBe('covers');
      expect(result.current.products.every((p) => p.category === 'covers')).toBe(true);
    });

    it('allows clearing category to show all', () => {
      const { result } = renderHook(() => useProducts({ initialCategory: 'futons' }));
      act(() => result.current.setSelectedCategory(null));
      expect(result.current.selectedCategory).toBeNull();
      const categories = new Set(result.current.products.map((p) => p.category));
      expect(categories.size).toBeGreaterThan(1);
    });

    it('defaults to no category when not provided', () => {
      const { result } = renderHook(() => useProducts());
      expect(result.current.selectedCategory).toBeNull();
    });

    it('defaults to no category when empty options provided', () => {
      const { result } = renderHook(() => useProducts({}));
      expect(result.current.selectedCategory).toBeNull();
    });
  });

  describe('search', () => {
    it('filters by product name', () => {
      const { result } = renderHook(() => useProducts());
      act(() => result.current.setSearchQuery('asheville'));
      const names = result.current.products.map((p) => p.name.toLowerCase());
      expect(names.every((n) => n.includes('asheville'))).toBe(true);
    });

    it('filters by short description', () => {
      const { result } = renderHook(() => useProducts());
      act(() => result.current.setSearchQuery('innerspring'));
      expect(result.current.products.length).toBeGreaterThan(0);
    });

    it('filters by category keyword', () => {
      const { result } = renderHook(() => useProducts());
      act(() => result.current.setSearchQuery('pillows'));
      expect(result.current.products.length).toBeGreaterThan(0);
      expect(result.current.products.every((p) => p.category === 'pillows')).toBe(true);
    });

    it('is case-insensitive', () => {
      const { result } = renderHook(() => useProducts());
      act(() => result.current.setSearchQuery('ASHEVILLE'));
      expect(result.current.products.length).toBeGreaterThan(0);
    });

    it('returns empty for no matches', () => {
      const { result } = renderHook(() => useProducts());
      act(() => result.current.setSearchQuery('xyznonexistent'));
      expect(result.current.products.length).toBe(0);
    });

    it('resets page when search changes', () => {
      const { result } = renderHook(() => useProducts());
      // Load more first
      act(() => result.current.loadMore());
      act(() => jest.advanceTimersByTime(400));
      // Now search — should reset pagination
      act(() => result.current.setSearchQuery('futon'));
      expect(result.current.products.length).toBeLessThanOrEqual(8);
    });
  });

  describe('category filter', () => {
    it('filters by category', () => {
      const { result } = renderHook(() => useProducts());
      act(() => result.current.setSelectedCategory('covers'));
      expect(result.current.products.every((p) => p.category === 'covers')).toBe(true);
    });

    it('shows all when category is null', () => {
      const { result } = renderHook(() => useProducts());
      act(() => result.current.setSelectedCategory('covers'));
      act(() => result.current.setSelectedCategory(null));
      // Should show more than just covers
      const categories = new Set(result.current.products.map((p) => p.category));
      expect(categories.size).toBeGreaterThan(1);
    });

    it('resets page when category changes', () => {
      const { result } = renderHook(() => useProducts());
      act(() => result.current.loadMore());
      act(() => jest.advanceTimersByTime(400));
      act(() => result.current.setSelectedCategory('futons'));
      expect(result.current.products.length).toBeLessThanOrEqual(8);
    });
  });

  describe('sort', () => {
    it('sorts by price ascending', () => {
      const { result } = renderHook(() => useProducts());
      act(() => result.current.setSortBy('price-asc'));
      const prices = result.current.products.map((p) => p.price);
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
      }
    });

    it('sorts by price descending', () => {
      const { result } = renderHook(() => useProducts());
      act(() => result.current.setSortBy('price-desc'));
      const prices = result.current.products.map((p) => p.price);
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeLessThanOrEqual(prices[i - 1]);
      }
    });

    it('sorts by rating', () => {
      const { result } = renderHook(() => useProducts());
      act(() => result.current.setSortBy('rating'));
      const ratings = result.current.products.map((p) => p.rating);
      for (let i = 1; i < ratings.length; i++) {
        expect(ratings[i]).toBeLessThanOrEqual(ratings[i - 1]);
      }
    });

    it('resets page when sort changes', () => {
      const { result } = renderHook(() => useProducts());
      act(() => result.current.loadMore());
      act(() => jest.advanceTimersByTime(400));
      act(() => result.current.setSortBy('price-asc'));
      expect(result.current.products.length).toBeLessThanOrEqual(8);
    });
  });

  describe('pagination', () => {
    it('loadMore increases visible products', () => {
      const { result } = renderHook(() => useProducts());
      const initialCount = result.current.products.length;
      act(() => result.current.loadMore());
      act(() => jest.advanceTimersByTime(400));
      // If there are more products than PAGE_SIZE, we should see more
      if (PRODUCTS.length > 8) {
        expect(result.current.products.length).toBeGreaterThan(initialCount);
      }
    });

    it('sets isLoading during loadMore', () => {
      const { result } = renderHook(() => useProducts());
      if (!result.current.hasMore) return;
      act(() => result.current.loadMore());
      expect(result.current.isLoading).toBe(true);
      act(() => jest.advanceTimersByTime(400));
      expect(result.current.isLoading).toBe(false);
    });

    it('does not loadMore when already loading', () => {
      const { result } = renderHook(() => useProducts());
      if (!result.current.hasMore) return;
      act(() => result.current.loadMore());
      const countDuringLoad = result.current.products.length;
      act(() => result.current.loadMore()); // Should no-op
      expect(result.current.products.length).toBe(countDuringLoad);
    });

    it('hasMore is false when all products visible', () => {
      const { result } = renderHook(() => useProducts());
      // Filter to small category
      act(() => result.current.setSelectedCategory('pillows'));
      // Pillows has only 1 product, should not have more
      expect(result.current.hasMore).toBe(false);
    });

    it('refresh resets to page 1', () => {
      const { result } = renderHook(() => useProducts());
      act(() => result.current.loadMore());
      act(() => jest.advanceTimersByTime(400));
      act(() => result.current.refresh());
      expect(result.current.products.length).toBeLessThanOrEqual(8);
    });
  });

  describe('combined filters', () => {
    it('search + category filter works together', () => {
      const { result } = renderHook(() => useProducts());
      act(() => result.current.setSelectedCategory('futons'));
      act(() => result.current.setSearchQuery('queen'));
      expect(result.current.products.length).toBeGreaterThan(0);
      expect(result.current.products.every((p) => p.category === 'futons')).toBe(true);
    });

    it('search + sort works together', () => {
      const { result } = renderHook(() => useProducts());
      act(() => result.current.setSearchQuery('futon'));
      act(() => result.current.setSortBy('price-asc'));
      const prices = result.current.products.map((p) => p.price);
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
      }
    });
  });

  describe('fuzzy search', () => {
    it('finds products with partial/fuzzy query', () => {
      const { result } = renderHook(() => useProducts());
      // "ashvl" doesn't exactly match "Asheville" but fuzzy should find it
      act(() => result.current.setSearchQuery('ashvl'));
      expect(result.current.products.length).toBeGreaterThan(0);
      expect(result.current.products.some((p) => p.name.includes('Asheville'))).toBe(true);
    });

    it('ranks exact matches higher than fuzzy matches', () => {
      const { result } = renderHook(() => useProducts());
      act(() => result.current.setSearchQuery('asheville'));
      // First result should be the Asheville product
      expect(result.current.products[0].name).toContain('Asheville');
    });

    it('returns empty for completely unrelated query', () => {
      const { result } = renderHook(() => useProducts());
      act(() => result.current.setSearchQuery('xyznothing'));
      expect(result.current.products.length).toBe(0);
    });
  });

  describe('suggestions', () => {
    it('returns empty suggestions when query is empty', () => {
      const { result } = renderHook(() => useProducts());
      expect(result.current.suggestions).toEqual([]);
    });

    it('returns empty suggestions when query is short (< 2 chars)', () => {
      const { result } = renderHook(() => useProducts());
      act(() => result.current.setSearchQuery('f'));
      expect(result.current.suggestions).toEqual([]);
    });

    it('returns suggestions for 2+ char query', () => {
      const { result } = renderHook(() => useProducts());
      act(() => result.current.setSearchQuery('fu'));
      expect(result.current.suggestions.length).toBeGreaterThan(0);
    });

    it('suggestions are product names', () => {
      const { result } = renderHook(() => useProducts());
      act(() => result.current.setSearchQuery('ash'));
      expect(result.current.suggestions.length).toBeGreaterThan(0);
      expect(result.current.suggestions[0]).toContain('Asheville');
    });

    it('caps suggestions at 5', () => {
      const { result } = renderHook(() => useProducts());
      act(() => result.current.setSearchQuery('the'));
      expect(result.current.suggestions.length).toBeLessThanOrEqual(5);
    });
  });
});
