import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { SearchScreen } from '../SearchScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import { PRODUCTS } from '@/data/products';
import { useVisualSearch } from '@/hooks/useVisualSearch';

jest.mock('@/hooks/useVisualSearch', () => ({
  useVisualSearch: jest.fn(),
}));

const mockUseVisualSearch = useVisualSearch as jest.MockedFunction<typeof useVisualSearch>;

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
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

jest.useFakeTimers();

function renderSearchScreen() {
  return render(
    <ThemeProvider>
      <WishlistProvider>
        <SearchScreen />
      </WishlistProvider>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseVisualSearch.mockReturnValue({
    trigger: jest.fn(),
    status: 'idle',
    results: [],
    query: null,
    error: null,
    reset: jest.fn(),
  });
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
            <SearchScreen testID="custom-search" />
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

    it('shows trending searches section in initial state', async () => {
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
});

describe('SearchScreen visual search integration', () => {
  const mockTrigger = jest.fn();
  const mockReset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseVisualSearch.mockReturnValue({
      trigger: mockTrigger,
      status: 'idle',
      results: [],
      query: null,
      error: null,
      reset: mockReset,
    });
  });

  it('shows loading spinner when vsStatus is loading', async () => {
    mockUseVisualSearch.mockReturnValue({
      trigger: mockTrigger,
      status: 'loading',
      results: [],
      query: null,
      error: null,
      reset: mockReset,
    });
    const { getByTestId } = renderSearchScreen();
    await act(async () => { jest.advanceTimersByTime(100); });
    expect(getByTestId('visual-search-loading')).toBeTruthy();
  });

  it('shows VisualSearchEmptyState when success with no results', async () => {
    mockUseVisualSearch.mockReturnValue({
      trigger: mockTrigger,
      status: 'success',
      results: [],
      query: { category: 'futons', style: 'modern', colorFamily: 'neutral', keywords: [], matchType: 'scored' },
      error: null,
      reset: mockReset,
    });
    const { getByTestId } = renderSearchScreen();
    await act(async () => { jest.advanceTimersByTime(100); });
    expect(getByTestId('visual-search-empty-state')).toBeTruthy();
  });

  it('shows visual search results with badge when success with results', async () => {
    const mockProducts = [PRODUCTS[0]];
    mockUseVisualSearch.mockReturnValue({
      trigger: mockTrigger,
      status: 'success',
      results: mockProducts,
      query: { category: 'futons', style: 'modern', colorFamily: 'neutral', keywords: [], matchType: 'scored' },
      error: null,
      reset: mockReset,
    });
    const { getByTestId } = renderSearchScreen();
    await act(async () => { jest.advanceTimersByTime(100); });
    expect(getByTestId('visual-search-badge')).toBeTruthy();
  });

  it('calls vsReset when text changes while visual search is active', async () => {
    mockUseVisualSearch.mockReturnValue({
      trigger: mockTrigger,
      status: 'success',
      results: [],
      query: null,
      error: null,
      reset: mockReset,
    });
    const { getByTestId } = renderSearchScreen();
    await act(async () => { jest.advanceTimersByTime(100); });
    fireEvent.changeText(getByTestId('search-input'), 'new text');
    expect(mockReset).toHaveBeenCalled();
  });
});
