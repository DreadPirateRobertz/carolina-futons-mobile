/**
 * AccountGamificationHeader edge-case tests — cm-ajd
 *
 * Deeper coverage for the gamification summary surface: a11y label
 * composition, activeOpacity/role/hint behavior with and without onPress,
 * points formatting at boundaries, and streak=0 base-multiplier.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { AccountGamificationHeader } from '../AccountGamificationHeader';
import { ThemeProvider } from '@/theme/ThemeProvider';

import { useLoyalty } from '@/hooks/useLoyalty';
import { useStreak } from '@/hooks/useStreak';

jest.mock('@/hooks/useLoyalty', () => ({ useLoyalty: jest.fn() }));
jest.mock('@/hooks/useStreak', () => ({ useStreak: jest.fn() }));

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

const mockUseLoyalty = useLoyalty as jest.Mock;
const mockUseStreak = useStreak as jest.Mock;

function defaultLoyalty(overrides = {}) {
  return {
    points: 750,
    tier: 'silver',
    nextTier: 'gold',
    pointsToNext: 750,
    progress: 0.25,
    loading: false,
    error: null,
    refreshPoints: jest.fn(),
    ...overrides,
  };
}

function renderWidget(onPress?: () => void) {
  return render(
    <ThemeProvider>
      <AccountGamificationHeader onPress={onPress} testID="gam-header" />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  mockUseLoyalty.mockReturnValue(defaultLoyalty());
  mockUseStreak.mockReturnValue({ streak: 5, loading: false });
});

// ── Accessibility label composition ──────────────────────────────────────────

describe('a11y label — composition', () => {
  it('includes tier, points, and streak in label', () => {
    mockUseLoyalty.mockReturnValue(defaultLoyalty({ points: 1500, tier: 'gold' }));
    mockUseStreak.mockReturnValue({ streak: 7, loading: false });
    const { getByTestId } = renderWidget();
    const label = getByTestId('gam-header').props.accessibilityLabel as string;
    expect(label).toContain('gold');
    expect(label).toContain('1,500');
    expect(label).toContain('7 day streak');
  });

  it('includes multiplier chip in label when streak >= 3', () => {
    mockUseStreak.mockReturnValue({ streak: 5, loading: false });
    const { getByTestId } = renderWidget();
    const label = getByTestId('gam-header').props.accessibilityLabel as string;
    expect(label).toMatch(/1\.5× points/);
  });

  it('omits multiplier chip from label when streak < 3 (base multiplier)', () => {
    mockUseStreak.mockReturnValue({ streak: 2, loading: false });
    const { getByTestId } = renderWidget();
    const label = getByTestId('gam-header').props.accessibilityLabel as string;
    expect(label).not.toMatch(/×/);
  });

  it('shows "Loading" label while loyalty is loading', () => {
    mockUseLoyalty.mockReturnValue(defaultLoyalty({ loading: true }));
    const { getByTestId } = renderWidget();
    expect(getByTestId('gam-header').props.accessibilityLabel).toBe('Loading gamification status');
  });
});

// ── Interaction affordances ──────────────────────────────────────────────────

describe('interaction affordances', () => {
  it('accessibilityRole is "text" when onPress is not provided', () => {
    const { getByTestId } = renderWidget();
    expect(getByTestId('gam-header').props.accessibilityRole).toBe('text');
  });

  it('accessibilityHint is set when onPress is provided', () => {
    const { getByTestId } = renderWidget(jest.fn());
    expect(getByTestId('gam-header').props.accessibilityHint).toBe('Opens loyalty rewards details');
  });

  it('accessibilityHint is undefined when onPress is not provided', () => {
    const { getByTestId } = renderWidget();
    expect(getByTestId('gam-header').props.accessibilityHint).toBeUndefined();
  });
});

// ── Points formatting boundaries ─────────────────────────────────────────────

describe('points formatting', () => {
  it('formats 1,000,000 pts with commas', () => {
    mockUseLoyalty.mockReturnValue(defaultLoyalty({ points: 1_000_000 }));
    const { getByTestId } = renderWidget();
    const label = getByTestId('gam-header').props.accessibilityLabel as string;
    expect(label).toContain('1,000,000');
  });

  it('shows 0 points without a NaN or negative value', () => {
    mockUseLoyalty.mockReturnValue(defaultLoyalty({ points: 0 }));
    const { getByTestId } = renderWidget();
    const label = getByTestId('gam-header').props.accessibilityLabel as string;
    expect(label).toContain('0 points');
  });
});

// ── Streak boundary ──────────────────────────────────────────────────────────

describe('streak boundaries', () => {
  it('renders base 1× multiplier chip at streak=0 (showBaseMultiplier forces it)', () => {
    mockUseStreak.mockReturnValue({ streak: 0, loading: false });
    const { getByTestId } = renderWidget();
    expect(getByTestId('streak-multiplier').props.children).toEqual([1, '×']);
  });

  it('renders base 1× multiplier chip at streak=2 (below bonus threshold)', () => {
    mockUseStreak.mockReturnValue({ streak: 2, loading: false });
    const { getByTestId } = renderWidget();
    expect(getByTestId('streak-multiplier').props.children).toEqual([1, '×']);
  });

  it('renders 1.5× multiplier chip at streak=3 (first bonus threshold)', () => {
    mockUseStreak.mockReturnValue({ streak: 3, loading: false });
    const { getByTestId } = renderWidget();
    expect(getByTestId('streak-multiplier').props.children).toEqual([1.5, '×']);
  });

  it('renders 2× multiplier chip at streak=7 (top tier)', () => {
    mockUseStreak.mockReturnValue({ streak: 7, loading: false });
    const { getByTestId } = renderWidget();
    expect(getByTestId('streak-multiplier').props.children).toEqual([2, '×']);
    const label = getByTestId('gam-header').props.accessibilityLabel as string;
    expect(label).toMatch(/2× points/);
  });
});
