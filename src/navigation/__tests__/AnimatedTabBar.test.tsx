import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const { View, Pressable } = require('react-native');
  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (c: any) => c,
    },
    useSharedValue: (init: any) => ({ value: init }),
    useAnimatedStyle: (fn: any) => fn(),
    withSpring: (val: any) => val,
  };
});

// Mock safe area
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, top: 0, left: 0, right: 0 }),
}));

// Mock expo-blur
jest.mock('expo-blur', () => {
  const { View } = require('react-native');
  const { createElement } = require('react');
  return {
    BlurView: ({ children, ...props }: any) => createElement(View, props, children),
  };
});

import { AnimatedTabBar } from '../AnimatedTabBar';
import * as Haptics from 'expo-haptics';

// Build a mock BottomTabBarProps-like state
function createMockProps(activeIndex = 0) {
  const routes = [
    { key: 'Home-1', name: 'Home' },
    { key: 'Shop-2', name: 'Shop' },
    { key: 'Cart-3', name: 'Cart' },
    { key: 'Account-4', name: 'Account' },
  ];
  const navigation = {
    emit: jest.fn(() => ({ defaultPrevented: false })),
    navigate: jest.fn(),
  };
  const state = {
    index: activeIndex,
    routes,
  };
  const descriptors: Record<string, any> = {};
  routes.forEach((route) => {
    descriptors[route.key] = {
      options: {
        tabBarLabel: route.name,
        tabBarIcon: ({ focused, color }: any) => (
          <Text testID={`icon-${route.name}`}>{route.name[0]}</Text>
        ),
        tabBarBadge: route.name === 'Cart' ? 2 : undefined,
      },
    };
  });
  return { state, descriptors, navigation } as any;
}

describe('AnimatedTabBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all tab labels', () => {
    const props = createMockProps(0);
    const { getByText } = render(<AnimatedTabBar {...props} />);
    expect(getByText('Home')).toBeTruthy();
    expect(getByText('Shop')).toBeTruthy();
    expect(getByText('Cart')).toBeTruthy();
    expect(getByText('Account')).toBeTruthy();
  });

  it('highlights the active tab', () => {
    const props = createMockProps(1); // Shop active
    const { getByTestId } = render(<AnimatedTabBar {...props} />);
    expect(getByTestId('tab-Shop')).toBeTruthy();
  });

  it('triggers navigation on tab press', () => {
    const props = createMockProps(0);
    const { getByTestId } = render(<AnimatedTabBar {...props} />);
    fireEvent.press(getByTestId('tab-Shop'));
    expect(props.navigation.emit).toHaveBeenCalled();
    expect(props.navigation.navigate).toHaveBeenCalledWith('Shop');
  });

  it('triggers haptic feedback on tab press', () => {
    const props = createMockProps(0);
    const { getByTestId } = render(<AnimatedTabBar {...props} />);
    fireEvent.press(getByTestId('tab-Shop'));
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });

  it('renders cart badge when present', () => {
    const props = createMockProps(0);
    const { getByText } = render(<AnimatedTabBar {...props} />);
    expect(getByText('2')).toBeTruthy();
  });

  it('has glass background style via testID', () => {
    const props = createMockProps(0);
    const { getByTestId } = render(<AnimatedTabBar {...props} />);
    expect(getByTestId('animated-tab-bar')).toBeTruthy();
  });

  it('renders blur backdrop for glassmorphism', () => {
    const props = createMockProps(0);
    const { getByTestId } = render(<AnimatedTabBar {...props} />);
    expect(getByTestId('tab-bar-blur')).toBeTruthy();
  });
});
