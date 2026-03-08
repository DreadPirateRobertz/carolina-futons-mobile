import React from 'react';
import { render } from '@testing-library/react-native';
import { SkeletonOrderDetail } from '../SkeletonOrderDetail';
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderSkeleton(testID?: string) {
  return render(
    <ThemeProvider>
      <SkeletonOrderDetail testID={testID} />
    </ThemeProvider>,
  );
}

describe('SkeletonOrderDetail', () => {
  it('renders with default testID', () => {
    const { getByTestId } = renderSkeleton();
    expect(getByTestId('skeleton-order-detail')).toBeTruthy();
  });

  it('renders with custom testID', () => {
    const { getByTestId } = renderSkeleton('custom-skeleton');
    expect(getByTestId('custom-skeleton')).toBeTruthy();
  });

  it('has accessibility label for loading state', () => {
    const { getByLabelText } = renderSkeleton();
    expect(getByLabelText('Loading order details')).toBeTruthy();
  });

  it('renders timeline shimmer placeholders', () => {
    const { getByTestId } = renderSkeleton();
    const root = getByTestId('skeleton-order-detail');
    expect(root.children.length).toBeGreaterThan(0);
  });
});
