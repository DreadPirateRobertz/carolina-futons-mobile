import React from 'react';
import { render } from '@testing-library/react-native';
import { SkeletonCollectionCard } from '../SkeletonCollectionCard';
import { ThemeProvider } from '@/theme/ThemeProvider';

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: any) => c },
    useSharedValue: (init: any) => ({ value: init }),
    useAnimatedStyle: (fn: any) => fn(),
    withRepeat: (val: any) => val,
    withTiming: (val: any) => val,
    Easing: { inOut: () => undefined, ease: undefined },
  };
});

jest.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => false }));

function wrap(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('SkeletonCollectionCard', () => {
  it('renders with default testID', () => {
    const { getByTestId } = wrap(<SkeletonCollectionCard />);
    expect(getByTestId('skeleton-collection-card')).toBeTruthy();
  });

  it('accepts custom testID', () => {
    const { getByTestId } = wrap(<SkeletonCollectionCard testID="custom-skel" />);
    expect(getByTestId('custom-skel')).toBeTruthy();
  });

  it('has loading accessibility label', () => {
    const { getByTestId } = wrap(<SkeletonCollectionCard />);
    expect(getByTestId('skeleton-collection-card').props.accessibilityLabel).toBe(
      'Loading collection',
    );
  });

  it('renders Loading-labelled elements for shimmer placeholders', () => {
    const { getAllByLabelText } = wrap(<SkeletonCollectionCard />);
    expect(getAllByLabelText('Loading').length).toBeGreaterThanOrEqual(3);
  });

  it('uses SkeletonBox for the hero image placeholder', () => {
    const { getByTestId } = wrap(<SkeletonCollectionCard />);
    expect(getByTestId('skeleton-collection-card-image')).toBeTruthy();
  });

  it('uses SkeletonText for the title placeholder', () => {
    const { getByTestId } = wrap(<SkeletonCollectionCard />);
    expect(getByTestId('skeleton-collection-card-title')).toBeTruthy();
  });
});
