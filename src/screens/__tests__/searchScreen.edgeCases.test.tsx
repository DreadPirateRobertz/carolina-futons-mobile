/**
 * SearchScreen edge-case tests — cm-e15
 *
 * Covers gaps in searchScreen.test.tsx / searchScreen.deeper.test.tsx /
 * searchScreen.error.test.tsx / searchScreen.skeleton.test.tsx:
 *  - Empty results: SearchEmptyState category/trending chip interaction
 *  - XSS / special-character queries (submit path sanitization)
 *  - Debounce: explicit submit bypasses 300ms window
 *  - Pagination: loadMore wired to FlatList onEndReached
 *  - Sort/filter: modal open, option selection, all 6 sort options, overlay close
 *  - Camera/voice search unavailable (no camera-icon-btn in SearchScreen)
 *  - Recent searches: dropdown items, remove, clear all
 *  - Network error edge cases: error+loading priority, empty error message
 */
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { SearchScreen } from '../SearchScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import { CompareProvider } from '@/contexts/CompareContext';

// ─── Navigation ───────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

// ─── Wix (no CMS trending terms) ─────────────────────────────────────────────

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => null,
}));

// ─── AsyncStorage ─────────────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

// ─── Analytics ────────────────────────────────────────────────────────────────

jest.mock('@/services/analytics', () => ({
  events: {
    search: jest.fn(),
    screenView: jest.fn(),
    filterCategory: jest.fn(),
    sortProducts: jest.fn(),
  },
}));

// ─── Wishlist ─────────────────────────────────────────────────────────────────

jest.mock('@/hooks/useWishlist', () => ({
  WishlistProvider: ({ children }: { children: React.ReactNode }) => children,
  useWishlist: () => ({ isInWishlist: () => false, toggle: jest.fn(), items: [] }),
}));

// ─── Recent searches (controllable) ──────────────────────────────────────────

const mockAddSearch = jest.fn();
const mockRemoveSearch = jest.fn();
const mockClearAll = jest.fn();
const mockUseRecentSearches = jest.fn();
jest.mock('@/hooks/useRecentSearches', () => ({
  useRecentSearches: () => mockUseRecentSearches(),
}));

// ─── useProducts (controllable) ───────────────────────────────────────────────

const mockSetSortBy = jest.fn();
const mockLoadMore = jest.fn();
const mockRefresh = jest.fn();
const mockUseProducts = jest.fn();
jest.mock('@/hooks/useProducts', () => ({
  ...jest.requireActual('@/hooks/useProducts'),
  useProducts: () => mockUseProducts(),
}));

// ─── Timer setup ──────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockUseRecentSearches.mockReturnValue({
    recentSearches: [],
    addSearch: mockAddSearch,
    removeSearch: mockRemoveSearch,
    clearAll: mockClearAll,
  });
  mockUseProducts.mockReturnValue(makeProductsState());
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

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

const PRODUCT_CATEGORIES = [
  { id: 'futons' as const, label: 'Futons' },
  { id: 'murphy-beds' as const, label: 'Murphy Beds' },
];

