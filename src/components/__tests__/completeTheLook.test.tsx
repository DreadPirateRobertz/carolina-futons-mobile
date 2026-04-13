/**
 * TDD tests for CompleteTheLook component.
 *
 * Covers:
 *  - Renders nothing when products array is empty
 *  - Renders strip title "Complete the Look"
 *  - Renders 2-4 product cards with name and price
 *  - Each card is tappable and calls onProductPress with the product
 *  - Shows loading skeleton while isLoading is true
 *  - Shows nothing (no error UI) when error is set but products is empty (non-fatal)
 *  - testID="complete-the-look-strip" on root container
 *  - Accessible: section header accessibilityRole
 *
 * cm-3n3: Complete the look — complementary product recommendations on PDP.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CompleteTheLook } from '../CompleteTheLook';
import type { Product } from '@/data/products';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      espresso: '#3B2A1A',
      espressoLight: '#7A6456',
      white: '#FFFFFF',
      sandLight: '#F5F0E8',
      overlay: '#DDDDDD',
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24 },
    borderRadius: { sm: 4, md: 8, card: 12 },
    shadows: { card: {} },
    typography: { bodyFamilyBold: 'SourceSans3_700Bold' },
  }),
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeProduct(id: string): Product {
  return {
    id: id as Product['id'],
    name: `Product ${id}`,
    slug: `product-${id}`,
    category: 'futons',
    price: 299,
    description: 'A great futon',
    shortDescription: 'Great futon',
    images: [{ uri: `https://example.com/${id}.jpg`, alt: `Product ${id}` }],
    rating: 4.5,
    reviewCount: 10,
    inStock: true,
    fabricOptions: ['linen'],
    dimensions: { width: 60, depth: 30, height: 15 },
  };
}

const PRODUCTS = [makeProduct('p1'), makeProduct('p2'), makeProduct('p3'), makeProduct('p4')];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CompleteTheLook', () => {
  it('renders nothing when products is empty and not loading', () => {
    const { queryByTestId } = render(
      <CompleteTheLook products={[]} isLoading={false} error={null} onProductPress={jest.fn()} />,
    );
    expect(queryByTestId('complete-the-look-strip')).toBeNull();
  });

  it('renders strip with testID when products exist', () => {
    const { getByTestId } = render(
      <CompleteTheLook
        products={PRODUCTS.slice(0, 2)}
        isLoading={false}
        error={null}
        onProductPress={jest.fn()}
      />,
    );
    expect(getByTestId('complete-the-look-strip')).toBeTruthy();
  });

  it('renders the section title "Complete the Look"', () => {
    const { getByText } = render(
      <CompleteTheLook
        products={PRODUCTS.slice(0, 2)}
        isLoading={false}
        error={null}
        onProductPress={jest.fn()}
      />,
    );
    expect(getByText('Complete the Look')).toBeTruthy();
  });

  it('renders a card for each product', () => {
    const { getAllByTestId } = render(
      <CompleteTheLook
        products={PRODUCTS}
        isLoading={false}
        error={null}
        onProductPress={jest.fn()}
      />,
    );
    expect(getAllByTestId(/^complete-the-look-card-/)).toHaveLength(4);
  });

  it('renders product name and price on each card', () => {
    const { getByText } = render(
      <CompleteTheLook
        products={[PRODUCTS[0]]}
        isLoading={false}
        error={null}
        onProductPress={jest.fn()}
      />,
    );
    expect(getByText('Product p1')).toBeTruthy();
    expect(getByText('$299.00')).toBeTruthy();
  });

  it('calls onProductPress with the product when card is tapped', () => {
    const onProductPress = jest.fn();
    const { getByTestId } = render(
      <CompleteTheLook
        products={[PRODUCTS[0]]}
        isLoading={false}
        error={null}
        onProductPress={onProductPress}
      />,
    );
    fireEvent.press(getByTestId('complete-the-look-card-p1'));
    expect(onProductPress).toHaveBeenCalledWith(PRODUCTS[0]);
  });

  it('shows loading skeleton when isLoading is true', () => {
    const { getByTestId, queryByTestId } = render(
      <CompleteTheLook products={[]} isLoading={true} error={null} onProductPress={jest.fn()} />,
    );
    expect(getByTestId('complete-the-look-skeleton')).toBeTruthy();
    expect(queryByTestId('complete-the-look-strip')).toBeNull();
  });

  it('renders nothing (no error UI) when error is set but products is empty', () => {
    const { queryByTestId } = render(
      <CompleteTheLook
        products={[]}
        isLoading={false}
        error="Wix unavailable"
        onProductPress={jest.fn()}
      />,
    );
    expect(queryByTestId('complete-the-look-strip')).toBeNull();
    expect(queryByTestId('complete-the-look-skeleton')).toBeNull();
  });

  it('renders strip (ignoring non-fatal error) when products and error both present', () => {
    const { getByTestId } = render(
      <CompleteTheLook
        products={[PRODUCTS[0]]}
        isLoading={false}
        error="partial error"
        onProductPress={jest.fn()}
      />,
    );
    expect(getByTestId('complete-the-look-strip')).toBeTruthy();
  });

  it('section title has accessibilityRole header', () => {
    const { getByRole } = render(
      <CompleteTheLook
        products={PRODUCTS.slice(0, 2)}
        isLoading={false}
        error={null}
        onProductPress={jest.fn()}
      />,
    );
    expect(getByRole('header', { name: 'Complete the Look' })).toBeTruthy();
  });
});
