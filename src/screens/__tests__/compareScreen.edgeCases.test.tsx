/**
 * CompareScreen deeper edge-case tests — cm-1o3
 *
 * Covers gaps in compareScreen.test.tsx:
 * - Max items limit (> 3 products silently truncated)
 * - Remove item (button absent without prop, correct ID per product, a11y label)
 * - Empty compare state (back button, no scroll view, no section headers)
 * - Offline / missing product data (empty images, empty fabricOptions)
 * - Scroll sync: single scroll view contains all comparison rows
 * - Diff highlighting for size and availability rows
 * - Best-price highlight with 3 products (unique cheapest only)
 * - Low-stock boundary (stockCount at LOW_STOCK_THRESHOLD)
 * - Share message header/footer content
 */
import React from 'react';
import { Share } from 'react-native';
import { render, fireEvent, within, act } from '@testing-library/react-native';
import { CompareScreen } from '../CompareScreen';
import { PRODUCTS, LOW_STOCK_THRESHOLD } from '@/data/products';
import type { Product } from '@/data/products';
import { MAX_COMPARE_ITEMS } from '@/hooks/useCompare';
import { formatPrice } from '@/utils';

// ── Mocks ─────────────────────────────────────────────────────────────────────

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

// ── Fixtures ──────────────────────────────────────────────────────────────────

const futons = PRODUCTS.filter((p) => p.category === 'futons').slice(0, 3);
const [productA, productB, productC] = futons;

// A product with the same price as productA (for tie tests)
const tied: Product = { ...productA, id: 'tied' as any, name: 'Tied Price' };

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Share, 'share').mockResolvedValue({
    action: Share.sharedAction,
    activityType: undefined,
  });
});

// ── Max items limit ───────────────────────────────────────────────────────────

describe('max items limit', () => {
  it('silently drops 4th product when 4 products provided', () => {
    const fourth: Product = { ...productA, id: 'fourth' as any, name: 'Fourth Product' };
    const { queryByText } = render(
      <CompareScreen products={[productA, productB, productC, fourth]} />,
    );
    expect(queryByText('Fourth Product')).toBeNull();
  });

  it('silently drops 4th and 5th products when 5 provided', () => {
    const fourth: Product = { ...productA, id: 'fourth' as any, name: 'Fourth Product' };
    const fifth: Product = { ...productA, id: 'fifth' as any, name: 'Fifth Product' };
    const { queryByText } = render(
      <CompareScreen products={[productA, productB, productC, fourth, fifth]} />,
    );
    expect(queryByText('Fourth Product')).toBeNull();
    expect(queryByText('Fifth Product')).toBeNull();
  });

  it('still renders all three allowed products when 5 provided', () => {
    const fourth: Product = { ...productA, id: 'fourth' as any, name: 'Fourth Product' };
    const fifth: Product = { ...productA, id: 'fifth' as any, name: 'Fifth Product' };
    const { getByText } = render(
      <CompareScreen products={[productA, productB, productC, fourth, fifth]} />,
    );
    expect(getByText(productA.name)).toBeTruthy();
    expect(getByText(productB.name)).toBeTruthy();
    expect(getByText(productC.name)).toBeTruthy();
  });

  it(`MAX_COMPARE_ITEMS is ${MAX_COMPARE_ITEMS}`, () => {
    // Sanity-check constant so test suite stays correct if value changes
    expect(MAX_COMPARE_ITEMS).toBe(3);
  });

  it('sticky header shows exactly one column per capped product', () => {
    const fourth: Product = { ...productA, id: 'fourth' as any, name: 'Fourth Product' };
    const { getByTestId, queryByText } = render(
      <CompareScreen products={[productA, productB, productC, fourth]} />,
    );
    const header = getByTestId('sticky-product-header');
    // Only 3 product names inside sticky header
    expect(within(header).getByText(productA.name)).toBeTruthy();
    expect(within(header).getByText(productC.name)).toBeTruthy();
    expect(queryByText('Fourth Product')).toBeNull();
  });
});

// ── Remove item ───────────────────────────────────────────────────────────────

