/**
 * AvatarDisplay tests — cf-ymo
 *
 * TDD spec for the chibi bear avatar component.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { AvatarDisplay } from '../AvatarDisplay';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { LOYALTY_TIERS } from '@/data/loyaltyTiers';

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (c: React.ComponentType) => c,
    },
    useSharedValue: (init: number) => ({ value: init }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withSpring: (val: number) => val,
    withSequence: (...vals: number[]) => vals[vals.length - 1],
  };
});

function renderAvatar(props: React.ComponentProps<typeof AvatarDisplay> = {}) {
  return render(
    <ThemeProvider>
      <AvatarDisplay {...props} />
    </ThemeProvider>,
  );
}

describe('AvatarDisplay', () => {
  it('renders root element with default testID', () => {
    const { getByTestId } = renderAvatar();
    expect(getByTestId('avatar-display')).toBeTruthy();
  });

  it('accepts custom testID', () => {
    const { getByTestId } = renderAvatar({ testID: 'my-avatar' });
    expect(getByTestId('my-avatar')).toBeTruthy();
  });

  // ── Sizes ─────────────────────────────────────────────────────────

  it('renders at sm size (32px)', () => {
    const { getByTestId } = renderAvatar({ size: 'sm' });
    const el = getByTestId('avatar-display');
    expect(StyleSheet.flatten(el.props.style)).toEqual(
      expect.objectContaining({ width: 32, height: 32 }),
    );
  });

  it('renders at md size (64px) by default', () => {
    const { getByTestId } = renderAvatar();
    const el = getByTestId('avatar-display');
    expect(StyleSheet.flatten(el.props.style)).toEqual(
      expect.objectContaining({ width: 64, height: 64 }),
    );
  });

  it('renders at md size (64px) when explicitly set', () => {
    const { getByTestId } = renderAvatar({ size: 'md' });
    const el = getByTestId('avatar-display');
    expect(StyleSheet.flatten(el.props.style)).toEqual(
      expect.objectContaining({ width: 64, height: 64 }),
    );
  });

  it('renders at lg size (128px)', () => {
    const { getByTestId } = renderAvatar({ size: 'lg' });
    const el = getByTestId('avatar-display');
    expect(StyleSheet.flatten(el.props.style)).toEqual(
      expect.objectContaining({ width: 128, height: 128 }),
    );
  });

  // ── Bear placeholder ───────────────────────────────────────────────

  it('shows bear emoji placeholder', () => {
    const { getByText } = renderAvatar();
    expect(getByText('🐻')).toBeTruthy();
  });

  // ── Accessory ─────────────────────────────────────────────────────

  it('shows equipped accessory emoji when provided', () => {
    const { getByTestId } = renderAvatar({ equippedAccessoryId: 'hat-crown' });
    expect(getByTestId('avatar-accessory')).toBeTruthy();
  });

  it('does not show accessory element when no accessory equipped', () => {
    const { queryByTestId } = renderAvatar({ equippedAccessoryId: null });
    expect(queryByTestId('avatar-accessory')).toBeNull();
  });

  // ── Accessibility ──────────────────────────────────────────────────

  it('has accessibilityRole of image', () => {
    const { getByTestId } = renderAvatar();
    expect(getByTestId('avatar-display').props.accessibilityRole).toBe('image');
  });

  it('renders without crashing for all tier values', () => {
    expect(() => renderAvatar({ tier: LOYALTY_TIERS[0] })).not.toThrow();
    expect(() => renderAvatar({ tier: LOYALTY_TIERS[1] })).not.toThrow();
    expect(() => renderAvatar({ tier: LOYALTY_TIERS[2] })).not.toThrow();
    expect(() => renderAvatar({ tier: LOYALTY_TIERS[3] })).not.toThrow();
  });
});
