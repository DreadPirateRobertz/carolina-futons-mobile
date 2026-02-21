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
    GestureHandlerRootView: ({ children, ...props }: any) =>
      createElement(View, props, children),
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

import { ARScreen } from '../ARScreen';
import { useCameraPermissions } from 'expo-camera';

describe('ARScreen', () => {
  beforeEach(() => {
    (useCameraPermissions as jest.Mock).mockReturnValue([{ granted: true }, jest.fn()]);
  });

  it('renders camera view when permission granted', () => {
    const { getByTestId } = render(<ARScreen />);
    expect(getByTestId('ar-screen')).toBeTruthy();
    expect(getByTestId('ar-camera')).toBeTruthy();
    expect(getByTestId('ar-futon-overlay')).toBeTruthy();
    expect(getByTestId('ar-controls')).toBeTruthy();
  });

  it('shows permission request when not granted', () => {
    (useCameraPermissions as jest.Mock).mockReturnValue([{ granted: false }, jest.fn()]);
    const { getByTestId, getByText } = render(<ARScreen />);
    expect(getByTestId('ar-permission')).toBeTruthy();
    expect(getByText('See Futons in Your Room')).toBeTruthy();
    expect(getByTestId('ar-grant-permission')).toBeTruthy();
  });

  it('requests permission when button pressed', () => {
    const mockRequest = jest.fn();
    (useCameraPermissions as jest.Mock).mockReturnValue([{ granted: false }, mockRequest]);
    const { getByTestId } = render(<ARScreen />);
    fireEvent.press(getByTestId('ar-grant-permission'));
    expect(mockRequest).toHaveBeenCalled();
  });

  it('shows loading state when permission is null', () => {
    (useCameraPermissions as jest.Mock).mockReturnValue([null, jest.fn()]);
    const { getByTestId } = render(<ARScreen />);
    expect(getByTestId('ar-loading')).toBeTruthy();
  });

  it('calls onClose when close button pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(<ARScreen onClose={onClose} />);
    fireEvent.press(getByTestId('ar-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows hint text with gesture instructions', () => {
    const { getByText } = render(<ARScreen />);
    expect(getByText(/Drag to position/)).toBeTruthy();
    expect(getByText(/Pinch to resize/)).toBeTruthy();
  });

  it('renders model selector chips', () => {
    const { getByTestId } = render(<ARScreen />);
    expect(getByTestId('ar-model-asheville-full')).toBeTruthy();
    expect(getByTestId('ar-model-blue-ridge-queen')).toBeTruthy();
    expect(getByTestId('ar-model-pisgah-twin')).toBeTruthy();
    expect(getByTestId('ar-model-biltmore-loveseat')).toBeTruthy();
  });

  it('renders fabric swatches', () => {
    const { getByTestId } = render(<ARScreen />);
    expect(getByTestId('ar-fabric-natural-linen')).toBeTruthy();
    expect(getByTestId('ar-fabric-slate-gray')).toBeTruthy();
    expect(getByTestId('ar-fabric-mountain-blue')).toBeTruthy();
  });

  it('toggles dimension overlay', () => {
    const { getByTestId } = render(<ARScreen />);
    fireEvent.press(getByTestId('ar-dimension-toggle'));
    // Dimension toggle should work without error
    expect(getByTestId('ar-dimension-toggle')).toBeTruthy();
  });

  it('switches model on chip press', () => {
    const { getByTestId, getAllByText } = render(<ARScreen />);
    fireEvent.press(getByTestId('ar-model-blue-ridge-queen'));
    // Name appears in chip + overlay badge
    expect(getAllByText('The Blue Ridge').length).toBeGreaterThanOrEqual(1);
  });

  it('shows add to cart with price', () => {
    const { getByTestId, getAllByText } = render(<ARScreen />);
    expect(getByTestId('ar-add-to-cart')).toBeTruthy();
    // Default model (Asheville) at $349 + default fabric ($0)
    expect(getAllByText(/\$349\.00/).length).toBeGreaterThanOrEqual(1);
  });

  it('uses initial model when provided', () => {
    const { getAllByText } = render(<ARScreen initialModelId="pisgah-twin" />);
    expect(getAllByText('The Pisgah').length).toBeGreaterThanOrEqual(1);
  });
});
