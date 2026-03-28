/**
 * AccountGamificationHeader tests — hq-u6i9c
 *
 * TDD spec for the consolidated gamification summary widget shown at the top
 * of AccountScreen when authenticated. Renders tier badge, points, streak +
 * multiplier, and next-tier progress bar.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AccountGamificationHeader } from '../AccountGamificationHeader';
import { ThemeProvider } from '@/theme/ThemeProvider';

import { useLoyalty } from '@/hooks/useLoyalty';
import { useStreak } from '@/hooks/useStreak';

// ── Mock hooks ────────────────────────────────────────────────────────────────

jest.mock('@/hooks/useLoyalty', () => ({
  useLoyalty: jest.fn(),
}));

jest.mock('@/hooks/useStreak', () => ({
  useStreak: jest.fn(),
}));

// Mock reanimated for TierProgressBar inside the widget
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
    tier: 'silver' as const,
    nextTier: 'gold' as const,
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

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('rendering', () => {
  it('renders the root container', () => {
    const { getByTestId } = renderWidget();
    expect(getByTestId('gam-header')).toBeTruthy();
  });

  it('renders the loyalty tier badge', () => {
    const { getByTestId } = renderWidget();
    expect(getByTestId('loyalty-tier-badge')).toBeTruthy();
  });

  it('renders the streak badge', () => {
    const { getByTestId } = renderWidget();
    expect(getByTestId('streak-badge')).toBeTruthy();
  });

  it('renders the tier progress bar', () => {
    const { getByTestId } = renderWidget();
    expect(getByTestId('tier-progress-bar')).toBeTruthy();
  });

  it('renders with default testID when not provided', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <AccountGamificationHeader />
      </ThemeProvider>,
    );
    expect(getByTestId('account-gamification-header')).toBeTruthy();
  });
});

// ── Points display ────────────────────────────────────────────────────────────

describe('points display', () => {
  it('shows the correct points total', () => {
    mockUseLoyalty.mockReturnValue(defaultLoyalty({ points: 1234 }));
    const { getByText } = renderWidget();
    expect(getByText('1,234 pts')).toBeTruthy();
  });

  it('shows 0 points when account is empty', () => {
    mockUseLoyalty.mockReturnValue(defaultLoyalty({ points: 0 }));
    const { getByText } = renderWidget();
    expect(getByText('0 pts')).toBeTruthy();
  });
});

// ── Tier display ──────────────────────────────────────────────────────────────

describe('tier display', () => {
  it('shows Trail Blazer (lowest) tier name at 0 pts', () => {
    mockUseLoyalty.mockReturnValue(defaultLoyalty({ points: 100, tier: 'bronze' }));
    const { getByTestId } = renderWidget();
    expect(getByTestId('loyalty-tier-name').props.children).toMatch(/trail blazer/i);
  });

  it('shows Mountain Guide tier name at 750 pts', () => {
    mockUseLoyalty.mockReturnValue(defaultLoyalty({ points: 750, tier: 'silver' }));
    const { getByTestId } = renderWidget();
    expect(getByTestId('loyalty-tier-name').props.children).toMatch(/mountain guide/i);
  });

  it('shows Summit Master tier name at 2000 pts', () => {
    mockUseLoyalty.mockReturnValue(defaultLoyalty({ points: 2000, tier: 'gold' }));
    const { getByTestId } = renderWidget();
    expect(getByTestId('loyalty-tier-name').props.children).toMatch(/summit master/i);
  });
});

// ── Streak + multiplier ───────────────────────────────────────────────────────

describe('streak + multiplier', () => {
  it('shows the streak count', () => {
    mockUseStreak.mockReturnValue({ streak: 8, loading: false });
    const { getByTestId } = renderWidget();
    const badge = getByTestId('streak-badge');
    expect(badge).toBeTruthy();
  });

  it('shows streak multiplier chip when streak >= 3', () => {
    mockUseStreak.mockReturnValue({ streak: 5, loading: false });
    const { getByTestId } = renderWidget();
    expect(getByTestId('streak-multiplier')).toBeTruthy();
  });

  it('does not render streak badge while streak is loading', () => {
    mockUseStreak.mockReturnValue({ streak: 0, loading: true });
    const { queryByTestId } = renderWidget();
    expect(queryByTestId('streak-badge')).toBeNull();
  });
});

// ── Loading state ─────────────────────────────────────────────────────────────

describe('loading state', () => {
  it('renders a loading placeholder when loyalty is loading', () => {
    mockUseLoyalty.mockReturnValue(defaultLoyalty({ loading: true }));
    const { getByTestId } = renderWidget();
    expect(getByTestId('gam-header-loading')).toBeTruthy();
  });

  it('does not render tier badge while loading', () => {
    mockUseLoyalty.mockReturnValue(defaultLoyalty({ loading: true }));
    const { queryByTestId } = renderWidget();
    expect(queryByTestId('loyalty-tier-badge')).toBeNull();
  });
});

// ── Error state ───────────────────────────────────────────────────────────────

describe('error state', () => {
  it('renders normally (falls back to defaults) when loyalty errors', () => {
    mockUseLoyalty.mockReturnValue(
      defaultLoyalty({ points: 0, tier: 'bronze', loading: false, error: 'Network error' }),
    );
    const { getByTestId } = renderWidget();
    expect(getByTestId('loyalty-tier-badge')).toBeTruthy();
  });
});

// ── Tap to navigate ───────────────────────────────────────────────────────────

describe('tap to navigate', () => {
  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderWidget(onPress);
    fireEvent.press(getByTestId('gam-header'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not throw when onPress is not provided', () => {
    const { getByTestId } = renderWidget();
    expect(() => fireEvent.press(getByTestId('gam-header'))).not.toThrow();
  });
});

// ── Accessibility ─────────────────────────────────────────────────────────────

describe('accessibility', () => {
  it('has an accessibility label describing gamification status', () => {
    const { getByTestId } = renderWidget();
    const root = getByTestId('gam-header');
    expect(root.props.accessibilityLabel).toBeTruthy();
  });

  it('has accessibilityRole of button when onPress provided', () => {
    const { getByTestId } = renderWidget(jest.fn());
    const root = getByTestId('gam-header');
    expect(root.props.accessibilityRole).toBe('button');
  });
});
