/**
 * @module ProductContextMenu.test
 *
 * TDD tests for the ProductContextMenu component — cm-qzd.
 * Slide-up action sheet shown on ProductCard long-press.
 * Actions: Add to Cart, Add to Wishlist, Share.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProductContextMenu } from '../ProductContextMenu';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { PRODUCTS } from '@/data/products';

const product = PRODUCTS.find((p) => p.category === 'futons')!;

function renderMenu(
  props: Partial<React.ComponentProps<typeof ProductContextMenu>> = {},
) {
  return render(
    <ThemeProvider>
      <ProductContextMenu
        visible={true}
        product={product}
        onClose={jest.fn()}
        {...props}
      />
    </ThemeProvider>,
  );
}

describe('ProductContextMenu', () => {
  describe('Visibility', () => {
    it('renders when visible=true', () => {
      const { getByTestId } = renderMenu({ visible: true });
      expect(getByTestId('product-context-menu')).toBeTruthy();
    });

    it('does not render when visible=false', () => {
      const { queryByTestId } = renderMenu({ visible: false });
      expect(queryByTestId('product-context-menu')).toBeNull();
    });
  });

  describe('Content', () => {
    it('shows product name in header', () => {
      const { getByTestId } = renderMenu();
      expect(getByTestId('context-menu-product-name').props.children).toBe(
        product.name,
      );
    });

    it('shows Add to Cart button when onAddToCart provided', () => {
      const { getByTestId } = renderMenu({ onAddToCart: jest.fn() });
      expect(getByTestId('context-add-to-cart')).toBeTruthy();
    });

    it('hides Add to Cart button when onAddToCart not provided', () => {
      const { queryByTestId } = renderMenu({ onAddToCart: undefined });
      expect(queryByTestId('context-add-to-cart')).toBeNull();
    });

    it('shows Add to Wishlist button when onAddToWishlist provided', () => {
      const { getByTestId } = renderMenu({ onAddToWishlist: jest.fn() });
      expect(getByTestId('context-add-to-wishlist')).toBeTruthy();
    });

    it('hides Add to Wishlist button when onAddToWishlist not provided', () => {
      const { queryByTestId } = renderMenu({ onAddToWishlist: undefined });
      expect(queryByTestId('context-add-to-wishlist')).toBeNull();
    });

    it('shows Share button when onShare provided', () => {
      const { getByTestId } = renderMenu({ onShare: jest.fn() });
      expect(getByTestId('context-share')).toBeTruthy();
    });

    it('hides Share button when onShare not provided', () => {
      const { queryByTestId } = renderMenu({ onShare: undefined });
      expect(queryByTestId('context-share')).toBeNull();
    });

    it('always shows Cancel button', () => {
      const { getByTestId } = renderMenu();
      expect(getByTestId('context-cancel')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('calls onAddToCart and onClose when Add to Cart pressed', () => {
      const onAddToCart = jest.fn();
      const onClose = jest.fn();
      const { getByTestId } = renderMenu({ onAddToCart, onClose });
      fireEvent.press(getByTestId('context-add-to-cart'));
      expect(onAddToCart).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onAddToWishlist and onClose when Add to Wishlist pressed', () => {
      const onAddToWishlist = jest.fn();
      const onClose = jest.fn();
      const { getByTestId } = renderMenu({ onAddToWishlist, onClose });
      fireEvent.press(getByTestId('context-add-to-wishlist'));
      expect(onAddToWishlist).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onShare and onClose when Share pressed', () => {
      const onShare = jest.fn();
      const onClose = jest.fn();
      const { getByTestId } = renderMenu({ onShare, onClose });
      fireEvent.press(getByTestId('context-share'));
      expect(onShare).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Cancel pressed', () => {
      const onClose = jest.fn();
      const { getByTestId } = renderMenu({ onClose });
      fireEvent.press(getByTestId('context-cancel'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop pressed', () => {
      const onClose = jest.fn();
      const { getByTestId } = renderMenu({ onClose });
      fireEvent.press(getByTestId('product-context-menu-backdrop'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('menu has accessibilityViewIsModal', () => {
      const { getByTestId } = renderMenu();
      expect(getByTestId('product-context-menu').props.accessibilityViewIsModal).toBe(true);
    });

    it('Add to Cart button has accessibilityRole=button', () => {
      const { getByTestId } = renderMenu({ onAddToCart: jest.fn() });
      expect(getByTestId('context-add-to-cart').props.accessibilityRole).toBe('button');
    });

    it('Add to Wishlist button has accessibilityRole=button', () => {
      const { getByTestId } = renderMenu({ onAddToWishlist: jest.fn() });
      expect(getByTestId('context-add-to-wishlist').props.accessibilityRole).toBe('button');
    });

    it('Share button has accessibilityRole=button', () => {
      const { getByTestId } = renderMenu({ onShare: jest.fn() });
      expect(getByTestId('context-share').props.accessibilityRole).toBe('button');
    });

    it('Cancel button has accessibilityRole=button', () => {
      const { getByTestId } = renderMenu();
      expect(getByTestId('context-cancel').props.accessibilityRole).toBe('button');
    });
  });
});
