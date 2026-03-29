/**
 * @module MiniCartDrawer.test
 *
 * TDD tests for the MiniCartDrawer component — cm-2us.
 * Slide-up drawer showing item count, subtotal, and checkout CTA.
 * Available from all screens except Checkout.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { MiniCartDrawer } from '../MiniCartDrawer';
import { ThemeProvider } from '@/theme/ThemeProvider';

// Mock useCart
const mockUseCart = jest.fn();
jest.mock('@/hooks/useCart', () => ({
  useCart: () => mockUseCart(),
}));

function renderDrawer(props: Partial<React.ComponentProps<typeof MiniCartDrawer>> = {}) {
  return render(
    <ThemeProvider>
      <MiniCartDrawer visible={true} onClose={jest.fn()} onCheckout={jest.fn()} {...props} />
    </ThemeProvider>,
  );
}

const CART_WITH_ITEMS = {
  itemCount: 2,
  subtotal: 798,
  items: [
    {
      id: 'asheville:natural-linen',
      model: { name: 'Asheville' },
      fabric: { name: 'Natural Linen', color: '#D4C5A9' },
      fabricName: 'Natural Linen',
      quantity: 1,
      unitPrice: 349,
      price: 349,
      imageUrl: 'https://cdn.wix.com/asheville-150.jpg',
    },
    {
      id: 'blue-ridge:natural-linen',
      model: { name: 'Blue Ridge' },
      fabric: { name: 'Natural Linen', color: '#D4C5A9' },
      fabricName: 'Natural Linen',
      quantity: 1,
      unitPrice: 449,
      price: 449,
    },
  ],
};

const EMPTY_CART = { itemCount: 0, subtotal: 0, items: [] };

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCart.mockReturnValue(CART_WITH_ITEMS);
});

describe('MiniCartDrawer', () => {
  describe('Visibility', () => {
    it('renders when visible=true', () => {
      const { getByTestId } = renderDrawer({ visible: true });
      expect(getByTestId('mini-cart-drawer')).toBeTruthy();
    });

    it('does not render when visible=false', () => {
      const { queryByTestId } = renderDrawer({ visible: false });
      expect(queryByTestId('mini-cart-drawer')).toBeNull();
    });
  });

  describe('Content', () => {
    it('shows item count', () => {
      const { getByTestId } = renderDrawer();
      expect(getByTestId('mini-cart-item-count').props.children).toBe(2);
    });

    it('shows formatted subtotal', () => {
      const { getByTestId } = renderDrawer();
      const subtotalEl = getByTestId('mini-cart-subtotal');
      expect(subtotalEl.props.children).toMatch(/798|\$798/);
    });

    it('shows checkout button', () => {
      const { getByTestId } = renderDrawer();
      expect(getByTestId('mini-cart-checkout-btn')).toBeTruthy();
    });

    it('shows close button', () => {
      const { getByTestId } = renderDrawer();
      expect(getByTestId('mini-cart-close-btn')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('calls onClose when close button pressed', () => {
      const onClose = jest.fn();
      const { getByTestId } = renderDrawer({ onClose });
      fireEvent.press(getByTestId('mini-cart-close-btn'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onCheckout when checkout button pressed', () => {
      const onCheckout = jest.fn();
      const { getByTestId } = renderDrawer({ onCheckout });
      fireEvent.press(getByTestId('mini-cart-checkout-btn'));
      expect(onCheckout).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop pressed', () => {
      const onClose = jest.fn();
      const { getByTestId } = renderDrawer({ onClose });
      fireEvent.press(getByTestId('mini-cart-backdrop'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('disables checkout button when cart is empty', () => {
      mockUseCart.mockReturnValue(EMPTY_CART);
      const { getByTestId } = renderDrawer();
      expect(getByTestId('mini-cart-checkout-btn').props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('drawer has modal accessibilityViewIsModal', () => {
      const { getByTestId } = renderDrawer();
      expect(getByTestId('mini-cart-drawer').props.accessibilityViewIsModal).toBe(true);
    });

    it('close button has accessible label', () => {
      const { getByTestId } = renderDrawer();
      expect(getByTestId('mini-cart-close-btn').props.accessibilityLabel).toBeTruthy();
    });

    it('checkout button has button role', () => {
      const { getByTestId } = renderDrawer();
      expect(getByTestId('mini-cart-checkout-btn').props.accessibilityRole).toBe('button');
    });
  });

  describe('Default testID', () => {
    it('accepts custom testID', () => {
      const { getByTestId } = renderDrawer({ testID: 'my-mini-cart' });
      expect(getByTestId('my-mini-cart')).toBeTruthy();
    });
  });

  describe('Item schema — imageUrl + fabricName + a11y', () => {
    it('shows product image when imageUrl is present', () => {
      const { getByTestId } = renderDrawer();
      const img = getByTestId('cartItemImage-asheville:natural-linen');
      expect(img.props.source?.uri).toBe('https://cdn.wix.com/asheville-150.jpg');
    });

    it('shows color swatch when imageUrl is absent', () => {
      const { getByTestId } = renderDrawer();
      const swatch = getByTestId('cartItemImage-blue-ridge:natural-linen');
      // No source.uri → it's a View with backgroundColor
      expect(swatch.props.source).toBeUndefined();
      expect(swatch.props.style).toBeTruthy();
    });

    it('each cart item row has accessibilityLabel with name, fabricName, price, qty', () => {
      const { getByTestId } = renderDrawer();
      const row = getByTestId('cartItemRow-asheville:natural-linen');
      expect(row.props.accessibilityLabel).toMatch(/Asheville/i);
      expect(row.props.accessibilityLabel).toMatch(/Natural Linen/i);
      expect(row.props.accessibilityLabel).toMatch(/349/);
      expect(row.props.accessibilityLabel).toMatch(/quantity 1/i);
    });

    it('accessibilityLabel uses fabricName field when available', () => {
      const { getByTestId } = renderDrawer();
      const row = getByTestId('cartItemRow-asheville:natural-linen');
      expect(row.props.accessibilityLabel).toContain('Natural Linen');
    });
  });

  describe('Reduced motion', () => {
    it('renders without crash when reduced motion is enabled', () => {
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
      expect(() => renderDrawer()).not.toThrow();
      jest.restoreAllMocks();
    });
  });
});
