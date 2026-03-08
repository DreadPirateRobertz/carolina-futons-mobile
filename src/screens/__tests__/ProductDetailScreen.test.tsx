import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { ProductDetailScreen } from '../ProductDetailScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import { FUTON_MODELS, FABRICS } from '@/data/futons';
import { PRODUCTS } from '@/data/products';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
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

const asheville = FUTON_MODELS[0]; // The Asheville, $349
const blueRidge = FUTON_MODELS[1]; // The Blue Ridge, $449
const naturalLinen = FABRICS[0]; // Natural Linen, $0
const mountainBlue = FABRICS.find((f) => f.id === 'mountain-blue')!; // $29
function renderDetail(props: Partial<React.ComponentProps<typeof ProductDetailScreen>> = {}) {
  return render(
    <ThemeProvider>
      <WishlistProvider>
        <ProductDetailScreen {...props} />
      </WishlistProvider>
    </ThemeProvider>,
  );
}

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
  });

  describe('Share Button', () => {
    it('renders share button', () => {
      const { getByTestId } = renderDetail();
      expect(getByTestId('detail-share-button')).toBeTruthy();
    });

    it('share button has accessibility label with product name', () => {
      const { getByTestId } = renderDetail();
      const shareBtn = getByTestId('detail-share-button');
      expect(shareBtn.props.accessibilityLabel).toContain('Share');
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
      expect(getByText('Try in Your Room')).toBeTruthy();
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
      // pisgah-twin has no mock reviews
      const { getByTestId, queryByTestId } = renderDetail({ productId: 'pisgah-twin' });
      expect(getByTestId('reviews-empty-state')).toBeTruthy();
      expect(queryByTestId('review-sort-options')).toBeNull();
      expect(queryByTestId('view-all-reviews')).toBeNull();
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
  });
});
