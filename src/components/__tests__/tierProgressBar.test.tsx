/**
 * TierProgressBar tests — cm-ihz
 *
 * TDD spec for the animated tier progress bar shown on AccountScreen (ProfileScreen).
 * Shows progress from current tier toward next tier (Bronze→Silver→Gold).
 */

import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { render } from '@testing-library/react-native';
import { TierProgressBar } from '../TierProgressBar';
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
  };
});

function renderBar(points: number, testID?: string) {
  return render(
    <ThemeProvider>
      <TierProgressBar points={points} testID={testID} />
    </ThemeProvider>,
  );
}

describe('TierProgressBar', () => {
  // ── Rendering ─────────────────────────────────────────────────────

  it('renders the progress bar root', () => {
    const { getByTestId } = renderBar(200);
    expect(getByTestId('tier-progress-bar')).toBeTruthy();
  });

  it('renders the track', () => {
    const { getByTestId } = renderBar(200);
    expect(getByTestId('tier-progress-track')).toBeTruthy();
  });

  it('renders the fill', () => {
    const { getByTestId } = renderBar(200);
    expect(getByTestId('tier-progress-fill')).toBeTruthy();
  });

  // ── Tier label ────────────────────────────────────────────────────

  it('shows Trail Blazer label for 0 points', () => {
    const { getByText } = renderBar(0);
    expect(getByText(/Trail Blazer/i)).toBeTruthy();
  });

  it('shows Mountain Guide label for 500+ points', () => {
    const { getByText } = renderBar(500);
    expect(getByText(/Mountain Guide/i)).toBeTruthy();
  });

  it('shows Summit Master label for 1500+ points', () => {
    const { getByText } = renderBar(1500);
    expect(getByText(/Summit Master/i)).toBeTruthy();
  });

  it('shows next tier label when not at max tier', () => {
    // At 200 pts (Trail Blazer), next tier is Mountain Guide at 500
    const { getByText } = renderBar(200);
    expect(getByText(/Mountain Guide/i)).toBeTruthy();
  });

  it('shows points remaining to next tier', () => {
    // At 200 pts (Trail Blazer), 300 more needed for Mountain Guide
    const { getByText } = renderBar(200);
    expect(getByText(/300/)).toBeTruthy();
  });

  it('shows Blue Ridge Legend label at max tier (3000+)', () => {
    const { getByText } = renderBar(3000);
    expect(getByText(/Blue Ridge Legend/i)).toBeTruthy();
  });

  // ── Accessibility ─────────────────────────────────────────────────

  it('has accessible label describing tier progress', () => {
    const { getByTestId } = renderBar(200);
    const bar = getByTestId('tier-progress-bar');
    expect(bar.props.accessibilityLabel).toBeTruthy();
  });

  // ── testID override ───────────────────────────────────────────────

  it('uses custom testID when provided', () => {
    const { getByTestId } = renderBar(100, 'my-bar');
    expect(getByTestId('my-bar')).toBeTruthy();
  });

  // ── Edge cases ────────────────────────────────────────────────────

  it('renders with exactly 0 points', () => {
    const { getByTestId } = renderBar(0);
    expect(getByTestId('tier-progress-bar')).toBeTruthy();
  });

  it('renders at exact tier threshold (500)', () => {
    const { getByTestId } = renderBar(500);
    expect(getByTestId('tier-progress-bar')).toBeTruthy();
  });

  it('renders at max tier (5000+)', () => {
    const { getByTestId } = renderBar(5000);
    expect(getByTestId('tier-progress-bar')).toBeTruthy();
  });

  // cm-jest-coverage: hit getCurrentTier fallback (line 37) with negative points
  it('renders without crash when points is negative (getCurrentTier fallback)', () => {
    const { getByTestId } = renderBar(-1);
    expect(getByTestId('tier-progress-bar')).toBeTruthy();
  });

  // cm-jest-coverage: reducedMotion === true branch in animation effect (line 66)
  it('renders without crash when reduced motion is enabled (zero-duration animation)', () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    expect(() => renderBar(200)).not.toThrow();
    jest.restoreAllMocks();
  });
});
