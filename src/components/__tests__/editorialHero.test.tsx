import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { EditorialHero } from '../EditorialHero';
import { ThemeProvider } from '@/theme';

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
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
    FadeInDown: {
      delay: () => ({ duration: () => ({ springify: () => undefined }) }),
    },
  };
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider initialColorMode="dark">{children}</ThemeProvider>
);

describe('EditorialHero', () => {
  it('renders title and subtitle', () => {
    const { getByText } = render(
      <EditorialHero
        title="Carolina Futons"
        subtitle="Handcrafted comfort"
        ctaLabel="View in Your Room"
        onCtaPress={() => {}}
      />,
      { wrapper },
    );
    expect(getByText('Carolina Futons')).toBeTruthy();
    expect(getByText('Handcrafted comfort')).toBeTruthy();
  });

  it('renders CTA button with label', () => {
    const { getByText } = render(
      <EditorialHero
        title="Carolina Futons"
        subtitle="Handcrafted comfort"
        ctaLabel="View in Your Room"
        onCtaPress={() => {}}
      />,
      { wrapper },
    );
    expect(getByText('View in Your Room')).toBeTruthy();
  });

  it('calls onCtaPress when CTA is pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <EditorialHero
        title="Carolina Futons"
        subtitle="Handcrafted comfort"
        ctaLabel="View in Your Room"
        onCtaPress={onPress}
      />,
      { wrapper },
    );
    fireEvent.press(getByTestId('editorial-hero-cta'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders with testID', () => {
    const { getByTestId } = render(
      <EditorialHero
        title="Test"
        subtitle="Sub"
        ctaLabel="CTA"
        onCtaPress={() => {}}
        testID="hero"
      />,
      { wrapper },
    );
    expect(getByTestId('hero')).toBeTruthy();
  });

  it('renders without CTA when ctaLabel is omitted', () => {
    const { getByText, queryByTestId } = render(
      <EditorialHero title="Title Only" subtitle="Subtitle" />,
      { wrapper },
    );
    expect(getByText('Title Only')).toBeTruthy();
    expect(queryByTestId('editorial-hero-cta')).toBeNull();
  });
});
