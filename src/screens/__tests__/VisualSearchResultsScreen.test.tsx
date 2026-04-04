/**
 * Tests for VisualSearchResultsScreen — deacon-905
 *
 * Covers: loading skeleton, top-5 matches rendered, empty state,
 * network error + retry, product press navigation, back navigation.
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

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CATALOG_PRODUCTS: CatalogProduct[] = [
  {
    id: 'prod-1',
    name: 'Summit Futon',
    slug: 'summit-futon',
    sku: 'SF-001',
    category: 'futons',
    price: 699,
    images: ['https://example.com/summit.jpg'],
  },
  {
    id: 'prod-2',
    name: 'Valley Sofa',
    slug: 'valley-sofa',
    sku: 'VS-002',
    category: 'sofas',
    price: 899,
    images: ['https://example.com/valley.jpg'],
  },
  {
    id: 'prod-3',
    name: 'Ridge Loveseat',
    slug: 'ridge-loveseat',
    sku: 'RL-003',
    category: 'loveseats',
    price: 549,
    images: [],
  },
];

const MATCHES = [
  { product: CATALOG_PRODUCTS[0], score: 0.95 },
  { product: CATALOG_PRODUCTS[1], score: 0.87 },
  { product: CATALOG_PRODUCTS[2], score: 0.71 },
];

function setupHappyPath() {
  mockFetchCatalogExport.mockResolvedValue({
    success: true,
    products: CATALOG_PRODUCTS,
  });
  mockSearchByImage.mockResolvedValue({
    success: true,
    matches: MATCHES,
  });
}

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

// ── Root ──────────────────────────────────────────────────────────────────────

describe('VisualSearchResultsScreen — root', () => {
  it('renders with testID visual-search-results-screen', async () => {
    setupHappyPath();
    const { getByTestId } = renderScreen();
    expect(getByTestId('visual-search-results-screen')).toBeTruthy();
    await waitFor(() => expect(mockSearchByImage).toHaveBeenCalled());
  });

  it('renders a back button', async () => {
    setupHappyPath();
    const { getByTestId } = renderScreen();
    expect(getByTestId('visual-search-results-back')).toBeTruthy();
    await waitFor(() => expect(mockSearchByImage).toHaveBeenCalled());
  });

  it('back button calls goBack', async () => {
    setupHappyPath();
    const { getByTestId } = renderScreen();
    await waitFor(() => expect(mockSearchByImage).toHaveBeenCalled());
    fireEvent.press(getByTestId('visual-search-results-back'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('shows the captured image preview', async () => {
    setupHappyPath();
    const { getByTestId } = renderScreen();
    expect(getByTestId('visual-search-preview-image')).toBeTruthy();
    await waitFor(() => expect(mockSearchByImage).toHaveBeenCalled());
  });
});

// ── Loading skeleton ──────────────────────────────────────────────────────────

describe('VisualSearchResultsScreen — loading state', () => {
  it('shows loading skeleton while searching', async () => {
    mockFetchCatalogExport.mockImplementation(() => new Promise(() => {})); // never resolves
    const { getByTestId } = renderScreen();
    expect(getByTestId('visual-search-results-loading')).toBeTruthy();
  });

  it('does not show results list while loading', async () => {
    mockFetchCatalogExport.mockImplementation(() => new Promise(() => {}));
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('visual-search-results-list')).toBeNull();
  });

  it('does not show empty state while loading', async () => {
    mockFetchCatalogExport.mockImplementation(() => new Promise(() => {}));
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('visual-search-results-empty')).toBeNull();
  });

  it('does not show error state while loading', async () => {
    mockFetchCatalogExport.mockImplementation(() => new Promise(() => {}));
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('visual-search-results-error')).toBeNull();
  });
});

// ── Happy path — results list ─────────────────────────────────────────────────

describe('VisualSearchResultsScreen — results list', () => {
  it('renders the results list after search completes', async () => {
    setupHappyPath();
    const { getByTestId } = renderScreen();

    await waitFor(() => {
      expect(getByTestId('visual-search-results-list')).toBeTruthy();
    });
  });

  it('renders a card for each match', async () => {
    setupHappyPath();
    const { getAllByTestId } = renderScreen();

    await waitFor(() => {
      expect(getAllByTestId(/^visual-search-result-card-/).length).toBe(MATCHES.length);
    });
  });

  it('renders match product names', async () => {
    setupHappyPath();
    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('Summit Futon')).toBeTruthy();
      expect(getByText('Valley Sofa')).toBeTruthy();
      expect(getByText('Ridge Loveseat')).toBeTruthy();
    });
  });

  it('renders similarity score badge on each card', async () => {
    setupHappyPath();
    const { getAllByTestId } = renderScreen();

    await waitFor(() => {
      expect(getAllByTestId(/^visual-search-result-score-/).length).toBe(MATCHES.length);
    });
  });

  it('hides loading skeleton when results arrive', async () => {
    setupHappyPath();
    const { queryByTestId, getByTestId } = renderScreen();

    // Wait for success state to confirm loading is done
    await waitFor(() => {
      expect(getByTestId('visual-search-results-list')).toBeTruthy();
    });
    expect(queryByTestId('visual-search-results-loading')).toBeNull();
  });
});

// ── Product press → navigation ────────────────────────────────────────────────

describe('VisualSearchResultsScreen — product navigation', () => {
  it('navigates to ProductDetail when a result card is pressed', async () => {
    setupHappyPath();
    const { getByTestId } = renderScreen();

    await waitFor(() => {
      expect(getByTestId('visual-search-result-card-prod-1')).toBeTruthy();
    });

    fireEvent.press(getByTestId('visual-search-result-card-prod-1'));

    expect(mockNavigate).toHaveBeenCalledWith('ProductDetail', { slug: 'summit-futon' });
  });
});

// ── Empty state ───────────────────────────────────────────────────────────────

describe('VisualSearchResultsScreen — empty state', () => {
  it('shows empty state when search returns no matches', async () => {
    mockFetchCatalogExport.mockResolvedValue({ success: true, products: CATALOG_PRODUCTS });
    mockSearchByImage.mockResolvedValue({ success: true, matches: [] });

    const { getByTestId } = renderScreen();

    await waitFor(() => {
      expect(getByTestId('visual-search-results-empty')).toBeTruthy();
    });
  });

  it('shows "No matches found" message in empty state', async () => {
    mockFetchCatalogExport.mockResolvedValue({ success: true, products: CATALOG_PRODUCTS });
    mockSearchByImage.mockResolvedValue({ success: true, matches: [] });

    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText(/no matches found/i)).toBeTruthy();
    });
  });

  it('does not show error state in empty state', async () => {
    mockFetchCatalogExport.mockResolvedValue({ success: true, products: CATALOG_PRODUCTS });
    mockSearchByImage.mockResolvedValue({ success: true, matches: [] });

    const { queryByTestId } = renderScreen();

    await waitFor(() => {
      expect(queryByTestId('visual-search-results-error')).toBeNull();
    });
  });

  it('does not show results list in empty state', async () => {
    mockFetchCatalogExport.mockResolvedValue({ success: true, products: CATALOG_PRODUCTS });
    mockSearchByImage.mockResolvedValue({ success: true, matches: [] });

    const { queryByTestId } = renderScreen();

    await waitFor(() => {
      expect(queryByTestId('visual-search-results-list')).toBeNull();
    });
  });
});

// ── Error state ───────────────────────────────────────────────────────────────

describe('VisualSearchResultsScreen — error state (catalog fetch fails)', () => {
  it('shows error state when catalog fetch fails', async () => {
    mockFetchCatalogExport.mockResolvedValue({ success: false, products: [], error: 'Network error' });

    const { getByTestId } = renderScreen();

    await waitFor(() => {
      expect(getByTestId('visual-search-results-error')).toBeTruthy();
    });
  });

  it('shows error message', async () => {
    mockFetchCatalogExport.mockResolvedValue({ success: false, products: [], error: 'Network error' });

    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText(/network error/i)).toBeTruthy();
    });
  });

  it('shows retry button on error', async () => {
    mockFetchCatalogExport.mockResolvedValue({ success: false, products: [], error: 'Timeout' });

    const { getByTestId } = renderScreen();

    await waitFor(() => {
      expect(getByTestId('visual-search-results-retry')).toBeTruthy();
    });
  });

  it('retrying re-runs the search', async () => {
    mockFetchCatalogExport
      .mockResolvedValueOnce({ success: false, products: [], error: 'Timeout' })
      .mockResolvedValueOnce({ success: true, products: CATALOG_PRODUCTS });
    mockSearchByImage.mockResolvedValue({ success: true, matches: MATCHES });

    const { getByTestId } = renderScreen();

    await waitFor(() => {
      expect(getByTestId('visual-search-results-retry')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId('visual-search-results-retry'));
    });

    await waitFor(() => {
      expect(getByTestId('visual-search-results-list')).toBeTruthy();
    });
  });
});

describe('VisualSearchResultsScreen — error state (embedding search fails)', () => {
  it('shows error state when search API fails', async () => {
    mockFetchCatalogExport.mockResolvedValue({ success: true, products: CATALOG_PRODUCTS });
    mockSearchByImage.mockResolvedValue({ success: false, matches: [], error: 'Server error' });

    const { getByTestId } = renderScreen();

    await waitFor(() => {
      expect(getByTestId('visual-search-results-error')).toBeTruthy();
    });
  });

  it('shows error state when search API throws', async () => {
    mockFetchCatalogExport.mockResolvedValue({ success: true, products: CATALOG_PRODUCTS });
    mockSearchByImage.mockRejectedValue(new Error('Unexpected crash'));

    const { getByTestId } = renderScreen();

    await waitFor(() => {
      expect(getByTestId('visual-search-results-error')).toBeTruthy();
    });
  });
});
