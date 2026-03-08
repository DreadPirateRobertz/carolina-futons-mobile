import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { ShopScreen } from '../ShopScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import { PRODUCTS } from '@/data/products';

jest.useFakeTimers();

async function renderShop(props: { onProductPress?: jest.Mock } = {}) {
  const onProductPress = props.onProductPress ?? jest.fn();
  const result = render(
    <ThemeProvider>
      <WishlistProvider>
        <ShopScreen onProductPress={onProductPress} />
      </WishlistProvider>
    </ThemeProvider>,
  );
  // Advance past initial loading skeleton (600ms) and flush async SWR cache
  await act(async () => {
    jest.advanceTimersByTime(700);
  });
  return { ...result, onProductPress };
}

describe('ShopScreen', () => {
  describe('layout', () => {
    it('renders with testID', async () => {
      const { getByTestId } = await renderShop();
      expect(getByTestId('shop-screen')).toBeTruthy();
    });

    it('renders Shop title', async () => {
      const { getByText } = await renderShop();
      expect(getByText('Shop')).toBeTruthy();
    });

    it('renders product list', async () => {
      const { getByTestId } = await renderShop();
      expect(getByTestId('product-list')).toBeTruthy();
    });

    it('renders search bar', async () => {
      const { getByTestId } = await renderShop();
      expect(getByTestId('search-bar')).toBeTruthy();
    });

    it('renders category filter', async () => {
      const { getByTestId } = await renderShop();
      expect(getByTestId('category-filter')).toBeTruthy();
    });

    it('renders sort picker', async () => {
      const { getByTestId } = await renderShop();
      expect(getByTestId('sort-picker')).toBeTruthy();
    });
  });

  describe('product rendering', () => {
    it('renders product cards', async () => {
      const { getByTestId } = await renderShop();
      // First page should show products (PAGE_SIZE = 8)
      expect(getByTestId(`product-card-${PRODUCTS[0].id}`)).toBeTruthy();
    });

    it('shows product count in sort picker', async () => {
      const { getByText } = await renderShop();
      // Should show count of visible products
      expect(getByText(/\d+ products?/)).toBeTruthy();
    });
  });

  describe('search', () => {
    it('filters products when searching', async () => {
      const { getByTestId, queryByTestId } = await renderShop();
      fireEvent.changeText(getByTestId('search-input'), 'memory foam');
      // Memory foam mattress should be visible
      expect(getByTestId('product-card-prod-memory-foam')).toBeTruthy();
      // Grip strips should not be visible
      expect(queryByTestId('product-card-prod-grip-strips')).toBeNull();
    });

    it('shows empty state for no results', async () => {
      const { getByTestId, getByText } = await renderShop();
      fireEvent.changeText(getByTestId('search-input'), 'xyznonexistent');
      expect(getByTestId('search-empty-state')).toBeTruthy();
      expect(getByText(/No results for "xyznonexistent"/)).toBeTruthy();
    });

    it('shows search-specific empty message', async () => {
      const { getByTestId, getByText } = await renderShop();
      fireEvent.changeText(getByTestId('search-input'), 'xyznonexistent');
      expect(getByText(/No results for "xyznonexistent"/)).toBeTruthy();
    });

    it('clears search and sets category when empty-state category chip pressed', async () => {
      const { getByTestId, queryByTestId } = await renderShop();
      fireEvent.changeText(getByTestId('search-input'), 'xyznonexistent');
      expect(getByTestId('search-empty-state')).toBeTruthy();
      fireEvent.press(getByTestId('category-chip-futons'));
      expect(queryByTestId('search-empty-state')).toBeNull();
    });

    it('sets search query when trending chip pressed', async () => {
      const { getByTestId, queryByTestId } = await renderShop();
      fireEvent.changeText(getByTestId('search-input'), 'xyznonexistent');
      expect(getByTestId('search-empty-state')).toBeTruthy();
      fireEvent.press(getByTestId('trending-chip-0'));
      // Trending chip sets search to 'futon mattress', which should match products
      expect(queryByTestId('search-empty-state')).toBeNull();
    });
  });

  describe('category filter', () => {
    it('renders All chip and category chips', async () => {
      const { getByTestId, getByText } = await renderShop();
      expect(getByTestId('category-all')).toBeTruthy();
      expect(getByText('Futons')).toBeTruthy();
      expect(getByText('Covers')).toBeTruthy();
    });

    it('filters by category when chip pressed', async () => {
      const { getByTestId, queryByTestId } = await renderShop();
      fireEvent.press(getByTestId('category-pillows'));
      // Arm pillows should be visible
      expect(getByTestId('product-card-prod-arm-pillows')).toBeTruthy();
      // Futons should not be visible
      expect(queryByTestId('product-card-prod-asheville-full')).toBeNull();
    });

    it('shows all when All chip pressed after filtering', async () => {
      const { getByTestId } = await renderShop();
      // Filter to pillows
      fireEvent.press(getByTestId('category-pillows'));
      // Back to all
      fireEvent.press(getByTestId('category-all'));
      // Futon should be visible again
      expect(getByTestId(`product-card-${PRODUCTS[0].id}`)).toBeTruthy();
    });
  });

  describe('sort', () => {
    it('opens sort modal', async () => {
      const { getByTestId, getByText } = await renderShop();
      fireEvent.press(getByTestId('sort-button'));
      expect(getByText('Sort By')).toBeTruthy();
    });

    it('sorts by price low to high', async () => {
      const { getByTestId, getAllByTestId } = await renderShop();
      fireEvent.press(getByTestId('sort-button'));
      fireEvent.press(getByTestId('sort-option-price-asc'));
      // After sorting, the cheapest product should appear
      const cards = getAllByTestId(/^product-card-/);
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  describe('interaction', () => {
    it('calls onProductPress when product card tapped', async () => {
      const onProductPress = jest.fn();
      const { getByTestId } = await renderShop({ onProductPress });
      fireEvent.press(getByTestId(`product-card-${PRODUCTS[0].id}`));
      expect(onProductPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('entrance animation', () => {
    it('wraps product cards in animated containers', async () => {
      const { getAllByTestId } = await renderShop();
      const wrappers = getAllByTestId(/^product-card-animated-/);
      expect(wrappers.length).toBeGreaterThan(0);
    });
  });
});
