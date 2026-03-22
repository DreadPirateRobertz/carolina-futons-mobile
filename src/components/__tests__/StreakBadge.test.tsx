/**
 * StreakBadge tests — cm-ihz
 *
 * TDD spec for the streak badge component shown on HomeScreen / AccountScreen.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { StreakBadge } from '../StreakBadge';
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderBadge(streak: number, testID?: string) {
  return render(
    <ThemeProvider>
      <StreakBadge streak={streak} testID={testID} />
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
    expect(getByText(/5/)).toBeTruthy();
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
});
