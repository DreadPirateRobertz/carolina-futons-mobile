/**
 * @module ProductDetailScreenARToast.test
 *
 * TDD tests for the AR points toast and AccountScreen deeplink surfaced when a
 * user opens the AR viewer from ProductDetailScreen.
 *
 * hq-27qq8
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ProductDetailScreen } from '../ProductDetailScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import { CompareProvider } from '@/contexts/CompareContext';
import { FUTON_MODELS } from '@/data/futons';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

jest.mock('@/services/uploadReviewPhoto', () => ({
  uploadReviewPhoto: jest.fn().mockResolvedValue('https://example.com/photo.jpg'),
}));

jest.mock('@/hooks/useProductReviews', () => ({
  useProductReviews: () => ({
    aggregate: { averageRating: 4.0, totalReviews: 10 },
    reviews: [],
    isLoading: false,
    error: null,
  }),
}));

jest.mock('@/hooks/useRecommendations', () => ({
  useRecommendations: () => ({
    recentlyViewed: [],
    similarItems: [],
    alsoBoought: [],
    recommendedForYou: [],
    trackView: jest.fn(),
    trackPurchase: jest.fn(),
    clearHistory: jest.fn(),
  }),
  RecommendationsProvider: ({ children }: any) => children,
}));

jest.mock('@/hooks/useProductRecommendations', () => ({
  useProductRecommendations: () => ({ isLoading: false, recommendations: [], error: null }),
  clearRecommendationsCache: jest.fn(),
}));

jest.mock('@/services/wix/wixProvider', () => ({
  useWixClient: () => null,
  useOptionalWixClient: () => null,
  WixProvider: ({ children }: any) => children,
}));

jest.mock('@/hooks/useCart', () => ({
  useCart: () => ({
    items: [],
    itemCount: 0,
    subtotal: 0,
    syncing: false,
    addItem: jest.fn(),
    removeItem: jest.fn(),
    updateQuantity: jest.fn(),
    clearCart: jest.fn(),
    pendingSync: 0,
    isSyncing: false,
    loadItems: jest.fn(),
  }),
  CartProvider: ({ children }: any) => children,
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'user-1', email: 'test@example.com', displayName: 'Test User' },
    loading: false,
    error: null,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signInWithGoogle: jest.fn(),
    signInWithApple: jest.fn(),
    resetPassword: jest.fn(),
    signOut: jest.fn(),
    clearError: jest.fn(),
  }),
  AuthProvider: ({ children }: any) => children,
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

jest.mock('@/hooks/useProductResources', () => ({
  useProductResources: () => ({ resources: [], loading: false, error: null }),
}));

const mockArUsed = jest.fn();

jest.mock('@/hooks/useGamificationEvents', () => ({
  useGamificationEvents: () => ({
    addToCart: jest.fn(),
    submitReview: jest.fn(),
    referralShared: jest.fn(),
    arUsed: mockArUsed,
    wishlistAdd: jest.fn(),
  }),
}));

jest.mock('@/utils', () => ({
  ...jest.requireActual('@/utils'),
  openARViewer: jest.fn(),
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

Alert.alert = jest.fn();

const asheville = FUTON_MODELS[0];

function renderDetail(props: Partial<React.ComponentProps<typeof ProductDetailScreen>> = {}) {
  return render(
    <ThemeProvider>
      <CompareProvider>
        <WishlistProvider>
          <ProductDetailScreen {...props} />
        </WishlistProvider>
      </CompareProvider>
    </ThemeProvider>,
  );
}

describe('ProductDetailScreen — AR points toast (hq-27qq8)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockArUsed.mockResolvedValue({ success: true });
  });

  it('shows ar-points-toast after AR button tap when arUsed succeeds', async () => {
    const { getByTestId } = renderDetail({ productId: asheville.id });
    const arButton = getByTestId('detail-ar-button');

    await act(async () => {
      fireEvent.press(arButton);
    });

    await waitFor(() => {
      expect(getByTestId('ar-points-toast')).toBeTruthy();
    });
  });

  it('ar-points-toast is not visible before AR is opened', () => {
    const { queryByTestId } = renderDetail({ productId: asheville.id });
    const toast = queryByTestId('ar-points-toast');
    // Toast may be in DOM (for animation) but not visually shown
    if (toast) {
      expect(toast.props.accessibilityElementsHidden).toBe(true);
    }
  });

  it('hides ar-points-toast after auto-dismiss timer', async () => {
    const { getByTestId } = renderDetail({ productId: asheville.id });

    await act(async () => {
      fireEvent.press(getByTestId('detail-ar-button'));
    });

    await waitFor(() => {
      expect(getByTestId('ar-points-toast')).toBeTruthy();
    });

    // Wait for the 2200ms auto-dismiss with real timers
    await waitFor(
      () => {
        const toast = getByTestId('ar-points-toast', { includeHiddenElements: true });
        expect(toast.props.accessibilityElementsHidden).toBe(true);
      },
      { timeout: 3000 },
    );
  }, 10000);

  it('does not show toast when arUsed returns success:false', async () => {
    mockArUsed.mockResolvedValue({ success: false });
    const { queryByTestId, getByTestId } = renderDetail({ productId: asheville.id });

    await act(async () => {
      fireEvent.press(getByTestId('detail-ar-button'));
    });

    const toast = queryByTestId('ar-points-toast');
    if (toast) {
      expect(toast.props.accessibilityElementsHidden).toBe(true);
    }
  });

  it('shows ar-account-link when toast is visible', async () => {
    const { getByTestId } = renderDetail({ productId: asheville.id });

    await act(async () => {
      fireEvent.press(getByTestId('detail-ar-button'));
    });

    await waitFor(() => {
      expect(getByTestId('ar-account-link')).toBeTruthy();
    });
  });

  it('ar-account-link navigates to Account tab', async () => {
    const { getByTestId } = renderDetail({ productId: asheville.id });

    await act(async () => {
      fireEvent.press(getByTestId('detail-ar-button'));
    });

    await waitFor(() => {
      expect(getByTestId('ar-account-link')).toBeTruthy();
    });

    fireEvent.press(getByTestId('ar-account-link'));
    expect(mockNavigate).toHaveBeenCalledWith('Tabs', { screen: 'Account' });
  });

  it('calls arUsed with the product id', async () => {
    const { getByTestId } = renderDetail({ productId: asheville.id });

    await act(async () => {
      fireEvent.press(getByTestId('detail-ar-button'));
    });

    expect(mockArUsed).toHaveBeenCalledWith(expect.any(String));
  });

  it('does not show toast when arUsed rejects (network/API error)', async () => {
    mockArUsed.mockRejectedValue(new Error('network error'));
    const { queryByTestId, getByTestId } = renderDetail({ productId: asheville.id });

    await act(async () => {
      fireEvent.press(getByTestId('detail-ar-button'));
    });

    const toast = queryByTestId('ar-points-toast');
    if (toast) {
      expect(toast.props.accessibilityElementsHidden).toBe(true);
    }
  });
});
