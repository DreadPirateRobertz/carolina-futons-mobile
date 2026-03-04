import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

// Mock expo-image
jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Image = React.forwardRef(function ExpoImage(props: any, ref: any) {
    const { contentFit, transition, recyclingKey, ...rest } = props;
    return React.createElement(View, { ...rest, ref });
  });
  Image.displayName = 'ExpoImage';
  return { Image };
});

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const React = require('react');
  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (c: any) => {
        const Wrapped = React.forwardRef((props: any, ref: any) =>
          React.createElement(c, { ...props, ref }),
        );
        Wrapped.displayName = `Animated(${c.displayName || c.name || 'Component'})`;
        return Wrapped;
      },
    },
    useSharedValue: (init: any) => ({ value: init }),
    useAnimatedStyle: (fn: any) => fn(),
    interpolate: (_val: any, _input: any, output: any) => output[1],
    Extrapolation: { CLAMP: 'clamp' },
  };
});

import { ParallaxHeader } from '../ParallaxHeader';

describe('ParallaxHeader', () => {
  const scrollY = { value: 0 } as any;

  it('renders with testID', () => {
    const { getByTestId } = render(
      <ParallaxHeader
        imageUri="https://example.com/photo.jpg"
        height={400}
        scrollY={scrollY}
        testID="parallax"
      />,
    );
    expect(getByTestId('parallax')).toBeTruthy();
  });

  it('renders overlay children', () => {
    const { getByText } = render(
      <ParallaxHeader imageUri="https://example.com/photo.jpg" height={400} scrollY={scrollY}>
        <Text>Overlay Content</Text>
      </ParallaxHeader>,
    );
    expect(getByText('Overlay Content')).toBeTruthy();
  });

  it('accepts custom parallaxFactor', () => {
    const { getByTestId } = render(
      <ParallaxHeader
        imageUri="https://example.com/photo.jpg"
        height={300}
        scrollY={scrollY}
        parallaxFactor={0.3}
        testID="custom-parallax"
      />,
    );
    expect(getByTestId('custom-parallax')).toBeTruthy();
  });
});
