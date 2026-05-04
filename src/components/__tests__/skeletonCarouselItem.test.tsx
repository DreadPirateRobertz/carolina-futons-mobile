import React from 'react';
import { render } from '@testing-library/react-native';
import { SkeletonCarouselItem, SkeletonCarouselRow } from '../SkeletonCarouselItem';
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

describe('SkeletonCarouselItem', () => {
  it('renders with default testID', () => {
    const { getByTestId } = wrap(<SkeletonCarouselItem />);
    expect(getByTestId('skeleton-carousel-item')).toBeTruthy();
  });

  it('renders with custom testID', () => {
    const { getByTestId } = wrap(<SkeletonCarouselItem testID="custom" />);
    expect(getByTestId('custom')).toBeTruthy();
  });

  it('has accessibility label', () => {
    const { getByLabelText } = wrap(<SkeletonCarouselItem />);
    expect(getByLabelText('Loading recommendation')).toBeTruthy();
  });

  it('uses SkeletonBox for the image placeholder', () => {
    const { getByTestId } = wrap(<SkeletonCarouselItem />);
    expect(getByTestId('skeleton-carousel-item-image')).toBeTruthy();
  });

  it('uses SkeletonText for the name placeholder', () => {
    const { getByTestId } = wrap(<SkeletonCarouselItem />);
    expect(getByTestId('skeleton-carousel-item-name')).toBeTruthy();
  });

  it('uses SkeletonBox for the price placeholder', () => {
    const { getByTestId } = wrap(<SkeletonCarouselItem />);
    expect(getByTestId('skeleton-carousel-item-price')).toBeTruthy();
  });
});

describe('SkeletonCarouselRow', () => {
  it('renders default 3 items', () => {
    const { getByTestId } = wrap(<SkeletonCarouselRow />);
    expect(getByTestId('skeleton-carousel-row')).toBeTruthy();
    expect(getByTestId('skeleton-carousel-0')).toBeTruthy();
    expect(getByTestId('skeleton-carousel-1')).toBeTruthy();
    expect(getByTestId('skeleton-carousel-2')).toBeTruthy();
  });

  it('renders custom count', () => {
    const { getByTestId, queryByTestId } = wrap(<SkeletonCarouselRow count={2} />);
    expect(getByTestId('skeleton-carousel-0')).toBeTruthy();
    expect(getByTestId('skeleton-carousel-1')).toBeTruthy();
    expect(queryByTestId('skeleton-carousel-2')).toBeNull();
  });
});
