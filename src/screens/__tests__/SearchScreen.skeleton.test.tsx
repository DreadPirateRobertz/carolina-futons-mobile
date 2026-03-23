/**
 * TDD tests for SearchScreen skeleton loading state — cm-3l5
 *
 * When a search query is active and results are loading, a skeleton grid
 * should render in place of the empty/error state.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { SearchScreen } from '../SearchScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => null,
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/services/analytics', () => ({
  events: {
    search: jest.fn(),
    screenView: jest.fn(),
    filterCategory: jest.fn(),
    sortProducts: jest.fn(),
  },
}));

const mockUseProducts = jest.fn();
jest.mock('@/hooks/useProducts', () => ({
  ...jest.requireActual('@/hooks/useProducts'),
  useProducts: () => mockUseProducts(),
}));

jest.useFakeTimers();
afterAll(() => jest.useRealTimers());

function renderSearchScreen() {
  return render(
    <ThemeProvider>
      <WishlistProvider>
        <SearchScreen />
      </WishlistProvider>
    </ThemeProvider>,
  );
}

const BASE_PRODUCTS_STATE = {
  products: [],
  categories: [],
  searchQuery: 'futon',
  selectedCategory: null,
  sortBy: 'featured',
  isLoading: false,
  isInitialLoading: false,
  suggestions: [],
  setSearchQuery: jest.fn(),
  setSelectedCategory: jest.fn(),
  setSortBy: jest.fn(),
  loadMore: jest.fn(),
  refresh: jest.fn(),
};

describe('SearchScreen — skeleton loading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows skeleton grid when search query is set and results are loading', async () => {
    mockUseProducts.mockReturnValue({
      ...BASE_PRODUCTS_STATE,
      isLoading: true,
      isInitialLoading: true,
    });
    const { getByTestId } = renderSearchScreen();
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(getByTestId('skeleton-product-grid')).toBeTruthy();
  });

  it('does not show skeleton when there is no search query', async () => {
    mockUseProducts.mockReturnValue({
      ...BASE_PRODUCTS_STATE,
      searchQuery: '',
      isLoading: true,
      isInitialLoading: true,
    });
    const { queryByTestId } = renderSearchScreen();
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(queryByTestId('skeleton-product-grid')).toBeNull();
  });

  it('does not show skeleton when loading is false (shows results/empty)', async () => {
    mockUseProducts.mockReturnValue({
      ...BASE_PRODUCTS_STATE,
      isLoading: false,
      isInitialLoading: false,
    });
    const { queryByTestId } = renderSearchScreen();
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(queryByTestId('skeleton-product-grid')).toBeNull();
  });
});
