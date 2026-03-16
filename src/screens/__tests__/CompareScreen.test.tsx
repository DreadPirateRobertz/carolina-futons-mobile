import React from 'react';
import { render, fireEvent, within } from '@testing-library/react-native';
import { CompareScreen } from '../CompareScreen';
import { PRODUCTS } from '@/data/products';
import type { Product } from '@/data/products';
import { formatPrice } from '@/utils';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      sandBase: '#E8D5B7',
      sandLight: '#F2E8D5',
      sandDark: '#D4BC96',
      espresso: '#3A2518',
      espressoLight: '#5C4033',
      mountainBlue: '#5B8FA8',
      offWhite: '#FAF7F2',
      sunsetCoral: '#E8845C',
      success: '#4A7C59',
      error: '#E8845C',
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    borderRadius: { sm: 4, md: 8, lg: 16 },
    typography: {
      h2: { fontSize: 20, fontWeight: '700' },
      body: { fontSize: 14 },
      caption: { fontSize: 12 },
    },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

// Grab 3 futon products for comparison tests
const futons = PRODUCTS.filter((p) => p.category === 'futons').slice(0, 3);
const [productA, productB, productC] = futons;

describe('CompareScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- RENDERING ---

  it('renders empty state when no products provided', () => {
    const { getByText } = render(<CompareScreen products={[]} />);
    expect(getByText(/add products to compare/i)).toBeTruthy();
  });

  it('renders a single product column', () => {
    const { getByText } = render(<CompareScreen products={[productA]} />);
    expect(getByText(productA.name)).toBeTruthy();
    expect(getByText(formatPrice(productA.price))).toBeTruthy();
  });

  it('renders two products side by side', () => {
    const { getByText } = render(<CompareScreen products={[productA, productB]} />);
    expect(getByText(productA.name)).toBeTruthy();
    expect(getByText(productB.name)).toBeTruthy();
  });

  it('renders three products side by side (max)', () => {
    const { getByText } = render(<CompareScreen products={[productA, productB, productC]} />);
    expect(getByText(productA.name)).toBeTruthy();
    expect(getByText(productB.name)).toBeTruthy();
    expect(getByText(productC.name)).toBeTruthy();
  });

  // --- COMPARISON ROWS ---

  it('displays dimension comparison rows', () => {
    const { getAllByText, getByText } = render(<CompareScreen products={[productA, productB]} />);
    expect(getByText('Dimensions')).toBeTruthy();
    // Dimensions formatted as W×D×H
    const dimA = `${productA.dimensions.width}" × ${productA.dimensions.depth}" × ${productA.dimensions.height}"`;
    const dimB = `${productB.dimensions.width}" × ${productB.dimensions.depth}" × ${productB.dimensions.height}"`;
    expect(getByText(dimA)).toBeTruthy();
    expect(getByText(dimB)).toBeTruthy();
  });

  it('displays price comparison with highlight on lowest', () => {
    const { getByTestId } = render(<CompareScreen products={[productA, productB]} />);
    // The cheaper product's price cell should have a "best-value" testID
    const cheaper = productA.price < productB.price ? productA : productB;
    const bestValueCell = getByTestId(`price-best-${cheaper.id}`);
    expect(bestValueCell).toBeTruthy();
  });

  it('displays rating comparison', () => {
    const { getByText } = render(<CompareScreen products={[productA, productB]} />);
    expect(getByText('Rating')).toBeTruthy();
    expect(getByText(`${productA.rating}`)).toBeTruthy();
    expect(getByText(`${productB.rating}`)).toBeTruthy();
  });

  it('displays fabric options', () => {
    const { getByText } = render(<CompareScreen products={[productA, productB]} />);
    expect(getByText('Fabrics')).toBeTruthy();
    // Each product's fabric count
    expect(getByText(`${productA.fabricOptions.length} options`)).toBeTruthy();
  });

  it('displays stock status', () => {
    const { getByText } = render(<CompareScreen products={[productA, productB]} />);
    expect(getByText('Availability')).toBeTruthy();
  });

  it('displays size row when products have sizes', () => {
    const { getByText } = render(<CompareScreen products={[productA, productB]} />);
    expect(getByText('Size')).toBeTruthy();
  });

  // --- INTERACTIONS ---

  it('calls onRemove when remove button is pressed', () => {
    const onRemove = jest.fn();
    const { getAllByTestId } = render(
      <CompareScreen products={[productA, productB]} onRemove={onRemove} />,
    );
    const removeButtons = getAllByTestId(/remove-product/);
    fireEvent.press(removeButtons[0]);
    expect(onRemove).toHaveBeenCalledWith(productA.id);
  });

  it('calls onProductPress when product name is tapped', () => {
    const onProductPress = jest.fn();
    const { getByText } = render(
      <CompareScreen products={[productA, productB]} onProductPress={onProductPress} />,
    );
    fireEvent.press(getByText(productA.name));
    expect(onProductPress).toHaveBeenCalledWith(productA);
  });

  it('calls onBack when back button is pressed', () => {
    const onBack = jest.fn();
    const { getByTestId } = render(
      <CompareScreen products={[productA, productB]} onBack={onBack} />,
    );
    fireEvent.press(getByTestId('back-button'));
    expect(onBack).toHaveBeenCalled();
  });

  // --- EDGE CASES ---

  it('handles product with missing optional fields gracefully', () => {
    const sparseProduct: Product = {
      ...productA,
      id: 'prod-sparse' as any,
      name: 'Sparse Product',
      size: undefined,
      originalPrice: undefined,
      badge: undefined,
      stockCount: undefined,
    };
    const { getByText } = render(<CompareScreen products={[sparseProduct, productB]} />);
    expect(getByText('Sparse Product')).toBeTruthy();
    // Size row should show '-' for missing size
    expect(getByText('-')).toBeTruthy();
  });

  it('handles out-of-stock product', () => {
    const oosProduct: Product = {
      ...productA,
      id: 'prod-oos' as any,
      name: 'OOS Futon',
      inStock: false,
      stockCount: 0,
    };
    const { getByText } = render(<CompareScreen products={[oosProduct, productB]} />);
    expect(getByText('Out of Stock')).toBeTruthy();
  });

  it('handles low stock product', () => {
    const lowStockProduct: Product = {
      ...productA,
      id: 'prod-low' as any,
      name: 'Low Stock Futon',
      inStock: true,
      stockCount: 2,
    };
    const { getByText } = render(<CompareScreen products={[lowStockProduct, productB]} />);
    expect(getByText('Low Stock (2)')).toBeTruthy();
  });

  it('shows original price with discount when available', () => {
    const discountProduct: Product = {
      ...productA,
      id: 'prod-disc' as any,
      name: 'Discount Futon',
      price: 249,
      originalPrice: 349,
    };
    const { getByText } = render(<CompareScreen products={[discountProduct, productB]} />);
    expect(getByText(formatPrice(249))).toBeTruthy();
    expect(getByText(formatPrice(349))).toBeTruthy();
  });

  it('caps at MAX_COMPARE_ITEMS (3) products', () => {
    const fourProducts = [...futons, { ...productA, id: 'prod-extra' as any, name: 'Extra' }];
    const { queryByText } = render(<CompareScreen products={fourProducts} />);
    // Fourth product should not render
    expect(queryByText('Extra')).toBeNull();
  });

  it('handles undefined dimensions gracefully', () => {
    const noDimsProduct: Product = {
      ...productA,
      id: 'prod-nodims' as any,
      name: 'No Dims Futon',
      dimensions: undefined as any,
    };
    const { getByText, getAllByText } = render(
      <CompareScreen products={[noDimsProduct, productB]} />,
    );
    expect(getByText('No Dims Futon')).toBeTruthy();
    // Should show '-' for missing dimensions
    expect(getAllByText('-').length).toBeGreaterThanOrEqual(1);
  });

  it('renders without onProductPress (no crash on tap)', () => {
    const { getByText } = render(<CompareScreen products={[productA, productB]} />);
    // Tapping product name without onProductPress should not throw
    expect(() => fireEvent.press(getByText(productA.name))).not.toThrow();
  });

  it('does not highlight best price when prices are tied', () => {
    const tiedProduct: Product = {
      ...productB,
      id: 'prod-tied' as any,
      name: 'Tied Price Futon',
      price: productA.price,
    };
    const { queryByTestId } = render(<CompareScreen products={[productA, tiedProduct]} />);
    // Neither should get best-value highlight
    expect(queryByTestId(`price-best-${productA.id}`)).toBeNull();
    expect(queryByTestId('price-best-prod-tied')).toBeNull();
  });

  it('renders accessibly with proper labels', () => {
    const { getByLabelText } = render(<CompareScreen products={[productA, productB]} />);
    expect(getByLabelText(/compare products/i)).toBeTruthy();
  });
});
