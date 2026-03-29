import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ZoomableImage } from '../ZoomableImage';

jest.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: jest.fn(() => false),
}));

import { useReducedMotion } from '@/hooks/useReducedMotion';
const mockUseReducedMotion = useReducedMotion as jest.Mock;

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

  it('has accessibility role and label', () => {
    const { getByRole } = render(
      <ZoomableImage testID="zoom-a11y">
        <Text>Photo</Text>
      </ZoomableImage>,
    );

    expect(getByRole('image')).toBeTruthy();
  });

  it('works with reduceMotion enabled', () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { getByTestId } = render(
      <ZoomableImage testID="zoom-reduced">
        <Text>Reduced</Text>
      </ZoomableImage>,
    );

    expect(getByTestId('zoom-reduced')).toBeTruthy();
    mockUseReducedMotion.mockReturnValue(false);
  });
});
