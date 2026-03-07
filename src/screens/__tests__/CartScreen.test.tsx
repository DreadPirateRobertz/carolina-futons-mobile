import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CartScreen } from '../CartScreen';
import { CartProvider, useCart } from '@/hooks/useCart';
import { ConnectivityProvider } from '@/hooks/useConnectivity';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { FUTON_MODELS, FABRICS } from '@/data/futons';

const mockApplyCoupon = jest.fn();
jest.mock('@/services/wix/wixProvider', () => ({
  useWixClient: () => ({
    applyCoupon: mockApplyCoupon,
  }),
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

describe('CartScreen', () => {
  describe('Empty cart', () => {
    it('renders empty state when cart is empty', () => {
      const { getByTestId } = renderCartScreen();
      expect(getByTestId('cart-empty-state')).toBeTruthy();
    });

    // Skip: illustration component not yet built (sprint bead cm-0qn)
    it.skip('shows empty state illustration', () => {
      const { getByTestId } = renderCartScreen();
      expect(getByTestId('cart-illustration')).toBeTruthy();
    });

    it('shows "Start Shopping" action when onContinueShopping provided', () => {
      const onContinueShopping = jest.fn();
      const { getByTestId } = renderCartScreen({ onContinueShopping });
      const action = getByTestId('cart-empty-state-action');
      expect(action).toBeTruthy();
      fireEvent.press(action);
      expect(onContinueShopping).toHaveBeenCalledTimes(1);
    });

    it('does not show action when onContinueShopping not provided', () => {
      const { queryByTestId } = renderCartScreen();
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
      expect(getByTestId('bnpl-teaser')).toBeTruthy();
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

    it('clears all items', () => {
      const { getByTestId } = renderCartScreen({}, seed);
      fireEvent.press(getByTestId('cart-clear-button'));
      expect(getByTestId('cart-empty-state')).toBeTruthy();
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
    it('accepts custom testID', () => {
      const { getByTestId } = renderCartScreen({ testID: 'my-cart' });
      expect(getByTestId('my-cart')).toBeTruthy();
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
});
