import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

import App from '../App';

// Mock AsyncStorage — returning user (skip onboarding)
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve('true')),
  setItem: jest.fn(() => Promise.resolve()),
}));

// Mock font packages
jest.mock('expo-font', () => ({
  useFonts: () => [true],
  isLoaded: () => true,
}));
jest.mock('@expo-google-fonts/playfair-display', () => ({
  PlayfairDisplay_400Regular: 'PlayfairDisplay_400Regular',
  PlayfairDisplay_700Bold: 'PlayfairDisplay_700Bold',
}));
jest.mock('@expo-google-fonts/source-sans-3', () => ({
  SourceSans3_400Regular: 'SourceSans3_400Regular',
  SourceSans3_600SemiBold: 'SourceSans3_600SemiBold',
  SourceSans3_700Bold: 'SourceSans3_700Bold',
}));
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));

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
    withTiming: (val: any) => val,
    withRepeat: (val: any) => val,
    Easing: {
      ease: 0,
      inOut: () => 0,
      bezier: () => 0,
      in: () => 0,
      out: () => 0,
    },
  };
});

// Mock Stripe SDK
jest.mock('@stripe/stripe-react-native', () => {
  const { createElement } = require('react');
  return {
    StripeProvider: ({ children }: any) => children,
    useStripe: () => ({
      initPaymentSheet: jest.fn().mockResolvedValue({ error: null }),
      presentPaymentSheet: jest.fn().mockResolvedValue({ error: null }),
    }),
  };
});

// Mock native stack — use a minimal JS-based stack for testing
jest.mock('@react-navigation/native-stack', () => {
  const {
    createNavigatorFactory,
    useNavigationBuilder,
    StackRouter,
  } = require('@react-navigation/core');
  const { createElement } = require('react');
  const { View } = require('react-native');

  function NativeStackNavigator({ children, screenOptions, ...rest }: any) {
    const { state, descriptors, NavigationContent } = useNavigationBuilder(StackRouter, {
      children,
      screenOptions,
      ...rest,
    });
    return createElement(
      NavigationContent,
      null,
      state.routes.map((route: any, i: number) => {
        if (i !== state.index) return null;
        return createElement(View, { key: route.key }, descriptors[route.key].render());
      }),
    );
  }

  return {
    createNativeStackNavigator: createNavigatorFactory(NativeStackNavigator),
  };
});

describe('App', () => {
  it('renders HomeScreen by default', async () => {
    const { getByTestId, getByText } = render(<App />);
    await waitFor(() => {
      expect(getByTestId('home-screen')).toBeTruthy();
    });
    expect(getByText('Welcome to Carolina Futons')).toBeTruthy();
  });

  it('renders tab bar with Home, Shop, Cart, Account', async () => {
    const { getByText } = render(<App />);
    await waitFor(() => {
      expect(getByText('Home')).toBeTruthy();
    });
    expect(getByText('Shop')).toBeTruthy();
    expect(getByText('Cart')).toBeTruthy();
    expect(getByText('Account')).toBeTruthy();
  });

  it('navigates to Shop tab when tapped', async () => {
    const { getByText, getByTestId } = render(<App />);
    await waitFor(() => {
      expect(getByText('Shop')).toBeTruthy();
    });
    fireEvent.press(getByText('Shop'));
    await waitFor(() => {
      expect(getByTestId('shop-screen')).toBeTruthy();
    });
  });
});
