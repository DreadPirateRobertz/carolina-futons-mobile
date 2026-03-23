/**
 * TierUpgradeToast TDD tests — cfutons_mobile-0lt
 *
 * Tests written BEFORE implementation per CLAUDE.md mandate.
 * Shows "You've reached {tier} tier!" when a loyalty tier upgrade fires.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { TierUpgradeToast } from '../TierUpgradeToast';
import { ThemeProvider } from '@/theme/ThemeProvider';

const mockInsets = { bottom: 0, top: 0, left: 0, right: 0 };
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => mockInsets,
}));

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
    withTiming: (val: number) => val,
    withSequence: (...vals: number[]) => vals[vals.length - 1],
    withDelay: (_delay: number, val: number) => val,
  };
});

function renderToast(props: React.ComponentProps<typeof TierUpgradeToast>) {
  return render(
    <ThemeProvider>
      <TierUpgradeToast {...props} />
    </ThemeProvider>,
  );
}

describe('TierUpgradeToast', () => {
  it('renders the tier name in the label', () => {
    const { getByTestId } = renderToast({ tier: 'silver', visible: true });
    expect(getByTestId('tier-upgrade-toast-label').props.children).toContain('silver');
  });

  it('renders for gold tier', () => {
    const { getByTestId } = renderToast({ tier: 'gold', visible: true });
    expect(getByTestId('tier-upgrade-toast-label').props.children).toContain('gold');
  });

  it('is accessible when visible', () => {
    const { getByTestId } = renderToast({ tier: 'silver', visible: true });
    const toast = getByTestId('tier-upgrade-toast');
    expect(toast.props.accessibilityLabel).toMatch(/silver/i);
  });

  it('hides accessibility when not visible', () => {
    const { getByTestId } = renderToast({ tier: 'silver', visible: false });
    const toast = getByTestId('tier-upgrade-toast', { includeHiddenElements: true });
    expect(toast.props.accessibilityElementsHidden).toBe(true);
  });

  it('accepts optional testID override', () => {
    const { getByTestId } = renderToast({ tier: 'gold', visible: true, testID: 'custom-tier' });
    expect(getByTestId('custom-tier')).toBeTruthy();
  });

  it('renders without crashing when not visible', () => {
    expect(() => renderToast({ tier: 'bronze', visible: false })).not.toThrow();
  });

  // ── Safe area insets (hq-gbo6f) ───────────────────────────────────

  afterEach(() => {
    mockInsets.bottom = 0;
  });

  it('adds safe area inset to bottom position (non-zero inset)', () => {
    mockInsets.bottom = 34;
    const { getByTestId } = renderToast({ tier: 'silver', visible: true });
    const toast = getByTestId('tier-upgrade-toast');
    const flatStyle = StyleSheet.flatten(toast.props.style);
    expect(flatStyle.bottom).toBe(134);
  });

  it('uses base bottom (100) when safe area inset is zero', () => {
    mockInsets.bottom = 0;
    const { getByTestId } = renderToast({ tier: 'gold', visible: true });
    const toast = getByTestId('tier-upgrade-toast');
    const flatStyle = StyleSheet.flatten(toast.props.style);
    expect(flatStyle.bottom).toBe(100);
  });
});
