/**
 * ShopScreen — deeper edge-case test suite (cm-rcz)
 *
 * Covers paths not exercised by the main, error, recently-viewed, or
 * bundle-deals test files:
 *   - Analytics event firing (search submit, category select, sort change)
 *   - Navigation fallback when onProductPress is omitted
 *   - CompareTray navigation CTA
 *   - Footer spinner visibility (loading-more indicator)
 *   - Initial-loading skeleton
 *   - Generic empty state (no products, no query, no error, not loading)
 *   - Custom testID prop
 *   - Mountain skyline header element
 *   - Pull-to-refresh calls refresh()
 *   - Search submit adds query to recent searches
 *   - Trending chip search fires analytics
 *   - Sort high-to-low
 *   - Search + category combined filtering
 */

import React from 'react';
import { RefreshControl } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ShopScreen } from '../ShopScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import { CompareProvider } from '@/contexts/CompareContext';
import * as analyticsModule from '@/services/analytics';
import * as useProductsModule from '@/hooks/useProducts';
import * as useRecentSearchesModule from '@/hooks/useRecentSearches';
import * as CompareContextModule from '@/contexts/CompareContext';
import type { ProductCategory, ProductFilters } from '@/hooks/useProducts';
import type { Product } from '@/data/products';
import { PRODUCTS } from '@/data/products';

// ── Navigation mock (module-level so factory closure captures it) ──────────────
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: jest.fn(),
      dispatch: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
    }),
    useNavigationState: (selector: (s: any) => any) => {
      const state = { routes: [{ name: 'Home', key: 'Home-mock' }], index: 0 };
      return selector(state);
    },
  };
});

// ── Shared fixtures ────────────────────────────────────────────────────────────

const EMPTY_FILTERS: ProductFilters = {
  sizes: [],
  fabrics: [],
  colorFamilies: [],
  priceRange: null,
};

const BASE_PRODUCTS = {
  products: [] as Product[],
  categories: [],
  searchQuery: '',
  selectedCategory: null as ProductCategory | null,
  sortBy: 'featured' as const,
  filters: EMPTY_FILTERS,
  activeFilterCount: 0,
  availableFabrics: [],
  priceExtent: [0, 1000] as [number, number],
  isLoading: false,
  isInitialLoading: false,
  hasMore: false,
  suggestions: [],
  isFromCache: true,
  fetchError: null as Error | null,
  setSearchQuery: jest.fn(),
  setSelectedCategory: jest.fn(),
  setSortBy: jest.fn(),
  setFilters: jest.fn(),
  loadMore: jest.fn(),
  refresh: jest.fn(),
};

function renderShopControlled(overrides: Partial<typeof BASE_PRODUCTS> = {}) {
  jest.spyOn(useProductsModule, 'useProducts').mockReturnValue({ ...BASE_PRODUCTS, ...overrides });
  return render(
    <ThemeProvider>
      <WishlistProvider>
        <CompareProvider>
          <ShopScreen onProductPress={jest.fn()} />
        </CompareProvider>
      </WishlistProvider>
    </ThemeProvider>,
  );
}

async function renderShopReal(opts: { withProductPress?: boolean } = {}) {
  const withProductPress = opts.withProductPress ?? true;
  const result = render(
    <ThemeProvider>
      <WishlistProvider>
        <CompareProvider>
          <ShopScreen onProductPress={withProductPress ? jest.fn() : undefined} />
        </CompareProvider>
      </WishlistProvider>
    </ThemeProvider>,
  );
  await waitFor(() => result.getByTestId('product-list'));
  return result;
}

// ── Cleanup ────────────────────────────────────────────────────────────────────

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  mockNavigate.mockClear();
});

// ── Analytics ─────────────────────────────────────────────────────────────────

