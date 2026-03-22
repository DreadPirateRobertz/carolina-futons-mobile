/**
 * PointsToast tests — cm-ihz
 *
 * TDD spec for the animated "+N points earned" toast on OrderConfirmationScreen.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { PointsToast } from '../PointsToast';
import { ThemeProvider } from '@/theme/ThemeProvider';

// Mock reanimated — animation mechanics not under test
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
    runOnJS: (fn: (...args: unknown[]) => void) => fn,
  };
});

function renderToast(props: { points: number; visible: boolean; testID?: string }) {
  return render(
    <ThemeProvider>
      <PointsToast {...props} />
    </ThemeProvider>,
  );
}

describe('PointsToast', () => {
  // ── Rendering when visible ────────────────────────────────────────

  it('renders root element when visible', () => {
    const { getByTestId } = renderToast({ points: 100, visible: true });
    expect(getByTestId('points-toast')).toBeTruthy();
  });

  it('shows the points amount', () => {
    const { getByText } = renderToast({ points: 250, visible: true });
    expect(getByText(/\+250/)).toBeTruthy();
  });

  it('shows "points earned" label', () => {
    const { getByText } = renderToast({ points: 100, visible: true });
    expect(getByText(/points earned/i)).toBeTruthy();
  });

  // ── Hidden state ─────────────────────────────────────────────────

  it('renders root element even when not visible (for animation)', () => {
    const { getByTestId } = renderToast({ points: 100, visible: false });
    expect(getByTestId('points-toast', { includeHiddenElements: true })).toBeTruthy();
  });

  // ── Accessibility ─────────────────────────────────────────────────

  it('has accessible label with point count', () => {
    const { getByTestId } = renderToast({ points: 500, visible: true });
    const toast = getByTestId('points-toast');
    expect(toast.props.accessibilityLabel).toMatch(/500.*points/i);
  });

  it('is hidden from accessibility when not visible', () => {
    const { getByTestId } = renderToast({ points: 100, visible: false });
    const toast = getByTestId('points-toast', { includeHiddenElements: true });
    expect(toast.props.accessibilityElementsHidden).toBe(true);
  });

  // ── testID override ───────────────────────────────────────────────

  it('uses custom testID when provided', () => {
    const { getByTestId } = renderToast({ points: 50, visible: true, testID: 'my-toast' });
    expect(getByTestId('my-toast')).toBeTruthy();
  });

  // ── Edge cases ────────────────────────────────────────────────────

  it('renders with 0 points', () => {
    const { getByTestId } = renderToast({ points: 0, visible: true });
    expect(getByTestId('points-toast')).toBeTruthy();
  });

  it('renders with large point value (10000)', () => {
    const { getByText } = renderToast({ points: 10000, visible: true });
    expect(getByText(/\+10000/)).toBeTruthy();
  });
});
