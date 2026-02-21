import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// TDD: Tests written before implementation
// Component will be at: @/components/ProductCard
// import { ProductCard } from '@/components/ProductCard';

// Placeholder until component exists
const ProductCard = (props: any) => {
  throw new Error('ProductCard component not yet implemented');
};

const mockProduct = {
  id: 'futon-001',
  name: 'Carolina Classic Futon',
  price: 299.99,
  image: 'https://example.com/futon.jpg',
  badge: 'Sale',
};

describe('ProductCard', () => {
  describe('rendering', () => {
    it('renders product name', () => {
      const { getByText } = render(<ProductCard product={mockProduct} onPress={() => {}} />);
      expect(getByText('Carolina Classic Futon')).toBeTruthy();
    });

    it('renders formatted price', () => {
      const { getByText } = render(<ProductCard product={mockProduct} onPress={() => {}} />);
      expect(getByText('$299.99')).toBeTruthy();
    });

    it('renders product image', () => {
      const { getByTestId } = render(
        <ProductCard product={mockProduct} onPress={() => {}} testID="product-card" />,
      );
      expect(getByTestId('product-card-image')).toBeTruthy();
    });

    it('renders badge when provided', () => {
      const { getByText } = render(<ProductCard product={mockProduct} onPress={() => {}} />);
      expect(getByText('Sale')).toBeTruthy();
    });

    it('does not render badge when not provided', () => {
      const productNoBadge = { ...mockProduct, badge: undefined };
      const { queryByTestId } = render(
        <ProductCard product={productNoBadge} onPress={() => {}} testID="product-card" />,
      );
      expect(queryByTestId('product-card-badge')).toBeFalsy();
    });
  });

  describe('pricing', () => {
    it('renders sale price with original price when on sale', () => {
      const saleProduct = {
        ...mockProduct,
        price: 249.99,
        originalPrice: 299.99,
        badge: 'Sale',
      };
      const { getByText } = render(<ProductCard product={saleProduct} onPress={() => {}} />);
      expect(getByText('$249.99')).toBeTruthy();
      expect(getByText('$299.99')).toBeTruthy();
    });

    it('shows price formatted with two decimal places', () => {
      const product = { ...mockProduct, price: 300 };
      const { getByText } = render(<ProductCard product={product} onPress={() => {}} />);
      expect(getByText('$300.00')).toBeTruthy();
    });
  });

  describe('interaction', () => {
    it('calls onPress with product when tapped', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <ProductCard product={mockProduct} onPress={onPress} testID="product-card" />,
      );
      fireEvent.press(getByTestId('product-card'));
      expect(onPress).toHaveBeenCalledWith(mockProduct);
    });
  });

  describe('image handling', () => {
    it('shows placeholder when image fails to load', () => {
      const { getByTestId } = render(
        <ProductCard product={mockProduct} onPress={() => {}} testID="product-card" />,
      );
      const image = getByTestId('product-card-image');
      fireEvent(image, 'error');
      // Should show fallback/placeholder
      expect(getByTestId('product-card-image-placeholder')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('has accessible label with product name and price', () => {
      const { getByTestId } = render(
        <ProductCard product={mockProduct} onPress={() => {}} testID="product-card" />,
      );
      const card = getByTestId('product-card');
      expect(card.props.accessibilityLabel).toContain('Carolina Classic Futon');
      expect(card.props.accessibilityLabel).toContain('$299.99');
    });
  });
});