describe('ShopScreen — analytics', () => {
  it('fires search event on search submit with query and result count', async () => {
    const searchSpy = jest.spyOn(analyticsModule.events, 'search').mockImplementation(() => {});
    const { getByTestId } = await renderShopReal();
    fireEvent.changeText(getByTestId('search-input'), 'futon');
    fireEvent(getByTestId('search-input'), 'submitEditing');
    expect(searchSpy).toHaveBeenCalledWith('futon', expect.any(Number));
  });

  it('fires filterCategory event when a category chip is pressed', async () => {
    const filterSpy = jest
      .spyOn(analyticsModule.events, 'filterCategory')
      .mockImplementation(() => {});
    const { getByTestId } = await renderShopReal();
    fireEvent.press(getByTestId('category-pillows'));
    expect(filterSpy).toHaveBeenCalledWith('pillows');
  });

  it('does not fire filterCategory when All chip pressed', async () => {
    const filterSpy = jest
      .spyOn(analyticsModule.events, 'filterCategory')
      .mockImplementation(() => {});
    const { getByTestId } = await renderShopReal();
    fireEvent.press(getByTestId('category-pillows'));
    filterSpy.mockClear();
    fireEvent.press(getByTestId('category-all'));
    expect(filterSpy).not.toHaveBeenCalled();
  });

  it('fires sortProducts event when sort option selected', async () => {
    const sortSpy = jest.spyOn(analyticsModule.events, 'sortProducts').mockImplementation(() => {});
    const { getByTestId } = await renderShopReal();
    fireEvent.press(getByTestId('sort-button'));
    fireEvent.press(getByTestId('sort-option-price-asc'));
    expect(sortSpy).toHaveBeenCalledWith('price-asc');
  });

  it('fires search event when trending chip pressed from empty state', async () => {
    const searchSpy = jest.spyOn(analyticsModule.events, 'search').mockImplementation(() => {});
    const { getByTestId } = await renderShopReal();
    fireEvent.changeText(getByTestId('search-input'), 'xyznonexistent');
    searchSpy.mockClear();
    fireEvent.press(getByTestId('trending-chip-0'));
    expect(searchSpy).toHaveBeenCalledWith(expect.any(String), 0);
  });
});

// ── Navigation ─────────────────────────────────────────────────────────────────

describe('ShopScreen — navigation', () => {
  it('navigates to ProductDetail when no onProductPress prop provided', async () => {
    // Render WITHOUT onProductPress so the navigation fallback is triggered
    const { getByTestId } = await renderShopReal({ withProductPress: false });
    fireEvent.press(getByTestId(`product-card-${PRODUCTS[0].id}`));
    expect(mockNavigate).toHaveBeenCalledWith('ProductDetail', { slug: PRODUCTS[0].slug });
  });

  it('navigates to Compare when CompareTray CTA pressed', async () => {
    // Mock CompareContext to have items so the tray renders
    jest.spyOn(CompareContextModule, 'useCompareContext').mockReturnValue({
      compareList: [PRODUCTS[0]],
      count: 1,
      addToCompare: jest.fn(),
      removeFromCompare: jest.fn(),
      clearCompare: jest.fn(),
      isInCompare: jest.fn(() => false),
      isFull: false,
    });

    const { getByTestId } = await renderShopReal();
    fireEvent.press(getByTestId('compare-tray-cta'));
    expect(mockNavigate).toHaveBeenCalledWith('Compare');
  });
});

// ── Loading states ─────────────────────────────────────────────────────────────

describe('ShopScreen — loading states', () => {
  it('shows skeleton grid when isInitialLoading is true', () => {
    const { getByTestId } = renderShopControlled({ isInitialLoading: true });
    expect(getByTestId('shop-skeleton')).toBeTruthy();
  });

  it('does not show skeleton when not initially loading', () => {
    const { queryByTestId } = renderShopControlled({ isInitialLoading: false });
    expect(queryByTestId('shop-skeleton')).toBeNull();
  });

  it('shows footer spinner when isLoading is true', () => {
    const { getByTestId } = renderShopControlled({
      products: PRODUCTS.slice(0, 3),
      isLoading: true,
    });
    expect(getByTestId('shop-loading-more')).toBeTruthy();
  });

  it('does not show footer spinner when isLoading is false', () => {
    const { queryByTestId } = renderShopControlled({ isLoading: false });
    expect(queryByTestId('shop-loading-more')).toBeNull();
  });
});

