/**
 * ShopScreen — error recovery
 *
 * Tests for the fetchError → NetworkErrorState → retry cycle.
 * Kept in a separate file so the real-data ShopScreen.test.tsx is unaffected.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ShopScreen } from '../ShopScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import { CompareProvider } from '@/contexts/CompareContext';
import * as useProductsModule from '@/hooks/useProducts';
import type { ProductCategory, ProductFilters } from '@/hooks/useProducts';

const EMPTY_FILTERS: ProductFilters = {
  sizes: [],
  fabrics: [],
  colorFamilies: [],
  priceRange: null,
};

const BASE = {
  products: [],
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

function renderShopError() {
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

describe('ShopScreen — error recovery', () => {
  let spy: jest.SpyInstance;

  beforeEach(() => {
    spy = jest.spyOn(useProductsModule, 'useProducts').mockReturnValue(BASE);
  });

  afterEach(() => {
    spy.mockRestore();
    jest.clearAllMocks();
  });

  it('shows error state when fetchError is set and not loading', () => {
    spy.mockReturnValue({
      ...BASE,
      fetchError: new Error('Wix catalog unavailable'),
    });
    const { getByTestId } = renderShopError();
    expect(getByTestId('network-error-state')).toBeTruthy();
  });

  it('shows retry button when fetchError is set', () => {
    spy.mockReturnValue({
      ...BASE,
      fetchError: new Error('Network timeout'),
    });
    const { getByTestId } = renderShopError();
    expect(getByTestId('network-error-retry')).toBeTruthy();
  });

  it('calls refresh when retry button is pressed', () => {
    const mockRefresh = jest.fn();
    spy.mockReturnValue({
      ...BASE,
      fetchError: new Error('Network timeout'),
      refresh: mockRefresh,
    });
    const { getByTestId } = renderShopError();
    fireEvent.press(getByTestId('network-error-retry'));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('shows skeleton not error while initially loading', () => {
    spy.mockReturnValue({
      ...BASE,
      isInitialLoading: true,
      fetchError: new Error('race condition — error before load complete'),
    });
    const { queryByTestId } = renderShopError();
    expect(queryByTestId('network-error-state')).toBeNull();
  });

  it('does not show error state when fetchError is null', () => {
    spy.mockReturnValue({ ...BASE, fetchError: null });
    const { queryByTestId } = renderShopError();
    expect(queryByTestId('network-error-state')).toBeNull();
  });

  it('shows error message from fetchError', () => {
    spy.mockReturnValue({
      ...BASE,
      fetchError: new Error('Service unavailable'),
    });
    const { getByText } = renderShopError();
    expect(getByText('Service unavailable')).toBeTruthy();
  });

  it('logs fetchError to console.error with screen prefix', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('Wix timeout');
    spy.mockReturnValue({ ...BASE, fetchError: error });
    renderShopError();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[ShopScreen]'), error);
    consoleSpy.mockRestore();
  });

  it('does not show product list or skeleton when error', () => {
    spy.mockReturnValue({
      ...BASE,
      fetchError: new Error('Network error'),
    });
    const { queryByTestId } = renderShopError();
    expect(queryByTestId('product-list')).toBeNull();
    expect(queryByTestId('shop-skeleton')).toBeNull();
  });
});
