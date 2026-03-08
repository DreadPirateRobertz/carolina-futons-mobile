import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

import { AnimatedPressable } from '../AnimatedPressable';
import * as Haptics from 'expo-haptics';

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
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

describe('AnimatedPressable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children', () => {
    const { getByText } = render(
      <AnimatedPressable onPress={() => {}}>
        <Text>Tap me</Text>
      </AnimatedPressable>,
    );
    expect(getByText('Tap me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <AnimatedPressable onPress={onPress} testID="btn">
        <Text>Press</Text>
      </AnimatedPressable>,
    );
    fireEvent.press(getByTestId('btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('triggers haptic feedback on press', () => {
    const { getByTestId } = render(
      <AnimatedPressable onPress={() => {}} testID="haptic-btn">
        <Text>Haptic</Text>
      </AnimatedPressable>,
    );
    fireEvent.press(getByTestId('haptic-btn'));
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });

  it('skips haptics when haptic="none"', () => {
    const { getByTestId } = render(
      <AnimatedPressable onPress={() => {}} testID="no-haptic" haptic="none">
        <Text>No haptic</Text>
      </AnimatedPressable>,
    );
    fireEvent.press(getByTestId('no-haptic'));
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });

  it('accepts style prop', () => {
    const { getByTestId } = render(
      <AnimatedPressable testID="styled" style={{ padding: 10 }}>
        <Text>X</Text>
      </AnimatedPressable>,
    );
    expect(getByTestId('styled')).toBeTruthy();
  });

  it('supports disabled state', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <AnimatedPressable onPress={onPress} testID="disabled-btn" disabled>
        <Text>Disabled</Text>
      </AnimatedPressable>,
    );
    fireEvent.press(getByTestId('disabled-btn'));
    // Pressable with disabled doesn't fire onPress
    expect(onPress).not.toHaveBeenCalled();
  });

  it('sets accessibility role', () => {
    const { getByTestId } = render(
      <AnimatedPressable testID="a11y" accessibilityRole="link">
        <Text>Link</Text>
      </AnimatedPressable>,
    );
    expect(getByTestId('a11y').props.accessibilityRole).toBe('link');
  });

  it('passes accessibilityHint through to pressable', () => {
    const { getByTestId } = render(
      <AnimatedPressable
        testID="hint-btn"
        accessibilityLabel="Add to cart"
        accessibilityHint="Adds this item to your shopping cart"
      >
        <Text>Add</Text>
      </AnimatedPressable>,
    );
    expect(getByTestId('hint-btn').props.accessibilityHint).toBe(
      'Adds this item to your shopping cart',
    );
  });
});