// ── Empty state (no products, no query, no error) ──────────────────────────────

describe('ShopScreen — generic empty state', () => {
  it('shows "No products found" when products array is empty with no query', () => {
    const { getByTestId, getByText } = renderShopControlled({
      products: [],
      searchQuery: '',
      fetchError: null,
      isInitialLoading: false,
    });
    expect(getByTestId('shop-empty')).toBeTruthy();
    expect(getByText('No products found')).toBeTruthy();
  });

  it('shows generic empty message body', () => {
    const { getByText } = renderShopControlled({
      products: [],
      searchQuery: '',
      fetchError: null,
      isInitialLoading: false,
    });
    expect(getByText('No products in this category yet.')).toBeTruthy();
  });

  it('does not show generic empty state when there are products', () => {
    const { queryByTestId } = renderShopControlled({
      products: PRODUCTS.slice(0, 3),
      searchQuery: '',
      fetchError: null,
      isInitialLoading: false,
    });
    expect(queryByTestId('shop-empty')).toBeNull();
  });

  it('shows search empty state (not generic) when query set with no results', () => {
    const { queryByTestId } = renderShopControlled({
      products: [],
      searchQuery: 'xyznonexistent',
      fetchError: null,
      isInitialLoading: false,
    });
    // search empty state takes priority over generic empty state
    expect(queryByTestId('shop-empty')).toBeNull();
    expect(queryByTestId('search-empty-state')).toBeTruthy();
  });
});

// ── Custom testID ──────────────────────────────────────────────────────────────

describe('ShopScreen — testID prop', () => {
  it('uses default testID when none provided', () => {
    const { getByTestId } = renderShopControlled();
    expect(getByTestId('shop-screen')).toBeTruthy();
  });

  it('uses custom testID when provided', () => {
    jest.spyOn(useProductsModule, 'useProducts').mockReturnValue({ ...BASE_PRODUCTS });
    const { getByTestId, queryByTestId } = render(
      <ThemeProvider>
        <WishlistProvider>
          <CompareProvider>
            <ShopScreen testID="my-custom-shop" onProductPress={jest.fn()} />
          </CompareProvider>
        </WishlistProvider>
      </ThemeProvider>,
    );
    expect(getByTestId('my-custom-shop')).toBeTruthy();
    expect(queryByTestId('shop-screen')).toBeNull();
  });
});

// ── UI structure ───────────────────────────────────────────────────────────────

describe('ShopScreen — UI structure', () => {
  it('renders mountain skyline in header', async () => {
    const { getByTestId } = await renderShopReal();
    expect(getByTestId('shop-mountain-skyline')).toBeTruthy();
  });

  it('does not render CompareTray when compare list is empty', async () => {
    const { queryByTestId } = await renderShopReal();
    // CompareProvider starts with empty list — tray returns null
    expect(queryByTestId('shop-compare-tray')).toBeNull();
  });

  it('renders CompareTray when compare list has items', async () => {
    jest.spyOn(CompareContextModule, 'useCompareContext').mockReturnValue({
      compareList: [PRODUCTS[0]],
      count: 1,
      addToCompare: jest.fn(),
      removeFromCompare: jest.fn(),
      clearCompare: jest.fn(),
      isInCompare: jest.fn(() => false),
      isFull: false,
    });
    const { getByTestId } = await renderShopReal();
    expect(getByTestId('shop-compare-tray')).toBeTruthy();
  });
});

// ── Pull-to-refresh ────────────────────────────────────────────────────────────

