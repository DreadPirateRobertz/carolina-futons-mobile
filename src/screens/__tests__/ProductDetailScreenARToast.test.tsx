/**
 * TDD tests — cf-1q0
 *
 * AR points toast: fires on first AR use per session, shows +25 points,
 * tapping navigates to AccountScreen, AsyncStorage flag prevents repeat.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ProductDetailScreen } from '../ProductDetailScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import { CompareProvider } from '@/contexts/CompareContext';
import { FUTON_MODELS } from '@/data/futons';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@/services/uploadReviewPhoto', () => ({
  uploadReviewPhoto: jest.fn().mockResolvedValue('https://example.com/photo.jpg'),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

jest.mock('@/hooks/usePremium', () => ({
  PremiumProvider: ({ children }: any) => children,
  usePremium: () => ({
    isPremium: true,
    isLoading: false,
    offerings: [],
    error: null,
    purchase: jest.fn(),
    restore: jest.fn(),
    refreshStatus: jest.fn(),
  }),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'user-1', email: 'test@example.com', displayName: 'Test' },
    loading: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
    signUp: jest.fn(),
  }),
}));

jest.mock('@/hooks/useCart', () => ({
  useCart: () => ({
    items: [],
    addItem: jest.fn(),
    removeItem: jest.fn(),
    updateQuantity: jest.fn(),
    total: 0,
    itemCount: 0,
    clearCart: jest.fn(),
    loadItems: jest.fn(),
  }),
  CartProvider: ({ children }: any) => children,
}));

const mockArUsed = jest.fn().mockResolvedValue({ success: true });
jest.mock('@/hooks/useGamificationEvents', () => ({
  useGamificationEvents: () => ({
    addToCart: jest.fn(),
    submitReview: jest.fn(),
    referralShared: jest.fn(),
    arUsed: mockArUsed,
    wishlistAdd: jest.fn(),
  }),
}));

jest.mock('@/hooks/useProductReviews', () => ({
  useProductReviews: () => ({
    aggregate: { averageRating: 4.3, totalReviews: 10 },
    reviews: [],
    isLoading: false,
    error: null,
  }),
}));

jest.mock('@/hooks/useProductResources', () => ({
  useProductResources: () => ({ resources: [], loading: false, error: null }),
}));

jest.mock('@/hooks/useRecentlyViewed', () => ({
  useRecentlyViewed: () => ({
    recentProducts: [],
    addViewed: jest.fn(),
    clearAll: jest.fn(),
    count: 0,
  }),
}));

jest.mock('@/hooks/useRecentlyViewedSlugs', () => ({
  useRecentlyViewedSlugs: () => ({ slugs: [], addSlug: jest.fn() }),
}));

jest.mock('@/utils', () => ({
  ...jest.requireActual('@/utils'),
  openARViewer: jest.fn(),
}));

jest.mock('@/services/arSupport', () => ({
  isARSupported: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/services/wix/config', () => ({ isWixConfigured: () => false }));

jest.mock('@/hooks/useRecommendations', () => ({
  useRecommendations: () => ({
    similarItems: [],
    trackView: jest.fn(),
    recommendations: [],
    isLoading: false,
  }),
  RecommendationsProvider: ({ children }: any) => children,
}));

jest.mock('@/hooks/useProductRecommendations', () => ({
  useProductRecommendations: () => ({ isLoading: false, recommendations: [], error: null }),
  clearRecommendationsCache: jest.fn(),
}));

Alert.alert = jest.fn();

const model = FUTON_MODELS[0];

function renderScreen() {
  return render(
    <ThemeProvider>
      <WishlistProvider>
        <CompareProvider>
          <ProductDetailScreen productId={model.id} />
        </CompareProvider>
      </WishlistProvider>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockArUsed.mockResolvedValue({ success: true });
  const AsyncStorage = require('@react-native-async-storage/async-storage');
  AsyncStorage.clear();
});

describe('ProductDetailScreen — AR points toast (cf-1q0)', () => {
  it('shows ar-points-toast after first AR use succeeds', async () => {
    const { getByTestId, queryByTestId } = renderScreen();
    expect(queryByTestId('ar-points-toast')).toBeNull();

    await act(async () => {
      fireEvent.press(getByTestId('detail-ar-button'));
    });

    await waitFor(() => {
      expect(getByTestId('ar-points-toast')).toBeTruthy();
    });
  });

  it('toast displays 25 points', async () => {
    const { getByTestId } = renderScreen();

    await act(async () => {
      fireEvent.press(getByTestId('detail-ar-button'));
    });

    await waitFor(() => {
      const toast = getByTestId('ar-points-toast');
      expect(toast.props.accessibilityLabel).toContain('25');
    });
  });

  it('tapping ar-account-link navigates to Account tab', async () => {
    const { getByTestId } = renderScreen();

    await act(async () => {
      fireEvent.press(getByTestId('detail-ar-button'));
    });

    await waitFor(() => getByTestId('ar-account-link'));
    fireEvent.press(getByTestId('ar-account-link'));

    expect(mockNavigate).toHaveBeenCalledWith('Tabs', { screen: 'Account' });
  });

  it('does NOT show toast when arUsed returns success:false', async () => {
    mockArUsed.mockResolvedValue({ success: false });
    const { queryByTestId } = renderScreen();

    await act(async () => {
      fireEvent.press(queryByTestId('detail-ar-button')!);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(queryByTestId('ar-points-toast')).toBeNull();
  });

  it('does NOT show toast when arUsed rejects', async () => {
    mockArUsed.mockRejectedValue(new Error('AR service error'));
    const { queryByTestId } = renderScreen();

    await act(async () => {
      fireEvent.press(queryByTestId('detail-ar-button')!);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(queryByTestId('ar-points-toast')).toBeNull();
  });

  it('AsyncStorage flag prevents toast on second AR use', async () => {
    const { getByTestId, queryByTestId, unmount } = renderScreen();

    await act(async () => {
      fireEvent.press(getByTestId('detail-ar-button'));
    });
    await waitFor(() => getByTestId('ar-points-toast'));

    unmount();

    // Re-render (same session, flag persists in AsyncStorage mock)
    const { queryByTestId: queryByTestId2 } = renderScreen();
    await act(async () => {
      fireEvent.press(queryByTestId2('detail-ar-button')!);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(queryByTestId2('ar-points-toast')).toBeNull();
  });
});
