import React from 'react';
import { Share } from 'react-native';
import { render, fireEvent, within, act } from '@testing-library/react-native';
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
    const { getByText, getByTestId } = render(<CompareScreen products={[productA, productB]} />);
    // Expand Details section (collapsed by default)
    fireEvent.press(getByTestId('section-details-header'));
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
    const { getByText, getByTestId } = render(<CompareScreen products={[productA, productB]} />);
    // Expand Details section (collapsed by default)
    fireEvent.press(getByTestId('section-details-header'));
    expect(getByText('Fabrics')).toBeTruthy();
    // Fabric count shown as number alongside swatches
    expect(getByText(`${productA.fabricOptions.length}`)).toBeTruthy();
  });

  it('displays stock status', () => {
    const { getByText } = render(<CompareScreen products={[productA, productB]} />);
    expect(getByText('Availability')).toBeTruthy();
  });

  it('displays size row when products have sizes', () => {
    const { getByText, getByTestId } = render(<CompareScreen products={[productA, productB]} />);
    // Expand Details section (collapsed by default)
    fireEvent.press(getByTestId('section-details-header'));
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
    const { getByText, getByTestId } = render(<CompareScreen products={[sparseProduct, productB]} />);
    expect(getByText('Sparse Product')).toBeTruthy();
    // Expand Details to see Size row
    fireEvent.press(getByTestId('section-details-header'));
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
    const { getByText, getAllByText, getByTestId } = render(
      <CompareScreen products={[noDimsProduct, productB]} />,
    );
    expect(getByText('No Dims Futon')).toBeTruthy();
    // Expand Details to see Dimensions row
    fireEvent.press(getByTestId('section-details-header'));
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

  // --- STICKY HEADER (cm-31m) ---

  it('renders sticky product header with testID', () => {
    const { getByTestId } = render(<CompareScreen products={[productA, productB]} />);
    expect(getByTestId('sticky-product-header')).toBeTruthy();
  });

  it('renders scrollable comparison rows with testID', () => {
    const { getByTestId } = render(<CompareScreen products={[productA, productB]} />);
    expect(getByTestId('comparison-scroll-view')).toBeTruthy();
  });

  it('sticky header is not inside scroll view (not obscured by scroll)', () => {
    const { getByTestId } = render(<CompareScreen products={[productA, productB]} />);
    const header = getByTestId('sticky-product-header');
    const scrollView = getByTestId('comparison-scroll-view');
    // Header must not be a descendant of the scroll view
    const scrollNode = scrollView;
    let node = header.parent;
    let isInsideScroll = false;
    while (node) {
      if (node === scrollNode) {
        isInsideScroll = true;
        break;
      }
      node = node.parent;
    }
    expect(isInsideScroll).toBe(false);
  });

  it('sticky header has elevation/zIndex for correct layering', () => {
    const { getByTestId } = render(<CompareScreen products={[productA, productB]} />);
    const header = getByTestId('sticky-product-header');
    const style = header.props.style;
    const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : (style ?? {});
    expect(flatStyle.zIndex).toBeGreaterThan(0);
  });

  it('sticky header is not shown in empty state', () => {
    const { queryByTestId } = render(<CompareScreen products={[]} />);
    expect(queryByTestId('sticky-product-header')).toBeNull();
  });

  it('sticky header shows product names fixed above comparison rows', () => {
    const { getByTestId, getByText } = render(<CompareScreen products={[productA, productB]} />);
    const header = getByTestId('sticky-product-header');
    // Product names are inside the sticky header
    expect(within(header).getByText(productA.name)).toBeTruthy();
    expect(within(header).getByText(productB.name)).toBeTruthy();
  });

  // --- PROGRESSIVE DISCLOSURE (hq-rag7a) ---

  describe('Progressive Disclosure', () => {
    it('renders section headers for Basic Info and Details', () => {
      const { getByText } = render(<CompareScreen products={[productA, productB]} />);
      expect(getByText('Basic Info')).toBeTruthy();
      expect(getByText('Details')).toBeTruthy();
    });

    it('Basic Info section is expanded by default', () => {
      const { getByTestId } = render(<CompareScreen products={[productA, productB]} />);
      const section = getByTestId('section-basic-info');
      // The rows within should be visible
      expect(within(section).getByText('Price')).toBeTruthy();
    });

    it('Details section is collapsed by default', () => {
      const { getByTestId } = render(<CompareScreen products={[productA, productB]} />);
      const section = getByTestId('section-details');
      // Dimensions row should NOT be visible when collapsed
      expect(within(section).queryByText('Dimensions')).toBeNull();
    });

    it('toggles Details section on press', () => {
      const { getByTestId, getByText } = render(
        <CompareScreen products={[productA, productB]} />,
      );
      // Expand Details
      fireEvent.press(getByText('Details'));
      const section = getByTestId('section-details');
      expect(within(section).getByText('Dimensions')).toBeTruthy();

      // Collapse Details
      fireEvent.press(getByText('Details'));
      expect(within(section).queryByText('Dimensions')).toBeNull();
    });

    it('toggles Basic Info section on press', () => {
      const { getByTestId, getByText } = render(
        <CompareScreen products={[productA, productB]} />,
      );
      // Collapse Basic Info
      fireEvent.press(getByText('Basic Info'));
      const section = getByTestId('section-basic-info');
      expect(within(section).queryByText('Price')).toBeNull();

      // Re-expand
      fireEvent.press(getByText('Basic Info'));
      expect(within(section).getByText('Price')).toBeTruthy();
    });

    it('section header has accessible role and label', () => {
      const { getByLabelText } = render(<CompareScreen products={[productA, productB]} />);
      expect(getByLabelText('Toggle Basic Info section')).toBeTruthy();
      expect(getByLabelText('Toggle Details section')).toBeTruthy();
    });
  });

  // --- SPEC COMPARISON TABLE — DIFFERENCE HIGHLIGHTING (hq-rag7a) ---

  describe('Spec Difference Highlighting', () => {
    it('highlights cells where values differ across products', () => {
      // productA and productB have different ratings
      const { getByTestId } = render(<CompareScreen products={[productA, productB]} />);
      // Expand Details section first
      fireEvent.press(getByTestId('section-details-header'));

      // If ratings differ, cells should have diff-highlight testID
      if (productA.rating !== productB.rating) {
        expect(getByTestId(`diff-rating-${productA.id}`)).toBeTruthy();
        expect(getByTestId(`diff-rating-${productB.id}`)).toBeTruthy();
      }
    });

    it('does not highlight cells where values are identical', () => {
      const identicalProduct: Product = {
        ...productA,
        id: 'prod-identical' as any,
        name: 'Identical Futon',
      };
      const { queryByTestId } = render(
        <CompareScreen products={[productA, identicalProduct]} />,
      );
      // Same price → no highlight
      expect(queryByTestId(`diff-price-${productA.id}`)).toBeNull();
      expect(queryByTestId('diff-price-prod-identical')).toBeNull();
    });

    it('does not apply diff highlighting with only one product', () => {
      const { queryByTestId } = render(<CompareScreen products={[productA]} />);
      expect(queryByTestId(`diff-price-${productA.id}`)).toBeNull();
    });
  });

  // --- COLOR SWATCH VISUALIZATION (hq-rag7a) ---

  describe('Color Swatch Visualization', () => {
    it('renders fabric swatches instead of plain text count', () => {
      const { getByTestId } = render(<CompareScreen products={[productA, productB]} />);
      // Expand Details to see Fabrics row
      fireEvent.press(getByTestId('section-details-header'));
      expect(getByTestId(`fabric-swatches-${productA.id}`)).toBeTruthy();
    });

    it('renders one swatch per fabric option', () => {
      const { getByTestId, getAllByTestId } = render(<CompareScreen products={[productA, productB]} />);
      fireEvent.press(getByTestId('section-details-header'));
      // Each fabric option should have a swatch
      const swatches = getAllByTestId(new RegExp(`^swatch-${productA.id}-`));
      expect(swatches.length).toBe(productA.fabricOptions.length);
    });

    it('swatch has accessible label with fabric name', () => {
      const { getByTestId } = render(<CompareScreen products={[productA, productB]} />);
      fireEvent.press(getByTestId('section-details-header'));
      const swatchContainer = getByTestId(`fabric-swatches-${productA.id}`);
      const firstFabric = productA.fabricOptions[0];
      const firstSwatch = within(swatchContainer).getByLabelText(firstFabric);
      expect(firstSwatch).toBeTruthy();
    });

    it('renders fallback swatch color for unknown fabric names', () => {
      const customProduct: Product = {
        ...productA,
        id: 'prod-unknown-fabric' as any,
        name: 'Unknown Fabric Futon',
        fabricOptions: ['Alien Purple'],
      };
      const { getByTestId } = render(<CompareScreen products={[customProduct, productB]} />);
      fireEvent.press(getByTestId('section-details-header'));
      // Should still render swatch (with fallback gray)
      expect(getByTestId('fabric-swatches-prod-unknown-fabric')).toBeTruthy();
    });

    it('shows fabric count label alongside swatches', () => {
      const { getByTestId } = render(<CompareScreen products={[productA, productB]} />);
      fireEvent.press(getByTestId('section-details-header'));
      const swatchContainer = getByTestId(`fabric-swatches-${productA.id}`);
      expect(
        within(swatchContainer).getByText(`${productA.fabricOptions.length}`),
      ).toBeTruthy();
    });
  });

  // --- SHARE TO SOCIAL (hq-rag7a) ---

  describe('Share Comparison', () => {
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({
      action: Share.sharedAction,
      activityType: undefined,
    });

    afterEach(() => {
      shareSpy.mockClear();
    });

    it('renders share button when products are present', () => {
      const { getByTestId } = render(<CompareScreen products={[productA, productB]} />);
      expect(getByTestId('compare-share-button')).toBeTruthy();
    });

    it('does not render share button in empty state', () => {
      const { queryByTestId } = render(<CompareScreen products={[]} />);
      expect(queryByTestId('compare-share-button')).toBeNull();
    });

    it('calls Share.share with comparison text on press', async () => {
      const { getByTestId } = render(<CompareScreen products={[productA, productB]} />);
      await act(async () => {
        fireEvent.press(getByTestId('compare-share-button'));
      });
      expect(shareSpy).toHaveBeenCalledTimes(1);
      const shareArg = shareSpy.mock.calls[0][0];
      expect(shareArg.message).toContain(productA.name);
      expect(shareArg.message).toContain(productB.name);
      expect(shareArg.message).toContain(formatPrice(productA.price));
      expect(shareArg.message).toContain(formatPrice(productB.price));
    });

    it('includes all products in share text', async () => {
      const { getByTestId } = render(
        <CompareScreen products={[productA, productB, productC]} />,
      );
      await act(async () => {
        fireEvent.press(getByTestId('compare-share-button'));
      });
      const shareArg = shareSpy.mock.calls[0][0];
      expect(shareArg.message).toContain(productA.name);
      expect(shareArg.message).toContain(productB.name);
      expect(shareArg.message).toContain(productC.name);
    });

    it('does not crash when Share.share rejects', async () => {
      shareSpy.mockRejectedValueOnce(new Error('share cancelled'));
      const { getByTestId } = render(<CompareScreen products={[productA, productB]} />);
      await act(async () => {
        fireEvent.press(getByTestId('compare-share-button'));
      });
      // no crash — rejection handled gracefully
    });

    it('does not crash when Share.share is dismissed', async () => {
      shareSpy.mockResolvedValueOnce({
        action: Share.dismissedAction,
        activityType: undefined,
      });
      const { getByTestId } = render(<CompareScreen products={[productA, productB]} />);
      await act(async () => {
        fireEvent.press(getByTestId('compare-share-button'));
      });
      // no crash
    });

    it('share button has accessible label', () => {
      const { getByLabelText } = render(<CompareScreen products={[productA, productB]} />);
      expect(getByLabelText('Share comparison')).toBeTruthy();
    });
  });
});
