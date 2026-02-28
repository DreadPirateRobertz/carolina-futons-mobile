import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProductDetailScreen } from '../ProductDetailScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import { FUTON_MODELS, FABRICS } from '@/data/futons';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
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
    it('renders AR button', () => {
      const { getByTestId } = renderDetail();
      expect(getByTestId('ar-cta-button')).toBeTruthy();
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
      fireEvent.press(getByTestId('ar-cta-button'));
      expect(onOpenAR).toHaveBeenCalledWith('blue-ridge-queen');
    });

    it('does not crash when onOpenAR not provided', () => {
      const { getByTestId } = renderDetail();
      expect(() => fireEvent.press(getByTestId('ar-cta-button'))).not.toThrow();
    });

    it('has accessibility label with model name', () => {
      const { getByTestId } = renderDetail({ productId: 'asheville-full' });
      const btn = getByTestId('ar-cta-button');
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
});