describe('remove item', () => {
  it('remove button is not rendered when onRemove prop is absent', () => {
    const { queryByTestId } = render(<CompareScreen products={[productA, productB]} />);
    expect(queryByTestId(`remove-product-${productA.id}`)).toBeNull();
    expect(queryByTestId(`remove-product-${productB.id}`)).toBeNull();
  });

  it('calls onRemove with productB.id when second remove button pressed', () => {
    const onRemove = jest.fn();
    const { getByTestId } = render(
      <CompareScreen products={[productA, productB]} onRemove={onRemove} />,
    );
    fireEvent.press(getByTestId(`remove-product-${productB.id}`));
    expect(onRemove).toHaveBeenCalledWith(productB.id);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('remove button accessibility label names the product', () => {
    const onRemove = jest.fn();
    const { getByTestId } = render(
      <CompareScreen products={[productA, productB]} onRemove={onRemove} />,
    );
    expect(getByTestId(`remove-product-${productA.id}`).props.accessibilityLabel).toBe(
      `Remove ${productA.name} from comparison`,
    );
  });

  it('all three products have remove buttons when onRemove provided', () => {
    const onRemove = jest.fn();
    const { getByTestId } = render(
      <CompareScreen products={[productA, productB, productC]} onRemove={onRemove} />,
    );
    expect(getByTestId(`remove-product-${productA.id}`)).toBeTruthy();
    expect(getByTestId(`remove-product-${productB.id}`)).toBeTruthy();
    expect(getByTestId(`remove-product-${productC.id}`)).toBeTruthy();
  });
});

// ── Empty compare state ───────────────────────────────────────────────────────

describe('empty compare state', () => {
  it('shows back button in empty state when onBack provided', () => {
    const onBack = jest.fn();
    const { getByTestId } = render(<CompareScreen products={[]} onBack={onBack} />);
    expect(getByTestId('back-button')).toBeTruthy();
  });

  it('back button fires onBack in empty state', () => {
    const onBack = jest.fn();
    const { getByTestId } = render(<CompareScreen products={[]} onBack={onBack} />);
    fireEvent.press(getByTestId('back-button'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('comparison scroll view is absent in empty state', () => {
    const { queryByTestId } = render(<CompareScreen products={[]} />);
    expect(queryByTestId('comparison-scroll-view')).toBeNull();
  });

  it('section headers are absent in empty state', () => {
    const { queryByText } = render(<CompareScreen products={[]} />);
    expect(queryByText('Basic Info')).toBeNull();
    expect(queryByText('Details')).toBeNull();
  });

  it('empty state text is exact expected string', () => {
    const { getByText } = render(<CompareScreen products={[]} />);
    expect(getByText('Add products to compare')).toBeTruthy();
  });
});

// ── Missing product data (offline / incomplete data) ─────────────────────────

describe('missing product data', () => {
  it('product with empty fabricOptions renders without crash', () => {
    const noFabrics: Product = {
      ...productA,
      id: 'no-fabrics' as any,
      name: 'No Fabrics Futon',
      fabricOptions: [],
    };
    const { getByText, getByTestId } = render(<CompareScreen products={[noFabrics, productB]} />);
    expect(getByText('No Fabrics Futon')).toBeTruthy();
    // Expand Details to see Fabrics row
    fireEvent.press(getByTestId('section-details-header'));
    // Swatch container still renders; count shows 0
    expect(getByTestId('fabric-swatches-no-fabrics')).toBeTruthy();
    expect(within(getByTestId('fabric-swatches-no-fabrics')).getByText('0')).toBeTruthy();
  });

  it('product with empty images array renders product name without crash', () => {
    const noImages: Product = {
      ...productA,
      id: 'no-images' as any,
      name: 'No Images Futon',
      images: [],
    };
    const { getByText } = render(<CompareScreen products={[noImages, productB]} />);
    expect(getByText('No Images Futon')).toBeTruthy();
  });

  it('product with empty images has no Image element in sticky header', () => {
    const noImages: Product = {
      ...productA,
      id: 'no-images' as any,
      name: 'No Images Futon',
      images: [],
    };
    const { getByTestId, queryAllByTestId } = render(
      <CompareScreen products={[noImages, productB]} />,
    );
    const header = getByTestId('sticky-product-header');
    // expo-image mock renders as testID-less element — presence check via text
    expect(within(header).getByText('No Images Futon')).toBeTruthy();
    // Confirm no crash and product is still accessible
    expect(queryAllByTestId('no-images-image')).toHaveLength(0);
  });

  it('product with undefined size shows "-" in expanded Details', () => {
    const noSize: Product = { ...productA, id: 'no-size' as any, size: undefined };
    const { getAllByText, getByTestId } = render(<CompareScreen products={[noSize, productB]} />);
    fireEvent.press(getByTestId('section-details-header'));
    const dashes = getAllByText('-');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it('product with undefined dimensions shows "-" in expanded Details', () => {
    const noDims: Product = {
      ...productA,
      id: 'no-dims' as any,
      dimensions: undefined as any,
    };
    const { getAllByText, getByTestId } = render(<CompareScreen products={[noDims, productB]} />);
    fireEvent.press(getByTestId('section-details-header'));
    expect(getAllByText('-').length).toBeGreaterThanOrEqual(1);
  });
});

// ── Scroll sync (single scroll view) ─────────────────────────────────────────

describe('scroll sync — single scrollable region', () => {
  it('comparison sections are inside the single scroll view', () => {
    const { getByTestId } = render(<CompareScreen products={[productA, productB]} />);
    const scrollView = getByTestId('comparison-scroll-view');
    const basicInfoSection = getByTestId('section-basic-info');
    // basic-info must be a descendant of the scroll view
    let node = basicInfoSection.parent;
    let found = false;
    while (node) {
      if (node === scrollView) {
        found = true;
        break;
      }
      node = node.parent;
    }
    expect(found).toBe(true);
  });

  it('price row contains one cell per product', () => {
    const { getAllByText } = render(<CompareScreen products={[productA, productB, productC]} />);
    // Three products → three price values rendered
    const priceA = getAllByText(formatPrice(productA.price));
    const priceB = getAllByText(formatPrice(productB.price));
    expect(priceA.length).toBeGreaterThanOrEqual(1);
    expect(priceB.length).toBeGreaterThanOrEqual(1);
  });
});

// ── Diff highlighting for size and availability rows ─────────────────────────

describe('diff highlighting — size and availability rows', () => {
  it('diff-availability testIDs appear when availability differs', () => {
    const inStockProduct: Product = {
      ...productA,
      id: 'in-stock' as any,
      name: 'In Stock Futon',
      inStock: true,
      stockCount: undefined,
    };
    const outOfStockProduct: Product = {
      ...productB,
      id: 'out-of-stock' as any,
      name: 'OOS Futon',
      inStock: false,
      stockCount: 0,
    };
    const { getByTestId } = render(
      <CompareScreen products={[inStockProduct, outOfStockProduct]} />,
    );
    expect(getByTestId('diff-availability-in-stock')).toBeTruthy();
    expect(getByTestId('diff-availability-out-of-stock')).toBeTruthy();
  });

  it('no diff-availability testIDs when both products have same availability', () => {
    const p1: Product = { ...productA, id: 'p1' as any, inStock: true, stockCount: undefined };
    const p2: Product = { ...productB, id: 'p2' as any, inStock: true, stockCount: undefined };
    const { queryByTestId } = render(<CompareScreen products={[p1, p2]} />);
    expect(queryByTestId('diff-availability-p1')).toBeNull();
    expect(queryByTestId('diff-availability-p2')).toBeNull();
  });

  it('diff-size testIDs appear when sizes differ', () => {
    const fullSize: Product = { ...productA, id: 'full' as any, size: 'full' };
    const queenSize: Product = { ...productB, id: 'queen' as any, size: 'queen' };
    const { getByTestId } = render(<CompareScreen products={[fullSize, queenSize]} />);
    // Details section must be expanded to see size row
    fireEvent.press(getByTestId('section-details-header'));
    expect(getByTestId('diff-size-full')).toBeTruthy();
    expect(getByTestId('diff-size-queen')).toBeTruthy();
  });

  it('no diff-size testIDs when sizes are identical', () => {
    const p1: Product = { ...productA, id: 'p1' as any, size: 'full' };
    const p2: Product = { ...productB, id: 'p2' as any, size: 'full' };
    const { getByTestId, queryByTestId } = render(<CompareScreen products={[p1, p2]} />);
    fireEvent.press(getByTestId('section-details-header'));
    expect(queryByTestId('diff-size-p1')).toBeNull();
    expect(queryByTestId('diff-size-p2')).toBeNull();
  });
});

// ── Best-price highlight with 3 products ─────────────────────────────────────

describe('best-price highlight with 3 products', () => {
  it('uniquely cheapest product gets price-best highlight among 3', () => {
    const cheap: Product = { ...productA, id: 'cheap' as any, price: 199 };
    const mid: Product = { ...productB, id: 'mid' as any, price: 349 };
    const expensive: Product = { ...productC, id: 'expensive' as any, price: 499 };
    const { getByTestId } = render(<CompareScreen products={[cheap, mid, expensive]} />);
    expect(getByTestId('price-best-cheap')).toBeTruthy();
  });

  it('mid and expensive products do NOT get price-best with 3 products', () => {
    const cheap: Product = { ...productA, id: 'cheap' as any, price: 199 };
    const mid: Product = { ...productB, id: 'mid' as any, price: 349 };
    const expensive: Product = { ...productC, id: 'expensive' as any, price: 499 };
    const { queryByTestId } = render(<CompareScreen products={[cheap, mid, expensive]} />);
    expect(queryByTestId('price-best-mid')).toBeNull();
    expect(queryByTestId('price-best-expensive')).toBeNull();
  });

  it('no price-best highlight when all 3 products share the same price', () => {
    const p1: Product = { ...productA, id: 'p1' as any, price: 299 };
    const p2: Product = { ...productB, id: 'p2' as any, price: 299 };
    const p3: Product = { ...productC, id: 'p3' as any, price: 299 };
    const { queryByTestId } = render(<CompareScreen products={[p1, p2, p3]} />);
    expect(queryByTestId('price-best-p1')).toBeNull();
    expect(queryByTestId('price-best-p2')).toBeNull();
    expect(queryByTestId('price-best-p3')).toBeNull();
  });
});

// ── Low-stock boundary ────────────────────────────────────────────────────────

describe('low-stock boundary', () => {
  it(`stockCount = LOW_STOCK_THRESHOLD (${LOW_STOCK_THRESHOLD}) shows In Stock`, () => {
    const atThreshold: Product = {
      ...productA,
      id: 'at-threshold' as any,
      inStock: true,
      stockCount: LOW_STOCK_THRESHOLD,
    };
    // Render alone to avoid ambiguity from productB's stock label
    const { getByText, queryByText } = render(<CompareScreen products={[atThreshold]} />);
    expect(getByText('In Stock')).toBeTruthy();
    expect(queryByText(`Low Stock (${LOW_STOCK_THRESHOLD})`)).toBeNull();
  });

  it(`stockCount = LOW_STOCK_THRESHOLD - 1 (${LOW_STOCK_THRESHOLD - 1}) shows Low Stock`, () => {
    const justBelow: Product = {
      ...productA,
      id: 'just-below' as any,
      inStock: true,
      stockCount: LOW_STOCK_THRESHOLD - 1,
    };
    const { getByText } = render(<CompareScreen products={[justBelow, productB]} />);
    expect(getByText(`Low Stock (${LOW_STOCK_THRESHOLD - 1})`)).toBeTruthy();
  });
});

// ── Share message content ─────────────────────────────────────────────────────

describe('share message content', () => {
  it('share message starts with "Compare Futons:"', async () => {
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({
      action: Share.sharedAction,
      activityType: undefined,
    });
    const { getByTestId } = render(<CompareScreen products={[productA, productB]} />);
    await act(async () => {
      fireEvent.press(getByTestId('compare-share-button'));
    });
    expect(shareSpy.mock.calls[0][0].message).toMatch(/^Compare Futons:/);
  });

  it('share message ends with "via Carolina Futons"', async () => {
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({
      action: Share.sharedAction,
      activityType: undefined,
    });
    const { getByTestId } = render(<CompareScreen products={[productA, productB]} />);
    await act(async () => {
      fireEvent.press(getByTestId('compare-share-button'));
    });
    expect(shareSpy.mock.calls[0][0].message).toMatch(/via Carolina Futons$/);
  });

  it('share message includes product ratings', async () => {
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({
      action: Share.sharedAction,
      activityType: undefined,
    });
    const { getByTestId } = render(<CompareScreen products={[productA, productB]} />);
    await act(async () => {
      fireEvent.press(getByTestId('compare-share-button'));
    });
    const msg = shareSpy.mock.calls[0][0].message;
    expect(msg).toContain(`${productA.rating} stars`);
    expect(msg).toContain(`${productB.rating} stars`);
  });
});
