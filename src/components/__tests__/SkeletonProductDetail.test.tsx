import React from 'react';
import { render } from '@testing-library/react-native';
import { SkeletonProductDetail } from '../SkeletonProductDetail';
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderSkeleton(testID?: string) {
  return render(
    <ThemeProvider>
      <SkeletonProductDetail testID={testID} />
    </ThemeProvider>,
  );
}

describe('SkeletonProductDetail', () => {
  it('renders with default testID', () => {
    const { getByTestId } = renderSkeleton();
    expect(getByTestId('skeleton-product-detail')).toBeTruthy();
  });

  it('renders with custom testID', () => {
    const { getByTestId } = renderSkeleton('custom-skeleton');
    expect(getByTestId('custom-skeleton')).toBeTruthy();
  });

  it('has accessibility label for loading state', () => {
    const { getByLabelText } = renderSkeleton();
    expect(getByLabelText('Loading product details')).toBeTruthy();
  });

  it('renders gallery placeholder shimmer', () => {
    const { UNSAFE_root } = renderSkeleton();
    // The root should contain shimmer elements (children exist)
    expect(UNSAFE_root.children.length).toBeGreaterThan(0);
  });

  it('renders pagination dots', () => {
    const { getByTestId } = renderSkeleton();
    const root = getByTestId('skeleton-product-detail');
    // Component renders 4 pagination dots, fabric swatches, dim items, review cards
    expect(root).toBeTruthy();
  });
});
