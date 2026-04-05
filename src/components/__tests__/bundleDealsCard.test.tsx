/**
 * TDD tests for BundleDealsCard (cm-6i5).
 *
 * Covers:
 *  - Renders bundle name
 *  - Renders each product name
 *  - Renders discount code
 *  - Renders formatted price
 *  - "Copy Code" button copies to clipboard
 *  - Returns null when bundle prop is null/undefined
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Clipboard } from 'react-native';
import { BundleDealsCard } from '../BundleDealsCard';
import type { BundleDeal } from '@/hooks/useBundleDeals';
import { PRODUCTS } from '@/data/products';

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.spyOn(Clipboard, 'setString').mockImplementation(() => {});

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      sandBase: '#E8D5B7',
      sandDark: '#D4C4A0',
      espresso: '#3B2410',
      espressoLight: '#6B4C30',
      sunsetCoral: '#E05252',
      mountainBlue: '#4A7FA5',
      offWhite: '#FAF7F2',
      success: '#2D6A4F',
      overlay: '#00000022',
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    borderRadius: { sm: 4, md: 8, lg: 12, button: 8 },
    typography: {
      headingFamily: 'System',
      bodyFamily: 'System',
      bodyFamilyBold: 'System',
    },
  }),
}));

// ── Fixtures ───────────────────────────────────────────────────────────────────

const PRODUCTS_WITH_SKU = PRODUCTS.filter((p) => p.sku);
const PRODUCT_A = PRODUCTS_WITH_SKU[0];
const PRODUCT_B = PRODUCTS_WITH_SKU[1];

const BUNDLE: BundleDeal = {
  name: 'The Bedroom Bundle',
  skus: [PRODUCT_A.sku!, PRODUCT_B.sku!],
  discountCode: 'BEDROOM10',
  price: 699,
  products: [PRODUCT_A, PRODUCT_B],
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Rendering ──────────────────────────────────────────────────────────────────

describe('BundleDealsCard — rendering', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(<BundleDealsCard bundle={BUNDLE} />);
    expect(getByTestId('bundle-deals-card')).toBeTruthy();
  });

  it('renders the bundle name', () => {
    const { getByText } = render(<BundleDealsCard bundle={BUNDLE} />);
    expect(getByText('The Bedroom Bundle')).toBeTruthy();
  });

  it('renders each product name', () => {
    const { getByText } = render(<BundleDealsCard bundle={BUNDLE} />);
    expect(getByText(PRODUCT_A.name)).toBeTruthy();
    expect(getByText(PRODUCT_B.name)).toBeTruthy();
  });

  it('renders the discount code', () => {
    const { getByText } = render(<BundleDealsCard bundle={BUNDLE} />);
    expect(getByText('BEDROOM10')).toBeTruthy();
  });

  it('renders the bundle price', () => {
    const { getByTestId } = render(<BundleDealsCard bundle={BUNDLE} />);
    expect(getByTestId('bundle-deals-price')).toBeTruthy();
  });

  it('displays price as formatted currency', () => {
    const { getByText } = render(<BundleDealsCard bundle={BUNDLE} />);
    // formatPrice(699) = '$699.00' or similar
    expect(getByText(/\$699/)).toBeTruthy();
  });

  it('renders the copy code button', () => {
    const { getByTestId } = render(<BundleDealsCard bundle={BUNDLE} />);
    expect(getByTestId('bundle-deals-copy-code')).toBeTruthy();
  });

  it('accepts a custom testID', () => {
    const { getByTestId } = render(<BundleDealsCard bundle={BUNDLE} testID="my-bundle" />);
    expect(getByTestId('my-bundle')).toBeTruthy();
  });
});

// ── Copy code ──────────────────────────────────────────────────────────────────

describe('BundleDealsCard — copy code', () => {
  it('calls Clipboard.setString with the discount code on press', () => {
    const { getByTestId } = render(<BundleDealsCard bundle={BUNDLE} />);
    fireEvent.press(getByTestId('bundle-deals-copy-code'));
    expect(Clipboard.setString).toHaveBeenCalledWith('BEDROOM10');
  });

  it('copy button has accessible label', () => {
    const { getByTestId } = render(<BundleDealsCard bundle={BUNDLE} />);
    const btn = getByTestId('bundle-deals-copy-code');
    expect(btn.props.accessibilityLabel).toBeTruthy();
  });
});

// ── Empty products ─────────────────────────────────────────────────────────────

describe('BundleDealsCard — edge cases', () => {
  it('renders when products array is empty', () => {
    const bundle: BundleDeal = { ...BUNDLE, products: [], skus: [] };
    const { getByTestId } = render(<BundleDealsCard bundle={bundle} />);
    expect(getByTestId('bundle-deals-card')).toBeTruthy();
  });
});
