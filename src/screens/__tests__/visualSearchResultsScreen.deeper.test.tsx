/**
 * VisualSearchResultsScreen deeper edge-case tests — cm-2su
 *
 * Covers:
 *  - Loading skeleton: preview image shown, no retry button, header back button present
 *  - Error retry: retry after embedding fail succeeds, retry that fails stays in error,
 *    catalog-throws error handled on retry
 *  - Empty results state: no retry, no loading, no results list, body text content
 */
import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { VisualSearchResultsScreen } from '../VisualSearchResultsScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { CatalogProduct } from '@/services/visualSearch';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      dispatch: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
    }),
    useRoute: () => ({
      params: { imageUri: 'file:///photos/snap-001.jpg' },
    }),
    useNavigationState: (selector: any) => {
      const state = { routes: [{ name: 'VisualSearchResults', key: 'VSR-mock' }], index: 0 };
      return selector(state);
    },
  };
});

const mockSearchByImage = jest.fn();
const mockFetchCatalogExport = jest.fn();

jest.mock('@/services/visualSearchEmbedding', () => ({
  searchByImage: (...args: any[]) => mockSearchByImage(...args),
}));

jest.mock('@/services/visualSearch', () => ({
  fetchCatalogExport: (...args: any[]) => mockFetchCatalogExport(...args),
}));

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => null,
}));

jest.mock('@/services/crashReporting', () => ({
  captureException: jest.fn(),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PRODUCTS: CatalogProduct[] = [
  {
    id: 'prod-1',
    name: 'Summit Futon',
    slug: 'summit-futon',
    sku: 'SF-001',
    category: 'futons',
    price: 699,
    images: ['https://example.com/summit.jpg'],
  },
];

const MATCHES = [{ product: PRODUCTS[0], score: 0.92 }];

function renderScreen() {
  return render(
    <NavigationContainer>
      <ThemeProvider>
        <VisualSearchResultsScreen />
      </ThemeProvider>
    </NavigationContainer>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Loading skeleton (deeper) ─────────────────────────────────────────────────

describe('VisualSearchResultsScreen — loading skeleton (deeper)', () => {
  beforeEach(() => {
    // fetchCatalogExport never resolves → stays in loading state
    mockFetchCatalogExport.mockImplementation(() => new Promise(() => {}));
  });

  it('shows the preview image while loading', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('visual-search-preview-image')).toBeTruthy();
  });

  it('shows the loading indicator (visual-search-results-loading) while loading', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('visual-search-results-loading')).toBeTruthy();
  });

  it('does not show the retry button while loading', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('visual-search-results-retry')).toBeNull();
  });

  it('header back button is present while loading', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('visual-search-results-back')).toBeTruthy();
  });

  it('does not show the confidence filter banner while loading', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('confidence-filter-banner')).toBeNull();
  });
});

// ── Error retry (deeper) ──────────────────────────────────────────────────────

describe('VisualSearchResultsScreen — error retry (deeper)', () => {
  it('retry after embedding-search failure shows results on success', async () => {
    mockFetchCatalogExport.mockResolvedValue({ success: true, products: PRODUCTS });
    mockSearchByImage
      .mockResolvedValueOnce({ success: false, matches: [], error: 'Embedding failed' })
      .mockResolvedValueOnce({ success: true, matches: MATCHES });

    const { getByTestId } = renderScreen();

    await waitFor(() => expect(getByTestId('visual-search-results-retry')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByTestId('visual-search-results-retry'));
    });

    await waitFor(() => {
      expect(getByTestId('visual-search-results-list')).toBeTruthy();
    });
  });

  it('retry that fails again stays in error state', async () => {
    mockFetchCatalogExport.mockResolvedValue({
      success: false,
      products: [],
      error: 'Still unavailable',
    });

    const { getByTestId } = renderScreen();

    await waitFor(() => expect(getByTestId('visual-search-results-retry')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByTestId('visual-search-results-retry'));
    });

    await waitFor(() => {
      expect(getByTestId('visual-search-results-error')).toBeTruthy();
    });
  });

  it('retry after catalog throws stays in error state', async () => {
    mockFetchCatalogExport
      .mockRejectedValueOnce(new Error('Network down'))
      .mockRejectedValueOnce(new Error('Still down'));

    const { getByTestId } = renderScreen();

    await waitFor(() => expect(getByTestId('visual-search-results-retry')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByTestId('visual-search-results-retry'));
    });

    await waitFor(() => {
      expect(getByTestId('visual-search-results-error')).toBeTruthy();
    });
  });

  it('retry clears error before showing loading (no error during retry fetch)', async () => {
    let resolveRetry!: (v: any) => void;
    mockFetchCatalogExport
      .mockResolvedValueOnce({ success: false, products: [], error: 'Timeout' })
      .mockImplementationOnce(
        () =>
          new Promise((res) => {
            resolveRetry = res;
          }),
      );

    const { getByTestId, queryByTestId } = renderScreen();

    await waitFor(() => expect(getByTestId('visual-search-results-retry')).toBeTruthy());

    act(() => {
      fireEvent.press(getByTestId('visual-search-results-retry'));
    });

    // Error should clear and loading appear while retry is in-flight
    expect(queryByTestId('visual-search-results-error')).toBeNull();
    expect(queryByTestId('visual-search-results-loading')).toBeTruthy();

    // Cleanup: resolve so no pending async after test
    await act(async () => {
      resolveRetry({ success: true, products: PRODUCTS });
      mockSearchByImage.mockResolvedValue({ success: true, matches: MATCHES });
    });
  });
});

// ── Empty results state (deeper) ──────────────────────────────────────────────

describe('VisualSearchResultsScreen — empty results state (deeper)', () => {
  beforeEach(() => {
    mockFetchCatalogExport.mockResolvedValue({ success: true, products: PRODUCTS });
    mockSearchByImage.mockResolvedValue({ success: true, matches: [] });
  });

  it('shows visual-search-results-empty testID', async () => {
    const { getByTestId } = renderScreen();
    await waitFor(() => expect(getByTestId('visual-search-results-empty')).toBeTruthy());
  });

  it('does not show retry button in empty state', async () => {
    const { getByTestId, queryByTestId } = renderScreen();
    await waitFor(() => expect(getByTestId('visual-search-results-empty')).toBeTruthy());
    expect(queryByTestId('visual-search-results-retry')).toBeNull();
  });

  it('does not show loading indicator in empty state', async () => {
    const { getByTestId, queryByTestId } = renderScreen();
    await waitFor(() => expect(getByTestId('visual-search-results-empty')).toBeTruthy());
    expect(queryByTestId('visual-search-results-loading')).toBeNull();
  });

  it('does not show results list in empty state', async () => {
    const { getByTestId, queryByTestId } = renderScreen();
    await waitFor(() => expect(getByTestId('visual-search-results-empty')).toBeTruthy());
    expect(queryByTestId('visual-search-results-list')).toBeNull();
  });

  it('empty body text mentions taking a clearer photo', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => {
      expect(getByText(/clearer photo/i)).toBeTruthy();
    });
  });

  it('back button is present in empty state', async () => {
    const { getByTestId } = renderScreen();
    await waitFor(() => expect(getByTestId('visual-search-results-empty')).toBeTruthy());
    expect(getByTestId('visual-search-results-back')).toBeTruthy();
  });
});
