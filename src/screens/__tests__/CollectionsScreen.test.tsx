import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { CollectionsScreen } from '../CollectionsScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { COLLECTIONS } from '@/data/collections';

// Control useCollections state from tests
const mockRefresh = jest.fn();
const mockUseCollections = jest.fn();
jest.mock('@/hooks/useCollections', () => ({
  ...jest.requireActual('@/hooks/useCollections'),
  useCollections: () => mockUseCollections(),
}));

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

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => ({
    queryData: jest.fn().mockResolvedValue({ items: [], totalResults: 0 }),
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

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
  mockPremiumValue.isPremium = false;
  // Default: loaded, no error, full static collections
  mockUseCollections.mockReturnValue({
    collections: COLLECTIONS,
    featured: COLLECTIONS.filter((c) => c.featured),
    isLoading: false,
    isStale: false,
    error: null,
    refresh: mockRefresh,
  });
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
    mockPremiumValue.isPremium = false;
    const { getByTestId } = renderCollectionsScreen();
    expect(getByTestId('early-access-lock-spring-2026-preview')).toBeTruthy();
  });

  it('hides early access lock for premium users', () => {
    mockPremiumValue.isPremium = true;
    const { queryByTestId } = renderCollectionsScreen();
    expect(queryByTestId('early-access-lock-spring-2026-preview')).toBeNull();
  });
});

describe('CollectionsScreen — loading state', () => {
  beforeEach(() => {
    mockUseCollections.mockReturnValue({
      collections: [],
      featured: [],
      isLoading: true,
      isStale: false,
      error: null,
      refresh: mockRefresh,
    });
  });

  it('shows skeleton while loading', () => {
    const { getByTestId } = renderCollectionsScreen();
    expect(getByTestId('skeleton-collection-list')).toBeTruthy();
  });

  it('hides the collections list while loading', () => {
    const { queryByTestId } = renderCollectionsScreen();
    expect(queryByTestId('collections-list')).toBeNull();
  });
});

describe('CollectionsScreen — error state', () => {
  beforeEach(() => {
    mockUseCollections.mockReturnValue({
      collections: [],
      featured: [],
      isLoading: false,
      isStale: false,
      error: new Error('Network request failed'),
      refresh: mockRefresh,
    });
  });

  it('shows error message when fetch fails', () => {
    const { getByTestId } = renderCollectionsScreen();
    expect(getByTestId('collections-error')).toBeTruthy();
  });

  it('shows retry button on error', () => {
    const { getByTestId } = renderCollectionsScreen();
    expect(getByTestId('collections-retry')).toBeTruthy();
  });

  it('tapping retry calls refresh', () => {
    const { getByTestId } = renderCollectionsScreen();
    fireEvent.press(getByTestId('collections-retry'));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('hides collections list on error', () => {
    const { queryByTestId } = renderCollectionsScreen();
    expect(queryByTestId('collections-list')).toBeNull();
  });
});

describe('CollectionsScreen — empty state', () => {
  beforeEach(() => {
    mockUseCollections.mockReturnValue({
      collections: [],
      featured: [],
      isLoading: false,
      isStale: false,
      error: null,
      refresh: mockRefresh,
    });
  });

  it('shows empty state when no collections returned', () => {
    const { getByTestId } = renderCollectionsScreen();
    expect(getByTestId('collections-empty')).toBeTruthy();
  });

  it('hides collections list when empty', () => {
    const { queryByTestId } = renderCollectionsScreen();
    expect(queryByTestId('collections-list')).toBeNull();
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
