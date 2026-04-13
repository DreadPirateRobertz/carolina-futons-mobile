/**
 * TDD tests for SearchScreen error recovery — cm-vjz
 *
 * When a search query is active and useProducts returns a fetchError,
 * SearchScreen must show NetworkErrorState (not SearchEmptyState).
 * The retry button must call refresh().
 */
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
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

const mockRefresh = jest.fn();
const mockUseProducts = jest.fn();
jest.mock('@/hooks/useProducts', () => ({
  ...jest.requireActual('@/hooks/useProducts'),
  useProducts: () => mockUseProducts(),
}));

jest.useFakeTimers();
afterAll(() => jest.useRealTimers());

const BASE_STATE = {
  products: [],
  categories: [],
  searchQuery: 'futon',
  selectedCategory: null,
  sortBy: 'featured' as const,
  isLoading: false,
  isInitialLoading: false,
  suggestions: [],
  fetchError: null,
  setSearchQuery: jest.fn(),
  setSelectedCategory: jest.fn(),
  setSortBy: jest.fn(),
  loadMore: jest.fn(),
  refresh: mockRefresh,
  hasMore: false,
};

function renderSearch() {
  return render(
    <ThemeProvider>
      <WishlistProvider>
        <SearchScreen />
      </WishlistProvider>
    </ThemeProvider>,
  );
}

describe('SearchScreen — error recovery (cm-vjz)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows NetworkErrorState when fetchError is set and search query is active', async () => {
    mockUseProducts.mockReturnValue({
      ...BASE_STATE,
      fetchError: new Error('Network request failed'),
    });
    const { getByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(getByTestId('network-error-state')).toBeTruthy();
  });

  it('does not show SearchEmptyState when fetchError is set', async () => {
    mockUseProducts.mockReturnValue({
      ...BASE_STATE,
      fetchError: new Error('Network request failed'),
    });
    const { queryByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(queryByTestId('search-empty-state')).toBeNull();
  });

  it('does not show skeleton when fetchError is set (error takes priority)', async () => {
    mockUseProducts.mockReturnValue({
      ...BASE_STATE,
      isLoading: false,
      fetchError: new Error('Network request failed'),
    });
    const { queryByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(queryByTestId('skeleton-product-grid')).toBeNull();
  });

  it('calls refresh when retry button is pressed', async () => {
    mockUseProducts.mockReturnValue({
      ...BASE_STATE,
      fetchError: new Error('Network request failed'),
    });
    const { getByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    fireEvent.press(getByTestId('network-error-retry'));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('does not show NetworkErrorState when no search query is active', async () => {
    mockUseProducts.mockReturnValue({
      ...BASE_STATE,
      searchQuery: '',
      fetchError: new Error('Network request failed'),
    });
    const { queryByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(queryByTestId('network-error-state')).toBeNull();
  });

  it('shows results grid (not error) when no fetchError', async () => {
    mockUseProducts.mockReturnValue({
      ...BASE_STATE,
      fetchError: null,
    });
    const { queryByTestId, getByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(queryByTestId('network-error-state')).toBeNull();
    expect(getByTestId('search-results-grid')).toBeTruthy();
  });
});
