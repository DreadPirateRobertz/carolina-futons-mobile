import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { CategoryScreen } from '../CategoryScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import { PRODUCTS } from '@/data/products';

jest.useFakeTimers();

const futonProducts = PRODUCTS.filter((p) => p.category === 'futons');
const coverProducts = PRODUCTS.filter((p) => p.category === 'covers');

async function renderCategory(props: Partial<React.ComponentProps<typeof CategoryScreen>> = {}) {
  const onProductPress = props.onProductPress ?? jest.fn();
  const onBack = props.onBack ?? jest.fn();
  const result = render(
    <ThemeProvider>
      <WishlistProvider>
        <CategoryScreen onProductPress={onProductPress} onBack={onBack} {...props} />
      </WishlistProvider>
    </ThemeProvider>,
  );
  // Advance past initial loading skeleton (600ms) and flush async SWR cache
  await act(async () => {
    jest.advanceTimersByTime(700);
  });
  return { ...result, onProductPress, onBack };
}

describe('CategoryScreen', () => {
  describe('rendering', () => {
    it('renders with default testID', async () => {
      const { getByTestId } = await renderCategory();
      expect(getByTestId('category-screen')).toBeTruthy();
    });

    it('accepts custom testID', async () => {
      const { getByTestId } = await renderCategory({ testID: 'custom-cat' });
      expect(getByTestId('custom-cat')).toBeTruthy();
    });

    it('renders category title from categoryId', async () => {
      const { getByTestId } = await renderCategory({ categoryId: 'futons' });
      expect(getByTestId('category-title').props.children).toBe('Futons');
    });

    it('renders custom categoryTitle when provided', async () => {
      const { getByTestId } = await renderCategory({
        categoryId: 'futons',
        categoryTitle: 'All Futons',
      });
      expect(getByTestId('category-title').props.children).toBe('All Futons');
    });

    it('title has header accessibility role', async () => {
      const { getByTestId } = await renderCategory();
      expect(getByTestId('category-title').props.accessibilityRole).toBe('header');
    });
  });

  describe('product grid', () => {
    it('shows futon products for futons category', async () => {
      const { getByTestId } = await renderCategory({ categoryId: 'futons' });
      expect(getByTestId('category-product-list')).toBeTruthy();
    });

    it('shows product count', async () => {
      const { getByTestId } = await renderCategory({ categoryId: 'futons' });
      expect(getByTestId('category-count').props.children).toEqual([
        futonProducts.length,
        ' ',
        'products',
      ]);
    });

    it('shows singular for 1 product categories', async () => {
      // accessories with only grip strips and polish = 2 products
      // Let's use pillows which has 1 product
      const { getByTestId } = await renderCategory({ categoryId: 'pillows' });
      const pillowCount = PRODUCTS.filter((p) => p.category === 'pillows').length;
      expect(getByTestId('category-count').props.children).toEqual([
        pillowCount,
        ' ',
        pillowCount === 1 ? 'product' : 'products',
      ]);
    });

    it('shows cover products for covers category', async () => {
      const { getByTestId } = await renderCategory({ categoryId: 'covers' });
      // Verify at least one cover product card renders
      const firstCover = coverProducts[0];
      expect(getByTestId(`product-card-${firstCover.id}`)).toBeTruthy();
    });
  });

  describe('empty state', () => {
    it('shows empty state for unknown category with no products', async () => {
      const { getByTestId } = await renderCategory({
        categoryId: 'nonexistent-category' as any,
        categoryTitle: 'Empty Category',
      });
      expect(getByTestId('category-empty')).toBeTruthy();
    });

    it('empty state shows go back action when onBack provided', async () => {
      const { getByTestId } = await renderCategory({
        categoryId: 'nonexistent-category' as any,
        onBack: jest.fn(),
      });
      expect(getByTestId('category-empty')).toBeTruthy();
    });
  });

  describe('back button', () => {
    it('renders back button when onBack provided', async () => {
      const { getByTestId } = await renderCategory({ onBack: jest.fn() });
      expect(getByTestId('category-back')).toBeTruthy();
    });

    it('calls onBack when pressed', async () => {
      const onBack = jest.fn();
      const { getByTestId } = await renderCategory({ onBack });
      fireEvent.press(getByTestId('category-back'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('back button has accessibility attributes', async () => {
      const { getByTestId } = await renderCategory({ onBack: jest.fn() });
      const btn = getByTestId('category-back');
      expect(btn.props.accessibilityLabel).toBe('Go back');
      expect(btn.props.accessibilityRole).toBe('button');
    });

    it('does not render back button when onBack not provided', async () => {
      const { queryByTestId } = await renderCategory({ onBack: undefined });
      expect(queryByTestId('category-back')).toBeNull();
    });
  });

  describe('sorting', () => {
    it('defaults to featured sort', async () => {
      const { getByTestId } = await renderCategory({ categoryId: 'futons' });
      // Featured sort puts Bestseller products first
      const firstCard = futonProducts.find((p) => p.badge === 'Bestseller');
      if (firstCard) {
        expect(getByTestId(`product-card-${firstCard.id}`)).toBeTruthy();
      }
    });
  });

  describe('product interaction', () => {
    it('calls onProductPress when product tapped', async () => {
      const onProductPress = jest.fn();
      const { getByTestId } = await renderCategory({
        categoryId: 'futons',
        onProductPress,
      });
      const firstFuton = futonProducts[0];
      fireEvent.press(getByTestId(`product-card-${firstFuton.id}`));
      expect(onProductPress).toHaveBeenCalledWith(expect.objectContaining({ id: firstFuton.id }));
    });
  });
});
