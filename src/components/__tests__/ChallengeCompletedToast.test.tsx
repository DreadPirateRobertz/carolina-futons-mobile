/**
 * ChallengeCompletedToast tests — hq-myhj5
 *
 * TDD spec for the animated challenge completion toast.
 * Shows challenge title + "+N pts earned" when a challenge is completed.
 */

import React from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { ChallengeCompletedToast } from '../ChallengeCompletedToast';
import { ThemeProvider } from '@/theme/ThemeProvider';

const mockInsets = { bottom: 0, top: 0, left: 0, right: 0 };
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => mockInsets,
}));

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

function renderToast(props: {
  title: string;
  rewardPoints: number;
  visible: boolean;
  testID?: string;
}) {
  return render(
    <ThemeProvider>
      <ChallengeCompletedToast {...props} />
    </ThemeProvider>,
  );
}

const BASE = { title: 'Spring Refresh', rewardPoints: 500, visible: true };

describe('ChallengeCompletedToast', () => {
  // ── Rendering ──────────────────────────────────────────────────────

  it('renders root element when visible', () => {
    const { getByTestId } = renderToast(BASE);
    expect(getByTestId('challenge-completed-toast')).toBeTruthy();
  });

  it('shows the challenge title', () => {
    const { getByText } = renderToast(BASE);
    expect(getByText(/Spring Refresh/)).toBeTruthy();
  });

  it('shows the rewardPoints with "+" prefix', () => {
    const { getByText } = renderToast(BASE);
    expect(getByText(/\+500/)).toBeTruthy();
  });

  it('shows "pts earned" label', () => {
    const { getByText } = renderToast(BASE);
    expect(getByText(/pts earned/i)).toBeTruthy();
  });

  // ── Hidden state ──────────────────────────────────────────────────

  it('renders root element even when not visible (for animation continuity)', () => {
    const { getByTestId } = renderToast({ ...BASE, visible: false });
    expect(getByTestId('challenge-completed-toast', { includeHiddenElements: true })).toBeTruthy();
  });

  // ── Accessibility ──────────────────────────────────────────────────

  it('has accessible label containing the title', () => {
    const { getByTestId } = renderToast(BASE);
    const toast = getByTestId('challenge-completed-toast');
    expect(toast.props.accessibilityLabel).toMatch(/Spring Refresh/);
  });

  it('has accessible label containing the reward points', () => {
    const { getByTestId } = renderToast(BASE);
    const toast = getByTestId('challenge-completed-toast');
    expect(toast.props.accessibilityLabel).toMatch(/500/);
  });

  it('is hidden from accessibility when not visible', () => {
    const { getByTestId } = renderToast({ ...BASE, visible: false });
    const toast = getByTestId('challenge-completed-toast', { includeHiddenElements: true });
    expect(toast.props.accessibilityElementsHidden).toBe(true);
  });

  it('is accessible when visible', () => {
    const { getByTestId } = renderToast(BASE);
    const toast = getByTestId('challenge-completed-toast');
    expect(toast.props.accessibilityElementsHidden).toBe(false);
  });

  // ── testID override ────────────────────────────────────────────────

  it('uses custom testID when provided', () => {
    const { getByTestId } = renderToast({ ...BASE, testID: 'my-challenge-toast' });
    expect(getByTestId('my-challenge-toast')).toBeTruthy();
  });

  // ── Edge cases ────────────────────────────────────────────────────

  it('renders with 0 rewardPoints', () => {
    const { getByTestId } = renderToast({ ...BASE, rewardPoints: 0 });
    expect(getByTestId('challenge-completed-toast')).toBeTruthy();
  });

  it('renders with large rewardPoints (10000)', () => {
    const { getByText } = renderToast({ ...BASE, rewardPoints: 10000 });
    expect(getByText(/\+10000/)).toBeTruthy();
  });

  it('renders with a long challenge title without crashing', () => {
    const longTitle = 'A'.repeat(80);
    expect(() => renderToast({ ...BASE, title: longTitle })).not.toThrow();
  });

  it('renders without crash when reduced motion is enabled', () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    expect(() => renderToast(BASE)).not.toThrow();
    jest.restoreAllMocks();
  });

  // ── Safe area insets (hq-gbo6f) ───────────────────────────────────

  afterEach(() => {
    mockInsets.bottom = 0;
  });

  it('adds safe area inset to bottom position (non-zero inset)', () => {
    mockInsets.bottom = 34;
    const { getByTestId } = renderToast(BASE);
    const toast = getByTestId('challenge-completed-toast');
    const flatStyle = StyleSheet.flatten(toast.props.style);
    expect(flatStyle.bottom).toBe(134);
  });

  it('uses base bottom (100) when safe area inset is zero', () => {
    mockInsets.bottom = 0;
    const { getByTestId } = renderToast(BASE);
    const toast = getByTestId('challenge-completed-toast');
    const flatStyle = StyleSheet.flatten(toast.props.style);
    expect(flatStyle.bottom).toBe(100);
  });
});
