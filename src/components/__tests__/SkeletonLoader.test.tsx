import React from 'react';
import { render } from '@testing-library/react-native';

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const easingFn = (v: any) => v;
  easingFn.inOut = () => easingFn;
  easingFn.ease = easingFn;
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
    interpolate: (_val: any, _input: any, output: any) => output[1],
    Easing: { inOut: () => easingFn, ease: easingFn },
  };
});

import { SkeletonLoader } from '../SkeletonLoader';

describe('SkeletonLoader', () => {
  it('renders with default dimensions', () => {
    const { getByTestId } = render(<SkeletonLoader testID="skel" />);
    expect(getByTestId('skel')).toBeTruthy();
  });

  it('accepts width and height', () => {
    const { getByTestId } = render(<SkeletonLoader testID="sized" width={200} height={100} />);
    const el = getByTestId('sized');
    expect(el).toBeTruthy();
  });

  it('renders circle variant', () => {
    const { getByTestId } = render(<SkeletonLoader testID="circle" variant="circle" width={48} />);
    expect(getByTestId('circle')).toBeTruthy();
  });

  it('renders text variant with small height', () => {
    const { getByTestId } = render(<SkeletonLoader testID="text" variant="text" height={14} />);
    expect(getByTestId('text')).toBeTruthy();
  });

  it('accepts custom borderRadius', () => {
    const { getByTestId } = render(<SkeletonLoader testID="rounded" borderRadius={16} />);
    expect(getByTestId('rounded')).toBeTruthy();
  });
});
