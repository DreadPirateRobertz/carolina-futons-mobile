import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { SearchScreen } from '../SearchScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import { CompareProvider } from '@/contexts/CompareContext';
import { PRODUCTS } from '@/data/products';

// Mock WishlistProvider so it renders children synchronously with no async
// AsyncStorage/network operations — prevents OOM SIGTERM in CI under fake timers.
jest.mock('@/hooks/useWishlist', () => ({
  WishlistProvider: ({ children }: { children: React.ReactNode }) => children,
  useWishlist: () => ({ isInWishlist: () => false, toggle: jest.fn(), items: [] }),
}));

// Mock useRecentSearches to avoid a dynamic import('@react-native-async-storage/async-storage')
// inside a useEffect IIFE. That dynamic import creates an open async handle that keeps the Jest
// worker alive after all tests complete — GitHub Actions then kills it with SIGTERM.
jest.mock('@/hooks/useRecentSearches', () => ({
  useRecentSearches: () => ({
    recentSearches: [],
    addSearch: jest.fn(),
    removeSearch: jest.fn(),
    clearAll: jest.fn(),
  }),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

const mockQueryData = jest.fn();

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => ({ queryData: mockQueryData }),
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

jest.useFakeTimers();
afterAll(() => jest.useRealTimers());

beforeEach(() => {
  mockQueryData.mockReset();
  // Default: CMS returns empty (no trending terms) so existing tests are unaffected
  mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
});

function renderSearchScreen() {
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
});

describe('SearchScreen', () => {
  describe('rendering', () => {
    it('renders with testID', async () => {
      const { getByTestId } = renderSearchScreen();
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
      expect(getByTestId('search-screen')).toBeTruthy();
    });

    it('renders search input', async () => {
      const { getByTestId } = renderSearchScreen();
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
      expect(getByTestId('search-input')).toBeTruthy();
    });

    it('renders back button', async () => {
      const { getByTestId } = renderSearchScreen();
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
      expect(getByTestId('search-back')).toBeTruthy();
    });

    it('accepts custom testID', async () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <WishlistProvider>
            <CompareProvider>
              <SearchScreen testID="custom-search" />
            </CompareProvider>
          </WishlistProvider>
        </ThemeProvider>,
      );
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
      expect(getByTestId('custom-search')).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('calls goBack when back button pressed', async () => {
      const { getByTestId } = renderSearchScreen();
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
      fireEvent.press(getByTestId('search-back'));
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('navigates to ProductDetail when product tapped', async () => {
      const { getByTestId } = renderSearchScreen();
      await act(async () => {
        jest.advanceTimersByTime(700);
      });
      // Search for something that will return results
      fireEvent.changeText(getByTestId('search-input'), 'futon');
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      // Find a product card and tap it
      const firstFuton = PRODUCTS.find((p) => p.name.toLowerCase().includes('futon'));
      if (firstFuton) {
        const card = getByTestId(`product-card-${firstFuton.id}`);
        fireEvent.press(card);
        expect(mockNavigate).toHaveBeenCalledWith('ProductDetail', { slug: firstFuton.slug });
      }
    });

    it('navigates to Category when category chip pressed in empty state', async () => {
      const { getByTestId } = renderSearchScreen();
      await act(async () => {
        jest.advanceTimersByTime(700);
      });
      // Search for something that returns no results
      fireEvent.changeText(getByTestId('search-input'), 'xyznonexistent999');
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      const chip = getByTestId('category-chip-futons');
      fireEvent.press(chip);
      expect(mockNavigate).toHaveBeenCalledWith('Category', { slug: 'futons' });
    });
  });

  describe('search behavior', () => {
    it('shows results when typing a query', async () => {
      const { getByTestId, queryByTestId } = renderSearchScreen();
      await act(async () => {
        jest.advanceTimersByTime(700);
      });
      fireEvent.changeText(getByTestId('search-input'), 'futon');
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      expect(queryByTestId('search-results-grid')).toBeTruthy();
    });

    it('shows empty state when query returns no results', async () => {
      const { getByTestId } = renderSearchScreen();
      await act(async () => {
        jest.advanceTimersByTime(700);
      });
      fireEvent.changeText(getByTestId('search-input'), 'xyznonexistent999');
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      expect(getByTestId('search-empty-state')).toBeTruthy();
    });

    it('shows trending searches in empty state', async () => {
      const { getByTestId } = renderSearchScreen();
      await act(async () => {
        jest.advanceTimersByTime(700);
      });
      fireEvent.changeText(getByTestId('search-input'), 'xyznonexistent999');
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      expect(getByTestId('trending-section')).toBeTruthy();
    });

    it('applies trending search when trending chip pressed', async () => {
      const { getByTestId } = renderSearchScreen();
      await act(async () => {
        jest.advanceTimersByTime(700);
      });
      fireEvent.changeText(getByTestId('search-input'), 'xyznonexistent999');
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      fireEvent.press(getByTestId('trending-chip-0'));
      // Should update search query to trending term
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
    });

    it('clears search when clear button pressed', async () => {
      const { getByTestId, queryByTestId } = renderSearchScreen();
      await act(async () => {
        jest.advanceTimersByTime(700);
      });
      fireEvent.changeText(getByTestId('search-input'), 'futon');
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      fireEvent.press(getByTestId('search-clear'));
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      // Should show initial state, not results
      expect(queryByTestId('search-results-grid')).toBeNull();
    });
  });

  describe('initial state', () => {
    it('shows recent searches prompt when no query', async () => {
      const { getByTestId } = renderSearchScreen();
      await act(async () => {
        jest.advanceTimersByTime(700);
      });
      expect(getByTestId('search-initial-state')).toBeTruthy();
    });

    it('shows trending searches section in initial state when CMS has terms', async () => {
      mockQueryData.mockResolvedValue({
        items: [{ terms: ['futon mattress', 'queen size'] }],
        totalResults: 1,
      });
      const { getByText } = renderSearchScreen();
      await act(async () => {
        jest.advanceTimersByTime(700);
      });
      expect(getByText('Trending Searches')).toBeTruthy();
    });

    it('shows popular categories in initial state', async () => {
      const { getByText } = renderSearchScreen();
      await act(async () => {
        jest.advanceTimersByTime(700);
      });
      expect(getByText('Popular Categories')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('back button has accessibility label', async () => {
      const { getByTestId } = renderSearchScreen();
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
      expect(getByTestId('search-back').props.accessibilityLabel).toBe('Go back');
    });

    it('search input has accessibility label', async () => {
      const { getByTestId } = renderSearchScreen();
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
      expect(getByTestId('search-input').props.accessibilityLabel).toBe('Search products');
    });
  });

  describe('results count', () => {
    it('shows result count when search has results', async () => {
      const { getByTestId } = renderSearchScreen();
      await act(async () => {
        jest.advanceTimersByTime(700);
      });
      fireEvent.changeText(getByTestId('search-input'), 'futon');
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      expect(getByTestId('search-result-count')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('handles empty string search gracefully', async () => {
      const { getByTestId, queryByTestId } = renderSearchScreen();
      await act(async () => {
        jest.advanceTimersByTime(700);
      });
      fireEvent.changeText(getByTestId('search-input'), '');
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      // Should show initial state, not results or empty state
      expect(getByTestId('search-initial-state')).toBeTruthy();
      expect(queryByTestId('search-results-grid')).toBeNull();
    });

    it('handles whitespace-only search', async () => {
      const { getByTestId, queryByTestId } = renderSearchScreen();
      await act(async () => {
        jest.advanceTimersByTime(700);
      });
      fireEvent.changeText(getByTestId('search-input'), '   ');
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      // Whitespace triggers results mode but likely no matches
      expect(queryByTestId('search-initial-state')).toBeNull();
    });

    it('navigates to Category from initial state category chip', async () => {
      const { getByTestId } = renderSearchScreen();
      await act(async () => {
        jest.advanceTimersByTime(700);
      });
      fireEvent.press(getByTestId('initial-category-futons'));
      expect(mockNavigate).toHaveBeenCalledWith('Category', { slug: 'futons' });
    });

    it('applies trending search from initial state', async () => {
      mockQueryData.mockResolvedValue({
        items: [{ terms: ['futon mattress'] }],
        totalResults: 1,
      });
      const { getByTestId, queryByTestId } = renderSearchScreen();
      await act(async () => {
        jest.advanceTimersByTime(700);
      });
      fireEvent.press(getByTestId('initial-trending-0'));
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      // Should now show results mode (search-initial-state should be gone)
      expect(queryByTestId('search-initial-state')).toBeNull();
    });

    it('transitions from results back to initial state on clear', async () => {
      const { getByTestId } = renderSearchScreen();
      await act(async () => {
        jest.advanceTimersByTime(700);
      });
      // Search for something
      fireEvent.changeText(getByTestId('search-input'), 'futon');
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      // Clear
      fireEvent.press(getByTestId('search-clear'));
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      // Should be back to initial state
      expect(getByTestId('search-initial-state')).toBeTruthy();
    });

    it('shows sort picker in results mode', async () => {
      const { getByTestId } = renderSearchScreen();
      await act(async () => {
        jest.advanceTimersByTime(700);
      });
      fireEvent.changeText(getByTestId('search-input'), 'futon');
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      expect(getByTestId('sort-picker')).toBeTruthy();
    });
  });

  // cm-c00: 300ms debounce on search input
  describe('debounce on search input (cm-c00)', () => {
    it('does not show results before debounce window elapses', async () => {
      const { getByTestId, queryByTestId } = renderSearchScreen();
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      fireEvent.changeText(getByTestId('search-input'), 'futon');
      // Only 200ms elapsed — debounce has NOT fired yet
      await act(async () => {
        jest.advanceTimersByTime(200);
      });

      expect(queryByTestId('search-results-grid')).toBeNull();
    });

    it('shows results after debounce settles (300ms)', async () => {
      const { getByTestId } = renderSearchScreen();
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      fireEvent.changeText(getByTestId('search-input'), 'futon');
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      expect(getByTestId('search-results-grid')).toBeTruthy();
    });

    it('resets debounce timer on rapid typing — no results until typing stops', async () => {
      const { getByTestId, queryByTestId } = renderSearchScreen();
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Rapid keystrokes — each resets the 300ms timer
      fireEvent.changeText(getByTestId('search-input'), 'f');
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
      fireEvent.changeText(getByTestId('search-input'), 'fu');
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
      fireEvent.changeText(getByTestId('search-input'), 'fut');
      // Total: 300ms elapsed but last keystroke was 100ms ago — timer reset
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      expect(queryByTestId('search-results-grid')).toBeNull();

      // Let debounce settle
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      expect(getByTestId('search-results-grid')).toBeTruthy();
    });

    it('input text reflects typing immediately (UI stays responsive)', async () => {
      const { getByTestId } = renderSearchScreen();
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      fireEvent.changeText(getByTestId('search-input'), 'blue ridge');
      // Input value is visible before debounce fires
      expect(getByTestId('search-input').props.value).toBe('blue ridge');
    });
  });

  // hq-jc723: Trending searches from Wix CMS
  describe('trending searches from Wix CMS (hq-jc723)', () => {
    it('renders CMS trending terms as chips', async () => {
      mockQueryData.mockResolvedValue({
        items: [{ terms: ['mountain living', 'sectional sofa', 'futon frame'] }],
        totalResults: 1,
      });
      const { getByTestId } = renderSearchScreen();
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
      expect(getByTestId('initial-trending-0')).toBeTruthy();
      expect(getByTestId('initial-trending-1')).toBeTruthy();
      expect(getByTestId('initial-trending-2')).toBeTruthy();
    });

    it('hides the trending section entirely when CMS returns empty (not a crash)', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
      const { queryByTestId } = renderSearchScreen();
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
      expect(queryByTestId('trending-section-header')).toBeNull();
    });

    it('hides the trending section when CMS fetch fails (graceful fallback)', async () => {
      mockQueryData.mockRejectedValue(new Error('Wix unavailable'));
      const { queryByTestId } = renderSearchScreen();
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
      expect(queryByTestId('trending-section-header')).toBeNull();
    });

    it('tapping a CMS trending chip triggers search', async () => {
      mockQueryData.mockResolvedValue({
        items: [{ terms: ['blue ridge futon'] }],
        totalResults: 1,
      });
      const { getByTestId } = renderSearchScreen();
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
      fireEvent.press(getByTestId('initial-trending-0'));
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      expect(getByTestId('search-results-grid')).toBeTruthy();
    });
  });
});
