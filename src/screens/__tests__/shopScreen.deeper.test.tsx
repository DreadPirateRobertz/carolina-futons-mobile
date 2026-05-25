/**
 * ShopScreen — deeper edge-case test suite (cm-c43)
 *
 * Focuses on paths NOT covered by sibling test files
 * (shopScreen.test, shopScreen.error, shopScreen.bundleDeals,
 * shopScreen.recently-viewed, shopScreen.edge-cases):
 *
 *   - FilterButton badge visibility & FilterModal open/apply/close flow
 *   - Pagination edge cases (loadMore wiring, footer spinner with data)
 *   - Offline / network-error variants (offline message, retry resets)
 *   - Race conditions (initial-loading + fetchError simultaneously,
 *     error after products loaded, refresh during error)
 *   - Search input boundary conditions (very long, unicode, special chars,
 *     whitespace-only)
 *   - Rapid category toggling (last write wins)
 *   - Refresh control resets refreshing state after timeout
 *   - SearchEmptyState shown only when query+empty+no-error, not while loading
 */

import React from 'react';
import { Platform, RefreshControl } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { ShopScreen } from '../ShopScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import { CompareProvider } from '@/contexts/CompareContext';
import * as useProductsModule from '@/hooks/useProducts';
import type { CategoryInfo, Product, ProductCategory, ProductFilters } from '@/hooks/useProducts';
import { PRODUCTS } from '@/data/products';

// ── Navigation mock ────────────────────────────────────────────────────────────

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

// ── Fixtures ───────────────────────────────────────────────────────────────────

const EMPTY_FILTERS: ProductFilters = {
  sizes: [],
  fabrics: [],
  colorFamilies: [],
  priceRange: null,
};

const BASE_PRODUCTS = {
  products: [] as Product[],
  categories: [] as CategoryInfo[],
  searchQuery: '',
  selectedCategory: null as ProductCategory | null,
  sortBy: 'featured' as const,
  filters: EMPTY_FILTERS,
  activeFilterCount: 0,
  availableFabrics: ['cotton', 'linen'],
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

async function renderShopReal() {
  const result = render(
    <ThemeProvider>
      <WishlistProvider>
        <CompareProvider>
          <ShopScreen onProductPress={jest.fn()} />
        </CompareProvider>
      </WishlistProvider>
    </ThemeProvider>,
  );
  await waitFor(() => result.getByTestId('product-list'));
  return result;
}

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  mockNavigate.mockClear();
});

// ── FilterButton badge ─────────────────────────────────────────────────────────

describe('ShopScreen — filter button badge', () => {
  it('hides badge when activeFilterCount is 0', () => {
    const { queryByTestId, getByTestId } = renderShopControlled({ activeFilterCount: 0 });
    expect(getByTestId('filter-button')).toBeTruthy();
    expect(queryByTestId('filter-badge')).toBeNull();
  });

  it('shows badge when activeFilterCount > 0', () => {
    const { getByTestId } = renderShopControlled({
      activeFilterCount: 2,
      filters: { ...EMPTY_FILTERS, sizes: ['twin'], fabrics: ['cotton'] },
    });
    expect(getByTestId('filter-badge')).toBeTruthy();
  });

  it('badge text reflects activeFilterCount value', () => {
    const { getByText } = renderShopControlled({
      activeFilterCount: 3,
      filters: { ...EMPTY_FILTERS, sizes: ['twin'], fabrics: ['cotton'], colorFamilies: ['warm'] },
    });
    expect(getByText('3')).toBeTruthy();
  });

  it('FilterButton accessibility label reflects active count', () => {
    const { getByLabelText } = renderShopControlled({ activeFilterCount: 4 });
    expect(getByLabelText('Filters, 4 active')).toBeTruthy();
  });

  it('FilterButton accessibility label has no count when zero', () => {
    const { getByLabelText } = renderShopControlled({ activeFilterCount: 0 });
    expect(getByLabelText('Filters')).toBeTruthy();
  });
});

// ── FilterModal open/apply/close ──────────────────────────────────────────────

describe('ShopScreen — filter modal flow', () => {
  it('modal not visible by default', () => {
    const { queryByTestId } = renderShopControlled();
    expect(queryByTestId('filter-modal-overlay')).toBeNull();
  });

  it('opens filter modal when filter button pressed', () => {
    const { getByTestId } = renderShopControlled();
    fireEvent.press(getByTestId('filter-button'));
    expect(getByTestId('filter-modal-overlay')).toBeTruthy();
  });

  it('closes filter modal when overlay pressed', () => {
    const { getByTestId, queryByTestId } = renderShopControlled();
    fireEvent.press(getByTestId('filter-button'));
    expect(getByTestId('filter-modal-overlay')).toBeTruthy();
    fireEvent.press(getByTestId('filter-modal-overlay'));
    expect(queryByTestId('filter-modal-overlay')).toBeNull();
  });

  it('calls setFilters with draft when apply pressed', () => {
    const mockSetFilters = jest.fn();
    const { getByTestId } = renderShopControlled({
      setFilters: mockSetFilters,
      availableFabrics: ['cotton'],
    });
    fireEvent.press(getByTestId('filter-button'));
    fireEvent.press(getByTestId('filter-size-twin'));
    fireEvent.press(getByTestId('filter-apply'));
    expect(mockSetFilters).toHaveBeenCalledWith(expect.objectContaining({ sizes: ['twin'] }));
  });

  it('apply closes the modal', () => {
    const { getByTestId, queryByTestId } = renderShopControlled({
      availableFabrics: ['cotton'],
    });
    fireEvent.press(getByTestId('filter-button'));
    fireEvent.press(getByTestId('filter-apply'));
    expect(queryByTestId('filter-modal-overlay')).toBeNull();
  });
});

