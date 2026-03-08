import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ZoomableImage } from '../ZoomableImage';

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.useSharedValue = jest.fn((init: number) => ({ value: init }));
  Reanimated.useAnimatedStyle = jest.fn((fn: () => object) => fn());
  Reanimated.withSpring = jest.fn((val: number) => val);
  return Reanimated;
});

jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return {
    Gesture: {
      Pinch: () => ({ onUpdate: jest.fn().mockReturnThis(), onEnd: jest.fn().mockReturnThis() }),
      Pan: () => ({
        minPointers: jest.fn().mockReturnThis(),
        onUpdate: jest.fn().mockReturnThis(),
        onEnd: jest.fn().mockReturnThis(),
      }),
      Tap: () => ({ numberOfTaps: jest.fn().mockReturnThis(), onEnd: jest.fn().mockReturnThis() }),
      Simultaneous: jest.fn(),
    },
    GestureDetector: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});

describe('ZoomableImage', () => {
  it('renders children', () => {
    const { getByText } = render(
      <ZoomableImage testID="zoom-container">
        <Text>Test Content</Text>
      </ZoomableImage>,
    );

    expect(getByText('Test Content')).toBeTruthy();
  });

  it('renders with testID', () => {
    const { getByTestId } = render(
      <ZoomableImage testID="zoom-test">
        <Text>Content</Text>
      </ZoomableImage>,
    );

    expect(getByTestId('zoom-test')).toBeTruthy();
  });
});
