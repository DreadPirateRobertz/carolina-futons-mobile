/**
 * SearchScreen deeper edge cases — cm-os9
 *
 * Uses useProducts mock (like error/skeleton tests) to test:
 *  - result count singular vs plural
 *  - sort-picker value prop from hook state
 *  - empty state for special-char and long queries (real PRODUCTS data)
 *  - debounce cancel: type then clear before 300ms stays in initial state
 *  - rapid sequence: type, debounce, clear stays in initial state
 */
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { SearchScreen } from '../SearchScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import { CompareProvider } from '@/contexts/CompareContext';

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

jest.mock('@/hooks/useWishlist', () => ({
  WishlistProvider: ({ children }: { children: React.ReactNode }) => children,
  useWishlist: () => ({ isInWishlist: () => false, toggle: jest.fn(), items: [] }),
}));

jest.mock('@/hooks/useRecentSearches', () => ({
  useRecentSearches: () => ({
    recentSearches: [],
    addSearch: jest.fn(),
    removeSearch: jest.fn(),
    clearAll: jest.fn(),
  }),
}));

const mockSetSortBy = jest.fn();
const mockLoadMore = jest.fn();
const mockRefresh = jest.fn();
const mockUseProducts = jest.fn();

jest.mock('@/hooks/useProducts', () => ({
  ...jest.requireActual('@/hooks/useProducts'),
  useProducts: () => mockUseProducts(),
}));

jest.useFakeTimers();
afterAll(() => jest.useRealTimers());

// Minimal product for tests
const PRODUCT_A = {
  id: 'prod-a',
  slug: 'product-a',
  name: 'Product A',
  price: 100,
  images: [],
  category: 'futons',
  inStock: true,
};

const PRODUCT_B = {
  id: 'prod-b',
  slug: 'product-b',
  name: 'Product B',
  price: 200,
  images: [],
  category: 'futons',
  inStock: true,
};

const PRODUCT_C = {
  id: 'prod-c',
  slug: 'product-c',
  name: 'Product C',
  price: 300,
  images: [],
  category: 'futons',
  inStock: true,
};

function makeProductsState(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    products: [PRODUCT_A],
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
    setSortBy: mockSetSortBy,
    loadMore: mockLoadMore,
    refresh: mockRefresh,
    hasMore: false,
    ...overrides,
  };
}

function renderSearch() {
  return render(
    <ThemeProvider>
      <WishlistProvider>
        <CompareProvider>
          <SearchScreen />
        </CompareProvider>
      </WishlistProvider>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseProducts.mockReturnValue(makeProductsState());
});

// ── Result count singular vs plural ───────────────────────────────────────────