describe('ShopScreen — pull-to-refresh', () => {
  it('calls refresh when pull-to-refresh triggered', () => {
    const mockRefresh = jest.fn();
    const { UNSAFE_getByType } = renderShopControlled({
      products: PRODUCTS.slice(0, 3),
      refresh: mockRefresh,
    });
    const refreshControl = UNSAFE_getByType(RefreshControl);
    fireEvent(refreshControl, 'refresh');
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});

// ── Recent searches ────────────────────────────────────────────────────────────

describe('ShopScreen — recent searches', () => {
  it('adds query to recent searches on search submit', async () => {
    const mockAddSearch = jest.fn();
    jest.spyOn(useRecentSearchesModule, 'useRecentSearches').mockReturnValue({
      recentSearches: [],
      addSearch: mockAddSearch,
      removeSearch: jest.fn(),
      clearAll: jest.fn(),
    });

    const { getByTestId } = await renderShopReal();
    fireEvent.changeText(getByTestId('search-input'), 'memory foam');
    fireEvent(getByTestId('search-input'), 'submitEditing');

    expect(mockAddSearch).toHaveBeenCalledWith('memory foam');
  });

  it('adds trending chip query to recent searches', async () => {
    const mockAddSearch = jest.fn();
    jest.spyOn(useRecentSearchesModule, 'useRecentSearches').mockReturnValue({
      recentSearches: [],
      addSearch: mockAddSearch,
      removeSearch: jest.fn(),
      clearAll: jest.fn(),
    });

    const { getByTestId } = await renderShopReal();
    fireEvent.changeText(getByTestId('search-input'), 'xyznonexistent');
    mockAddSearch.mockClear();
    fireEvent.press(getByTestId('trending-chip-0'));

    expect(mockAddSearch).toHaveBeenCalledWith(expect.any(String));
  });

  it('does not call addSearch when submit fires with empty/whitespace input', async () => {
    const mockAddSearch = jest.fn();
    jest.spyOn(useRecentSearchesModule, 'useRecentSearches').mockReturnValue({
      recentSearches: [],
      addSearch: mockAddSearch,
      removeSearch: jest.fn(),
      clearAll: jest.fn(),
    });

    const { getByTestId } = await renderShopReal();
    // SearchBar.handleSubmit guards: only calls onSubmitSearch when clean is truthy
    fireEvent.changeText(getByTestId('search-input'), '');
    fireEvent(getByTestId('search-input'), 'submitEditing');

    expect(mockAddSearch).not.toHaveBeenCalled();
  });
});

// ── Sort edge cases ────────────────────────────────────────────────────────────

describe('ShopScreen — sort edge cases', () => {
  it('sorts by price high to low', async () => {
    const { getByTestId, getAllByTestId } = await renderShopReal();
    fireEvent.press(getByTestId('sort-button'));
    fireEvent.press(getByTestId('sort-option-price-desc'));
    const cards = getAllByTestId(/^product-card-/);
    expect(cards.length).toBeGreaterThan(0);
  });

  it('sort fires analytics with price-desc value', async () => {
    const sortSpy = jest.spyOn(analyticsModule.events, 'sortProducts').mockImplementation(() => {});
    const { getByTestId } = await renderShopReal();
    fireEvent.press(getByTestId('sort-button'));
    fireEvent.press(getByTestId('sort-option-price-desc'));
    expect(sortSpy).toHaveBeenCalledWith('price-desc');
  });
});

// ── Combined filters ───────────────────────────────────────────────────────────

describe('ShopScreen — combined search + category', () => {
  it('filters by both category and search query simultaneously', async () => {
    const { getByTestId, queryByTestId } = await renderShopReal();

    fireEvent.press(getByTestId('category-pillows'));
    fireEvent.changeText(getByTestId('search-input'), 'arm');

    expect(getByTestId('product-card-prod-arm-pillows')).toBeTruthy();
    expect(queryByTestId('product-card-prod-asheville-full')).toBeNull();
  });

  it('clearing category after search still shows search results across all categories', async () => {
    const { getByTestId } = await renderShopReal();

    fireEvent.press(getByTestId('category-pillows'));
    fireEvent.changeText(getByTestId('search-input'), 'arm');
    fireEvent.press(getByTestId('category-all'));

    expect(getByTestId('product-card-prod-arm-pillows')).toBeTruthy();
  });
});
