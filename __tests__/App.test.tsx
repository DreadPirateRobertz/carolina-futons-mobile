import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Mock expo-camera
jest.mock('expo-camera', () => {
  const { createElement } = require('react');
  const { View } = require('react-native');
  return {
    CameraView: ({ children, testID }: any) => createElement(View, { testID }, children),
    useCameraPermissions: jest.fn(() => [{ granted: true }, jest.fn()]),
  };
});

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

// Mock gesture handler
jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  const { createElement } = require('react');
  return {
    GestureHandlerRootView: ({ children, ...props }: any) => createElement(View, props, children),
    Gesture: {
      Pan: () => ({ onStart: () => ({ onUpdate: () => ({ onEnd: () => ({}) }) }) }),
      Pinch: () => ({ onStart: () => ({ onUpdate: () => ({ onEnd: () => ({}) }) }) }),
      Rotation: () => ({ onStart: () => ({ onUpdate: () => ({ onEnd: () => ({}) }) }) }),
      Simultaneous: () => ({}),
    },
    GestureDetector: ({ children }: any) => children,
  };
});

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: any) => c },
    useSharedValue: (init: any) => ({ value: init }),
    useAnimatedStyle: (fn: any) => fn(),
    withSpring: (val: any) => val,
  };
});

import App from '../App';

describe('App', () => {
  it('renders HomeScreen by default', () => {
    const { getByTestId, getByText } = render(<App />);
    expect(getByTestId('home-screen')).toBeTruthy();
    expect(getByText('Welcome to Carolina Futons')).toBeTruthy();
  });

  it('navigates to AR screen when AR button pressed', () => {
    const { getByTestId, queryByTestId } = render(<App />);
    expect(getByTestId('home-screen')).toBeTruthy();

    // Press AR button
    fireEvent.press(getByTestId('home-ar-button'));

    // Should now show AR screen, not home
    expect(getByTestId('ar-screen')).toBeTruthy();
    expect(queryByTestId('home-screen')).toBeNull();
  });

  it('navigates back to home when AR close pressed', () => {
    const { getByTestId, queryByTestId } = render(<App />);

    // Go to AR
    fireEvent.press(getByTestId('home-ar-button'));
    expect(getByTestId('ar-screen')).toBeTruthy();

    // Close AR
    fireEvent.press(getByTestId('ar-close'));

    // Should be back on home
    expect(getByTestId('home-screen')).toBeTruthy();
    expect(queryByTestId('ar-screen')).toBeNull();
  });

  it('can round-trip home → AR → home → AR', () => {
    const { getByTestId, queryByTestId } = render(<App />);

    // Home → AR
    fireEvent.press(getByTestId('home-ar-button'));
    expect(getByTestId('ar-screen')).toBeTruthy();

    // AR → Home
    fireEvent.press(getByTestId('ar-close'));
    expect(getByTestId('home-screen')).toBeTruthy();

    // Home → AR again
    fireEvent.press(getByTestId('home-ar-button'));
    expect(getByTestId('ar-screen')).toBeTruthy();
    expect(queryByTestId('home-screen')).toBeNull();
  });
});
