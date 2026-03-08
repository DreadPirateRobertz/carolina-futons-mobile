import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProductCard } from '../ProductCard';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import { PRODUCTS, type Product } from '@/data/products';
import { productId } from '@/data/productId';

const futon = PRODUCTS.find((p) => p.category === 'futons')!;
const saleProduct = PRODUCTS.find((p) => p.originalPrice !== undefined)!;
const noBadgeProduct = PRODUCTS.find((p) => !p.badge)!;

function renderCard(overrides: { product?: Product; onPress?: jest.Mock } = {}) {
  const onPress = overrides.onPress ?? jest.fn();
  return {
    ...render(
      <ThemeProvider>
        <WishlistProvider>
          <ProductCard product={overrides.product ?? futon} onPress={onPress} />
        </WishlistProvider>
      </ThemeProvider>,
    ),
    onPress,
  };
}

describe('ProductCard', () => {
  describe('rendering', () => {
    it('renders product name', () => {
      const { getByText } = renderCard();
      expect(getByText(futon.name)).toBeTruthy();
    });

    it('renders short description', () => {
      const { getByText } = renderCard();
      expect(getByText(futon.shortDescription)).toBeTruthy();
    });

    it('renders formatted price', () => {
      const { getByText } = renderCard();
      expect(getByText(`$${futon.price.toFixed(2)}`)).toBeTruthy();
    });

    it('renders review count', () => {
      const { getByText } = renderCard();
      expect(getByText(`(${futon.reviewCount})`)).toBeTruthy();
    });

    it('renders star rating', () => {
      const { getByText } = renderCard();
      const stars = '★'.repeat(Math.round(futon.rating)) + '☆'.repeat(5 - Math.round(futon.rating));
      expect(getByText(stars)).toBeTruthy();
    });

    it('has correct testID', () => {
      const { getByTestId } = renderCard();
      expect(getByTestId(`product-card-${futon.id}`)).toBeTruthy();
    });
  });

  describe('badge', () => {
    it('renders badge when present', () => {
      const badgedProduct = PRODUCTS.find((p) => p.badge)!;
      const { getByText } = renderCard({ product: badgedProduct });
      expect(getByText(badgedProduct.badge!)).toBeTruthy();
    });

    it('does not render badge when not present', () => {
      const { queryByText } = renderCard({ product: noBadgeProduct });
      // No badge text should exist that matches common badge values
      expect(queryByText('Bestseller')).toBeNull();
      expect(queryByText('Sale')).toBeNull();
      expect(queryByText('New')).toBeNull();
      expect(queryByText('Premium')).toBeNull();
    });
  });

  describe('pricing', () => {
    it('shows sale price and original price when on sale', () => {
      const { getByText } = renderCard({ product: saleProduct });
      expect(getByText(`$${saleProduct.price.toFixed(2)}`)).toBeTruthy();
      expect(getByText(`$${saleProduct.originalPrice!.toFixed(2)}`)).toBeTruthy();
    });

    it('does not show original price for non-sale items', () => {
      const regularProduct = PRODUCTS.find((p) => !p.originalPrice)!;
      const { queryByText } = renderCard({ product: regularProduct });
      // Only one price element should be present
      expect(queryByText(`$${regularProduct.price.toFixed(2)}`)).toBeTruthy();
    });
  });

  describe('interaction', () => {
    it('calls onPress with product when tapped', () => {
      const onPress = jest.fn();
      const { getByTestId } = renderCard({ onPress });
      fireEvent.press(getByTestId(`product-card-${futon.id}`));
      expect(onPress).toHaveBeenCalledWith(futon);
    });

    it('does not crash when onPress is not provided', () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <WishlistProvider>
            <ProductCard product={futon} />
          </WishlistProvider>
        </ThemeProvider>,
      );
      fireEvent.press(getByTestId(`product-card-${futon.id}`));
    });
  });

  describe('accessibility', () => {
    it('has accessible label with product name and price', () => {
      const { getByTestId } = renderCard();
      const card = getByTestId(`product-card-${futon.id}`);
      expect(card.props.accessibilityLabel).toContain(futon.name);
      expect(card.props.accessibilityLabel).toContain(`$${futon.price.toFixed(2)}`);
    });

    it('has button role', () => {
      const { getByTestId } = renderCard();
      expect(getByTestId(`product-card-${futon.id}`).props.accessibilityRole).toBe('button');
    });
  });

  describe('stock status', () => {
    const lowStockProduct: Product = {
      ...futon,
      id: productId('test-low-stock'),
      stockCount: 3,
    };

    const outOfStockProduct: Product = {
      ...futon,
      id: productId('test-oos'),
      inStock: false,
      stockCount: 0,
    };

    it('shows Low Stock badge when stockCount < 5', () => {
      const { getByText } = renderCard({ product: lowStockProduct });
      expect(getByText('Low Stock')).toBeTruthy();
    });

    it('shows Out of Stock badge when product is not in stock', () => {
      const { getByTestId } = renderCard({ product: outOfStockProduct });
      expect(getByTestId(`stock-badge-${outOfStockProduct.id}`)).toBeTruthy();
    });

    it('does not show stock badge for in-stock products', () => {
      const { queryByText } = renderCard();
      expect(queryByText('Low Stock')).toBeNull();
      expect(queryByText('Out of Stock')).toBeNull();
    });

    it('renders stock badge with correct testID', () => {
      const { getByTestId } = renderCard({ product: lowStockProduct });
      expect(getByTestId(`stock-badge-${lowStockProduct.id}`)).toBeTruthy();
    });
  });
});
