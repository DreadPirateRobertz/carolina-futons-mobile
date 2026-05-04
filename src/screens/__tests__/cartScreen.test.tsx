import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CartScreen } from '../CartScreen';
import { CartProvider, useCart } from '@/hooks/useCart';
import { ConnectivityProvider } from '@/hooks/useConnectivity';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { FUTON_MODELS, FABRICS } from '@/data/futons';

const mockUseLoyalty = jest.fn();
jest.mock('@/hooks/useLoyalty', () => ({
  useLoyalty: () => mockUseLoyalty(),
}));

const loyaltyBase = {
  points: 250,
  tier: 'bronze' as const,
  nextTier: 'silver' as const,
  pointsToNext: 250,
  progress: 0.5,
  loading: false,
  error: null,
  refreshPoints: jest.fn(),
};

// Mock ReanimatedSwipeable: render testID wrapper exposing onSwipeableOpen for fireEvent,
// and invoke renderRightActions so action buttons are visible in tests.
jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockSwipeable = React.forwardRef(
    ({ children, onSwipeableOpen, testID, renderRightActions }: any, _ref: any) => (
      <View
        testID={testID}
        onSwipeableOpen={() => onSwipeableOpen?.('right', { close: jest.fn() })}
      >
        {renderRightActions
          ? renderRightActions({ value: 1 }, { value: -100 }, { close: jest.fn() })
          : null}
        {children}
      </View>
    ),
  );
  MockSwipeable.displayName = 'MockSwipeable';
  return { __esModule: true, default: MockSwipeable };
});

const mockUseAuth = jest.fn(() => ({ isAuthenticated: true }));
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  AuthContext: { _currentValue: null },
}));

const mockApplyCoupon = jest.fn();
jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => ({
    applyCoupon: mockApplyCoupon,
    addToCart: jest.fn().mockResolvedValue(undefined),
    removeFromCart: jest.fn().mockResolvedValue(undefined),
    updateCartItemQuantity: jest.fn().mockResolvedValue(undefined),
    queryData: jest.fn().mockResolvedValue({ items: [] }),
    insertDataItem: jest.fn().mockResolvedValue({ id: 'mock-id', data: {} }),
  }),
}));

// Mock useBundleSuggestion to prevent async Wix fetches accumulating across tests (cm-b5f).
// Most tests return null bundle (no-op). Integration describe below tests real rendering.
const mockUseBundleSuggestion = jest.fn();
jest.mock('@/hooks/useBundleSuggestion', () => ({
  useBundleSuggestion: (...args: unknown[]) => mockUseBundleSuggestion(...args),
}));

// Mock useProductRecommendations to prevent async Wix calls that leak between tests.
jest.mock('@/hooks/useProductRecommendations', () => ({
  useProductRecommendations: () => ({ recommendations: [], isLoading: false, error: null }),
  clearRecommendationsCache: jest.fn(),
}));

const asheville = FUTON_MODELS[0]; // $349
const blueRidge = FUTON_MODELS[1]; // $449
const naturalLinen = FABRICS[0]; // $0
const mountainBlue = FABRICS[2]; // $29

/** Renders CartScreen wrapped in providers, with optional pre-seeded items */
function renderCartScreen(
  props: Partial<React.ComponentProps<typeof CartScreen>> = {},
  seedItems?: { model: typeof asheville; fabric: typeof naturalLinen; qty: number }[],
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ConnectivityProvider initialOnline={true} skipNetInfo={true}>
        <ThemeProvider>
          <CartProvider>
            {seedItems && <CartSeeder items={seedItems} />}
            {children}
          </CartProvider>
        </ThemeProvider>
      </ConnectivityProvider>
    );
  }

  return render(<CartScreen {...props} />, { wrapper: Wrapper });
}

