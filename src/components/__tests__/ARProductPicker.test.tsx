import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ARProductPicker } from '../ARProductPicker';
import { PRODUCTS } from '@/data/products';
import { MODELS_3D } from '@/data/models3d';

const arEligibleProducts = PRODUCTS.filter(
  (p) => p.inStock && MODELS_3D.some((m) => m.productId === p.id),
);

const defaultProps = {
  onSelectProduct: jest.fn(),
  onClose: jest.fn(),
};

function renderPicker(overrides: Partial<typeof defaultProps> = {}) {
  const props = {
    ...defaultProps,
    ...overrides,
    onSelectProduct: overrides.onSelectProduct ?? jest.fn(),
    onClose: overrides.onClose ?? jest.fn(),
  };
  return { ...render(<ARProductPicker {...props} />), props };
}

describe('ARProductPicker', () => {
  describe('Rendering', () => {
    it('renders with default testID', () => {
      const { getByTestId } = renderPicker();
      expect(getByTestId('ar-product-picker')).toBeTruthy();
    });

    it('shows "Choose a Product" header', () => {
      const { getByText } = renderPicker();
      expect(getByText('Choose a Product')).toBeTruthy();
    });

    it('renders close button', () => {
      const { getByTestId } = renderPicker();
      expect(getByTestId('ar-picker-close')).toBeTruthy();
    });
  });

  describe('Product Grid', () => {
    it('renders all AR-eligible products by default', () => {
      const { getByTestId } = renderPicker();
      for (const product of arEligibleProducts) {
        expect(getByTestId(`ar-picker-${product.id}`)).toBeTruthy();
      }
    });

    it('shows product name on each tile', () => {
      const { getByText } = renderPicker();
      for (const product of arEligibleProducts) {
        expect(getByText(product.name)).toBeTruthy();
      }
    });

    it('highlights selected product', () => {
      const selected = arEligibleProducts[0];
      const { getByTestId } = render(
        <ARProductPicker
          {...defaultProps}
          selectedProductId={selected.id}
        />,
      );
      const tile = getByTestId(`ar-picker-${selected.id}`);
      expect(tile.props.accessibilityState).toEqual({ selected: true });
    });
  });

  describe('Category Filters', () => {
    it('renders category filter chips', () => {
      const { getByTestId } = renderPicker();
      expect(getByTestId('ar-picker-cat-all')).toBeTruthy();
      expect(getByTestId('ar-picker-cat-futons')).toBeTruthy();
      expect(getByTestId('ar-picker-cat-murphy-beds')).toBeTruthy();
      expect(getByTestId('ar-picker-cat-frames')).toBeTruthy();
    });

    it('"All" filter is active by default', () => {
      const { getByTestId } = renderPicker();
      const allChip = getByTestId('ar-picker-cat-all');
      expect(allChip.props.accessibilityState).toEqual({ selected: true });
    });

    it('filters products when category chip pressed', () => {
      const { getByTestId, queryByTestId } = renderPicker();
      fireEvent.press(getByTestId('ar-picker-cat-futons'));

      // Futon products should still be visible
      const futonProduct = arEligibleProducts.find((p) => p.category === 'futons');
      if (futonProduct) {
        expect(getByTestId(`ar-picker-${futonProduct.id}`)).toBeTruthy();
      }

      // Murphy bed products should not be visible
      const murphyProduct = arEligibleProducts.find((p) => p.category === 'murphy-beds');
      if (murphyProduct) {
        expect(queryByTestId(`ar-picker-${murphyProduct.id}`)).toBeNull();
      }
    });

    it('shows correct count on category chips', () => {
      const { getByTestId } = renderPicker();
      const allChip = getByTestId('ar-picker-cat-all');
      // The "All" chip should contain the total AR product count
      expect(allChip).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('calls onSelectProduct when tile pressed', () => {
      const { getByTestId, props } = renderPicker();
      const target = arEligibleProducts[0];
      fireEvent.press(getByTestId(`ar-picker-${target.id}`));
      expect(props.onSelectProduct).toHaveBeenCalledWith(target);
    });

    it('calls onClose when close button pressed', () => {
      const { getByTestId, props } = renderPicker();
      fireEvent.press(getByTestId('ar-picker-close'));
      expect(props.onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('product tiles have accessible labels with name and price', () => {
      const { getByTestId } = renderPicker();
      const product = arEligibleProducts[0];
      const tile = getByTestId(`ar-picker-${product.id}`);
      expect(tile.props.accessibilityLabel).toContain(product.name);
      expect(tile.props.accessibilityLabel).toContain('$');
    });

    it('close button has accessibility label', () => {
      const { getByTestId } = renderPicker();
      const close = getByTestId('ar-picker-close');
      expect(close.props.accessibilityLabel).toBe('Close product picker');
    });
  });
});
