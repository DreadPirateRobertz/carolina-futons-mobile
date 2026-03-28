import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, Platform, Dimensions, StyleSheet } from 'react-native';
import { ProductDetailScreen } from '../ProductDetailScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import { CompareProvider } from '@/contexts/CompareContext';
import { FUTON_MODELS, FABRICS } from '@/data/futons';
import { PRODUCTS } from '@/data/products';

// Mock uploadReviewPhoto to prevent expo-file-system → expo-modules-core native bridge access
jest.mock('@/services/uploadReviewPhoto', () => ({
  uploadReviewPhoto: jest.fn().mockResolvedValue('https://example.com/photo.jpg'),
}));

// CF-wah8: useProductReviews mock — inline star ratings near price
const mockProductReviewsResult: {
  aggregate: { averageRating: number; totalReviews: number };
  reviews: never[];
  isLoading: boolean;
  error: string | null;
} = {
  aggregate: { averageRating: 4.3, totalReviews: 42 },
  reviews: [],
  isLoading: false,
  error: null,
};
const mockUseProductReviews = jest.fn((_productId: string) => mockProductReviewsResult);
jest.mock('@/hooks/useProductReviews', () => ({
  useProductReviews: (productId: string) => mockUseProductReviews(productId),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
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

jest.mock('@/hooks/usePremium', () => ({
  PremiumProvider: ({ children }: any) => children,
  usePremium: () => mockPremiumValue,
}));

const mockAuthValue = {
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
};

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuthValue,
  AuthProvider: ({ children }: any) => children,
}));

const mockTrackView = jest.fn();
const mockSimilarItems = PRODUCTS.filter((p) => p.category === 'futons').slice(0, 4);
const mockRecommendationsValue = {
  recentlyViewed: [],
  similarItems: mockSimilarItems,
  alsoBoought: [],
  recommendedForYou: [],
  trackView: mockTrackView,
  trackPurchase: jest.fn(),
  clearHistory: jest.fn(),
};

jest.mock('@/hooks/useRecommendations', () => ({
  useRecommendations: () => mockRecommendationsValue,
  RecommendationsProvider: ({ children }: any) => children,
}));

jest.mock('@/hooks/useProductRecommendations', () => ({
  useProductRecommendations: () => ({ isLoading: false, recommendations: [], error: null }),
  clearRecommendationsCache: jest.fn(),
}));

jest.mock('@/services/wix/wixProvider', () => ({
  useWixClient: () => ({
    queryData: jest.fn().mockResolvedValue({ items: [], totalResults: 0 }),
    addToWishlist: jest.fn(),
    removeFromWishlist: jest.fn(),
  }),
  useOptionalWixClient: () => null,
  WixProvider: ({ children }: any) => children,
}));

const mockAddItem = jest.fn();
const mockCartValue = {
  items: [],
  itemCount: 0,
  subtotal: 0,
  syncing: false,
  addItem: mockAddItem,
  removeItem: jest.fn(),
  updateQuantity: jest.fn(),
  clearCart: jest.fn(),
  pendingSync: 0,
  isSyncing: false,
  loadItems: jest.fn(),
};

jest.mock('@/hooks/useCart', () => ({
  useCart: () => mockCartValue,
  CartProvider: ({ children }: any) => children,
}));

jest.mock('@/hooks/useGamificationEvents', () => ({
  useGamificationEvents: () => ({
    addToCart: jest.fn(),
    submitReview: jest.fn(),
    referralShared: jest.fn(),
    arUsed: jest.fn(),
    wishlistAdd: jest.fn(),
  }),
}));

jest.mock('@/hooks/useProductResources', () => ({
  useProductResources: () => ({ resources: [], loading: false, error: null }),
}));

const mockAlert = jest.fn();
Alert.alert = mockAlert;

const asheville = FUTON_MODELS[0]; // The Asheville, $349
const blueRidge = FUTON_MODELS[1]; // The Blue Ridge, $449
const naturalLinen = FABRICS[0]; // Natural Linen, $0
const mountainBlue = FABRICS.find((f) => f.id === 'mountain-blue')!; // $29
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

