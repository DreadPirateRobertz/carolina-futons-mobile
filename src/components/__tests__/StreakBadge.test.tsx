/**
 * StreakBadge tests — cm-ihz
 *
 * TDD spec for the streak badge component shown on HomeScreen / AccountScreen.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { StreakBadge } from '../StreakBadge';
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderBadge(streak: number, testID?: string, showBaseMultiplier?: boolean) {
  return render(
    <ThemeProvider>
      <StreakBadge streak={streak} testID={testID} showBaseMultiplier={showBaseMultiplier} />
    </ThemeProvider>,
  );
}

describe('StreakBadge', () => {
  // ── Rendering ────────────────────────────────────────────────────

  it('renders the streak badge root', () => {
    const { getByTestId } = renderBadge(3);
    expect(getByTestId('streak-badge')).toBeTruthy();
  });

  it('shows the streak count', () => {
    const { getByText } = renderBadge(5);
    expect(getByText('5')).toBeTruthy();
  });

  it('shows "day streak" label for singular streak', () => {
    const { getByText } = renderBadge(1);
    expect(getByText(/day streak/i)).toBeTruthy();
  });

  it('shows "day streak" label for plural streak', () => {
    const { getByText } = renderBadge(7);
    expect(getByText(/day streak/i)).toBeTruthy();
  });

  it('shows fire emoji', () => {
    const { getByText } = renderBadge(3);
    expect(getByText(/🔥/)).toBeTruthy();
  });

  // ── Accessibility ─────────────────────────────────────────────────

  it('has accessible label describing the streak', () => {
    const { getByTestId } = renderBadge(4);
    const badge = getByTestId('streak-badge');
    expect(badge.props.accessibilityLabel).toMatch(/4.+day streak/i);
  });

  // ── testID override ───────────────────────────────────────────────

  it('uses custom testID when provided', () => {
    const { getByTestId } = renderBadge(2, 'my-streak');
    expect(getByTestId('my-streak')).toBeTruthy();
  });

  // ── Edge Cases ───────────────────────────────────────────────────

  it('renders with streak of 0', () => {
    const { getByTestId } = renderBadge(0);
    expect(getByTestId('streak-badge')).toBeTruthy();
  });

  it('renders with large streak (365)', () => {
    const { getByText } = renderBadge(365);
    expect(getByText(/365/)).toBeTruthy();
  });

  // ── Streak Multiplier (cm-7i1y0) ───────────────────────────────

  it('shows multiplier chip when streak >= 3 days', () => {
    const { getByTestId } = renderBadge(3);
    expect(getByTestId('streak-multiplier')).toBeTruthy();
  });

  it('shows "1.5×" multiplier for 3-day streak', () => {
    const { getByText } = renderBadge(3);
    expect(getByText(/1\.5×/)).toBeTruthy();
  });

  it('shows "2×" multiplier for 7-day streak', () => {
    const { getByText } = renderBadge(7);
    expect(getByText(/2×/)).toBeTruthy();
  });

  it('does NOT show multiplier chip when streak < 3 days', () => {
    const { queryByTestId } = renderBadge(2);
    expect(queryByTestId('streak-multiplier')).toBeNull();
  });

  it('includes multiplier in accessibility label when active', () => {
    const { getByTestId } = renderBadge(7);
    const badge = getByTestId('streak-badge');
    expect(badge.props.accessibilityLabel).toMatch(/2×.*points/);
  });

  // ── showBaseMultiplier prop (hq-paclo) ────────────────────────────

  it('shows "1×" chip when showBaseMultiplier=true and streak < 3', () => {
    const { getByTestId } = renderBadge(2, undefined, true);
    expect(getByTestId('streak-multiplier')).toBeTruthy();
  });

  it('shows "1×" text when showBaseMultiplier=true and streak = 0', () => {
    const { getByText } = renderBadge(0, undefined, true);
    expect(getByText('1×')).toBeTruthy();
  });

  it('still hides multiplier chip for base streak without showBaseMultiplier', () => {
    const { queryByTestId } = renderBadge(2);
    expect(queryByTestId('streak-multiplier')).toBeNull();
  });

  it('includes 1× in accessibility label when showBaseMultiplier=true', () => {
    const { getByTestId } = renderBadge(1, undefined, true);
    const badge = getByTestId('streak-badge');
    expect(badge.props.accessibilityLabel).toMatch(/1×.*points/);
  });
});
