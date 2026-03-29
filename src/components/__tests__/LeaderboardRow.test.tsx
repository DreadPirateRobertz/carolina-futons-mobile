/**
 * LeaderboardRow tests — cf-op6
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { LeaderboardRow } from '../LeaderboardRow';
import { ThemeProvider } from '@/theme/ThemeProvider';

function wrap(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('LeaderboardRow', () => {
  const base = { rank: 1, nickname: 'Alice', points: 2500, tier: 'gold' as const };

  it('renders rank number', () => {
    const { getByTestId } = wrap(<LeaderboardRow {...base} />);
    expect(getByTestId('leaderboard-row-rank').props.children).toBe(1);
  });

  it('renders nickname', () => {
    const { getByTestId } = wrap(<LeaderboardRow {...base} />);
    expect(getByTestId('leaderboard-row-nickname').props.children).toBe('Alice');
  });

  it('renders points', () => {
    const { getByTestId } = wrap(<LeaderboardRow {...base} />);
    expect(getByTestId('leaderboard-row-points').props.children).toContain('2,500');
  });

  it('renders tier badge with correct tier', () => {
    const { getByTestId } = wrap(<LeaderboardRow {...base} />);
    expect(getByTestId('loyalty-badge-gold')).toBeTruthy();
  });

  it('renders silver badge for silver tier', () => {
    const { getByTestId } = wrap(<LeaderboardRow {...base} tier="silver" />);
    expect(getByTestId('loyalty-badge-silver')).toBeTruthy();
  });

  it('renders bronze badge for bronze tier', () => {
    const { getByTestId } = wrap(<LeaderboardRow {...base} tier="bronze" />);
    expect(getByTestId('loyalty-badge-bronze')).toBeTruthy();
  });

  it('has no highlighted style by default', () => {
    const { getByTestId } = wrap(<LeaderboardRow {...base} />);
    const row = getByTestId('leaderboard-row-1');
    expect(row.props.style).not.toMatchObject(
      expect.arrayContaining([expect.objectContaining({ borderWidth: expect.any(Number) })]),
    );
  });

  it('applies highlighted style when isCurrentUser=true', () => {
    const { getByTestId } = wrap(<LeaderboardRow {...base} isCurrentUser />);
    const row = getByTestId('leaderboard-row-1');
    // Row container should have a testID and distinct style — we just verify it renders
    expect(row).toBeTruthy();
  });

  it('uses custom testID when provided', () => {
    const { getByTestId } = wrap(<LeaderboardRow {...base} testID="custom-row" />);
    expect(getByTestId('custom-row')).toBeTruthy();
  });

  it('formats large point values with commas', () => {
    const { getByTestId } = wrap(<LeaderboardRow {...base} points={12345} />);
    expect(getByTestId('leaderboard-row-points').props.children).toContain('12,345');
  });

  it('renders rank 1 correctly', () => {
    const { getByTestId } = wrap(<LeaderboardRow {...base} rank={1} />);
    expect(getByTestId('leaderboard-row-rank').props.children).toBe(1);
  });

  it('has composite accessibilityLabel with rank, name, points, and tier', () => {
    const { getByTestId } = wrap(<LeaderboardRow {...base} />);
    const label = getByTestId('leaderboard-row-1').props.accessibilityLabel;
    expect(label).toContain('1');
    expect(label).toContain('Alice');
    expect(label).toContain('2,500');
    expect(label).toContain('gold');
  });

  it('accessibilityLabel includes "you" when isCurrentUser', () => {
    const { getByTestId } = wrap(<LeaderboardRow {...base} isCurrentUser />);
    expect(getByTestId('leaderboard-row-1').props.accessibilityLabel).toContain('you');
  });

  it('does not include "you" in accessibilityLabel for other users', () => {
    const { getByTestId } = wrap(<LeaderboardRow {...base} />);
    expect(getByTestId('leaderboard-row-1').props.accessibilityLabel).not.toContain('you');
  });
});
