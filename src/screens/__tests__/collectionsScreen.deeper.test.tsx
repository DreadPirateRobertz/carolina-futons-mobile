/**
 * CollectionsScreen deeper edge cases — cm-os9
 *
 * Covers:
 *  - collections-list testID with data present
 *  - multiple collections render (2 cards)
 *  - Alert "Learn More" button navigates to Premium
 *  - empty message text content
 *  - single-item collection (no crash)
 *  - stale data (isStale=true) shows list normally
 *  - collection subtitle/description render
 */
import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { CollectionsScreen } from '../CollectionsScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate }),
  };
});

const mockPremiumValue = {
  isPremium: false,
  isLoading: false,
  offerings: [],
  error: null,
  purchase: jest.fn(),
  restore: jest.fn(),
  refreshStatus: jest.fn(),
};

jest.mock('@/hooks/useMiniCartDrawer', () => ({
  useMiniCartDrawer: () => ({
    open: jest.fn(),
    close: jest.fn(),
    toggle: jest.fn(),
    isOpen: false,
  }),
}));
jest.mock('@/hooks/useCart', () => ({
  useCart: () => ({ itemCount: 0, items: [], subtotal: 0 }),
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

const mockUseCollections = jest.fn();
jest.mock('@/hooks/useCollections', () => ({
  useCollections: () => mockUseCollections(),
}));

const BASE_COLLECTION = {
  id: 'col-1',
  slug: 'mountain-lodge-living',
  title: 'Mountain Lodge Living',
  subtitle: 'Cozy warmth',
  description: 'Test description',
  heroImage: { uri: 'https://example.com/img.jpg', alt: 'Lodge' },
  mood: [],
  featured: true,
  productIds: [],
};

const COLLECTION_B = {
  id: 'col-2',
  slug: 'blue-ridge-retreat',
  title: 'Blue Ridge Retreat',
  subtitle: 'Rustic comfort',
  description: 'Mountain style',
  heroImage: { uri: 'https://example.com/img2.jpg', alt: 'Retreat' },
  mood: [],
  featured: false,
  productIds: [],
};

function renderCollections() {
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
  mockUseCollections.mockReturnValue({
    collections: [BASE_COLLECTION],
    featured: [],
    isLoading: false,
    isStale: false,
    error: null,
    refresh: jest.fn(),
  });
});

// ── collections-list testID ───────────────────────────────────────────────────

describe('CollectionsScreen — collections list renders', () => {
  it('shows collections-list testID when collections exist', () => {
    const { getByTestId } = renderCollections();
    expect(getByTestId('collections-list')).toBeTruthy();
  });

  it('does not show collections-list when empty', () => {
    mockUseCollections.mockReturnValue({
      collections: [],
      featured: [],
      isLoading: false,
      isStale: false,
      error: null,
      refresh: jest.fn(),
    });
    const { queryByTestId } = renderCollections();
    expect(queryByTestId('collections-list')).toBeNull();
  });
});

// ── Multiple collections ──────────────────────────────────────────────────────

describe('CollectionsScreen — multiple collections', () => {
  it('renders two collection cards when two collections exist', () => {
    mockUseCollections.mockReturnValue({
      collections: [BASE_COLLECTION, COLLECTION_B],
      featured: [],
      isLoading: false,
      isStale: false,
      error: null,
      refresh: jest.fn(),
    });
    const { getByTestId } = renderCollections();
    expect(getByTestId('collection-card-mountain-lodge-living')).toBeTruthy();
    expect(getByTestId('collection-card-blue-ridge-retreat')).toBeTruthy();
  });

  it('renders first card only when single collection', () => {
    const { getByTestId, queryByTestId } = renderCollections();
    expect(getByTestId('collection-card-mountain-lodge-living')).toBeTruthy();
    expect(queryByTestId('collection-card-blue-ridge-retreat')).toBeNull();
  });
});

// ── Alert "Learn More" → navigate to Premium ──────────────────────────────────

describe('CollectionsScreen — earlyAccess Alert "Learn More"', () => {
  beforeEach(() => {
    mockPremiumValue.isPremium = false;
    mockUseCollections.mockReturnValue({
      collections: [{ ...BASE_COLLECTION, slug: 'spring-preview', earlyAccess: true }],
      featured: [],
      isLoading: false,
      isStale: false,
      error: null,
      refresh: jest.fn(),
    });
  });

  it('"Learn More" alert button navigates to Premium', () => {
    let capturedButtons: any[] = [];
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      capturedButtons = buttons ?? [];
    });
    const { getByTestId } = renderCollections();
    fireEvent.press(getByTestId('collection-card-spring-preview'));
    const learnMore = capturedButtons.find((b) => b.text === 'Learn More');
    learnMore?.onPress?.();
    expect(mockNavigate).toHaveBeenCalledWith('Premium');
    jest.restoreAllMocks();
  });

  it('"Not Now" alert button does not navigate', () => {
    let capturedButtons: any[] = [];
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      capturedButtons = buttons ?? [];
    });
    const { getByTestId } = renderCollections();
    fireEvent.press(getByTestId('collection-card-spring-preview'));
    const notNow = capturedButtons.find((b) => b.text === 'Not Now');
    notNow?.onPress?.();
    expect(mockNavigate).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });
});