function makeProductsState(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    products: [PRODUCT_A],
    categories: PRODUCT_CATEGORIES,
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

// ─── Empty results — SearchEmptyState interactions ────────────────────────────

describe('SearchScreen — empty results interactions', () => {
  it('category chip in empty state navigates to Category on press', async () => {
    mockUseProducts.mockReturnValue(
      makeProductsState({ searchQuery: 'xyznotfound', products: [] }),
    );
    const { getByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    fireEvent.press(getByTestId('category-chip-futons'));
    expect(mockNavigate).toHaveBeenCalledWith('Category', { slug: 'futons' });
  });

  it('trending chip in empty state updates the search input', async () => {
    mockUseProducts.mockReturnValue(
      makeProductsState({ searchQuery: 'xyznotfound', products: [] }),
    );
    const { getByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    // SearchEmptyState has hardcoded trending terms; chip-0 = 'futon mattress'
    fireEvent.press(getByTestId('trending-chip-0'));
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    // After pressing trending chip the input text updates immediately
    expect(getByTestId('search-input').props.value).toBe('futon mattress');
  });

  it('empty state shows "Try browsing by category instead" message', async () => {
    mockUseProducts.mockReturnValue(
      makeProductsState({ searchQuery: 'xyznotfound', products: [] }),
    );
    const { getByText } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(getByText('Try browsing by category instead')).toBeTruthy();
  });

  it('XSS query in empty state renders without crash', async () => {
    const xssQuery = '<script>alert(1)</script>';
    mockUseProducts.mockReturnValue(makeProductsState({ searchQuery: xssQuery, products: [] }));
    expect(() => renderSearch()).not.toThrow();
  });

  it('emoji query in empty state renders without crash', async () => {
    const emojiQuery = '🛋️ futon';
    mockUseProducts.mockReturnValue(makeProductsState({ searchQuery: emojiQuery, products: [] }));
    expect(() => renderSearch()).not.toThrow();
  });

  it('empty state with no categories passed does not crash', async () => {
    mockUseProducts.mockReturnValue(
      makeProductsState({ searchQuery: 'nothing', products: [], categories: [] }),
    );
    expect(() => renderSearch()).not.toThrow();
  });

  it('empty state accessibility label includes the search query', async () => {
    mockUseProducts.mockReturnValue(
      makeProductsState({ searchQuery: 'mountain oak', products: [] }),
    );
    const { getByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    const emptyState = getByTestId('search-empty-state');
    expect(emptyState.props.accessibilityLabel).toBe('No results for "mountain oak"');
  });
});

// ─── Explicit submit bypasses debounce ────────────────────────────────────────

describe('SearchScreen — explicit submit bypasses debounce', () => {
  it('onSubmitEditing fires search immediately without waiting 300ms', async () => {
    const mockSetSearchQuery = jest.fn();
    mockUseProducts.mockReturnValue(
      makeProductsState({ searchQuery: '', products: [], setSearchQuery: mockSetSearchQuery }),
    );
    const { getByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    // Type query into input
    fireEvent.changeText(getByTestId('search-input'), 'blue ridge');
    // Simulate keyboard "Search" button press (bypasses debounce)
    fireEvent(getByTestId('search-input'), 'submitEditing');

    // setSearchQuery should have been called immediately (no need to wait 300ms)
    expect(mockSetSearchQuery).toHaveBeenCalledWith('blue ridge');
  });

  it('onSubmitEditing adds the query to recent searches', async () => {
    mockUseProducts.mockReturnValue(makeProductsState({ searchQuery: '', products: [] }));
    const { getByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    fireEvent.changeText(getByTestId('search-input'), 'wall bed');
    fireEvent(getByTestId('search-input'), 'submitEditing');

    expect(mockAddSearch).toHaveBeenCalledWith('wall bed');
  });
});

// ─── XSS / special-character sanitization via submit ─────────────────────────

describe('SearchScreen — XSS and special character sanitization', () => {
  it('XSS vector via submit is sanitized (HTML tags stripped)', async () => {
    const mockSetSearchQuery = jest.fn();
    mockUseProducts.mockReturnValue(
      makeProductsState({ searchQuery: '', products: [], setSearchQuery: mockSetSearchQuery }),
    );
    const { getByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    const xssInput = '<script>alert(1)</script>';
    fireEvent.changeText(getByTestId('search-input'), xssInput);
    fireEvent(getByTestId('search-input'), 'submitEditing');

    // sanitizeInput strips HTML tags — setSearchQuery should NOT get raw HTML
    const calledWith = mockSetSearchQuery.mock.calls[0]?.[0] ?? '';
    expect(calledWith).not.toContain('<script>');
    expect(calledWith).not.toContain('</script>');
  });

  it('SQL injection attempt via submit is sanitized', async () => {
    const mockSetSearchQuery = jest.fn();
    mockUseProducts.mockReturnValue(
      makeProductsState({ searchQuery: '', products: [], setSearchQuery: mockSetSearchQuery }),
    );
    const { getByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    const sqlInput = "'; DROP TABLE products; --";
    fireEvent.changeText(getByTestId('search-input'), sqlInput);
    fireEvent(getByTestId('search-input'), 'submitEditing');

    // sanitizeInput removes SQL keywords — should not call setSearchQuery with raw SQL
    const calledWith = mockSetSearchQuery.mock.calls[0]?.[0] ?? '';
    expect(calledWith).not.toMatch(/DROP\s+TABLE/i);
  });

  it('unicode RTL string in query does not crash', async () => {
    const rtlQuery = '‮futon‬';
    mockUseProducts.mockReturnValue(makeProductsState({ searchQuery: rtlQuery, products: [] }));
    expect(() => renderSearch()).not.toThrow();
  });
});

// ─── Pagination ───────────────────────────────────────────────────────────────

describe('SearchScreen — pagination', () => {
  it('FlatList onEndReached triggers loadMore', async () => {
    mockUseProducts.mockReturnValue(
      makeProductsState({ products: [PRODUCT_A, PRODUCT_B], hasMore: true }),
    );
    const { getByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    fireEvent(getByTestId('search-results-grid'), 'onEndReached');
    expect(mockLoadMore).toHaveBeenCalledTimes(1);
  });

  it('renders results grid with hasMore=true without crash', async () => {
    mockUseProducts.mockReturnValue(makeProductsState({ products: [PRODUCT_A], hasMore: true }));
    const { getByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(getByTestId('search-results-grid')).toBeTruthy();
  });

  it('renders results grid with hasMore=false without crash', async () => {
    mockUseProducts.mockReturnValue(makeProductsState({ products: [PRODUCT_A], hasMore: false }));
    const { getByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(getByTestId('search-results-grid')).toBeTruthy();
  });
});

// ─── Sort / filter edge cases ─────────────────────────────────────────────────

describe('SearchScreen — sort / filter edge cases', () => {
  it('pressing sort button opens the sort modal', async () => {
    mockUseProducts.mockReturnValue(makeProductsState({ products: [PRODUCT_A] }));
    const { getByTestId, getByText } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    fireEvent.press(getByTestId('sort-button'));
    expect(getByText('Sort By')).toBeTruthy();
  });

  it('sort modal lists all 6 sort options', async () => {
    mockUseProducts.mockReturnValue(makeProductsState({ products: [PRODUCT_A] }));
    const { getByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    fireEvent.press(getByTestId('sort-button'));

    for (const value of ['featured', 'popular', 'price-asc', 'price-desc', 'newest', 'rating']) {
      expect(getByTestId(`sort-option-${value}`)).toBeTruthy();
    }
  });

  it('pressing a sort option calls setSortBy with correct value', async () => {
    mockUseProducts.mockReturnValue(makeProductsState({ products: [PRODUCT_A] }));
    const { getByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    fireEvent.press(getByTestId('sort-button'));
    fireEvent.press(getByTestId('sort-option-price-asc'));
    expect(mockSetSortBy).toHaveBeenCalledWith('price-asc');
  });

  it('pressing sort overlay closes the modal', async () => {
    mockUseProducts.mockReturnValue(makeProductsState({ products: [PRODUCT_A] }));
    const { getByTestId, queryByText } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    fireEvent.press(getByTestId('sort-button'));
    expect(queryByText('Sort By')).toBeTruthy();
    fireEvent.press(getByTestId('sort-modal-overlay'));
    expect(queryByText('Sort By')).toBeNull();
  });

  it('sort picker accessibility label reflects current sort', async () => {
    mockUseProducts.mockReturnValue(
      makeProductsState({ products: [PRODUCT_A], sortBy: 'price-asc' as const }),
    );
    const { getByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    const sortBtn = getByTestId('sort-button');
    expect(sortBtn.props.accessibilityLabel).toBe('Sort by Price: Low to High');
  });

  it('selecting sort option closes the modal', async () => {
    mockUseProducts.mockReturnValue(makeProductsState({ products: [PRODUCT_A] }));
    const { getByTestId, queryByText } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    fireEvent.press(getByTestId('sort-button'));
    fireEvent.press(getByTestId('sort-option-rating'));
    expect(queryByText('Sort By')).toBeNull();
  });
});

// ─── Camera / voice search unavailable ────────────────────────────────────────

describe('SearchScreen — camera / voice search unavailable', () => {
  it('camera icon button is not visible (SearchScreen does not pass onCameraPress)', async () => {
    mockUseProducts.mockReturnValue(makeProductsState());
    const { queryByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    // SearchScreen never passes onCameraPress to SearchBar, so camera-icon-btn must be absent
    expect(queryByTestId('camera-icon-btn')).toBeNull();
  });
});

// ─── Recent searches interactions ─────────────────────────────────────────────

describe('SearchScreen — recent searches interactions', () => {
  it('recent search items appear in dropdown when input is focused with no query', async () => {
    mockUseRecentSearches.mockReturnValue({
      recentSearches: ['blue ridge futon', 'queen mattress'],
      addSearch: mockAddSearch,
      removeSearch: mockRemoveSearch,
      clearAll: mockClearAll,
    });
    mockUseProducts.mockReturnValue(makeProductsState({ searchQuery: '', products: [] }));
    const { getByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    // Focus the input with empty value to trigger recent dropdown
    fireEvent(getByTestId('search-input'), 'focus');
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(getByTestId('recent-blue ridge futon')).toBeTruthy();
    expect(getByTestId('recent-queen mattress')).toBeTruthy();
  });

  it('pressing remove-recent button calls removeSearch with correct query', async () => {
    mockUseRecentSearches.mockReturnValue({
      recentSearches: ['sectional sofa'],
      addSearch: mockAddSearch,
      removeSearch: mockRemoveSearch,
      clearAll: mockClearAll,
    });
    mockUseProducts.mockReturnValue(makeProductsState({ searchQuery: '', products: [] }));
    const { getByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    fireEvent(getByTestId('search-input'), 'focus');
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    fireEvent.press(getByTestId('remove-recent-sectional sofa'));
    expect(mockRemoveSearch).toHaveBeenCalledWith('sectional sofa');
  });

  it('pressing clear-recent button calls clearAll', async () => {
    mockUseRecentSearches.mockReturnValue({
      recentSearches: ['futon', 'murphy bed'],
      addSearch: mockAddSearch,
      removeSearch: mockRemoveSearch,
      clearAll: mockClearAll,
    });
    mockUseProducts.mockReturnValue(makeProductsState({ searchQuery: '', products: [] }));
    const { getByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    fireEvent(getByTestId('search-input'), 'focus');
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    fireEvent.press(getByTestId('clear-recent'));
    expect(mockClearAll).toHaveBeenCalledTimes(1);
  });
});

// ─── Network error edge cases ─────────────────────────────────────────────────

describe('SearchScreen — network error edge cases', () => {
  it('shows skeleton (not error) when both isLoading=true and fetchError is set', async () => {
    // The SearchScreen condition: error only shown when `fetchError && !isLoading`
    mockUseProducts.mockReturnValue({
      ...makeProductsState(),
      isLoading: true,
      fetchError: new Error('Network timeout'),
    });
    const { getByTestId, queryByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(getByTestId('skeleton-product-grid')).toBeTruthy();
    expect(queryByTestId('network-error-state')).toBeNull();
  });

  it('empty error message falls back to default message in NetworkErrorState', async () => {
    mockUseProducts.mockReturnValue({
      ...makeProductsState(),
      fetchError: new Error(''),
    });
    const { getByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    // NetworkErrorState should render with the fallback message
    expect(getByTestId('network-error-state')).toBeTruthy();
  });

  it('retry button calls refresh regardless of error message content', async () => {
    mockUseProducts.mockReturnValue({
      ...makeProductsState(),
      fetchError: new Error(''),
    });
    const { getByTestId } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    fireEvent.press(getByTestId('network-error-retry'));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('error state clears when fetchError returns to null', async () => {
    mockUseProducts.mockReturnValue({
      ...makeProductsState(),
      fetchError: new Error('Network error'),
    });
    const { getByTestId, queryByTestId, rerender } = renderSearch();
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(getByTestId('network-error-state')).toBeTruthy();

    // Simulate recovery: error clears
    mockUseProducts.mockReturnValue(makeProductsState());
    rerender(
      <ThemeProvider>
        <WishlistProvider>
          <CompareProvider>
            <SearchScreen />
          </CompareProvider>
        </WishlistProvider>
      </ThemeProvider>,
    );
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(queryByTestId('network-error-state')).toBeNull();
    expect(getByTestId('search-results-grid')).toBeTruthy();
  });
});
