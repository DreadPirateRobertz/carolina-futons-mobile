import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeProvider';

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (c: any) => c,
    },
    useSharedValue: (init: any) => ({ value: init }),
    useAnimatedStyle: (fn: any) => fn(),
    withRepeat: (val: any) => val,
    withTiming: (val: any) => val,
    Easing: { inOut: () => undefined, ease: undefined },
  };
});

import { SkeletonProductCard, SkeletonProductGrid } from '../SkeletonProductCard';

function wrap(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('SkeletonProductCard', () => {
  it('renders with default testID', () => {
    const { getByTestId } = wrap(<SkeletonProductCard />);
    expect(getByTestId('skeleton-product-card')).toBeTruthy();
  });

  it('accepts custom testID', () => {
    const { getByTestId } = wrap(<SkeletonProductCard testID="custom-skel" />);
    expect(getByTestId('custom-skel')).toBeTruthy();
  });

  it('has loading accessibility label', () => {
    const { getByTestId } = wrap(<SkeletonProductCard />);
    expect(getByTestId('skeleton-product-card').props.accessibilityLabel).toBe(
      'Loading product',
    );
  });

  it('renders shimmer placeholders for image, text, rating, and price', () => {
    const { getAllByLabelText } = wrap(<SkeletonProductCard />);
    // Image (1) + name lines (2) + description (1) + rating shimmers (2) + price (1) = 7
    const shimmers = getAllByLabelText('Loading');
    expect(shimmers.length).toBeGreaterThanOrEqual(6);
  });
});

describe('SkeletonProductGrid', () => {
  it('renders default 4 skeleton cards', () => {
    const { getByTestId, getAllByTestId } = wrap(<SkeletonProductGrid />);
    expect(getByTestId('skeleton-product-grid')).toBeTruthy();
    expect(getAllByTestId(/^skeleton-card-/)).toHaveLength(4);
  });

  it('renders specified count of cards', () => {
    const { getAllByTestId } = wrap(<SkeletonProductGrid count={6} />);
    expect(getAllByTestId(/^skeleton-card-/)).toHaveLength(6);
  });

  it('handles odd count (last row has one card)', () => {
    const { getAllByTestId } = wrap(<SkeletonProductGrid count={3} />);
    expect(getAllByTestId(/^skeleton-card-/)).toHaveLength(3);
  });
});
