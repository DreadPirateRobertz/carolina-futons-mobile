/**
 * @module ProductBadge tests (cm-snj)
 *
 * Unified product badge component — shared visual language aligned with
 * cfutons web badge types (NEW, BESTSELLER, LOW_STOCK, SALE, CF_PLUS_EXCLUSIVE).
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ProductBadge } from '../ProductBadge';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { PRODUCT_BADGE_TYPES } from '@/data/productBadgeTypes';

function renderBadge(props: Partial<React.ComponentProps<typeof ProductBadge>> = {}) {
  return render(
    <ThemeProvider>
      <ProductBadge type="NEW" {...props} />
    </ThemeProvider>,
  );
}

describe('ProductBadge', () => {
  it('renders nothing when type is null', () => {
    const { queryByTestId } = renderBadge({ type: null });
    expect(queryByTestId('product-badge')).toBeNull();
  });

  it('renders nothing when type is undefined', () => {
    const { queryByTestId } = renderBadge({ type: undefined });
    expect(queryByTestId('product-badge')).toBeNull();
  });

  it('renders the NEW badge with label', () => {
    const { getByTestId, getByText } = renderBadge({ type: 'NEW' });
    expect(getByTestId('product-badge')).toBeTruthy();
    expect(getByText('New')).toBeTruthy();
  });

  it('renders the BESTSELLER badge with label', () => {
    const { getByText } = renderBadge({ type: 'BESTSELLER' });
    expect(getByText('Bestseller')).toBeTruthy();
  });

  it('renders the LOW_STOCK badge with label', () => {
    const { getByText } = renderBadge({ type: 'LOW_STOCK' });
    expect(getByText('Low Stock')).toBeTruthy();
  });

  it('renders the SALE badge with label', () => {
    const { getByText } = renderBadge({ type: 'SALE' });
    expect(getByText('Sale')).toBeTruthy();
  });

  it('renders the CF_PLUS_EXCLUSIVE badge with label', () => {
    const { getByText } = renderBadge({ type: 'CF_PLUS_EXCLUSIVE' });
    expect(getByText('CF+')).toBeTruthy();
  });

  it('passes custom testID', () => {
    const { getByTestId } = renderBadge({ type: 'NEW', testID: 'my-badge' });
    expect(getByTestId('my-badge')).toBeTruthy();
  });

  it('has accessibility label for NEW', () => {
    const { getByTestId } = renderBadge({ type: 'NEW' });
    expect(getByTestId('product-badge').props.accessibilityLabel).toBe('New product');
  });

  it('has accessibility label for SALE', () => {
    const { getByTestId } = renderBadge({ type: 'SALE' });
    expect(getByTestId('product-badge').props.accessibilityLabel).toBe('On sale');
  });

  it('has accessibility label for LOW_STOCK', () => {
    const { getByTestId } = renderBadge({ type: 'LOW_STOCK' });
    expect(getByTestId('product-badge').props.accessibilityLabel).toBe('Low stock');
  });

  it('has accessibility label for CF_PLUS_EXCLUSIVE', () => {
    const { getByTestId } = renderBadge({ type: 'CF_PLUS_EXCLUSIVE' });
    expect(getByTestId('product-badge').props.accessibilityLabel).toBe('CF+ exclusive item');
  });

  it('renders compact variant at smaller size', () => {
    const { getByTestId } = renderBadge({ type: 'SALE', compact: true, testID: 'badge' });
    expect(getByTestId('badge')).toBeTruthy();
  });

  it('exports all badge type constants', () => {
    expect(PRODUCT_BADGE_TYPES.NEW).toBe('NEW');
    expect(PRODUCT_BADGE_TYPES.BESTSELLER).toBe('BESTSELLER');
    expect(PRODUCT_BADGE_TYPES.LOW_STOCK).toBe('LOW_STOCK');
    expect(PRODUCT_BADGE_TYPES.SALE).toBe('SALE');
    expect(PRODUCT_BADGE_TYPES.CF_PLUS_EXCLUSIVE).toBe('CF_PLUS_EXCLUSIVE');
  });
});