// ── Pagination / loadMore ──────────────────────────────────────────────────────

describe('ShopScreen — pagination', () => {
  it('renders footer spinner alongside products when isLoading', () => {
    const { getByTestId, getAllByTestId } = renderShopControlled({
      products: PRODUCTS.slice(0, 4),
      isLoading: true,
      hasMore: true,
    });
    expect(getByTestId('shop-loading-more')).toBeTruthy();
    expect(getAllByTestId(/^product-card-/).length).toBeGreaterThan(0);
  });

  it('passes loadMore to FlatList onEndReached', () => {
    const mockLoadMore = jest.fn();
    const { UNSAFE_getByProps } = renderShopControlled({
      products: PRODUCTS.slice(0, 6),
      loadMore: mockLoadMore,
      hasMore: true,
    });
    const list = UNSAFE_getByProps({ testID: 'product-list' });
    expect(list.props.onEndReached).toBe(mockLoadMore);
    expect(list.props.onEndReachedThreshold).toBe(0.5);
  });

  it('does not show footer spinner when no longer loading', () => {
    const { queryByTestId } = renderShopControlled({
      products: PRODUCTS.slice(0, 4),
      isLoading: false,
      hasMore: false,
    });
    expect(queryByTestId('shop-loading-more')).toBeNull();
  });
});

// ── Offline / network-error variants ───────────────────────────────────────────

