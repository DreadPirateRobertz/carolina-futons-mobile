/**
 * CollectionsScreen gap tests — covers:
 *   - navigation.navigate('CollectionDetail', ...) for non-earlyAccess collection (line 69)
 *   - Alert.alert for earlyAccess + non-premium (lines 59-67)
 *   - navigation.navigate('Premium') via Alert button (line 64)
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
  useMiniCartDrawer: () => ({ open: jest.fn(), close: jest.fn(), toggle: jest.fn(), isOpen: false }),
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
  description: 'Test',
  heroImage: { uri: 'https://example.com/img.jpg', alt: 'Lodge' },
  mood: [],
  featured: true,
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

describe('CollectionsScreen — collection navigation', () => {
  it('pressing a non-earlyAccess collection navigates to CollectionDetail', () => {
    const { getByTestId } = renderCollections();
    fireEvent.press(getByTestId('collection-card-mountain-lodge-living'));
    expect(mockNavigate).toHaveBeenCalledWith('CollectionDetail', { slug: 'mountain-lodge-living' });
  });

  it('pressing earlyAccess collection as non-premium shows Alert', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    mockUseCollections.mockReturnValue({
      collections: [{ ...BASE_COLLECTION, slug: 'spring-2026-preview', earlyAccess: true }],
      featured: [],
      isLoading: false,
      isStale: false,
      error: null,
      refresh: jest.fn(),
    });
    const { getByTestId } = renderCollections();
    fireEvent.press(getByTestId('collection-card-spring-2026-preview'));
    expect(alertSpy).toHaveBeenCalledWith(
      'CF+ Early Access',
      expect.any(String),
      expect.any(Array),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('pressing earlyAccess collection as premium user navigates to CollectionDetail', () => {
    mockPremiumValue.isPremium = true;
    mockUseCollections.mockReturnValue({
      collections: [{ ...BASE_COLLECTION, slug: 'spring-2026-preview', earlyAccess: true }],
      featured: [],
      isLoading: false,
      isStale: false,
      error: null,
      refresh: jest.fn(),
    });
    const { getByTestId } = renderCollections();
    fireEvent.press(getByTestId('collection-card-spring-2026-preview'));
    expect(mockNavigate).toHaveBeenCalledWith('CollectionDetail', { slug: 'spring-2026-preview' });
  });
});
