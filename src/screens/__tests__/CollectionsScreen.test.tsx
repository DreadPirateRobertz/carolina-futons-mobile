import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { CollectionsScreen } from '../CollectionsScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

const mockPremiumValue = {
  isPremium: false,
  isLoading: false,
  offerings: [],
  error: null,
  purchase: jest.fn(),
  restore: jest.fn(),
  refreshStatus: jest.fn(),
};

const mockMiniCartOpen = jest.fn();
jest.mock('@/hooks/useMiniCartDrawer', () => ({
  useMiniCartDrawer: () => ({
    open: mockMiniCartOpen,
    close: jest.fn(),
    toggle: jest.fn(),
    isOpen: false,
  }),
}));

jest.mock('@/hooks/useCart', () => ({
  useCart: () => ({ itemCount: 2, items: [], subtotal: 0 }),
}));

jest.mock('@/hooks/usePremium', () => ({
  PremiumProvider: ({ children }: any) => children,
  usePremium: () => mockPremiumValue,
}));

const mockUseCollections = jest.fn();
jest.mock('@/hooks/useCollections', () => ({
  useCollections: () => mockUseCollections(),
}));

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => ({
    queryData: jest.fn().mockResolvedValue({ items: [], totalResults: 0 }),
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

const COLLECTIONS_LOADED = {
  collections: [
    {
      id: 'col-1',
      slug: 'mountain-lodge-living',
      title: 'Mountain Lodge Living',
      subtitle: 'Cozy warmth',
      description: 'Test',
      heroImage: { uri: 'https://example.com/img.jpg', alt: 'Lodge' },
      mood: [],
      featured: true,
      productIds: [],
    },
  ],
  featured: [],
  isLoading: false,
  isStale: false,
  error: null,
  refresh: jest.fn(),
};

function renderCollectionsScreen() {
  return render(
    <NavigationContainer>
      <ThemeProvider>
        <CollectionsScreen />
      </ThemeProvider>
    </NavigationContainer>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCollections.mockReturnValue(COLLECTIONS_LOADED);
});

describe('CollectionsScreen', () => {
  it('renders screen with testID', () => {
    const { getByTestId } = renderCollectionsScreen();
    expect(getByTestId('collections-screen')).toBeTruthy();
  });

  it('renders Shop the Look header', () => {
    const { getByText } = renderCollectionsScreen();
    expect(getByText('Shop the Look')).toBeTruthy();
  });

  it('renders collection cards', () => {
    const { getByTestId } = renderCollectionsScreen();
    expect(getByTestId('collection-card-mountain-lodge-living')).toBeTruthy();
  });

  it('shows early access lock on gated collection for non-premium users', () => {
    mockUseCollections.mockReturnValue({
      ...COLLECTIONS_LOADED,
      collections: [
        {
          ...COLLECTIONS_LOADED.collections[0],
          slug: 'spring-2026-preview',
          earlyAccess: true,
        },
      ],
    });
    mockPremiumValue.isPremium = false;
    const { getByTestId } = renderCollectionsScreen();
    expect(getByTestId('early-access-lock-spring-2026-preview')).toBeTruthy();
    mockPremiumValue.isPremium = false;
  });

  it('hides early access lock for premium users', () => {
    mockUseCollections.mockReturnValue({
      ...COLLECTIONS_LOADED,
      collections: [
        {
          ...COLLECTIONS_LOADED.collections[0],
          slug: 'spring-2026-preview',
          earlyAccess: true,
        },
      ],
    });
    mockPremiumValue.isPremium = true;
    const { queryByTestId } = renderCollectionsScreen();
    expect(queryByTestId('early-access-lock-spring-2026-preview')).toBeNull();
    mockPremiumValue.isPremium = false;
  });
});

// ── Skeleton loading state ─────────────────────────────────────────────────────

describe('CollectionsScreen — skeleton loading', () => {
  it('shows skeleton placeholders while loading', () => {
    mockUseCollections.mockReturnValue({
      ...COLLECTIONS_LOADED,
      collections: [],
      isLoading: true,
    });
    const { getByTestId } = renderCollectionsScreen();
    expect(getByTestId('collections-skeleton')).toBeTruthy();
  });

  it('renders 4 skeleton cards while loading', () => {
    mockUseCollections.mockReturnValue({
      ...COLLECTIONS_LOADED,
      collections: [],
      isLoading: true,
    });
    const { getAllByTestId } = renderCollectionsScreen();
    expect(getAllByTestId(/^skeleton-collection-card-/).length).toBe(4);
  });

  it('does not show error state while loading', () => {
    mockUseCollections.mockReturnValue({
      ...COLLECTIONS_LOADED,
      collections: [],
      isLoading: true,
    });
    const { queryByTestId } = renderCollectionsScreen();
    expect(queryByTestId('collections-error')).toBeNull();
  });

  it('does not show empty state while loading', () => {
    mockUseCollections.mockReturnValue({
      ...COLLECTIONS_LOADED,
      collections: [],
      isLoading: true,
    });
    const { queryByTestId } = renderCollectionsScreen();
    expect(queryByTestId('collections-empty')).toBeNull();
  });
});

// ── Error state ───────────────────────────────────────────────────────────────

describe('CollectionsScreen — error state', () => {
  it('shows error state when fetch fails', () => {
    mockUseCollections.mockReturnValue({
      ...COLLECTIONS_LOADED,
      collections: [],
      isLoading: false,
      error: new Error('Network error'),
    });
    const { getByTestId } = renderCollectionsScreen();
    expect(getByTestId('collections-error')).toBeTruthy();
  });

  it('shows error message text', () => {
    mockUseCollections.mockReturnValue({
      ...COLLECTIONS_LOADED,
      collections: [],
      isLoading: false,
      error: new Error('Network error'),
    });
    const { getByTestId } = renderCollectionsScreen();
    expect(getByTestId('collections-error-message')).toBeTruthy();
  });

  it('shows retry button on error', () => {
    mockUseCollections.mockReturnValue({
      ...COLLECTIONS_LOADED,
      collections: [],
      isLoading: false,
      error: new Error('Network error'),
    });
    const { getByTestId } = renderCollectionsScreen();
    expect(getByTestId('collections-retry-btn')).toBeTruthy();
  });

  it('calls refresh when retry button is pressed', () => {
    const mockRefresh = jest.fn();
    mockUseCollections.mockReturnValue({
      ...COLLECTIONS_LOADED,
      collections: [],
      isLoading: false,
      error: new Error('Network error'),
      refresh: mockRefresh,
    });
    const { getByTestId } = renderCollectionsScreen();
    fireEvent.press(getByTestId('collections-retry-btn'));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('does not show skeleton or list when error', () => {
    mockUseCollections.mockReturnValue({
      ...COLLECTIONS_LOADED,
      collections: [],
      isLoading: false,
      error: new Error('Network error'),
    });
    const { queryByTestId } = renderCollectionsScreen();
    expect(queryByTestId('collections-skeleton')).toBeNull();
    expect(queryByTestId('collections-list')).toBeNull();
  });
});

// ── Empty state ───────────────────────────────────────────────────────────────

describe('CollectionsScreen — empty state', () => {
  it('shows empty state when collections array is empty', () => {
    mockUseCollections.mockReturnValue({
      ...COLLECTIONS_LOADED,
      collections: [],
      isLoading: false,
      error: null,
    });
    const { getByTestId } = renderCollectionsScreen();
    expect(getByTestId('collections-empty')).toBeTruthy();
  });

  it('shows empty state message text', () => {
    mockUseCollections.mockReturnValue({
      ...COLLECTIONS_LOADED,
      collections: [],
      isLoading: false,
      error: null,
    });
    const { getByTestId } = renderCollectionsScreen();
    expect(getByTestId('collections-empty-message')).toBeTruthy();
  });

  it('does not show skeleton or error in empty state', () => {
    mockUseCollections.mockReturnValue({
      ...COLLECTIONS_LOADED,
      collections: [],
      isLoading: false,
      error: null,
    });
    const { queryByTestId } = renderCollectionsScreen();
    expect(queryByTestId('collections-skeleton')).toBeNull();
    expect(queryByTestId('collections-error')).toBeNull();
  });
});

describe('CollectionsScreen — cart icon opens mini-cart', () => {
  it('renders a header cart icon', () => {
    const { getByTestId } = renderCollectionsScreen();
    expect(getByTestId('collections-header-cart')).toBeTruthy();
  });

  it('tapping the header cart icon opens the mini-cart drawer', () => {
    const { getByTestId } = renderCollectionsScreen();
    fireEvent.press(getByTestId('collections-header-cart'));
    expect(mockMiniCartOpen).toHaveBeenCalledTimes(1);
  });

  it('shows the item count badge on the header cart icon', () => {
    const { getByTestId } = renderCollectionsScreen();
    expect(getByTestId('collections-header-cart-badge')).toBeTruthy();
  });
});
