import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BundleRow } from '../BundleRow';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import { CompareProvider } from '@/contexts/CompareContext';
import { PRODUCTS, type Product } from '@/data/products';

// Stub heavy components that are irrelevant for BundleRow unit tests
jest.mock('../InventoryBadge', () => ({
  InventoryBadge: () => null,
}));
jest.mock('../FinancingBadge', () => ({
  FinancingBadge: () => null,
}));
jest.mock('../ProductCardVideo', () => ({
  ProductCardVideo: () => null,
}));
jest.mock('../CompareButton', () => ({
  CompareButton: () => null,
}));
jest.mock('@/hooks/useInventoryBadge', () => ({
  useInventoryBadge: () => ({ badge: null, quantity: 0 }),
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: 'Medium', Light: 'Light' },
}));

const futons = PRODUCTS.filter((p) => p.category === 'futons').slice(0, 3);
const [productA, productB, productC] = futons;

function renderBundleRow(products: Product[], onProductPress = jest.fn(), testID = 'bundle-row') {
  return {
    ...render(
      <ThemeProvider>
        <WishlistProvider>
          <CompareProvider>
            <BundleRow products={products} onProductPress={onProductPress} testID={testID} />
          </CompareProvider>
        </WishlistProvider>
      </ThemeProvider>,
    ),
    onProductPress,
  };
}

describe('BundleRow', () => {
  describe('empty state', () => {
    it('renders nothing when products array is empty', () => {
      const { queryByTestId } = renderBundleRow([]);
      expect(queryByTestId('bundle-row')).toBeNull();
    });

    it('does not render the header when products is empty', () => {
      const { queryByText } = renderBundleRow([]);
      expect(queryByText('Pairs Well With')).toBeNull();
    });
  });

  describe('with products', () => {
    it('renders the "Pairs Well With" header', () => {
      const { getByText } = renderBundleRow([productA]);
      expect(getByText('Pairs Well With')).toBeTruthy();
    });

    it('renders a product card for each product', () => {
      const { getByTestId } = renderBundleRow([productA, productB]);
      expect(getByTestId(`product-card-${productA.id}`)).toBeTruthy();
      expect(getByTestId(`product-card-${productB.id}`)).toBeTruthy();
    });

    it('renders three product cards when given three products', () => {
      const { getAllByText } = renderBundleRow([productA, productB, productC]);
      // Each product renders its name
      expect(getAllByText(productA.name).length).toBeGreaterThanOrEqual(1);
      expect(getAllByText(productB.name).length).toBeGreaterThanOrEqual(1);
      expect(getAllByText(productC.name).length).toBeGreaterThanOrEqual(1);
    });

    it('renders the testID on the container', () => {
      const { getByTestId } = renderBundleRow([productA], jest.fn(), 'my-bundle');
      expect(getByTestId('my-bundle')).toBeTruthy();
    });
  });

  describe('interaction', () => {
    it('calls onProductPress with the product when a card is pressed', () => {
      const { onProductPress, getByTestId } = renderBundleRow([productA, productB]);
      fireEvent.press(getByTestId(`product-card-${productA.id}`));
      expect(onProductPress).toHaveBeenCalledTimes(1);
      expect(onProductPress).toHaveBeenCalledWith(productA);
    });

    it('calls onProductPress with the correct product when second card is pressed', () => {
      const { onProductPress, getByTestId } = renderBundleRow([productA, productB]);
      fireEvent.press(getByTestId(`product-card-${productB.id}`));
      expect(onProductPress).toHaveBeenCalledWith(productB);
    });

    it('calls onProductPress independently for each card tap', () => {
      const { onProductPress, getByTestId } = renderBundleRow([productA, productB]);
      fireEvent.press(getByTestId(`product-card-${productA.id}`));
      fireEvent.press(getByTestId(`product-card-${productB.id}`));
      expect(onProductPress).toHaveBeenCalledTimes(2);
    });
  });

  describe('accessibility', () => {
    it('header has accessibilityRole="header"', () => {
      const { getByRole } = renderBundleRow([productA]);
      // Check that there is at least one header role (the "Pairs Well With" heading)
      const headers = getByRole('header');
      expect(headers).toBeTruthy();
    });
  });
});
