/**
 * TDD tests for BundleDeals integration on ShopScreen (cm-6i5).
 *
 * Covers:
 *  - Bundle deals section renders when bundles are available
 *  - Renders a card for each bundle
 *  - Section is hidden when there are no bundles
 *  - Section is hidden while loading
 *  - Bundle name and code are visible
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { ShopScreen } from '../ShopScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import { CompareProvider } from '@/contexts/CompareContext';

// ── Mock useBundleDeals ────────────────────────────────────────────────────────

const mockUseBundleDeals = jest.fn();
jest.mock('@/hooks/useBundleDeals', () => ({
  useBundleDeals: () => mockUseBundleDeals(),
}));

// ── Fixtures ───────────────────────────────────────────────────────────────────

const BUNDLE_A = {
  name: 'The Bedroom Bundle',
  skus: ['CF-FUT-ASH-001'],
  discountCode: 'BEDROOM10',
  price: 699,
  products: [],
};

const BUNDLE_B = {
  name: 'The Living Room Bundle',
  skus: ['CF-FUT-BRQ-002'],
  discountCode: 'LIVING15',
  price: 899,
  products: [],
};

async function renderShop() {
  const result = render(
    <ThemeProvider>
      <WishlistProvider>
        <CompareProvider>
          <ShopScreen />
        </CompareProvider>
      </WishlistProvider>
    </ThemeProvider>,
  );
  await waitFor(() => result.getByTestId('product-list'));
  return result;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseBundleDeals.mockReturnValue({ bundles: [], isLoading: false, error: null });
});

// ── Bundle deals section ───────────────────────────────────────────────────────

describe('ShopScreen — bundle deals section', () => {
  it('renders the bundle deals section when bundles are available', async () => {
    mockUseBundleDeals.mockReturnValue({
      bundles: [BUNDLE_A],
      isLoading: false,
      error: null,
    });
    const { getByTestId } = await renderShop();
    expect(getByTestId('shop-bundle-deals')).toBeTruthy();
  });

  it('hides bundle deals section when no bundles', async () => {
    const { queryByTestId } = await renderShop();
    expect(queryByTestId('shop-bundle-deals')).toBeNull();
  });

  it('hides bundle deals section while loading', async () => {
    mockUseBundleDeals.mockReturnValue({ bundles: [], isLoading: true, error: null });
    const { queryByTestId } = await renderShop();
    expect(queryByTestId('shop-bundle-deals')).toBeNull();
  });

  it('renders a card for each bundle', async () => {
    mockUseBundleDeals.mockReturnValue({
      bundles: [BUNDLE_A, BUNDLE_B],
      isLoading: false,
      error: null,
    });
    const { getByTestId } = await renderShop();
    expect(getByTestId('shop-bundle-0')).toBeTruthy();
    expect(getByTestId('shop-bundle-1')).toBeTruthy();
  });

  it('displays bundle names', async () => {
    mockUseBundleDeals.mockReturnValue({
      bundles: [BUNDLE_A],
      isLoading: false,
      error: null,
    });
    const { getByText } = await renderShop();
    expect(getByText('The Bedroom Bundle')).toBeTruthy();
  });

  it('displays discount codes', async () => {
    mockUseBundleDeals.mockReturnValue({
      bundles: [BUNDLE_A],
      isLoading: false,
      error: null,
    });
    const { getByText } = await renderShop();
    expect(getByText('BEDROOM10')).toBeTruthy();
  });
});
