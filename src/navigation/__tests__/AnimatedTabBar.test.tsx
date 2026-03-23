import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

import { AnimatedTabBar } from '../AnimatedTabBar';
import * as Haptics from 'expo-haptics';

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

// Mock reanimated
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

// Build a mock BottomTabBarProps-like state
function createMockPropsWithTint(activeTint: string, inactiveTint: string, activeIndex = 0) {
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
  const descriptors: Record<string, any> = {};
  routes.forEach((route) => {
    descriptors[route.key] = {
      options: {
        tabBarLabel: route.name,
        tabBarIcon: ({ focused, color }: any) => (
          <Text testID={`icon-${route.name}`}>{route.name[0]}</Text>
        ),
        tabBarBadge: route.name === 'Cart' ? 2 : undefined,
        tabBarActiveTintColor: activeTint,
        tabBarInactiveTintColor: inactiveTint,
      },
    };
  });
  return { state: { index: activeIndex, routes }, descriptors, navigation } as any;
}

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

  describe('dynamic tint from options (cf-7l2)', () => {
    it('uses tabBarActiveTintColor from options for the focused tab label', () => {
      const { StyleSheet } = require('react-native');
      const props = createMockPropsWithTint('#FF0000', '#0000FF', 0); // Home active
      const { getByText } = render(<AnimatedTabBar {...props} />);
      const flatStyle = StyleSheet.flatten(getByText('Home').props.style);
      expect(flatStyle.color).toBe('#FF0000');
    });

    it('uses tabBarInactiveTintColor from options for unfocused tab labels', () => {
      const { StyleSheet } = require('react-native');
      const props = createMockPropsWithTint('#FF0000', '#0000FF', 0);
      const { getByText } = render(<AnimatedTabBar {...props} />);
      const flatStyle = StyleSheet.flatten(getByText('Shop').props.style);
      expect(flatStyle.color).toBe('#0000FF');
    });

    it('falls back to ACTIVE_COLOR constant when options lack tint colors', () => {
      const { StyleSheet } = require('react-native');
      const props = createMockProps(0);
      const { getByText } = render(<AnimatedTabBar {...props} />);
      const flatStyle = StyleSheet.flatten(getByText('Home').props.style);
      expect(flatStyle.color).toBe('#F5F0EB');
    });
  });

  describe('Accessibility', () => {
    it('sets accessibilityLabel on each tab', () => {
      const props = createMockProps(0);
      const { getByTestId } = render(<AnimatedTabBar {...props} />);
      for (const name of ['Home', 'Shop', 'Cart', 'Account']) {
        const tab = getByTestId(`tab-${name}`);
        expect(tab.props.accessibilityLabel).toBe(name);
      }
    });

    it('sets accessibilityRole="tab" on each tab', () => {
      const props = createMockProps(0);
      const { getByTestId } = render(<AnimatedTabBar {...props} />);
      const tab = getByTestId('tab-Home');
      expect(tab.props.accessibilityRole).toBe('tab');
    });

    it('marks active tab as selected', () => {
      const props = createMockProps(1);
      const { getByTestId } = render(<AnimatedTabBar {...props} />);
      expect(getByTestId('tab-Shop').props.accessibilityState).toEqual({ selected: true });
      expect(getByTestId('tab-Home').props.accessibilityState).toEqual({});
    });
  });
});