/** Component that adds items to cart on mount */
function CartSeeder({
  items,
}: {
  items: { model: typeof asheville; fabric: typeof naturalLinen; qty: number }[];
}) {
  const { addItem } = useCart();
  React.useEffect(() => {
    items.forEach(({ model, fabric, qty }) => addItem(model, fabric, qty));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

const nullBundle = {
  bundle: null,
  bundleProducts: [],
  pricing: null,
  isLoading: false,
  error: null,
  addBundleToCart: jest.fn(),
  isAddingToCart: false,
  addSuccess: false,
};

describe('CartScreen', () => {
  beforeEach(() => {
    mockUseLoyalty.mockReturnValue(loyaltyBase);
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    mockUseBundleSuggestion.mockReturnValue(nullBundle);
  });

  describe('Empty cart', () => {
    it('renders empty state when cart is empty', async () => {
      const { findByTestId } = renderCartScreen();
      expect(await findByTestId('cart-empty-state')).toBeTruthy();
    });

    // Skip: illustration component not yet built (sprint bead cm-0qn)
    it.skip('shows empty state illustration', () => {
      const { getByTestId } = renderCartScreen();
      expect(getByTestId('cart-illustration')).toBeTruthy();
    });

    it('shows "Start Shopping" action when onContinueShopping provided', async () => {
      const onContinueShopping = jest.fn();
      const { findByTestId } = renderCartScreen({ onContinueShopping });
      const action = await findByTestId('cart-empty-state-action');
      expect(action).toBeTruthy();
      fireEvent.press(action);
      expect(onContinueShopping).toHaveBeenCalledTimes(1);
    });

    it('does not show action when onContinueShopping not provided', async () => {
      const { findByTestId, queryByTestId } = renderCartScreen();
      await findByTestId('cart-empty-state');
      expect(queryByTestId('cart-empty-state-action')).toBeNull();
    });
  });

  describe('Cart with items', () => {
    const seed = [{ model: asheville, fabric: naturalLinen, qty: 1 }];

    it('renders cart screen with testID', () => {
      const { getByTestId } = renderCartScreen({}, seed);
      expect(getByTestId('cart-screen')).toBeTruthy();
    });

    it('shows cart header with item count', () => {
      const { getByTestId } = renderCartScreen({}, seed);
      expect(getByTestId('cart-header')).toBeTruthy();
    });

    it('renders cart item card', () => {
      const { getByTestId } = renderCartScreen({}, seed);
      expect(getByTestId('cart-item-asheville-full:natural-linen')).toBeTruthy();
    });

    it('shows product name on item', () => {
      const { getByTestId } = renderCartScreen({}, seed);
      expect(getByTestId('cart-item-name-asheville-full:natural-linen').props.children).toBe(
        'The Asheville',
      );
    });

    it('shows fabric name on item', () => {
      const { getByText } = renderCartScreen({}, seed);
      expect(getByText('Natural Linen')).toBeTruthy();
    });

    it('shows item quantity', () => {
      const { getByTestId } = renderCartScreen({}, seed);
      expect(getByTestId('cart-item-qty-asheville-full:natural-linen').props.children).toBe(1);
    });

    it('shows item line total', () => {
      const { getByTestId } = renderCartScreen({}, seed);
      expect(getByTestId('cart-item-price-asheville-full:natural-linen').props.children).toBe(
        '$349.00',
      );
    });
  });

  describe('Order summary', () => {
    const seed = [{ model: asheville, fabric: naturalLinen, qty: 1 }];

    it('renders order summary', () => {
      const { getByTestId } = renderCartScreen({}, seed);
      expect(getByTestId('order-summary')).toBeTruthy();
    });

    it('shows subtotal', () => {
      const { getByTestId } = renderCartScreen({}, seed);
      expect(getByTestId('cart-subtotal').props.children).toBe('$349.00');
    });

    it('shows shipping cost for orders under $499', () => {
      const { getByTestId } = renderCartScreen({}, seed);
      expect(getByTestId('cart-shipping').props.children).toBe('$49.00');
    });

    it('shows free shipping note for orders under threshold', () => {
      const { getByTestId } = renderCartScreen({}, seed);
      expect(getByTestId('free-shipping-note')).toBeTruthy();
    });

    it('shows tax amount', () => {
      const { getByTestId } = renderCartScreen({}, seed);
      // $349 × 0.07 = $24.43
      expect(getByTestId('cart-tax').props.children).toBe('$24.43');
    });

    it('shows total with shipping + tax', () => {
      const { getByTestId } = renderCartScreen({}, seed);
      // $349 + $49 + $24.43 = $422.43
      expect(getByTestId('cart-total').props.children).toBe('$422.43');
    });
  });

  describe('Free shipping', () => {
    const seed = [{ model: blueRidge, fabric: mountainBlue, qty: 2 }];

    it('shows FREE shipping for orders >= $499', () => {
      // ($449+$29) × 2 = $956
      const { getByTestId } = renderCartScreen({}, seed);
      expect(getByTestId('cart-shipping').props.children).toBe('FREE');
    });

    it('hides free shipping note when shipping is free', () => {
      const { queryByTestId } = renderCartScreen({}, seed);
      expect(queryByTestId('free-shipping-note')).toBeNull();
    });
  });

  describe('BNPL teaser', () => {
    it('shows BNPL teaser', () => {
      const seed = [{ model: asheville, fabric: naturalLinen, qty: 1 }];
      const { getByTestId } = renderCartScreen({}, seed);
      expect(getByTestId('bnpl-hero-cart')).toBeTruthy();
    });
  });

  describe('Checkout button', () => {
    const seed = [{ model: asheville, fabric: naturalLinen, qty: 1 }];

    it('renders checkout button', () => {
      const { getByTestId } = renderCartScreen({}, seed);
      expect(getByTestId('checkout-button')).toBeTruthy();
    });

    it('calls onCheckout when pressed', () => {
      const onCheckout = jest.fn();
      const { getByTestId } = renderCartScreen({ onCheckout }, seed);
      fireEvent.press(getByTestId('checkout-button'));
      expect(onCheckout).toHaveBeenCalledTimes(1);
    });

    it('has accessibility label with total', () => {
      const { getByTestId } = renderCartScreen({}, seed);
      expect(getByTestId('checkout-button').props.accessibilityLabel).toContain('$422.43');
    });
  });

  describe('Quantity controls', () => {
    const seed = [{ model: asheville, fabric: naturalLinen, qty: 2 }];

    it('increments item quantity', () => {
      const { getByTestId } = renderCartScreen({}, seed);
      fireEvent.press(getByTestId('cart-item-increment-asheville-full:natural-linen'));
      expect(getByTestId('cart-item-qty-asheville-full:natural-linen').props.children).toBe(3);
    });

    it('decrements item quantity', () => {
      const { getByTestId } = renderCartScreen({}, seed);
      fireEvent.press(getByTestId('cart-item-decrement-asheville-full:natural-linen'));
      expect(getByTestId('cart-item-qty-asheville-full:natural-linen').props.children).toBe(1);
    });

    it('removes item when decremented to 0', () => {
      const seed1 = [{ model: asheville, fabric: naturalLinen, qty: 1 }];
      const { getByTestId, queryByTestId } = renderCartScreen({}, seed1);
      fireEvent.press(getByTestId('cart-item-decrement-asheville-full:natural-linen'));
      expect(queryByTestId('cart-item-asheville-full:natural-linen')).toBeNull();
    });
  });

  describe('Remove item', () => {
    const seed = [
      { model: asheville, fabric: naturalLinen, qty: 1 },
      { model: blueRidge, fabric: mountainBlue, qty: 1 },
    ];

    it('removes item when X pressed', () => {
      const { getByTestId, queryByTestId } = renderCartScreen({}, seed);
      fireEvent.press(getByTestId('cart-item-remove-asheville-full:natural-linen'));
      expect(queryByTestId('cart-item-asheville-full:natural-linen')).toBeNull();
      expect(getByTestId('cart-item-blue-ridge-queen:mountain-blue')).toBeTruthy();
    });
  });

  describe('Clear cart', () => {
    const seed = [
      { model: asheville, fabric: naturalLinen, qty: 1 },
      { model: blueRidge, fabric: mountainBlue, qty: 1 },
    ];

    it('clears all items', async () => {
      const { getByTestId, findByTestId } = renderCartScreen({}, seed);
      await findByTestId('cart-clear-button');
      fireEvent.press(getByTestId('cart-clear-button'));
      expect(await findByTestId('cart-empty-state')).toBeTruthy();
    });
  });

  describe('Swipe to remove', () => {
    const seed = [{ model: asheville, fabric: naturalLinen, qty: 1 }];

    it('wraps cart item in Swipeable component', () => {
      const { getByTestId } = renderCartScreen({}, seed);
      expect(getByTestId('cart-item-swipeable-asheville-full:natural-linen')).toBeTruthy();
    });

    it('renders delete action behind swipeable', () => {
      const { getByTestId } = renderCartScreen({}, seed);
      expect(getByTestId('swipe-delete-action')).toBeTruthy();
    });

    it('removes item when swipe completes', () => {
      const { getByTestId, queryByTestId } = renderCartScreen({}, seed);
      const swipeable = getByTestId('cart-item-swipeable-asheville-full:natural-linen');
      fireEvent(swipeable, 'swipeableOpen');
      expect(queryByTestId('cart-item-asheville-full:natural-linen')).toBeNull();
    });
  });

  describe('Quantity button animation', () => {
    const seed = [{ model: asheville, fabric: naturalLinen, qty: 2 }];

    it('wraps quantity buttons in animated containers', () => {
      const { getByTestId } = renderCartScreen({}, seed);
      expect(getByTestId('qty-btn-animated-decrement-asheville-full:natural-linen')).toBeTruthy();
      expect(getByTestId('qty-btn-animated-increment-asheville-full:natural-linen')).toBeTruthy();
    });
  });

  describe('Custom testID', () => {
    it('accepts custom testID', async () => {
      const { findByTestId } = renderCartScreen({ testID: 'my-cart' });
      expect(await findByTestId('my-cart')).toBeTruthy();
    });
  });

  describe('Promo code', () => {
    const seed = [{ model: asheville, fabric: naturalLinen, qty: 1 }];

    beforeEach(() => {
      mockApplyCoupon.mockReset();
    });

    it('renders promo code section', () => {
      const { getByTestId } = renderCartScreen({}, seed);
      expect(getByTestId('promo-code-section')).toBeTruthy();
    });

    it('renders promo input and apply button', () => {
      const { getByTestId } = renderCartScreen({}, seed);
      expect(getByTestId('promo-input')).toBeTruthy();
      expect(getByTestId('promo-apply-button')).toBeTruthy();
    });

    it('shows applied coupon after successful validation', async () => {
      mockApplyCoupon.mockResolvedValue({
        id: 'c1',
        code: 'SAVE20',
        name: '20% Off',
        discountType: 'percentage',
        discountValue: 20,
      });

      const { getByTestId } = renderCartScreen({}, seed);
      fireEvent.changeText(getByTestId('promo-input'), 'SAVE20');
      fireEvent.press(getByTestId('promo-apply-button'));

      await waitFor(() => {
        expect(getByTestId('promo-applied')).toBeTruthy();
      });
    });

    it('shows discount row in order summary when coupon applied', async () => {
      mockApplyCoupon.mockResolvedValue({
        id: 'c1',
        code: 'SAVE20',
        name: '20% Off',
        discountType: 'percentage',
        discountValue: 20,
      });

      const { getByTestId } = renderCartScreen({}, seed);
      fireEvent.changeText(getByTestId('promo-input'), 'SAVE20');
      fireEvent.press(getByTestId('promo-apply-button'));

      await waitFor(() => {
        expect(getByTestId('cart-discount-row')).toBeTruthy();
        // $349 * 20% = $69.80
        expect(getByTestId('cart-discount').props.children).toEqual(['−', '$69.80']);
      });
    });

    it('shows error for invalid promo code', async () => {
      mockApplyCoupon.mockRejectedValue({ statusCode: 404, message: 'Not found' });

      const { getByTestId } = renderCartScreen({}, seed);
      fireEvent.changeText(getByTestId('promo-input'), 'BADCODE');
      fireEvent.press(getByTestId('promo-apply-button'));

      await waitFor(() => {
        expect(getByTestId('promo-error')).toBeTruthy();
      });
    });

    it('removes applied coupon when remove pressed', async () => {
      mockApplyCoupon.mockResolvedValue({
        id: 'c1',
        code: 'SAVE20',
        name: '20% Off',
        discountType: 'percentage',
        discountValue: 20,
      });

      const { getByTestId, queryByTestId } = renderCartScreen({}, seed);
      fireEvent.changeText(getByTestId('promo-input'), 'SAVE20');
      fireEvent.press(getByTestId('promo-apply-button'));

      await waitFor(() => {
        expect(getByTestId('promo-applied')).toBeTruthy();
      });

      fireEvent.press(getByTestId('promo-remove-button'));
      expect(queryByTestId('promo-applied')).toBeNull();
      expect(queryByTestId('cart-discount-row')).toBeNull();
    });

    it('updates total with discount applied', async () => {
      mockApplyCoupon.mockResolvedValue({
        id: 'c1',
        code: 'SAVE20',
        name: '20% Off',
        discountType: 'percentage',
        discountValue: 20,
      });

      const { getByTestId } = renderCartScreen({}, seed);
      fireEvent.changeText(getByTestId('promo-input'), 'SAVE20');
      fireEvent.press(getByTestId('promo-apply-button'));

      await waitFor(() => {
        // Subtotal: $349, Discount: $69.80, Taxable: $279.20
        // Tax: $279.20 * 0.07 = $19.54, Shipping: $49
        // Total: $279.20 + $49 + $19.54 = $347.74
        expect(getByTestId('cart-total').props.children).toBe('$347.74');
      });
    });
  });

  // ── BNPL modal — teaser tap (cm-v65) ──────────────────────────────────────

  describe('BNPL modal — teaser tap (cm-v65)', () => {
    const seed = [{ model: asheville, fabric: naturalLinen, qty: 1 }];

    it('BNPL teaser is shown when cart has items', () => {
      const { getByTestId } = renderCartScreen({}, seed);
      expect(getByTestId('bnpl-hero-cart')).toBeTruthy();
    });

    it('BNPL modal is not visible initially', () => {
      const { queryByTestId } = renderCartScreen({}, seed);
      expect(queryByTestId('bnpl-continue-btn')).toBeNull();
    });

    it('tapping BNPL teaser opens the modal', () => {
      const { getByTestId } = renderCartScreen({}, seed);
      fireEvent.press(getByTestId('bnpl-hero-cart'));
      expect(getByTestId('bnpl-modal')).toBeTruthy();
    });

    it('modal shows installment breakdown after teaser tap', () => {
      const { getByTestId, getByText } = renderCartScreen({}, seed);
      fireEvent.press(getByTestId('bnpl-hero-cart'));
      expect(getByText('Pay over time')).toBeTruthy();
      expect(getByText('Today')).toBeTruthy();
    });

    it('modal shows Klarna tab by default', () => {
      const { getByTestId, getByText } = renderCartScreen({}, seed);
      fireEvent.press(getByTestId('bnpl-hero-cart'));
      expect(getByText('Continue with Klarna')).toBeTruthy();
    });

    it('modal closes when close button pressed', () => {
      const { getByTestId, queryByTestId } = renderCartScreen({}, seed);
      fireEvent.press(getByTestId('bnpl-hero-cart'));
      fireEvent.press(getByTestId('bnpl-modal-close'));
      expect(queryByTestId('bnpl-continue-btn')).toBeNull();
    });

    it('modal closes when overlay pressed', () => {
      const { getByTestId, queryByTestId } = renderCartScreen({}, seed);
      fireEvent.press(getByTestId('bnpl-hero-cart'));
      fireEvent.press(getByTestId('bnpl-modal-overlay'));
      expect(queryByTestId('bnpl-continue-btn')).toBeNull();
    });
  });

  // ── LoyaltyProgressBar in CartScreen — hq-99ofd ───────────────────────────

  describe('LoyaltyProgressBar — hq-99ofd', () => {
    const seed = [{ model: asheville, fabric: naturalLinen, qty: 1 }];

    it('renders tier-progress-bar when authenticated with items in cart', () => {
      const { getByTestId } = renderCartScreen({}, seed);
      expect(getByTestId('cart-loyalty-progress')).toBeTruthy();
    });

    it('does not render tier-progress-bar in empty cart', () => {
      const { queryByTestId } = renderCartScreen();
      expect(queryByTestId('cart-loyalty-progress')).toBeNull();
    });

    it('does not render tier-progress-bar when unauthenticated', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: false });
      const { queryByTestId } = renderCartScreen({}, seed);
      expect(queryByTestId('cart-loyalty-progress')).toBeNull();
    });

    it('passes points from useLoyalty to TierProgressBar (Trail Blazer tier a11y)', () => {
      mockUseLoyalty.mockReturnValue({ ...loyaltyBase, points: 250 });
      const { getByTestId } = renderCartScreen({}, seed);
      const bar = getByTestId('cart-loyalty-progress');
      expect(bar.props.accessibilityLabel).toMatch(/Trail Blazer/i);
    });

    it('shows Mountain Guide tier a11y label when points >= 500', () => {
      mockUseLoyalty.mockReturnValue({
        ...loyaltyBase,
        points: 750,
      });
      const { getByTestId } = renderCartScreen({}, seed);
      const bar = getByTestId('cart-loyalty-progress');
      expect(bar.props.accessibilityLabel).toMatch(/Mountain Guide/i);
    });

    it('shows max-tier label when Blue Ridge Legend (points >= 3000)', () => {
      mockUseLoyalty.mockReturnValue({
        ...loyaltyBase,
        points: 3000,
        nextTier: null,
        pointsToNext: 0,
        progress: 1,
      });
      const { getByTestId } = renderCartScreen({}, seed);
      const bar = getByTestId('cart-loyalty-progress');
      expect(bar.props.accessibilityLabel).toMatch(/maximum tier reached/i);
    });
  });

  // cm-b5f: BundleSuggestion integration — verifies component renders/hides in CartScreen.
  // Uses controlled hook mock (no async Wix fetch) to avoid OOM accumulation.
  describe('BundleSuggestion integration (cm-b5f)', () => {
    const seed = [{ model: asheville, fabric: FABRICS[0], qty: 1 }];

    it('renders BundleSuggestion when cart has items and bundle is available', async () => {
      mockUseBundleSuggestion.mockReturnValue({
        bundle: { bundleId: 'b1', name: 'Asheville Comfort Bundle', productIds: ['p1', 'p2'], discountPercent: 10 },
        bundleProducts: [
          { id: 'p1', name: 'Asheville Full', slug: 'asheville-full', price: 349, category: 'futons' as const, fabricOptions: [], images: [], rating: 4.5, reviewCount: 12, description: '', inStock: true, featured: false },
          { id: 'p2', name: 'Linen Cover', slug: 'linen-cover', price: 79, category: 'covers' as const, fabricOptions: [], images: [], rating: 4.0, reviewCount: 5, description: '', inStock: true, featured: false },
        ],
        pricing: { originalTotal: 428, bundlePrice: 385, savings: 43, savingsPercent: 10, couponCode: 'CF-BUNDLE-ASHVLLE1' },
        isLoading: false,
        error: null,
        addBundleToCart: jest.fn(),
        isAddingToCart: false,
        addSuccess: false,
      });
      const { getByTestId } = renderCartScreen({}, seed);
      await waitFor(() => expect(getByTestId('bundle-suggestion-cart')).toBeTruthy());
    });

    it('does not render BundleSuggestion when cart is empty', () => {
      mockUseBundleSuggestion.mockReturnValue({
        bundle: { bundleId: 'b1', name: 'Bundle', productIds: ['p1'], discountPercent: 10 },
        bundleProducts: [],
        pricing: { originalTotal: 349, bundlePrice: 314, savings: 35, savingsPercent: 10, couponCode: 'CF-BUNDLE-X' },
        isLoading: false,
        error: null,
        addBundleToCart: jest.fn(),
        isAddingToCart: false,
        addSuccess: false,
      });
      const { queryByTestId } = renderCartScreen();
      expect(queryByTestId('bundle-suggestion-cart')).toBeNull();
    });
  });
});