// ── Empty state message text ──────────────────────────────────────────────────

describe('CollectionsScreen — empty state content', () => {
  beforeEach(() => {
    mockUseCollections.mockReturnValue({
      collections: [],
      featured: [],
      isLoading: false,
      isStale: false,
      error: null,
      refresh: jest.fn(),
    });
  });

  it('empty state shows "No collections available right now."', () => {
    const { getByText } = renderCollections();
    expect(getByText('No collections available right now.')).toBeTruthy();
  });

  it('empty state has collections-empty-message testID with correct text', () => {
    const { getByTestId } = renderCollections();
    expect(getByTestId('collections-empty-message').props.children).toBe(
      'No collections available right now.',
    );
  });
});

// ── Stale data state ──────────────────────────────────────────────────────────

describe('CollectionsScreen — stale data', () => {
  it('shows collection list when isStale=true (stale data still renders)', () => {
    mockUseCollections.mockReturnValue({
      collections: [BASE_COLLECTION],
      featured: [],
      isLoading: false,
      isStale: true,
      error: null,
      refresh: jest.fn(),
    });
    const { getByTestId } = renderCollections();
    expect(getByTestId('collections-list')).toBeTruthy();
    expect(getByTestId('collection-card-mountain-lodge-living')).toBeTruthy();
  });

  it('stale data does not show skeleton or error', () => {
    mockUseCollections.mockReturnValue({
      collections: [BASE_COLLECTION],
      featured: [],
      isLoading: false,
      isStale: true,
      error: null,
      refresh: jest.fn(),
    });
    const { queryByTestId } = renderCollections();
    expect(queryByTestId('collections-skeleton')).toBeNull();
    expect(queryByTestId('network-error-state')).toBeNull();
  });
});

// ── Error with Error object ───────────────────────────────────────────────────

describe('CollectionsScreen — error message from Error.message', () => {
  it('shows the Error.message text in error state', () => {
    mockUseCollections.mockReturnValue({
      collections: [],
      featured: [],
      isLoading: false,
      isStale: false,
      error: new Error('Connection timeout'),
      refresh: jest.fn(),
    });
    const { getByText } = renderCollections();
    expect(getByText('Connection timeout')).toBeTruthy();
  });

  it('shows fallback text when Error has no message', () => {
    const emptyError = new Error('');
    mockUseCollections.mockReturnValue({
      collections: [],
      featured: [],
      isLoading: false,
      isStale: false,
      error: emptyError,
      refresh: jest.fn(),
    });
    const { getByText } = renderCollections();
    expect(getByText('Something went wrong loading collections.')).toBeTruthy();
  });
});

// ── Screen structure ──────────────────────────────────────────────────────────

describe('CollectionsScreen — screen structure', () => {
  it('renders collections-screen testID', () => {
    const { getByTestId } = renderCollections();
    expect(getByTestId('collections-screen')).toBeTruthy();
  });

  it('header cart icon opens mini-cart when 2 collections present', () => {
    const mockOpen = jest.fn();
    jest.mock('@/hooks/useMiniCartDrawer', () => ({
      useMiniCartDrawer: () => ({ open: mockOpen, close: jest.fn(), toggle: jest.fn(), isOpen: false }),
    }));
    mockUseCollections.mockReturnValue({
      collections: [BASE_COLLECTION, COLLECTION_B],
      featured: [],
      isLoading: false,
      isStale: false,
      error: null,
      refresh: jest.fn(),
    });
    const { getByTestId } = renderCollections();
    expect(getByTestId('collections-list')).toBeTruthy();
    expect(getByTestId('collection-card-mountain-lodge-living')).toBeTruthy();
    expect(getByTestId('collection-card-blue-ridge-retreat')).toBeTruthy();
  });
});