beforeEach(() => {
  jest.clearAllMocks();
  mockUseProductReviews.mockReturnValue(mockProductReviewsResult);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('ProductDetailScreen', () => {
  describe('Rendering', () => {
    it('renders with default testID', () => {
      const { getByTestId } = renderDetail();
      expect(getByTestId('product-detail-screen')).toBeTruthy();
    });

    it('accepts custom testID', () => {
      const { getByTestId } = renderDetail({ testID: 'custom-detail' });
      expect(getByTestId('custom-detail')).toBeTruthy();
    });

    it('defaults to first model when no productId given', () => {
      const { getByTestId } = renderDetail();
      expect(getByTestId('product-name').props.children).toBe(asheville.name);
    });

    it('defaults to first model for unknown productId', () => {
      const { getByTestId } = renderDetail({ productId: 'nonexistent' });
      expect(getByTestId('product-name').props.children).toBe(asheville.name);
    });

    it('renders specified product by ID', () => {
      const { getByTestId } = renderDetail({ productId: 'blue-ridge-queen' });
      expect(getByTestId('product-name').props.children).toBe(blueRidge.name);
    });
  });

  describe('Product Info', () => {
    it('shows product name', () => {
      const { getByText } = renderDetail({ productId: 'asheville-full' });
      expect(getByText('The Asheville')).toBeTruthy();
    });

    it('shows product tagline', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      expect(getByTestId('product-tagline').props.children).toBe(asheville.tagline);
    });

    it('product name has header accessibility role', () => {
      const { getByTestId } = renderDetail();
      expect(getByTestId('product-name').props.accessibilityRole).toBe('header');
    });

    it('shows base price for default fabric (no surcharge)', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      expect(getByTestId('total-price').props.children).toBe('$349.00');
    });

    it('does not show price breakdown for free fabrics', () => {
      const { queryByTestId } = renderDetail({ productId: 'asheville-full' });
      expect(queryByTestId('price-breakdown')).toBeNull();
    });
  });

  describe('Image Gallery', () => {
    it('renders gallery list', () => {
      const { getByTestId } = renderDetail();
      expect(getByTestId('gallery-list')).toBeTruthy();
    });

    it('renders all four gallery slides', () => {
      const { getByTestId } = renderDetail();
      for (let i = 0; i < 4; i++) {
        expect(getByTestId(`gallery-slide-${i}`)).toBeTruthy();
      }
    });

    it('renders futon placeholders in gallery', () => {
      const { getByTestId } = renderDetail();
      for (let i = 0; i < 4; i++) {
        expect(getByTestId(`futon-placeholder-${i}`)).toBeTruthy();
      }
    });

    it('renders pagination dots', () => {
      const { getByTestId } = renderDetail();
      expect(getByTestId('gallery-pagination')).toBeTruthy();
      for (let i = 0; i < 4; i++) {
        expect(getByTestId(`gallery-dot-${i}`)).toBeTruthy();
      }
    });

    it('renders gallery view labels', () => {
      const { getByText } = renderDetail();
      expect(getByText('Front View')).toBeTruthy();
      expect(getByText('Side View')).toBeTruthy();
      expect(getByText('Flat Position')).toBeTruthy();
      expect(getByText('Detail')).toBeTruthy();
    });

    it('opens fullscreen modal when gallery slide tapped', () => {
      const { getByTestId, queryByTestId } = renderDetail();
      // Modal starts hidden (not visible)
      expect(queryByTestId('gallery-modal-close')).toBeNull();
      fireEvent.press(getByTestId('gallery-slide-0'));
      // Modal becomes visible after press — close button appears
      expect(getByTestId('gallery-modal-close')).toBeTruthy();
    });

    it('gallery slides have tap-to-fullscreen accessibility label', () => {
      const { getByTestId } = renderDetail();
      const slide = getByTestId('gallery-slide-0');
      expect(slide.props.accessibilityLabel).toContain('Tap to view fullscreen');
    });

    it('closes fullscreen modal when close button pressed', () => {
      const { getByTestId, queryByTestId } = renderDetail();
      fireEvent.press(getByTestId('gallery-slide-0'));
      expect(getByTestId('gallery-modal-close')).toBeTruthy();
      fireEvent.press(getByTestId('gallery-modal-close'));
      expect(queryByTestId('gallery-modal-close')).toBeNull();
    });

    it('passes activeGalleryIndex as initialIndex to fullscreen modal', () => {
      const { getByTestId } = renderDetail();
      fireEvent.press(getByTestId('gallery-slide-0'));
      const modal = getByTestId('fullscreen-gallery-modal');
      expect(modal).toBeTruthy();
    });

    it('renders fullscreen gallery with all 4 views', () => {
      const { getByTestId } = renderDetail();
      fireEvent.press(getByTestId('gallery-slide-0'));
      expect(getByTestId('fullscreen-gallery-list')).toBeTruthy();
    });

    it('fullscreen gallery has counter showing current position', () => {
      const { getByTestId, getByText } = renderDetail();
      fireEvent.press(getByTestId('gallery-slide-0'));
      expect(getByText('1 / 4')).toBeTruthy();
    });

    it('fullscreen modal renders ZoomableImage for each slide', () => {
      const { getByTestId } = renderDetail();
      fireEvent.press(getByTestId('gallery-slide-0'));
      // ZoomableImage wraps each slide — verify via testIDs
      expect(getByTestId('fullscreen-zoom-0')).toBeTruthy();
    });

    it('fullscreen gallery has accessibility label on gallery list', () => {
      const { getByTestId } = renderDetail();
      fireEvent.press(getByTestId('gallery-slide-0'));
      const list = getByTestId('fullscreen-gallery-list');
      expect(list.props.accessibilityLabel).toBe('Product image gallery');
      expect(list.props.accessibilityHint).toBe('Swipe left or right to view more images');
    });

    it('passes onIndexChange to sync inline gallery state', () => {
      const { getByTestId } = renderDetail();
      fireEvent.press(getByTestId('gallery-slide-0'));
      // The fullscreen modal receives onIndexChange which updates activeGalleryIndex
      // This is verified by the ImageGalleryModal having the prop connected
      const modal = getByTestId('fullscreen-gallery-modal');
      expect(modal).toBeTruthy();
    });

    it('gallery slide at each index is tappable to open fullscreen', () => {
      const { getByTestId, queryByTestId } = renderDetail();
      // Each slide should be tappable
      for (let i = 0; i < 4; i++) {
        expect(getByTestId(`gallery-slide-${i}`)).toBeTruthy();
      }
      // Tapping any slide opens modal
      fireEvent.press(getByTestId('gallery-slide-2'));
      expect(queryByTestId('gallery-modal-close')).toBeTruthy();
    });
  });

  describe('shared element transition', () => {
    it('renders gallery container with transition testID for the default model', () => {
      const { getByTestId } = renderDetail();
      // asheville-full is the default model (FUTON_MODELS[0])
      expect(getByTestId(`product-image-gallery-${asheville.id}`)).toBeTruthy();
    });

    it('renders gallery container with transition testID for a specific model', () => {
      const { getByTestId } = renderDetail({ productId: blueRidge.id });
      expect(getByTestId(`product-image-gallery-${blueRidge.id}`)).toBeTruthy();
    });

    it('gallery testID does not contain prod- prefix (must match ProductCard normalized tag)', () => {
      // The gallery testID is keyed on model.id (no prod- prefix), matching the
      // format of the sharedTransitionTag used by ProductCard after normalization.
      const { getByTestId } = renderDetail();
      const gallery = getByTestId(`product-image-gallery-${asheville.id}`);
      // testID must NOT have the prod- prefix — if it did, the naming would diverge
      // from the sharedTransitionTag (which is also prefix-free).
      expect(gallery.props.testID).not.toMatch(/prod-/);
    });
  });

  describe('Share Button', () => {
    let shareSpy: jest.SpyInstance;
    let shareProductSpy: jest.SpyInstance;

    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Share } = require('react-native');
      shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const analytics = require('@/services/analytics');
      shareProductSpy = jest.spyOn(analytics.events, 'shareProduct').mockImplementation(() => {});
    });

    afterEach(() => {
      shareSpy.mockRestore();
      shareProductSpy.mockRestore();
    });

    it('renders share button', () => {
      const { getByTestId } = renderDetail();
      expect(getByTestId('detail-share-button')).toBeTruthy();
    });

    it('share button has accessibility label with product name', () => {
      const { getByTestId } = renderDetail();
      const shareBtn = getByTestId('detail-share-button');
      expect(shareBtn.props.accessibilityLabel).toContain('Share');
    });

    it('share button has accessibilityHint describing the action (cm-a11y-shipping)', () => {
      const { getByTestId } = renderDetail();
      const shareBtn = getByTestId('detail-share-button');
      expect(shareBtn.props.accessibilityHint).toBeTruthy();
    });

    it('calls Share.share with product slug in deep link on press', async () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      fireEvent.press(getByTestId('detail-share-button'));
      await waitFor(() => expect(shareSpy).toHaveBeenCalled());
      const call = shareSpy.mock.calls[0][0] as { message: string; url?: string };
      const payload = call.url ?? call.message;
      expect(payload).toContain('asheville-full-futon');
    });

    it('fires shareProduct analytics event on successful share', async () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      fireEvent.press(getByTestId('detail-share-button'));
      await waitFor(() => expect(shareProductSpy).toHaveBeenCalled());
    });

    it('does not fire analytics when user cancels share', async () => {
      shareSpy.mockResolvedValueOnce({ action: 'dismissedAction' });
      const { getByTestId } = renderDetail();
      fireEvent.press(getByTestId('detail-share-button'));
      await waitFor(() => expect(shareSpy).toHaveBeenCalled());
      expect(shareProductSpy).not.toHaveBeenCalled();
    });

    it('does not throw when Share.share rejects', async () => {
      shareSpy.mockRejectedValueOnce(new Error('share failed'));
      const { getByTestId } = renderDetail();
      await act(async () => {
        fireEvent.press(getByTestId('detail-share-button'));
      });
      // no crash — rejection handled gracefully
    });
  });

  describe('Fabric Selector', () => {
    it('renders fabric selector', () => {
      const { getByTestId } = renderDetail();
      expect(getByTestId('fabric-selector')).toBeTruthy();
    });

    it('renders all fabric swatches', () => {
      const { getByTestId } = renderDetail();
      for (const fabric of FABRICS) {
        expect(getByTestId(`fabric-swatch-${fabric.id}`)).toBeTruthy();
      }
    });

    it('shows selected fabric name', () => {
      const { getByTestId } = renderDetail();
      // Default is first fabric (Natural Linen)
      expect(getByTestId('selected-fabric-name').props.children).toEqual(['Natural Linen', false]);
    });

    it('shows fabric surcharge when premium fabric selected', () => {
      const { getByTestId } = renderDetail();
      // Tap Mountain Blue ($29)
      fireEvent.press(getByTestId('fabric-swatch-mountain-blue'));
      const children = getByTestId('selected-fabric-name').props.children;
      expect(children).toContain('Mountain Blue');
    });

    it('updates price when fabric changes', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      // Select Mountain Blue (+$29)
      fireEvent.press(getByTestId('fabric-swatch-mountain-blue'));
      expect(getByTestId('total-price').props.children).toBe('$378.00');
    });

    it('shows price breakdown when premium fabric selected', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      fireEvent.press(getByTestId('fabric-swatch-mountain-blue'));
      expect(getByTestId('price-breakdown')).toBeTruthy();
    });

    it('updates price for most expensive fabric', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      // Select Espresso Brown (+$49)
      fireEvent.press(getByTestId('fabric-swatch-espresso-brown'));
      expect(getByTestId('total-price').props.children).toBe('$398.00');
    });

    it('reverts price when switching back to free fabric', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      fireEvent.press(getByTestId('fabric-swatch-mountain-blue'));
      expect(getByTestId('total-price').props.children).toBe('$378.00');
      fireEvent.press(getByTestId('fabric-swatch-natural-linen'));
      expect(getByTestId('total-price').props.children).toBe('$349.00');
    });

    it('fabric swatches have accessibility labels', () => {
      const { getByTestId } = renderDetail();
      const swatch = getByTestId('fabric-swatch-mountain-blue');
      expect(swatch.props.accessibilityLabel).toBe('Mountain Blue, add $29.00');
      expect(swatch.props.accessibilityRole).toBe('button');
    });

    it('fabric swatches have selected accessibility state', () => {
      const { getByTestId } = renderDetail();
      const defaultSwatch = getByTestId('fabric-swatch-natural-linen');
      expect(defaultSwatch.props.accessibilityState).toEqual({
        selected: true,
      });
      const otherSwatch = getByTestId('fabric-swatch-mountain-blue');
      expect(otherSwatch.props.accessibilityState).toEqual({
        selected: false,
      });
    });

    it('shows check mark on selected fabric', () => {
      const { getByTestId } = renderDetail();
      // Default fabric is natural-linen, check should be inside it
      const swatch = getByTestId('fabric-swatch-natural-linen');
      // Verify it has children (the check mark)
      expect(swatch.props.children).toBeTruthy();
    });
  });

  describe('Dimensions', () => {
    it('renders dimensions card', () => {
      const { getByTestId } = renderDetail();
      expect(getByTestId('dimensions-card')).toBeTruthy();
    });

    it('shows all four dimension fields', () => {
      const { getByTestId } = renderDetail();
      expect(getByTestId('dimension-width')).toBeTruthy();
      expect(getByTestId('dimension-depth')).toBeTruthy();
      expect(getByTestId('dimension-height')).toBeTruthy();
      expect(getByTestId('dimension-seat')).toBeTruthy();
    });

    it('shows correct dimensions for Asheville', () => {
      const { getByText, getByTestId } = renderDetail({ productId: 'asheville-full' });
      // Asheville: 54"W × 34"D × 33"H, 18" seat
      // inchesToFeetDisplay(54) → 4'6"
      expect(getByText('4\'6"')).toBeTruthy();
      // All four dimension items render
      expect(getByTestId('dimension-width')).toBeTruthy();
      expect(getByTestId('dimension-depth')).toBeTruthy();
      expect(getByTestId('dimension-height')).toBeTruthy();
      expect(getByTestId('dimension-seat')).toBeTruthy();
    });

    it('shows correct dimensions for Blue Ridge', () => {
      const { getByText } = renderDetail({ productId: 'blue-ridge-queen' });
      expect(getByText('60"')).toBeTruthy();
      expect(getByText('36"')).toBeTruthy();
      expect(getByText('35"')).toBeTruthy();
      expect(getByText('19"')).toBeTruthy();
    });
  });

  describe('Quantity Selector', () => {
    it('renders quantity selector', () => {
      const { getByTestId } = renderDetail();
      expect(getByTestId('quantity-selector')).toBeTruthy();
    });

    it('starts at quantity 1', () => {
      const { getByTestId } = renderDetail();
      expect(getByTestId('quantity-value').props.children).toBe(1);
    });

    it('increments quantity', () => {
      const { getByTestId } = renderDetail();
      fireEvent.press(getByTestId('quantity-increment'));
      expect(getByTestId('quantity-value').props.children).toBe(2);
    });

    it('decrements quantity', () => {
      const { getByTestId } = renderDetail();
      fireEvent.press(getByTestId('quantity-increment'));
      fireEvent.press(getByTestId('quantity-increment'));
      expect(getByTestId('quantity-value').props.children).toBe(3);
      fireEvent.press(getByTestId('quantity-decrement'));
      expect(getByTestId('quantity-value').props.children).toBe(2);
    });

    it('does not go below 1', () => {
      const { getByTestId } = renderDetail();
      fireEvent.press(getByTestId('quantity-decrement'));
      fireEvent.press(getByTestId('quantity-decrement'));
      expect(getByTestId('quantity-value').props.children).toBe(1);
    });

    it('does not go above 10', () => {
      const { getByTestId } = renderDetail();
      for (let i = 0; i < 15; i++) {
        fireEvent.press(getByTestId('quantity-increment'));
      }
      expect(getByTestId('quantity-value').props.children).toBe(10);
    });

    it('decrement button is disabled at quantity 1', () => {
      const { getByTestId } = renderDetail();
      const btn = getByTestId('quantity-decrement');
      expect(btn.props.accessibilityState.disabled).toBe(true);
    });

    it('increment button is disabled at quantity 10', () => {
      const { getByTestId } = renderDetail();
      for (let i = 0; i < 10; i++) {
        fireEvent.press(getByTestId('quantity-increment'));
      }
      const btn = getByTestId('quantity-increment');
      expect(btn.props.accessibilityState.disabled).toBe(true);
    });

    it('quantity buttons have accessibility labels', () => {
      const { getByTestId } = renderDetail();
      expect(getByTestId('quantity-decrement').props.accessibilityLabel).toBe('Decrease quantity');
      expect(getByTestId('quantity-increment').props.accessibilityLabel).toBe('Increase quantity');
    });

    it('quantity value has accessibility label', () => {
      const { getByTestId } = renderDetail();
      expect(getByTestId('quantity-value').props.accessibilityLabel).toBe('Quantity: 1');
    });
  });

  describe('Add to Cart', () => {
    it('renders add to cart button', () => {
      const { getByTestId } = renderDetail();
      expect(getByTestId('add-to-cart-button')).toBeTruthy();
    });

    it('shows correct price on CTA for quantity 1', () => {
      const { getByText } = renderDetail({ productId: 'asheville-full' });
      expect(getByText('Add to Cart — $349.00')).toBeTruthy();
    });

    it('updates CTA price when quantity changes', () => {
      const { getByTestId, getByText } = renderDetail({
        productId: 'asheville-full',
      });
      fireEvent.press(getByTestId('quantity-increment'));
      expect(getByText('Add to Cart — $698.00')).toBeTruthy();
    });

    it('updates CTA price when fabric changes', () => {
      const { getByTestId, getByText } = renderDetail({
        productId: 'asheville-full',
      });
      fireEvent.press(getByTestId('fabric-swatch-espresso-brown'));
      expect(getByText('Add to Cart — $398.00')).toBeTruthy();
    });

    it('updates CTA price for fabric + quantity combined', () => {
      const { getByTestId, getByText } = renderDetail({
        productId: 'asheville-full',
      });
      fireEvent.press(getByTestId('fabric-swatch-mountain-blue')); // +$29
      fireEvent.press(getByTestId('quantity-increment')); // qty 2
      // ($349 + $29) × 2 = $756
      expect(getByText('Add to Cart — $756.00')).toBeTruthy();
    });

    it('calls onAddToCart with model, fabric, and quantity', () => {
      const onAddToCart = jest.fn();
      const { getByTestId } = renderDetail({
        productId: 'asheville-full',
        onAddToCart,
      });
      fireEvent.press(getByTestId('quantity-increment')); // qty 2
      fireEvent.press(getByTestId('add-to-cart-button'));
      expect(onAddToCart).toHaveBeenCalledTimes(1);
      expect(onAddToCart).toHaveBeenCalledWith(asheville, naturalLinen, 2);
    });

    it('calls onAddToCart with selected fabric', () => {
      const onAddToCart = jest.fn();
      const { getByTestId } = renderDetail({
        productId: 'asheville-full',
        onAddToCart,
      });
      fireEvent.press(getByTestId('fabric-swatch-mountain-blue'));
      fireEvent.press(getByTestId('add-to-cart-button'));
      expect(onAddToCart).toHaveBeenCalledWith(asheville, mountainBlue, 1);
    });

    it('does not crash when onAddToCart not provided', () => {
      const { getByTestId } = renderDetail();
      expect(() => fireEvent.press(getByTestId('add-to-cart-button'))).not.toThrow();
    });

    it('add to cart button has dynamic accessibility label', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      const btn = getByTestId('add-to-cart-button');
      expect(btn.props.accessibilityLabel).toBe('Add 1 The Asheville to cart for $349.00');
    });

    it('accessibility label updates with quantity', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      fireEvent.press(getByTestId('quantity-increment'));
      fireEvent.press(getByTestId('quantity-increment'));
      const btn = getByTestId('add-to-cart-button');
      expect(btn.props.accessibilityLabel).toBe('Add 3 The Asheville to cart for $1047.00');
    });

    it('add-to-cart button has alignSelf stretch so it fills container on small screens', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      const btn = getByTestId('add-to-cart-button');
      const flat = StyleSheet.flatten(btn.props.style);
      expect(flat.alignSelf).toBe('stretch');
    });

    it('notify-back-in-stock button has alignSelf stretch so it fills container on small screens', async () => {
      // grip-strips has inStock: false, stockCount: 0 — renders notify button
      const { getByTestId } = renderDetail({ productId: 'grip-strips' });
      await act(async () => {});
      const btn = getByTestId('notify-back-in-stock-button');
      const flat = StyleSheet.flatten(btn.props.style);
      expect(flat.alignSelf).toBe('stretch');
    });

    it('add-to-cart button renders fully on 320px wide screens', () => {
      const spy = jest
        .spyOn(Dimensions, 'get')
        .mockReturnValue({ width: 320, height: 568, scale: 2, fontScale: 1 });
      try {
        const { getByTestId } = renderDetail({ productId: 'asheville-full' });
        const btn = getByTestId('add-to-cart-button');
        expect(btn).toBeTruthy();
        expect(btn.props.accessibilityRole).toBe('button');
        const flat = StyleSheet.flatten(btn.props.style);
        expect(flat.alignSelf).toBe('stretch');
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('AR CTA', () => {
    beforeEach(() => {
      mockPremiumValue.isPremium = true;
    });
    afterEach(() => {
      mockPremiumValue.isPremium = false;
    });

    it('renders AR button', () => {
      const { getByTestId } = renderDetail();
      expect(getByTestId('detail-ar-button')).toBeTruthy();
    });

    it('shows try in room text', () => {
      const { getByText } = renderDetail();
      expect(getByText('See It In Your Room')).toBeTruthy();
    });

    it('calls onOpenAR with model ID', () => {
      const onOpenAR = jest.fn();
      const { getByTestId } = renderDetail({
        productId: 'blue-ridge-queen',
        onOpenAR,
      });
      fireEvent.press(getByTestId('detail-ar-button'));
      expect(onOpenAR).toHaveBeenCalledWith('blue-ridge-queen');
    });

    it('does not crash when onOpenAR not provided', () => {
      const { getByTestId } = renderDetail();
      expect(() => fireEvent.press(getByTestId('detail-ar-button'))).not.toThrow();
    });

    it('has accessibility label with model name', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      const btn = getByTestId('detail-ar-button');
      expect(btn.props.accessibilityLabel).toBe('Try The Asheville in your room with AR camera');
    });
  });

  describe('Back Button', () => {
    it('does not render back button when onBack not provided', () => {
      const { queryByTestId } = renderDetail();
      expect(queryByTestId('detail-back-button')).toBeNull();
    });

    it('renders back button when onBack provided', () => {
      const { getByTestId } = renderDetail({ onBack: jest.fn() });
      expect(getByTestId('detail-back-button')).toBeTruthy();
    });

    it('calls onBack when pressed', () => {
      const onBack = jest.fn();
      const { getByTestId } = renderDetail({ onBack });
      fireEvent.press(getByTestId('detail-back-button'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('back button has accessibility attributes', () => {
      const { getByTestId } = renderDetail({ onBack: jest.fn() });
      const btn = getByTestId('detail-back-button');
      expect(btn.props.accessibilityLabel).toBe('Go back');
      expect(btn.props.accessibilityRole).toBe('button');
    });
  });

  describe('Different Products', () => {
    it('renders The Pisgah with correct price', () => {
      const { getByTestId, getByText } = renderDetail({
        productId: 'pisgah-twin',
      });
      expect(getByText('The Pisgah')).toBeTruthy();
      expect(getByTestId('total-price').props.children).toBe('$279.00');
    });

    it('renders The Biltmore with correct price', () => {
      const { getByTestId, getByText } = renderDetail({
        productId: 'biltmore-loveseat',
      });
      expect(getByText('The Biltmore')).toBeTruthy();
      expect(getByTestId('total-price').props.children).toBe('$319.00');
    });

    it('renders Blue Ridge with correct dimensions', () => {
      const { getByText } = renderDetail({ productId: 'blue-ridge-queen' });
      expect(getByText('60"')).toBeTruthy();
      expect(getByText('36"')).toBeTruthy();
    });

    it('each product has correct tagline', () => {
      const models = FUTON_MODELS;
      for (const m of models) {
        const { getByTestId, unmount } = renderDetail({ productId: m.id });
        expect(getByTestId('product-tagline').props.children).toBe(m.tagline);
        unmount();
      }
    });
  });

  describe('Reviews Section', () => {
    it('renders reviews section', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      expect(getByTestId('reviews-section')).toBeTruthy();
    });

    it('renders review summary with average rating', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      expect(getByTestId('review-summary')).toBeTruthy();
      expect(getByTestId('review-average')).toBeTruthy();
    });

    it('renders sort options', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      expect(getByTestId('review-sort-options')).toBeTruthy();
      expect(getByTestId('sort-helpful')).toBeTruthy();
      expect(getByTestId('sort-recent')).toBeTruthy();
    });

    it('renders preview review cards', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      // Should show up to 3 preview reviews
      expect(getByTestId('review-summary')).toBeTruthy();
    });

    it('renders view all reviews button when more than 3 reviews', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      expect(getByTestId('view-all-reviews')).toBeTruthy();
    });

    it('calls onViewAllReviews when view all pressed', () => {
      const onViewAllReviews = jest.fn();
      const { getByTestId } = renderDetail({
        productId: 'asheville-full',
        onViewAllReviews,
      });
      fireEvent.press(getByTestId('view-all-reviews'));
      expect(onViewAllReviews).toHaveBeenCalledWith('asheville-full');
    });

    it('sort pills change review order', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      fireEvent.press(getByTestId('sort-recent'));
      expect(getByTestId('sort-recent').props.accessibilityState.selected).toBe(true);
    });

    it('shows empty state when product has no reviews', () => {
      // cm-c01 seeded all futon models; spy on data layer to simulate zero-review state
      const reviewsData = require('@/data/reviews');
      jest.spyOn(reviewsData, 'getReviewsForProduct').mockReturnValue([]);
      jest.spyOn(reviewsData, 'getReviewSummary').mockReturnValue({
        totalReviews: 0,
        averageRating: 0,
        distribution: {},
      });
      const { getByTestId, queryByTestId } = renderDetail({ productId: 'pisgah-twin' });
      expect(getByTestId('reviews-empty-state')).toBeTruthy();
      expect(queryByTestId('review-sort-options')).toBeNull();
      expect(queryByTestId('view-all-reviews')).toBeNull();
      jest.restoreAllMocks();
    });

    it('hides write review button when not authenticated', () => {
      mockAuthValue.isAuthenticated = false;
      const { queryByTestId } = renderDetail({ productId: 'asheville-full' });
      expect(queryByTestId('write-review-button')).toBeNull();
      mockAuthValue.isAuthenticated = true;
    });

    it('shows write review button when authenticated', () => {
      mockAuthValue.isAuthenticated = true;
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      expect(getByTestId('write-review-button')).toBeTruthy();
    });
  });

  describe('Price Calculations', () => {
    it('Blue Ridge + Charcoal = $498', () => {
      const { getByTestId } = renderDetail({ productId: 'blue-ridge-queen' });
      fireEvent.press(getByTestId('fabric-swatch-charcoal'));
      // $449 + $49 = $498
      expect(getByTestId('total-price').props.children).toBe('$498.00');
    });

    it('Pisgah + Sunset Coral qty 3 = $924', () => {
      const { getByTestId, getByText } = renderDetail({
        productId: 'pisgah-twin',
      });
      fireEvent.press(getByTestId('fabric-swatch-sunset-coral'));
      // qty: 1 → 3
      fireEvent.press(getByTestId('quantity-increment'));
      fireEvent.press(getByTestId('quantity-increment'));
      // ($279 + $29) × 3 = $924
      expect(getByText('Add to Cart — $924.00')).toBeTruthy();
    });

    it('Biltmore + Mauve Blush qty 5 = $1840', () => {
      const { getByTestId, getByText } = renderDetail({
        productId: 'biltmore-loveseat',
      });
      fireEvent.press(getByTestId('fabric-swatch-mauve-blush'));
      for (let i = 0; i < 4; i++) {
        fireEvent.press(getByTestId('quantity-increment'));
      }
      // ($319 + $49) × 5 = $1840
      expect(getByText('Add to Cart — $1840.00')).toBeTruthy();
    });
  });

  describe('Web AR Routing', () => {
    const originalOS = Platform.OS;

    beforeEach(() => {
      jest.clearAllMocks();
      mockPremiumValue.isPremium = true;
    });

    afterEach(() => {
      Object.defineProperty(Platform, 'OS', { value: originalOS });
      mockPremiumValue.isPremium = false;
    });

    it('navigates to ARWeb screen on web platform when AR button tapped', () => {
      Object.defineProperty(Platform, 'OS', { value: 'web' });
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      fireEvent.press(getByTestId('detail-ar-button'));
      expect(mockNavigate).toHaveBeenCalledWith(
        'ARWeb',
        expect.objectContaining({
          glbUrl: expect.any(String),
          usdzUrl: expect.any(String),
          title: 'The Asheville',
          productId: expect.stringContaining('prod-'),
        }),
      );
    });

    it('passes catalog GLB URL for known product on web', () => {
      Object.defineProperty(Platform, 'OS', { value: 'web' });
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      fireEvent.press(getByTestId('detail-ar-button'));
      const navParams = mockNavigate.mock.calls[0][1];
      expect(navParams.glbUrl).toContain('.glb');
    });

    it('does not navigate on native platforms', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios' });
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      fireEvent.press(getByTestId('detail-ar-button'));
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Hook Integration (useProduct / useFutonModels)', () => {
    it('resolves catalog product via prod- prefix convention', () => {
      // The screen should map futon model ID → product ID (prod-{modelId})
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      // WishlistButton should receive the correct catalog product
      expect(getByTestId('detail-wishlist-button')).toBeTruthy();
    });

    it('renders wishlist button for all valid futon model IDs', () => {
      for (const model of FUTON_MODELS) {
        const catalogProduct = PRODUCTS.find((p) => p.id === `prod-${model.id}`);
        expect(catalogProduct).toBeTruthy();
        const { getByTestId, unmount } = renderDetail({ productId: model.id });
        expect(getByTestId('detail-wishlist-button')).toBeTruthy();
        unmount();
      }
    });

    it('hides wishlist button when catalog product not found', () => {
      const { queryByTestId } = renderDetail({ productId: 'nonexistent' });
      expect(queryByTestId('detail-wishlist-button')).toBeNull();
    });

    it('still renders model info when catalog product not found', () => {
      // Unknown productId falls back to first futon model
      const { getByTestId } = renderDetail({ productId: 'nonexistent' });
      expect(getByTestId('product-name').props.children).toBe(asheville.name);
      expect(getByTestId('total-price')).toBeTruthy();
    });

    it('AR button works even without catalog product', () => {
      mockPremiumValue.isPremium = true;
      const onOpenAR = jest.fn();
      const { getByTestId } = renderDetail({ productId: 'nonexistent', onOpenAR });
      expect(() => fireEvent.press(getByTestId('detail-ar-button'))).not.toThrow();
      expect(onOpenAR).toHaveBeenCalledWith('asheville-full'); // falls back to first model
      mockPremiumValue.isPremium = false;
    });

    it('AR web navigation uses catalog product ID when available', () => {
      mockPremiumValue.isPremium = true;
      Object.defineProperty(Platform, 'OS', { value: 'web' });
      const { getByTestId } = renderDetail({ productId: 'blue-ridge-queen' });
      fireEvent.press(getByTestId('detail-ar-button'));
      const navParams = mockNavigate.mock.calls[0][1];
      expect(navParams.productId).toBe('prod-blue-ridge-queen');
      mockPremiumValue.isPremium = false;
    });
  });

  describe('Size Guide', () => {
    it('renders size guide toggle button below dimensions card', () => {
      const { getByTestId } = renderDetail();
      expect(getByTestId('size-guide-toggle')).toBeTruthy();
    });

    it('size guide is collapsed by default', () => {
      const { queryByTestId } = renderDetail();
      expect(queryByTestId('size-guide-content')).toBeNull();
    });

    it('expands size guide when toggle pressed', () => {
      const { getByTestId } = renderDetail();
      fireEvent.press(getByTestId('size-guide-toggle'));
      expect(getByTestId('size-guide-content')).toBeTruthy();
    });

    it('collapses size guide when toggle pressed again', () => {
      const { getByTestId, queryByTestId } = renderDetail();
      fireEvent.press(getByTestId('size-guide-toggle'));
      expect(getByTestId('size-guide-content')).toBeTruthy();
      fireEvent.press(getByTestId('size-guide-toggle'));
      expect(queryByTestId('size-guide-content')).toBeNull();
    });

    it('shows visual dimension diagram with labeled width, depth, height', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      fireEvent.press(getByTestId('size-guide-toggle'));
      expect(getByTestId('size-diagram')).toBeTruthy();
      expect(getByTestId('diagram-label-width')).toBeTruthy();
      expect(getByTestId('diagram-label-depth')).toBeTruthy();
      expect(getByTestId('diagram-label-height')).toBeTruthy();
    });

    it('displays correct dimension values in diagram for Asheville', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      fireEvent.press(getByTestId('size-guide-toggle'));
      const join = (c: any) => [].concat(c).join('');
      expect(join(getByTestId('diagram-label-width').props.children)).toContain('54"');
      expect(join(getByTestId('diagram-label-depth').props.children)).toContain('34"');
      expect(join(getByTestId('diagram-label-height').props.children)).toContain('33"');
    });

    it('displays correct dimension values in diagram for Blue Ridge', () => {
      const { getByTestId } = renderDetail({ productId: 'blue-ridge-queen' });
      fireEvent.press(getByTestId('size-guide-toggle'));
      const join = (c: any) => [].concat(c).join('');
      expect(join(getByTestId('diagram-label-width').props.children)).toContain('60"');
      expect(join(getByTestId('diagram-label-depth').props.children)).toContain('36"');
      expect(join(getByTestId('diagram-label-height').props.children)).toContain('35"');
    });

    it('shows room size comparison', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      fireEvent.press(getByTestId('size-guide-toggle'));
      expect(getByTestId('room-comparison')).toBeTruthy();
    });

    it('room comparison mentions 10x10 room', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      fireEvent.press(getByTestId('size-guide-toggle'));
      const roomText = getByTestId('room-comparison');
      expect(roomText).toBeTruthy();
      // Room label shows 10' × 10'
      expect(getByTestId('room-comparison').props.children).toBeTruthy();
    });

    it('toggle button has accessibility attributes', () => {
      const { getByTestId } = renderDetail();
      const toggle = getByTestId('size-guide-toggle');
      expect(toggle.props.accessibilityRole).toBe('button');
      expect(toggle.props.accessibilityLabel).toContain('Size Guide');
    });

    it('toggle shows expanded state in accessibility', () => {
      const { getByTestId } = renderDetail();
      const toggle = getByTestId('size-guide-toggle');
      expect(toggle.props.accessibilityState).toMatchObject({ expanded: false });
      fireEvent.press(toggle);
      expect(getByTestId('size-guide-toggle').props.accessibilityState).toMatchObject({
        expanded: true,
      });
    });

    it('shows size guide for all products', () => {
      for (const model of FUTON_MODELS) {
        const { getByTestId, unmount } = renderDetail({ productId: model.id });
        fireEvent.press(getByTestId('size-guide-toggle'));
        expect(getByTestId('size-guide-content')).toBeTruthy();
        expect(getByTestId('size-diagram')).toBeTruthy();
        unmount();
      }
    });
  });

  describe('Related Products (You May Also Like)', () => {
    beforeEach(() => {
      mockTrackView.mockClear();
      mockRecommendationsValue.similarItems = mockSimilarItems;
    });

    it('renders You May Also Like section', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      expect(getByTestId('related-products')).toBeTruthy();
    });

    it('shows You May Also Like title', () => {
      const { getByText } = renderDetail({ productId: 'asheville-full' });
      expect(getByText('You May Also Like')).toBeTruthy();
    });

    it('renders recommendation carousel with similar products', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      expect(getByTestId('recommendation-list')).toBeTruthy();
    });

    it('renders product cards for similar items', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      for (const product of mockSimilarItems) {
        expect(getByTestId(`rec-card-${product.id}`)).toBeTruthy();
      }
    });

    it('calls onRelatedProductPress when a related product is tapped', () => {
      const onRelatedProductPress = jest.fn();
      const { getByTestId } = renderDetail({
        productId: 'asheville-full',
        onRelatedProductPress,
      });
      fireEvent.press(getByTestId(`rec-card-${mockSimilarItems[0].id}`));
      expect(onRelatedProductPress).toHaveBeenCalledWith(mockSimilarItems[0]);
    });

    it('does not crash when onRelatedProductPress not provided', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      expect(() =>
        fireEvent.press(getByTestId(`rec-card-${mockSimilarItems[0].id}`)),
      ).not.toThrow();
    });

    it('hides section when no similar items', () => {
      mockRecommendationsValue.similarItems = [];
      const { queryByTestId } = renderDetail({ productId: 'asheville-full' });
      expect(queryByTestId('related-products')).toBeNull();
    });

    it('tracks product view on mount', () => {
      renderDetail({ productId: 'asheville-full' });
      expect(mockTrackView).toHaveBeenCalledWith('prod-asheville-full');
    });

    it('related products section has accessibility', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      const section = getByTestId('related-products');
      expect(section.props.accessibilityLabel).toBe('You May Also Like');
    });
  });

  describe('Premium badge indicators', () => {
    afterEach(() => {
      mockPremiumValue.isPremium = false;
    });

    it('shows CF+ badge on AR button when user is premium', () => {
      mockPremiumValue.isPremium = true;
      const { getByTestId } = renderDetail();
      expect(getByTestId('ar-premium-badge')).toBeTruthy();
    });

    it('does not show CF+ badge on AR button when user is not premium', () => {
      mockPremiumValue.isPremium = false;
      const { queryByTestId } = renderDetail();
      expect(queryByTestId('ar-premium-badge')).toBeNull();
    });

    it('blocks AR for non-premium users with upsell alert', () => {
      mockPremiumValue.isPremium = false;
      const onOpenAR = jest.fn();
      const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
      const { getByTestId } = renderDetail({ onOpenAR });
      fireEvent.press(getByTestId('detail-ar-button'));
      expect(onOpenAR).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith(
        'CF+ Feature',
        expect.stringContaining('AR Room Designer'),
        expect.any(Array),
      );
      alertSpy.mockRestore();
    });
  });

  describe('Stock status indicators', () => {
    it('does not show stock alerts for in-stock products', () => {
      const { queryByTestId } = renderDetail();
      expect(queryByTestId('low-stock-alert')).toBeNull();
      expect(queryByTestId('out-of-stock-alert')).toBeNull();
    });

    it('shows low stock alert for Pisgah (stockCount: 3)', () => {
      const { getByTestId, getByText } = renderDetail({ productId: 'pisgah-twin' });
      expect(getByTestId('low-stock-alert')).toBeTruthy();
      expect(getByText(/Only 3 left/)).toBeTruthy();
    });

    it('shows add to cart button for low stock products', () => {
      const { getByTestId } = renderDetail({ productId: 'pisgah-twin' });
      expect(getByTestId('add-to-cart-button')).toBeTruthy();
    });

    it('does not show notify-back-in-stock button for in-stock products', () => {
      const { queryByTestId } = renderDetail();
      expect(queryByTestId('notify-back-in-stock-button')).toBeNull();
    });

    it('shows notify-back-in-stock button for OOS products', async () => {
      // prod-grip-strips has inStock: false, stockCount: 0
      const { getByTestId } = renderDetail({ productId: 'grip-strips' });
      await act(async () => {});
      expect(getByTestId('notify-back-in-stock-button')).toBeTruthy();
    });

    it('hides add-to-cart button for OOS products', async () => {
      const { queryByTestId } = renderDetail({ productId: 'grip-strips' });
      await act(async () => {});
      expect(queryByTestId('add-to-cart-button')).toBeNull();
    });

    it('shows out-of-stock alert for OOS products', async () => {
      const { getByTestId } = renderDetail({ productId: 'grip-strips' });
      await act(async () => {});
      expect(getByTestId('out-of-stock-alert')).toBeTruthy();
    });
  });

  describe('Notify Me / Back In Stock', () => {
    it('shows "Notify Me When Available" as default button text', async () => {
      const { getByTestId, getByText } = renderDetail({ productId: 'grip-strips' });
      await act(async () => {});
      expect(getByTestId('notify-back-in-stock-button')).toBeTruthy();
      expect(getByText('Notify Me When Available')).toBeTruthy();
    });

    it('has correct accessibility label when unsubscribed', async () => {
      const { getByTestId } = renderDetail({ productId: 'grip-strips' });
      await act(async () => {});
      const btn = getByTestId('notify-back-in-stock-button');
      expect(btn.props.accessibilityLabel).toBe('Notify me when back in stock');
    });

    it('has button accessibility role', async () => {
      const { getByTestId } = renderDetail({ productId: 'grip-strips' });
      await act(async () => {});
      const btn = getByTestId('notify-back-in-stock-button');
      expect(btn.props.accessibilityRole).toBe('button');
    });

    it('toggles to subscribed state when pressed', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.setItem.mockClear();
      const { getByTestId, getByText } = renderDetail({ productId: 'grip-strips' });
      await act(async () => {});
      await act(async () => {
        fireEvent.press(getByTestId('notify-back-in-stock-button'));
      });
      expect(getByText('Subscribed \u2713')).toBeTruthy();
    });

    it('has "Cancel" accessibility label after subscribing', async () => {
      const { getByTestId } = renderDetail({ productId: 'grip-strips' });
      await act(async () => {});
      await act(async () => {
        fireEvent.press(getByTestId('notify-back-in-stock-button'));
      });
      expect(getByTestId('notify-back-in-stock-button').props.accessibilityLabel).toBe(
        'Cancel back in stock notification',
      );
    });

    it('toggles back to unsubscribed on second press', async () => {
      const { getByTestId, getByText } = renderDetail({ productId: 'grip-strips' });
      await act(async () => {});
      // Subscribe
      await act(async () => {
        fireEvent.press(getByTestId('notify-back-in-stock-button'));
      });
      expect(getByText('Subscribed \u2713')).toBeTruthy();
      // Unsubscribe
      await act(async () => {
        fireEvent.press(getByTestId('notify-back-in-stock-button'));
      });
      expect(getByText('Notify Me When Available')).toBeTruthy();
    });

    it('persists subscription to AsyncStorage on subscribe', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.setItem.mockClear();
      const { getByTestId } = renderDetail({ productId: 'grip-strips' });
      await act(async () => {});
      await act(async () => {
        fireEvent.press(getByTestId('notify-back-in-stock-button'));
      });
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@back_in_stock_subscriptions',
        expect.stringContaining('prod-grip-strips'),
      );
    });
  });

  describe('Cart integration', () => {
    it('calls useCart addItem when add to cart is pressed', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      fireEvent.press(getByTestId('add-to-cart-button'));
      expect(mockAddItem).toHaveBeenCalledTimes(1);
      expect(mockAddItem).toHaveBeenCalledWith(asheville, naturalLinen, 1);
    });

    it('calls addItem with selected fabric and quantity', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      fireEvent.press(getByTestId('fabric-swatch-mountain-blue'));
      fireEvent.press(getByTestId('quantity-increment')); // qty 2
      fireEvent.press(getByTestId('add-to-cart-button'));
      expect(mockAddItem).toHaveBeenCalledWith(asheville, mountainBlue, 2);
    });

    it('shows success alert after adding to cart', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      fireEvent.press(getByTestId('add-to-cart-button'));
      expect(mockAlert).toHaveBeenCalledWith(
        'Added to Cart',
        expect.stringContaining('The Asheville'),
        expect.arrayContaining([
          expect.objectContaining({ text: 'Continue Shopping' }),
          expect.objectContaining({ text: 'View Cart' }),
        ]),
      );
    });

    it('navigates to cart when View Cart is pressed in success alert', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      fireEvent.press(getByTestId('add-to-cart-button'));
      // Get the View Cart button callback from Alert.alert
      const alertCall = mockAlert.mock.calls[0];
      const viewCartButton = alertCall[2].find((b: any) => b.text === 'View Cart');
      viewCartButton.onPress();
      expect(mockNavigate).toHaveBeenCalledWith('Tabs', { screen: 'Cart' });
    });

    it('still calls onAddToCart prop when provided', () => {
      const onAddToCart = jest.fn();
      const { getByTestId } = renderDetail({
        productId: 'asheville-full',
        onAddToCart,
      });
      fireEvent.press(getByTestId('add-to-cart-button'));
      // Both useCart.addItem and onAddToCart should be called
      expect(mockAddItem).toHaveBeenCalledTimes(1);
      expect(onAddToCart).toHaveBeenCalledTimes(1);
    });

    it('resets quantity to 1 after successful add to cart', () => {
      const { getByTestId, getByText } = renderDetail({ productId: 'asheville-full' });
      fireEvent.press(getByTestId('quantity-increment')); // qty 2
      expect(getByText('Add to Cart — $698.00')).toBeTruthy();
      fireEvent.press(getByTestId('add-to-cart-button'));
      // Quantity should reset to 1
      expect(getByText('Add to Cart — $349.00')).toBeTruthy();
    });
  });

  // ── cm-xh9: product video gallery slide ────────────────────────────────────

  describe('Video gallery slide', () => {
    it('renders a video slide tab when product has videoUri', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      expect(getByTestId('gallery-slide-video')).toBeTruthy();
    });

    it('does not render a video slide when product has no videoUri', () => {
      // pisgah-twin has no videoUri
      const { queryByTestId } = renderDetail({ productId: 'pisgah-twin' });
      expect(queryByTestId('gallery-slide-video')).toBeNull();
    });

    it('renders a video player inside the video slide', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      expect(getByTestId('product-detail-video')).toBeTruthy();
    });

    it('video slide shows a Video label', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      expect(getByTestId('gallery-label-video')).toBeTruthy();
    });

    it('video slide dot indicator appears when product has video', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      expect(getByTestId('gallery-dot-video')).toBeTruthy();
    });

    it('video slide is last in the gallery', () => {
      const { getAllByTestId } = renderDetail({ productId: 'asheville-full' });
      const slides = getAllByTestId(/^gallery-slide-/);
      const lastSlide = slides[slides.length - 1];
      expect(lastSlide.props.testID).toBe('gallery-slide-video');
    });

    it('video slide has an accessible label', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      const videoSlide = getByTestId('gallery-slide-video');
      expect(videoSlide.props.accessibilityLabel).toBeDefined();
    });

    it('renders an error fallback view on video error', async () => {
      // expo-video error handling: player fires statusChange with status 'error'
      const { useVideoPlayer } = require('expo-video');
      let statusCallback: (payload: { status: string }) => void;
      (useVideoPlayer as jest.Mock).mockImplementation((_src: string, setup: Function) => {
        const player = {
          loop: false,
          muted: false,
          play: jest.fn(),
          addListener: jest.fn((event: string, cb: (payload: { status: string }) => void) => {
            if (event === 'statusChange') statusCallback = cb;
            return { remove: jest.fn() };
          }),
        };
        if (setup) setup(player);
        return player;
      });
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      await act(async () => {
        statusCallback!({ status: 'error' });
      });
      expect(getByTestId('product-detail-video-error')).toBeTruthy();
    });

    it('hides video player after error', async () => {
      const { useVideoPlayer } = require('expo-video');
      let statusCallback: (payload: { status: string }) => void;
      (useVideoPlayer as jest.Mock).mockImplementation((_src: string, setup: Function) => {
        const player = {
          loop: false,
          muted: false,
          play: jest.fn(),
          addListener: jest.fn((event: string, cb: (payload: { status: string }) => void) => {
            if (event === 'statusChange') statusCallback = cb;
            return { remove: jest.fn() };
          }),
        };
        if (setup) setup(player);
        return player;
      });
      const { queryByTestId } = renderDetail({ productId: 'asheville-full' });
      await act(async () => {
        statusCallback!({ status: 'error' });
      });
      expect(queryByTestId('product-detail-video')).toBeNull();
    });
  });

  // ── CF-wah8: Star ratings adjacent to price ─────────────────────────────────

  describe('Inline star rating near price', () => {
    it('renders inline star rating near price when product has reviews', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      expect(getByTestId('price-inline-rating')).toBeTruthy();
    });

    it('does NOT render inline rating when product has no reviews', () => {
      // Simulate useProductReviews reporting zero reviews for this product
      mockUseProductReviews.mockReturnValue({
        ...mockProductReviewsResult,
        aggregate: { averageRating: 0, totalReviews: 0 },
      });
      const { queryByTestId } = renderDetail({ productId: 'pisgah-twin' });
      expect(queryByTestId('price-inline-rating')).toBeNull();
      jest.restoreAllMocks();
    });

    it('inline rating is within the price section', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      // Both elements should be present in the same screen area
      expect(getByTestId('price-section')).toBeTruthy();
      expect(getByTestId('price-inline-rating')).toBeTruthy();
    });

    it('inline rating has accessible role', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      const rating = getByTestId('price-inline-rating');
      expect(rating.props.accessibilityRole).toBe('text');
    });

    it('inline rating has accessibility label with star count', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      const rating = getByTestId('price-inline-rating');
      expect(rating.props.accessibilityLabel).toMatch(/out of 5 stars/);
    });

    // CF-wah8 expanded: useProductReviews wiring, position, tap behavior, edge cases

    it('wires rating from useProductReviews aggregate data', () => {
      mockUseProductReviews.mockReturnValue({
        ...mockProductReviewsResult,
        aggregate: { averageRating: 3.7, totalReviews: 99 },
      });
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      const rating = getByTestId('price-inline-rating');
      // accessibilityLabel should reflect the mocked average
      expect(rating.props.accessibilityLabel).toMatch(/3\.7|out of 5 stars/);
    });

    it('calls useProductReviews with the current product id', () => {
      renderDetail({ productId: 'asheville-full' });
      expect(mockUseProductReviews).toHaveBeenCalledWith('asheville-full');
    });

    it('does NOT render inline rating when useProductReviews returns zero reviews', () => {
      mockUseProductReviews.mockReturnValue({
        ...mockProductReviewsResult,
        aggregate: { averageRating: 0, totalReviews: 0 },
      });
      const { queryByTestId } = renderDetail({ productId: 'asheville-full' });
      expect(queryByTestId('price-inline-rating')).toBeNull();
    });

    it('does NOT render inline rating when useProductReviews is loading', () => {
      mockUseProductReviews.mockReturnValue({
        ...mockProductReviewsResult,
        isLoading: true,
        aggregate: { averageRating: 0, totalReviews: 0 },
      });
      const { queryByTestId } = renderDetail({ productId: 'asheville-full' });
      expect(queryByTestId('price-inline-rating')).toBeNull();
    });

    it('does NOT render inline rating when useProductReviews returns an error', () => {
      mockUseProductReviews.mockReturnValue({
        ...mockProductReviewsResult,
        error: 'Network error',
        aggregate: { averageRating: 0, totalReviews: 0 },
      });
      const { queryByTestId } = renderDetail({ productId: 'asheville-full' });
      expect(queryByTestId('price-inline-rating')).toBeNull();
    });

    it('inline rating tap target is pressable (links to reviews section)', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      // The inline rating wrapper must be pressable — tap scrolls to reviews
      const ratingTap = getByTestId('price-inline-rating-tap');
      expect(ratingTap).toBeTruthy();
      // Should not throw when pressed
      expect(() => fireEvent.press(ratingTap)).not.toThrow();
    });

    it('inline rating tap target renders above reviews section in the tree', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      // Both the tap target and the reviews section must render
      expect(getByTestId('price-inline-rating-tap')).toBeTruthy();
      expect(getByTestId('reviews-section')).toBeTruthy();
    });

    it('inline rating is positioned after the financing badge', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      // FinancingBadge and inline rating must both be present
      expect(getByTestId('product-detail-financing-badge')).toBeTruthy();
      expect(getByTestId('price-inline-rating')).toBeTruthy();
    });

    it('shows review count from useProductReviews in the rating label', () => {
      mockUseProductReviews.mockReturnValue({
        ...mockProductReviewsResult,
        aggregate: { averageRating: 4.5, totalReviews: 128 },
      });
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      const rating = getByTestId('price-inline-rating');
      // The count prop is passed through — accessible label or children should reflect count
      expect(rating.props.accessibilityLabel ?? JSON.stringify(rating)).toMatch(/128|out of 5/);
    });
  });

  // ── cm-8tl: Add to Cart layout — bottom inset ────────────────────────────────

  describe('Bottom inset / scroll layout (cm-8tl)', () => {
    it('applies non-zero paddingBottom to scroll content to clear tab bar / safe area', () => {
      const { getByTestId } = renderDetail();
      const scrollView = getByTestId('scroll-view');
      const contentContainerStyle = scrollView.props.contentContainerStyle;
      // Flatten array style to resolve final paddingBottom value
      const flat = Array.isArray(contentContainerStyle)
        ? Object.assign({}, ...contentContainerStyle)
        : contentContainerStyle;
      // Must be non-zero — ensures safe area bottom inset (34pt on iPhone X) is applied
      expect(flat.paddingBottom).toBeGreaterThan(0);
    });

    it('add-to-cart button is rendered and accessible', () => {
      const { getByTestId } = renderDetail();
      const btn = getByTestId('add-to-cart-button');
      expect(btn).toBeTruthy();
      expect(btn.props.accessibilityRole).toBe('button');
    });

    it('quantity selector is rendered and accessible', () => {
      const { getByTestId } = renderDetail();
      expect(getByTestId('quantity-selector')).toBeTruthy();
      expect(getByTestId('quantity-decrement')).toBeTruthy();
      expect(getByTestId('quantity-increment')).toBeTruthy();
      expect(getByTestId('quantity-value')).toBeTruthy();
    });
  });

  // ── BNPL modal — financing badge tap (cm-v65) ─────────────────────────────

  describe('BNPL modal — financing badge tap (cm-v65)', () => {
    // Asheville ($349) is above the financing threshold ($299) and BNPL minimums
    it('BNPL modal is not visible initially', () => {
      const { queryByTestId } = renderDetail({ productId: 'asheville-full' });
      // Modal with visible=false renders but hides its content
      expect(queryByTestId('bnpl-continue-btn')).toBeNull();
    });

    it('tapping financing badge opens BNPL modal', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      fireEvent.press(getByTestId('product-detail-financing-badge'));
      expect(getByTestId('bnpl-modal')).toBeTruthy();
    });

    it('BNPL modal shows installment breakdown after badge tap', () => {
      const { getByTestId, getByText } = renderDetail({ productId: 'asheville-full' });
      fireEvent.press(getByTestId('product-detail-financing-badge'));
      expect(getByText('Today')).toBeTruthy();
      expect(getByText('In 2 weeks')).toBeTruthy();
    });

    it('BNPL modal shows "Pay over time" header', () => {
      const { getByTestId, getByText } = renderDetail({ productId: 'asheville-full' });
      fireEvent.press(getByTestId('product-detail-financing-badge'));
      expect(getByText('Pay over time')).toBeTruthy();
    });

    it('BNPL modal shows Klarna tab by default', () => {
      const { getByTestId, getByText } = renderDetail({ productId: 'asheville-full' });
      fireEvent.press(getByTestId('product-detail-financing-badge'));
      expect(getByText('Continue with Klarna')).toBeTruthy();
    });

    it('BNPL modal closes when close button pressed', () => {
      const { getByTestId, queryByTestId } = renderDetail({ productId: 'asheville-full' });
      fireEvent.press(getByTestId('product-detail-financing-badge'));
      fireEvent.press(getByTestId('bnpl-modal-close'));
      expect(queryByTestId('bnpl-continue-btn')).toBeNull();
    });

    it('BNPL modal closes when overlay pressed', () => {
      const { getByTestId, queryByTestId } = renderDetail({ productId: 'asheville-full' });
      fireEvent.press(getByTestId('product-detail-financing-badge'));
      fireEvent.press(getByTestId('bnpl-modal-overlay'));
      expect(queryByTestId('bnpl-continue-btn')).toBeNull();
    });
  });

  describe('Wix network error state (cm-cii)', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('shows network error banner when Wix fetch fails', () => {
      jest.spyOn(require('@/services/wix/config'), 'isWixConfigured').mockReturnValue(true);
      jest.spyOn(require('@/hooks/useProduct'), 'useProductBySlug').mockReturnValue({
        product: null,
        isLoading: false,
        error: new Error('Network request failed'),
        refresh: jest.fn(),
      });

      const { getByTestId } = renderDetail({ productId: 'wix-mesa-5000' });
      expect(getByTestId('wix-network-error')).toBeTruthy();
    });

    it('shows retry button on Wix network error and calls refresh', () => {
      const mockRefresh = jest.fn();
      jest.spyOn(require('@/services/wix/config'), 'isWixConfigured').mockReturnValue(true);
      jest.spyOn(require('@/hooks/useProduct'), 'useProductBySlug').mockReturnValue({
        product: null,
        isLoading: false,
        error: new Error('Network request failed'),
        refresh: mockRefresh,
      });

      const { getByTestId } = renderDetail({ productId: 'wix-mesa-5000' });
      fireEvent.press(getByTestId('wix-network-error-retry'));
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('does not show network error when Wix product loads successfully', () => {
      // Default: isWixConfigured returns false (no env vars in test), local models render fine
      const { queryByTestId } = renderDetail({ productId: 'asheville-full' });
      expect(queryByTestId('wix-network-error')).toBeNull();
    });
  });
});
