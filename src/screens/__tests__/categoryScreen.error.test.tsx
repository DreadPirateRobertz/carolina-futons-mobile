/**
 * CategoryScreen — error recovery
 *
 * Tests for the isLoading → skeleton and fetchError → NetworkErrorState → retry cycle.
 * Kept separate from CategoryScreen.test.tsx which uses real hook data.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CategoryScreen } from '../CategoryScreen';
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

function renderCategory() {
  return render(
    <ThemeProvider>
      <WishlistProvider>
        <CompareProvider>
          <CategoryScreen onProductPress={jest.fn()} onBack={jest.fn()} />
        </CompareProvider>
      </WishlistProvider>
    </ThemeProvider>,
  );
}

describe('CategoryScreen — error recovery', () => {
  let spy: jest.SpyInstance;

  beforeEach(() => {
    spy = jest.spyOn(useProductsModule, 'useProducts').mockReturnValue(BASE);
  });

  afterEach(() => {
    spy.mockRestore();
    jest.clearAllMocks();
  });

  describe('skeleton loading', () => {
    it('shows skeleton when isInitialLoading is true', () => {
      spy.mockReturnValue({ ...BASE, isInitialLoading: true });
      const { getByTestId } = renderCategory();
      expect(getByTestId('skeleton-category-grid')).toBeTruthy();
    });

    it('does not show skeleton when not loading', () => {
      spy.mockReturnValue({ ...BASE, isInitialLoading: false });
      const { queryByTestId } = renderCategory();
      expect(queryByTestId('skeleton-category-grid')).toBeNull();
    });
  });

  describe('error state', () => {
    it('shows error state when fetchError is set and not loading', () => {
      spy.mockReturnValue({
        ...BASE,
        fetchError: new Error('Wix catalog unavailable'),
      });
      const { getByTestId } = renderCategory();
      expect(getByTestId('network-error-state')).toBeTruthy();
    });

    it('shows retry button when fetchError is set', () => {
      spy.mockReturnValue({
        ...BASE,
        fetchError: new Error('Network timeout'),
      });
      const { getByTestId } = renderCategory();
      expect(getByTestId('network-error-retry')).toBeTruthy();
    });

    it('calls refresh when retry button is pressed', () => {
      const mockRefresh = jest.fn();
      spy.mockReturnValue({
        ...BASE,
        fetchError: new Error('Network timeout'),
        refresh: mockRefresh,
      });
      const { getByTestId } = renderCategory();
      fireEvent.press(getByTestId('network-error-retry'));
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('shows skeleton not error while initially loading even if fetchError set', () => {
      spy.mockReturnValue({
        ...BASE,
        isInitialLoading: true,
        fetchError: new Error('race condition'),
      });
      const { queryByTestId, getByTestId } = renderCategory();
      expect(queryByTestId('network-error-state')).toBeNull();
      expect(getByTestId('skeleton-category-grid')).toBeTruthy();
    });

    it('does not show error state when fetchError is null', () => {
      spy.mockReturnValue({ ...BASE, fetchError: null });
      const { queryByTestId } = renderCategory();
      expect(queryByTestId('network-error-state')).toBeNull();
    });
  });
});