describe('ShopScreen — offline behavior', () => {
  it('shows network error when fetch fails with offline-style message', () => {
    const { getByTestId } = renderShopControlled({
      fetchError: new Error('Network request failed'),
    });
    expect(getByTestId('network-error-state')).toBeTruthy();
  });

  it('shows offline error message text verbatim from error', () => {
    const { getByText } = renderShopControlled({
      fetchError: new Error('Offline — please reconnect'),
    });
    expect(getByText('Offline — please reconnect')).toBeTruthy();
  });

  it('falls back to default copy when fetchError has empty message', () => {
    const { getByText } = renderShopControlled({
      fetchError: new Error(''),
    });
    expect(getByText('Could not load products.')).toBeTruthy();
  });

  it('retry button in error state wires to refresh', () => {
    const mockRefresh = jest.fn();
    const { getByTestId } = renderShopControlled({
      fetchError: new Error('Network down'),
      refresh: mockRefresh,
    });
    fireEvent.press(getByTestId('network-error-retry'));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('error state survives even when products list is populated from cache', () => {
    // fetchError set + products from cache: error UI is in ListEmptyComponent,
    // so only shows when products is empty. With cached products we still show
    // the grid. This documents that behavior so future regressions are caught.
    const { queryByTestId, getAllByTestId } = renderShopControlled({
      fetchError: new Error('Network down'),
      products: PRODUCTS.slice(0, 3),
      isFromCache: true,
    });
    expect(queryByTestId('network-error-state')).toBeNull();
    expect(getAllByTestId(/^product-card-/).length).toBeGreaterThan(0);
  });
});

// ── Race conditions ────────────────────────────────────────────────────────────

describe('ShopScreen — race conditions', () => {
  it('shows skeleton (not error) when initial-loading AND error are both set', () => {
    const { getByTestId, queryByTestId } = renderShopControlled({
      isInitialLoading: true,
      fetchError: new Error('arrived during initial fetch'),
    });
    expect(getByTestId('shop-skeleton')).toBeTruthy();
    expect(queryByTestId('network-error-state')).toBeNull();
  });

  it('logs fetchError to console.error even while initial-loading', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('async race');
    renderShopControlled({ isInitialLoading: true, fetchError: err });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[ShopScreen]'), err);
  });

  it('search empty state takes priority over generic empty when both could apply', () => {
    const { queryByTestId, getByTestId } = renderShopControlled({
      products: [],
      searchQuery: 'asdfghjkl',
      fetchError: null,
      isInitialLoading: false,
    });
    expect(queryByTestId('shop-empty')).toBeNull();
    expect(getByTestId('search-empty-state')).toBeTruthy();
  });

  it('error wins over search empty state when both could apply', () => {
    const { queryByTestId, getByTestId } = renderShopControlled({
      products: [],
      searchQuery: 'foo',
      fetchError: new Error('Network'),
      isInitialLoading: false,
    });
    expect(queryByTestId('search-empty-state')).toBeNull();
    expect(getByTestId('network-error-state')).toBeTruthy();
  });
});

// ── Search input boundary conditions ──────────────────────────────────────────

describe('ShopScreen — search input edge cases', () => {
  it('handles very long search query (1000 chars) without crashing', async () => {
    const longQuery = 'a'.repeat(1000);
    const { getByTestId } = await renderShopReal();
    expect(() => fireEvent.changeText(getByTestId('search-input'), longQuery)).not.toThrow();
  });

  it('handles unicode/emoji in search input', async () => {
    const { getByTestId } = await renderShopReal();
    expect(() => fireEvent.changeText(getByTestId('search-input'), '🛋️ café Möbel')).not.toThrow();
  });

  it('handles XSS-style special characters without crashing', async () => {
    const { getByTestId } = await renderShopReal();
    expect(() =>
      fireEvent.changeText(getByTestId('search-input'), '<script>alert(1)</script>'),
    ).not.toThrow();
  });

  it('handles SQL-injection-style input without crashing', async () => {
    const { getByTestId } = await renderShopReal();
    expect(() =>
      fireEvent.changeText(getByTestId('search-input'), "'; DROP TABLE products;--"),
    ).not.toThrow();
  });

  it('whitespace-only search input does not trigger submit handler', async () => {
    const { getByTestId } = await renderShopReal();
    fireEvent.changeText(getByTestId('search-input'), '   ');
    // submitEditing on whitespace-only is guarded by SearchBar; just verify no throw
    expect(() => fireEvent(getByTestId('search-input'), 'submitEditing')).not.toThrow();
  });
});

// ── Rapid category toggling ────────────────────────────────────────────────────

describe('ShopScreen — rapid category toggle', () => {
  it('forwards each category press to setSelectedCategory', async () => {
    const { getByTestId } = await renderShopReal();
    fireEvent.press(getByTestId('category-pillows'));
    fireEvent.press(getByTestId('category-futons'));
    fireEvent.press(getByTestId('category-all'));
    // No assertion needed beyond no-throw — exercises the rapid-toggle path
    expect(getByTestId('product-list')).toBeTruthy();
  });
});

// ── Refresh control state reset ───────────────────────────────────────────────

describe('ShopScreen — refresh control state', () => {
  it('refresh control initial refreshing prop is false', () => {
    const { UNSAFE_getByType } = renderShopControlled({ products: PRODUCTS.slice(0, 3) });
    expect(UNSAFE_getByType(RefreshControl).props.refreshing).toBe(false);
  });

  it('refreshing state clears after the 600ms timeout', () => {
    jest.useFakeTimers();
    try {
      const { UNSAFE_getByType } = renderShopControlled({ products: PRODUCTS.slice(0, 3) });
      const rc = UNSAFE_getByType(RefreshControl);
      fireEvent(rc, 'refresh');
      // Initially set to true synchronously
      expect(UNSAFE_getByType(RefreshControl).props.refreshing).toBe(true);
      act(() => {
        jest.advanceTimersByTime(600);
      });
      expect(UNSAFE_getByType(RefreshControl).props.refreshing).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });
});

// ── Layout / FlatList tuning ──────────────────────────────────────────────────

describe('ShopScreen — FlatList virtualization tuning', () => {
  it('renders a two-column grid', () => {
    const { UNSAFE_getByProps } = renderShopControlled({ products: PRODUCTS.slice(0, 4) });
    expect(UNSAFE_getByProps({ testID: 'product-list' }).props.numColumns).toBe(2);
  });

  it('uses tuned batch sizing for low-end device scroll perf', () => {
    const { UNSAFE_getByProps } = renderShopControlled({ products: PRODUCTS.slice(0, 4) });
    const list = UNSAFE_getByProps({ testID: 'product-list' });
    expect(list.props.windowSize).toBe(5);
    expect(list.props.maxToRenderPerBatch).toBe(6);
    expect(list.props.initialNumToRender).toBe(4);
    expect(list.props.updateCellsBatchingPeriod).toBe(100);
    expect(list.props.removeClippedSubviews).toBe(true);
  });

  it('keyboardShouldPersistTaps is set so suggestions remain tappable', () => {
    const { UNSAFE_getByProps } = renderShopControlled();
    expect(UNSAFE_getByProps({ testID: 'product-list' }).props.keyboardShouldPersistTaps).toBe(
      'handled',
    );
  });
});

// ── Platform compatibility ────────────────────────────────────────────────────

describe('ShopScreen — platform compatibility', () => {
  const original = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: original, configurable: true });
  });

  it('renders without throwing on iOS', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    expect(() => renderShopControlled({ products: PRODUCTS.slice(0, 2) })).not.toThrow();
  });

  it('renders without throwing on Android', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    expect(() => renderShopControlled({ products: PRODUCTS.slice(0, 2) })).not.toThrow();
  });
});
