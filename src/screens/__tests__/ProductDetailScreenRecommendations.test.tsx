/**
 * @module ProductDetailScreenRecommendations.test
 *
 * TDD stubs — cm-36j Phase 2.2.
 * Tests "Customers also bought" section on ProductDetailScreen:
 * skeleton while loading, carousel after load, hidden when empty.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { ProductDetailScreen } from '../ProductDetailScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import { CompareProvider } from '@/contexts/CompareContext';

jest.mock('expo-image', () => ({ Image: 'Image' }));
jest.mock('expo-av', () => ({}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));
jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  return {
    __esModule: true,
    default: {
      View: RN.View,
      ScrollView: RN.ScrollView,
      FlatList: RN.FlatList,
      createAnimatedComponent: (c: any) => c,
      timing: jest.fn(),
      spring: jest.fn(),
      Value: jest.fn(() => ({ setValue: jest.fn(), interpolate: jest.fn(() => 0) })),
    },
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: (fn: any) => {
      try {
        return fn();
      } catch {
        return {};
      }
    },
    useAnimatedScrollHandler: () => () => {},
    useAnimatedRef: () => ({ current: null }),
    withSpring: (v: any) => v,
    withTiming: (v: any) => v,
    withRepeat: (v: any) => v,
    withDelay: (_d: any, v: any) => v,
    interpolate: () => 0,
    Extrapolation: { CLAMP: 'CLAMP' },
    Easing: { inOut: (f: any) => f, ease: 0, linear: 0 },
    runOnJS: (fn: any) => fn,
    runOnUI: (fn: any) => fn,
    SlideInDown: { springify: () => ({ damping: () => ({}) }) },
    SlideOutDown: { duration: () => ({}) },
    FadeIn: { duration: () => ({}) },
    FadeOut: { duration: () => ({}) },
  };
});
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));
jest.mock('@/hooks/usePremium', () => ({
  PremiumProvider: ({ children }: any) => children,
  usePremium: () => ({
    isPremium: false,
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
    isAuthenticated: false,
    user: null,
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
const mockTrackView = jest.fn();
const mockTrackPurchase = jest.fn();
jest.mock('@/hooks/useRecommendations', () => ({
  useRecommendations: () => ({
    similarItems: [],
    trackView: mockTrackView,
    trackPurchase: mockTrackPurchase,
  }),
  RecommendationsProvider: ({ children }: any) => children,
}));
jest.mock('@/services/wix/wixProvider', () => ({
  useWixClient: () => null,
  useOptionalWixClient: () => null,
  WixProvider: ({ children }: any) => children,
}));
jest.mock('@/hooks/useCart', () => ({
  useCart: () => ({
    addItem: jest.fn(),
    itemCount: 0,
    items: [],
    subtotal: 0,
    syncing: false,
    removeItem: jest.fn(),
    updateQuantity: jest.fn(),
    clearCart: jest.fn(),
    pendingSync: 0,
    isSyncing: false,
    loadItems: jest.fn(),
  }),
  CartProvider: ({ children }: any) => children,
}));

// Co-purchase recommendations mock — controlled per test
const mockProductRecs = jest.fn();
jest.mock('@/hooks/useProductRecommendations', () => ({
  useProductRecommendations: () => mockProductRecs(),
  clearRecommendationsCache: jest.fn(),
}));

const mockRec = {
  id: 'p2',
  name: 'Blue Ridge Full',
  slug: 'blue-ridge-full',
  price: 449,
  category: 'futons' as const,
  fabricOptions: ['Slate Gray'],
  images: [],
  rating: 4.0,
  reviewCount: 8,
  description: 'Another futon',
  inStock: true,
  featured: false,
};

function renderDetail() {
  return render(
    <ThemeProvider>
      <CompareProvider>
        <WishlistProvider>
          <ProductDetailScreen productId="p1" />
        </WishlistProvider>
      </CompareProvider>
    </ThemeProvider>,
  );
}

describe('ProductDetailScreen — "Customers also bought" section', () => {
  describe('loading state', () => {
    beforeEach(() => {
      mockProductRecs.mockReturnValue({ isLoading: true, recommendations: [], error: null });
    });

    it('shows skeleton while loading co-purchase recommendations', () => {
      const { getByTestId } = renderDetail();
      expect(getByTestId('skeleton-also-bought')).toBeTruthy();
    });

    it('does not show carousel while loading', () => {
      const { queryByTestId } = renderDetail();
      expect(queryByTestId('also-bought-carousel')).toBeNull();
    });
  });

  describe('loaded with recommendations', () => {
    beforeEach(() => {
      mockProductRecs.mockReturnValue({
        isLoading: false,
        recommendations: [mockRec],
        error: null,
      });
    });

    it('shows "Customers also bought" carousel after load', () => {
      const { getByTestId } = renderDetail();
      expect(getByTestId('also-bought-carousel')).toBeTruthy();
    });

    it('does not show skeleton after load', () => {
      const { queryByTestId } = renderDetail();
      expect(queryByTestId('skeleton-also-bought')).toBeNull();
    });
  });

  describe('empty recommendations', () => {
    beforeEach(() => {
      mockProductRecs.mockReturnValue({ isLoading: false, recommendations: [], error: null });
    });

    it('hides "Customers also bought" section when no recommendations', () => {
      const { queryByTestId } = renderDetail();
      expect(queryByTestId('also-bought-carousel')).toBeNull();
      expect(queryByTestId('skeleton-also-bought')).toBeNull();
    });
  });
});
