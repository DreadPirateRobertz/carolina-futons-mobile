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

import { Shimmer, ShimmerLines, ShimmerCircle } from '../Shimmer';

function wrap(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('Shimmer', () => {
  it('renders with default props and accessibility', () => {
    const { getByLabelText } = wrap(<Shimmer />);
    const el = getByLabelText('Loading');
    expect(el).toBeTruthy();
    expect(el.props.accessibilityRole).toBe('progressbar');
  });

  it('applies custom width, height, and borderRadius', () => {
    const { getByLabelText } = wrap(
      <Shimmer width={200} height={24} borderRadius={8} />,
    );
    const styles = getByLabelText('Loading').props.style;
    const flat = Object.assign({}, ...styles.filter(Boolean));
    expect(flat.width).toBe(200);
    expect(flat.height).toBe(24);
    expect(flat.borderRadius).toBe(8);
  });

  it('includes opacity in animated style', () => {
    const { getByLabelText } = wrap(<Shimmer />);
    const styles = getByLabelText('Loading').props.style;
    const flat = Object.assign({}, ...styles.filter(Boolean));
    expect(flat).toHaveProperty('opacity');
  });
});

describe('ShimmerLines', () => {
  it('renders the specified number of lines', () => {
    const { getAllByLabelText } = wrap(<ShimmerLines lines={3} />);
    expect(getAllByLabelText('Loading')).toHaveLength(3);
  });

  it('defaults to 2 lines', () => {
    const { getAllByLabelText } = wrap(<ShimmerLines />);
    expect(getAllByLabelText('Loading')).toHaveLength(2);
  });

  it('applies lastLineWidth to the final line only', () => {
    const { getAllByLabelText } = wrap(
      <ShimmerLines lines={3} lastLineWidth="40%" />,
    );
    const bars = getAllByLabelText('Loading');
    const firstStyles = Object.assign({}, ...bars[0].props.style.filter(Boolean));
    const lastStyles = Object.assign({}, ...bars[2].props.style.filter(Boolean));
    expect(firstStyles.width).toBe('100%');
    expect(lastStyles.width).toBe('40%');
  });
});

describe('ShimmerCircle', () => {
  it('renders with default size 40 and circular borderRadius', () => {
    const { getByLabelText } = wrap(<ShimmerCircle />);
    const styles = getByLabelText('Loading').props.style;
    const flat = Object.assign({}, ...styles.filter(Boolean));
    expect(flat.width).toBe(40);
    expect(flat.height).toBe(40);
    expect(flat.borderRadius).toBe(20);
  });

  it('accepts custom size', () => {
    const { getByLabelText } = wrap(<ShimmerCircle size={60} />);
    const styles = getByLabelText('Loading').props.style;
    const flat = Object.assign({}, ...styles.filter(Boolean));
    expect(flat.width).toBe(60);
    expect(flat.height).toBe(60);
    expect(flat.borderRadius).toBe(30);
  });
});