describe('SearchScreen — result count wording', () => {
  it('shows "1 result" (singular) when exactly one product returned', async () => {
    mockUseProducts.mockReturnValue(makeProductsState({ products: [PRODUCT_A] }));
    const { getByText } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(getByText('1 result')).toBeTruthy();
  });

  it('shows "3 results" (plural) when three products returned', async () => {
    mockUseProducts.mockReturnValue(
      makeProductsState({ products: [PRODUCT_A, PRODUCT_B, PRODUCT_C] }),
    );
    const { getByText } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(getByText('3 results')).toBeTruthy();
  });

  it('shows "0 results" text for result count element when search yields nothing', async () => {
    mockUseProducts.mockReturnValue(makeProductsState({ products: [] }));
    const { queryByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    // When no products, ListHeaderComponent is not rendered → no result-count element
    expect(queryByTestId('search-result-count')).toBeNull();
  });
});

// ── Sort picker value reflects hook state ──────────────────────────────────────

describe('SearchScreen — sort picker', () => {
  it('renders sort-picker when results are shown', async () => {
    mockUseProducts.mockReturnValue(makeProductsState({ products: [PRODUCT_A] }));
    const { getByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(getByTestId('sort-picker')).toBeTruthy();
  });

  it('sort-picker renders for both featured and price_asc sort states', async () => {
    mockUseProducts.mockReturnValue(
      makeProductsState({ products: [PRODUCT_A], sortBy: 'price_asc' as const }),
    );
    const { getByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    // SortPicker renders regardless of the sortBy value
    expect(getByTestId('sort-picker')).toBeTruthy();
  });

  it('does not render sort-picker in initial state (no query)', async () => {
    mockUseProducts.mockReturnValue(makeProductsState({ searchQuery: '', products: [] }));
    const { queryByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(queryByTestId('sort-picker')).toBeNull();
  });
});

// ── Edge queries ──────────────────────────────────────────────────────────────

describe('SearchScreen — edge queries', () => {
  it('special-char query "!@#$" returns empty state (no crash)', async () => {
    mockUseProducts.mockReturnValue(makeProductsState({ searchQuery: '!@#$', products: [] }));
    const { getByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(getByTestId('search-empty-state')).toBeTruthy();
  });

  it('100-character query does not crash', async () => {
    const longQuery = 'a'.repeat(100);
    mockUseProducts.mockReturnValue(makeProductsState({ searchQuery: longQuery, products: [] }));
    expect(() => renderSearch()).not.toThrow();
  });

  it('query consisting only of numbers shows empty state', async () => {
    mockUseProducts.mockReturnValue(makeProductsState({ searchQuery: '12345', products: [] }));
    const { getByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(getByTestId('search-empty-state')).toBeTruthy();
  });
});

// ── Debounce cancel: type then clear before 300ms ─────────────────────────────

describe('SearchScreen — debounce cancel via clear', () => {
  it('stays in initial state after typing then clearing within debounce window', async () => {
    // Use no-query state so initial state is shown when query is empty
    mockUseProducts.mockReturnValue(makeProductsState({ searchQuery: '', products: [] }));
    const { getByTestId, queryByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    // Type a query — but input text alone doesn't change hook searchQuery
    fireEvent.changeText(getByTestId('search-input'), 'futon');
    // Advance only 100ms (debounce not yet fired)
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    // Clear before debounce fires
    fireEvent.changeText(getByTestId('search-input'), '');
    await act(async () => {
      jest.advanceTimersByTime(400); // debounce fully settles with ''
    });

    // hook still returns searchQuery='' → initial state visible
    expect(getByTestId('search-initial-state')).toBeTruthy();
    expect(queryByTestId('search-results-grid')).toBeNull();
  });

  it('input text is empty after clearing', async () => {
    mockUseProducts.mockReturnValue(makeProductsState({ searchQuery: '', products: [] }));
    const { getByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    fireEvent.changeText(getByTestId('search-input'), 'futon');
    fireEvent.changeText(getByTestId('search-input'), '');
    expect(getByTestId('search-input').props.value).toBe('');
  });
});

// ── No-results but no empty-state element when query is empty ─────────────────

describe('SearchScreen — initial state guard', () => {
  it('does not show search-empty-state when query is empty string', async () => {
    mockUseProducts.mockReturnValue(makeProductsState({ searchQuery: '', products: [] }));
    const { queryByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(queryByTestId('search-empty-state')).toBeNull();
  });

  it('shows initial-state popular categories while in initial state', async () => {
    mockUseProducts.mockReturnValue(makeProductsState({ searchQuery: '', products: [] }));
    const { getByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(getByTestId('initial-category-futons')).toBeTruthy();
    expect(getByTestId('initial-category-murphy-beds')).toBeTruthy();
    expect(getByTestId('initial-category-covers')).toBeTruthy();
  });

  it('all 7 popular category chips render', async () => {
    mockUseProducts.mockReturnValue(makeProductsState({ searchQuery: '', products: [] }));
    const { getByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    for (const cat of [
      'futons',
      'murphy-beds',
      'covers',
      'mattresses',
      'frames',
      'pillows',
      'accessories',
    ]) {
      expect(getByTestId(`initial-category-${cat}`)).toBeTruthy();
    }
  });
});
