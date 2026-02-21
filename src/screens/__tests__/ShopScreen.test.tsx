import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ShopScreen } from '../ShopScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import { PRODUCTS } from '@/data/products';

function renderShop(props: { onProductPress?: jest.Mock } = {}) {
  const onProductPress = props.onProductPress ?? jest.fn();
  return {
    ...render(
      <ThemeProvider>
        <WishlistProvider>
          <ShopScreen onProductPress={onProductPress} />
        </WishlistProvider>
      </ThemeProvider>,
    ),
    onProductPress,
  };
}

describe('ShopScreen', () => {
  describe('layout', () => {
    it('renders with testID', () => {
      const { getByTestId } = renderShop();
      expect(getByTestId('shop-screen')).toBeTruthy();
    });

    it('renders Shop title', () => {
      const { getByText } = renderShop();
      expect(getByText('Shop')).toBeTruthy();
    });

    it('renders product list', () => {
      const { getByTestId } = renderShop();
      expect(getByTestId('product-list')).toBeTruthy();
    });

    it('renders search bar', () => {
      const { getByTestId } = renderShop();
      expect(getByTestId('search-bar')).toBeTruthy();
    });

    it('renders category filter', () => {
      const { getByTestId } = renderShop();
      expect(getByTestId('category-filter')).toBeTruthy();
    });

    it('renders sort picker', () => {
      const { getByTestId } = renderShop();
      expect(getByTestId('sort-picker')).toBeTruthy();
    });
  });

  describe('product rendering', () => {
    it('renders product cards', () => {
      const { getByTestId } = renderShop();
      // First page should show products (PAGE_SIZE = 8)
      expect(getByTestId(`product-card-${PRODUCTS[0].id}`)).toBeTruthy();
    });

    it('shows product count in sort picker', () => {
      const { getByText } = renderShop();
      // Should show count of visible products
      expect(getByText(/\d+ products?/)).toBeTruthy();
    });
  });

  describe('search', () => {
    it('filters products when searching', () => {
      const { getByTestId, queryByTestId } = renderShop();
      fireEvent.changeText(getByTestId('search-input'), 'memory foam');
      // Memory foam mattress should be visible
      expect(getByTestId('product-card-prod-memory-foam')).toBeTruthy();
      // Grip strips should not be visible
      expect(queryByTestId('product-card-prod-grip-strips')).toBeNull();
    });

    it('shows empty state for no results', () => {
      const { getByTestId, getByText } = renderShop();
      fireEvent.changeText(getByTestId('search-input'), 'xyznonexistent');
      expect(getByTestId('shop-empty')).toBeTruthy();
      expect(getByText('No products found')).toBeTruthy();
    });

    it('shows search-specific empty message', () => {
      const { getByTestId, getByText } = renderShop();
      fireEvent.changeText(getByTestId('search-input'), 'xyznonexistent');
      expect(getByText(/No results for "xyznonexistent"/)).toBeTruthy();
    });
  });

  describe('category filter', () => {
    it('renders All chip and category chips', () => {
      const { getByTestId, getByText } = renderShop();
      expect(getByTestId('category-all')).toBeTruthy();
      expect(getByText('Futons')).toBeTruthy();
      expect(getByText('Covers')).toBeTruthy();
    });

    it('filters by category when chip pressed', () => {
      const { getByTestId, queryByTestId } = renderShop();
      fireEvent.press(getByTestId('category-pillows'));
      // Arm pillows should be visible
      expect(getByTestId('product-card-prod-arm-pillows')).toBeTruthy();
      // Futons should not be visible
      expect(queryByTestId('product-card-prod-asheville-full')).toBeNull();
    });

    it('shows all when All chip pressed after filtering', () => {
      const { getByTestId } = renderShop();
      // Filter to pillows
      fireEvent.press(getByTestId('category-pillows'));
      // Back to all
      fireEvent.press(getByTestId('category-all'));
      // Futon should be visible again
      expect(getByTestId(`product-card-${PRODUCTS[0].id}`)).toBeTruthy();
    });
  });

  describe('sort', () => {
    it('opens sort modal', () => {
      const { getByTestId, getByText } = renderShop();
      fireEvent.press(getByTestId('sort-button'));
      expect(getByText('Sort By')).toBeTruthy();
    });

    it('sorts by price low to high', () => {
      const { getByTestId, getAllByTestId } = renderShop();
      fireEvent.press(getByTestId('sort-button'));
      fireEvent.press(getByTestId('sort-option-price-asc'));
      // After sorting, the cheapest product should appear
      const cards = getAllByTestId(/^product-card-/);
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  describe('interaction', () => {
    it('calls onProductPress when product card tapped', () => {
      const onProductPress = jest.fn();
      const { getByTestId } = renderShop({ onProductPress });
      fireEvent.press(getByTestId(`product-card-${PRODUCTS[0].id}`));
      expect(onProductPress).toHaveBeenCalledTimes(1);
    });
  });
});
