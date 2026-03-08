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

  /** Render and flush async cache loading */
  async function renderLoaded(...args: Parameters<typeof useProducts>) {
    const hook = renderHook(() => useProducts(...args));
    await act(async () => {});
    return hook;
  }

  describe('initial state', () => {
    it('starts with isInitialLoading true and empty products', () => {
      const { result } = renderHook(() => useProducts());
      expect(result.current.isInitialLoading).toBe(true);
      expect(result.current.products).toEqual([]);
    });

    it('returns products after initial load completes', async () => {
      const { result } = await renderLoaded();
      expect(result.current.isInitialLoading).toBe(false);
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

    it('returns first page of products (max 8)', async () => {
      const { result } = await renderLoaded();
      expect(result.current.products.length).toBeLessThanOrEqual(8);
    });
  });

  describe('initialCategory', () => {
    it('starts with the given category pre-selected', async () => {
      const { result } = await renderLoaded({ initialCategory: 'futons' });
      expect(result.current.selectedCategory).toBe('futons');
      expect(result.current.products.every((p) => p.category === 'futons')).toBe(true);
    });

    it('returns only products from the initial category', async () => {
      const futonCount = PRODUCTS.filter((p) => p.category === 'futons').length;
      const { result } = await renderLoaded({ initialCategory: 'futons' });
      expect(result.current.products.length).toBe(futonCount);
    });

    it('allows changing category after initialization', async () => {
      const { result } = await renderLoaded({ initialCategory: 'futons' });
      act(() => result.current.setSelectedCategory('covers'));
      expect(result.current.selectedCategory).toBe('covers');
      expect(result.current.products.every((p) => p.category === 'covers')).toBe(true);
    });

    it('allows clearing category to show all', async () => {
      const { result } = await renderLoaded({ initialCategory: 'futons' });
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
    it('filters by product name', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.setSearchQuery('asheville'));
      const names = result.current.products.map((p) => p.name.toLowerCase());
      expect(names.every((n) => n.includes('asheville'))).toBe(true);
    });

    it('filters by short description', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.setSearchQuery('innerspring'));
      expect(result.current.products.length).toBeGreaterThan(0);
    });

    it('filters by category keyword', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.setSearchQuery('pillows'));
      expect(result.current.products.length).toBeGreaterThan(0);
      expect(result.current.products.every((p) => p.category === 'pillows')).toBe(true);
    });

    it('is case-insensitive', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.setSearchQuery('ASHEVILLE'));
      expect(result.current.products.length).toBeGreaterThan(0);
    });

    it('returns empty for no matches', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.setSearchQuery('xyznonexistent'));
      expect(result.current.products.length).toBe(0);
    });

    it('resets page when search changes', async () => {
      const { result } = await renderLoaded();
      // Load more first
      act(() => result.current.loadMore());
      act(() => jest.advanceTimersByTime(400));
      // Now search — should reset pagination
      act(() => result.current.setSearchQuery('futon'));
      expect(result.current.products.length).toBeLessThanOrEqual(8);
    });
  });

  describe('category filter', () => {
    it('filters by category', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.setSelectedCategory('covers'));
      expect(result.current.products.every((p) => p.category === 'covers')).toBe(true);
    });

    it('shows all when category is null', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.setSelectedCategory('covers'));
      act(() => result.current.setSelectedCategory(null));
      // Should show more than just covers
      const categories = new Set(result.current.products.map((p) => p.category));
      expect(categories.size).toBeGreaterThan(1);
    });

    it('resets page when category changes', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.loadMore());
      act(() => jest.advanceTimersByTime(400));
      act(() => result.current.setSelectedCategory('futons'));
      expect(result.current.products.length).toBeLessThanOrEqual(8);
    });
  });

  describe('sort', () => {
    it('sorts by price ascending', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.setSortBy('price-asc'));
      const prices = result.current.products.map((p) => p.price);
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
      }
    });

    it('sorts by price descending', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.setSortBy('price-desc'));
      const prices = result.current.products.map((p) => p.price);
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeLessThanOrEqual(prices[i - 1]);
      }
    });

    it('sorts by rating', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.setSortBy('rating'));
      const ratings = result.current.products.map((p) => p.rating);
      for (let i = 1; i < ratings.length; i++) {
        expect(ratings[i]).toBeLessThanOrEqual(ratings[i - 1]);
      }
    });

    it('sorts by popular (review count descending)', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.setSortBy('popular'));
      const counts = result.current.products.map((p) => p.reviewCount ?? 0);
      for (let i = 1; i < counts.length; i++) {
        expect(counts[i]).toBeLessThanOrEqual(counts[i - 1]);
      }
    });

    it('resets page when sort changes', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.loadMore());
      act(() => jest.advanceTimersByTime(400));
      act(() => result.current.setSortBy('price-asc'));
      expect(result.current.products.length).toBeLessThanOrEqual(8);
    });
  });

  describe('pagination', () => {
    it('loadMore increases visible products', async () => {
      const { result } = await renderLoaded();
      const initialCount = result.current.products.length;
      act(() => result.current.loadMore());
      act(() => jest.advanceTimersByTime(400));
      // If there are more products than PAGE_SIZE, we should see more
      if (PRODUCTS.length > 8) {
        expect(result.current.products.length).toBeGreaterThan(initialCount);
      }
    });

    it('sets isLoading during loadMore', async () => {
      const { result } = await renderLoaded();
      if (!result.current.hasMore) return;
      act(() => result.current.loadMore());
      expect(result.current.isLoading).toBe(true);
      act(() => jest.advanceTimersByTime(400));
      expect(result.current.isLoading).toBe(false);
    });

    it('does not loadMore when already loading', async () => {
      const { result } = await renderLoaded();
      if (!result.current.hasMore) return;
      act(() => result.current.loadMore());
      const countDuringLoad = result.current.products.length;
      act(() => result.current.loadMore()); // Should no-op
      expect(result.current.products.length).toBe(countDuringLoad);
    });

    it('hasMore is false when all products visible', async () => {
      const { result } = await renderLoaded();
      // Filter to small category
      act(() => result.current.setSelectedCategory('pillows'));
      // Pillows has only 1 product, should not have more
      expect(result.current.hasMore).toBe(false);
    });

    it('refresh resets to page 1', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.loadMore());
      act(() => jest.advanceTimersByTime(400));
      act(() => result.current.refresh());
      expect(result.current.products.length).toBeLessThanOrEqual(8);
    });
  });

  describe('combined filters', () => {
    it('search + category filter works together', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.setSelectedCategory('futons'));
      act(() => result.current.setSearchQuery('queen'));
      expect(result.current.products.length).toBeGreaterThan(0);
      expect(result.current.products.every((p) => p.category === 'futons')).toBe(true);
    });

    it('search + sort works together', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.setSearchQuery('futon'));
      act(() => result.current.setSortBy('price-asc'));
      const prices = result.current.products.map((p) => p.price);
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
      }
    });
  });

  describe('fuzzy search', () => {
    it('finds products with partial/fuzzy query', async () => {
      const { result } = await renderLoaded();
      // "ashvl" doesn't exactly match "Asheville" but fuzzy should find it
      act(() => result.current.setSearchQuery('ashvl'));
      expect(result.current.products.length).toBeGreaterThan(0);
      expect(result.current.products.some((p) => p.name.includes('Asheville'))).toBe(true);
    });

    it('ranks exact matches higher than fuzzy matches', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.setSearchQuery('asheville'));
      // First result should be the Asheville product
      expect(result.current.products[0].name).toContain('Asheville');
    });

    it('returns empty for completely unrelated query', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.setSearchQuery('xyznothing'));
      expect(result.current.products.length).toBe(0);
    });
  });

  describe('suggestions', () => {
    it('returns empty suggestions when query is empty', () => {
      const { result } = renderHook(() => useProducts());
      expect(result.current.suggestions).toEqual([]);
    });

    it('returns empty suggestions when query is short (< 2 chars)', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.setSearchQuery('f'));
      expect(result.current.suggestions).toEqual([]);
    });

    it('returns suggestions for 2+ char query', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.setSearchQuery('fu'));
      expect(result.current.suggestions.length).toBeGreaterThan(0);
    });

    it('suggestions are product names', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.setSearchQuery('ash'));
      expect(result.current.suggestions.length).toBeGreaterThan(0);
      expect(result.current.suggestions[0]).toContain('Asheville');
    });

    it('caps suggestions at 5', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.setSearchQuery('the'));
      expect(result.current.suggestions.length).toBeLessThanOrEqual(5);
    });
  });

  describe('product filters', () => {
    it('starts with empty filters and zero active count', async () => {
      const { result } = await renderLoaded();
      expect(result.current.filters).toEqual({ sizes: [], fabrics: [], priceRange: null });
      expect(result.current.activeFilterCount).toBe(0);
    });

    it('filters by single size', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.setFilters({ sizes: ['twin'], fabrics: [], priceRange: null }));
      // All sized products should be twin; sizeless products pass through
      result.current.products.forEach((p) => {
        if (p.size) expect(p.size).toBe('twin');
      });
      // Should have fewer products than the total catalog (accounting for pagination)
      const twinAndSizeless = PRODUCTS.filter((p) => p.size === 'twin' || !p.size);
      expect(result.current.products.length).toBeLessThanOrEqual(twinAndSizeless.length);
    });

    it('filters by multiple sizes', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.setFilters({ sizes: ['twin', 'full'], fabrics: [], priceRange: null }));
      result.current.products.forEach((p) => {
        if (p.size) expect(['twin', 'full']).toContain(p.size);
      });
    });

    it('preserves products without size when size filter is active', async () => {
      const { result } = await renderLoaded();
      // Products without size (e.g. gift cards, accessories) should not be excluded
      const sizelessProducts = PRODUCTS.filter((p) => !p.size);
      if (sizelessProducts.length > 0) {
        act(() => result.current.setFilters({ sizes: ['queen'], fabrics: [], priceRange: null }));
        const resultIds = result.current.products.map((p) => p.id);
        sizelessProducts.forEach((p) => {
          // Sizeless products should still appear (within pagination)
          if (PRODUCTS.indexOf(p) < 8) {
            expect(resultIds).toContain(p.id);
          }
        });
      }
    });

    it('filters by fabric', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.setFilters({ sizes: [], fabrics: ['Natural Linen'], priceRange: null }));
      result.current.products.forEach((p) => {
        expect(p.fabricOptions).toEqual(expect.arrayContaining(['Natural Linen']));
      });
    });

    it('filters by multiple fabrics (OR semantics)', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.setFilters({ sizes: [], fabrics: ['Natural Linen', 'Sunset Coral'], priceRange: null }));
      result.current.products.forEach((p) => {
        const hasMatch = p.fabricOptions.some((f) => ['Natural Linen', 'Sunset Coral'].includes(f));
        expect(hasMatch).toBe(true);
      });
    });

    it('filters by price range', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.setFilters({ sizes: [], fabrics: [], priceRange: [100, 300] }));
      result.current.products.forEach((p) => {
        expect(p.price).toBeGreaterThanOrEqual(100);
        expect(p.price).toBeLessThanOrEqual(300);
      });
    });

    it('price range is inclusive on boundaries', async () => {
      const { result } = await renderLoaded();
      // Use exact price of a known product (Pisgah Twin = 279)
      act(() => result.current.setFilters({ sizes: [], fabrics: [], priceRange: [279, 279] }));
      expect(result.current.products.length).toBeGreaterThanOrEqual(1);
      result.current.products.forEach((p) => {
        expect(p.price).toBe(279);
      });
    });

    it('combines size + fabric + price filters (AND logic)', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.setFilters({
        sizes: ['full'],
        fabrics: ['Natural Linen'],
        priceRange: [100, 500],
      }));
      result.current.products.forEach((p) => {
        if (p.size) expect(p.size).toBe('full');
        expect(p.fabricOptions).toEqual(expect.arrayContaining(['Natural Linen']));
        expect(p.price).toBeGreaterThanOrEqual(100);
        expect(p.price).toBeLessThanOrEqual(500);
      });
    });

    it('returns empty array when no products match filters', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.setFilters({ sizes: [], fabrics: [], priceRange: [999999, 999999] }));
      expect(result.current.products).toEqual([]);
    });

    it('empty filters return all products (within page)', async () => {
      const { result } = await renderLoaded();
      const allCount = result.current.products.length;
      // Use a restrictive filter that will reduce results below page size
      act(() => result.current.setFilters({ sizes: [], fabrics: [], priceRange: [999999, 999999] }));
      expect(result.current.products.length).toBe(0);
      // Clear filters restores original count
      act(() => result.current.setFilters({ sizes: [], fabrics: [], priceRange: null }));
      expect(result.current.products.length).toBe(allCount);
    });

    it('resets pagination when filters change', async () => {
      const { result } = await renderLoaded();
      // Load more first
      act(() => {
        result.current.loadMore();
        jest.runAllTimers();
      });
      const pageCount = result.current.products.length;
      // Apply filter — should reset to page 1
      act(() => result.current.setFilters({ sizes: ['twin'], fabrics: [], priceRange: null }));
      expect(result.current.products.length).toBeLessThanOrEqual(8);
    });
  });

  describe('activeFilterCount', () => {
    it('counts 1 when only sizes are set', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.setFilters({ sizes: ['twin', 'queen'], fabrics: [], priceRange: null }));
      expect(result.current.activeFilterCount).toBe(1);
    });

    it('counts 1 when only fabrics are set', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.setFilters({ sizes: [], fabrics: ['Natural Linen'], priceRange: null }));
      expect(result.current.activeFilterCount).toBe(1);
    });

    it('counts 1 when only price range is set', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.setFilters({ sizes: [], fabrics: [], priceRange: [100, 500] }));
      expect(result.current.activeFilterCount).toBe(1);
    });

    it('counts 3 when all filter types are set', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.setFilters({ sizes: ['queen'], fabrics: ['Natural Linen'], priceRange: [100, 500] }));
      expect(result.current.activeFilterCount).toBe(3);
    });

    it('counts 0 when filters are cleared', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.setFilters({ sizes: ['queen'], fabrics: ['Natural Linen'], priceRange: [100, 500] }));
      expect(result.current.activeFilterCount).toBe(3);
      act(() => result.current.setFilters({ sizes: [], fabrics: [], priceRange: null }));
      expect(result.current.activeFilterCount).toBe(0);
    });
  });

  describe('availableFabrics', () => {
    it('returns sorted unique fabric names from all products', async () => {
      const { result } = await renderLoaded();
      expect(result.current.availableFabrics.length).toBeGreaterThan(0);
      // Should be sorted
      const sorted = [...result.current.availableFabrics].sort();
      expect(result.current.availableFabrics).toEqual(sorted);
      // Should be unique
      const unique = [...new Set(result.current.availableFabrics)];
      expect(result.current.availableFabrics).toEqual(unique);
    });
  });

  describe('priceExtent', () => {
    it('returns min and max prices from products', async () => {
      const { result } = await renderLoaded();
      const [min, max] = result.current.priceExtent;
      expect(min).toBeLessThan(max);
      expect(min).toBe(Math.floor(Math.min(...PRODUCTS.map((p) => p.price))));
      expect(max).toBe(Math.ceil(Math.max(...PRODUCTS.map((p) => p.price))));
    });
  });

  describe('fetchError', () => {
    it('starts with null fetchError', async () => {
      const { result } = await renderLoaded();
      expect(result.current.fetchError).toBeNull();
    });
  });
});
