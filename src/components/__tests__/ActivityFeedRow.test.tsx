/**
 * ActivityFeedRow tests — cf-2h8
 *
 * TDD spec for the row component used in the Activity Feed.
 * Renders event type icon, description, +points badge, and relative date.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { ActivityFeedRow } from '../ActivityFeedRow';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { ActivityEvent } from '@/hooks/useActivityFeed';

function renderRow(event: ActivityEvent) {
  return render(
    <ThemeProvider>
      <ActivityFeedRow event={event} />
    </ThemeProvider>,
  );
}

const BASE: ActivityEvent = {
  id: 'e1',
  type: 'purchase',
  description: 'Ordered Blue Ridge Sectional',
  points: 250,
  earnedAt: '2026-03-20T14:00:00Z',
};

describe('ActivityFeedRow', () => {
  // ── testID ────────────────────────────────────────────────────────────────

  it('has testID activity-feed-row-{id}', () => {
    const { getByTestId } = renderRow(BASE);
    expect(getByTestId('activity-feed-row-e1')).toBeTruthy();
  });

  // ── Description ──────────────────────────────────────────────────────────

  it('renders event description', () => {
    const { getByText } = renderRow(BASE);
    expect(getByText('Ordered Blue Ridge Sectional')).toBeTruthy();
  });

  // ── Points ───────────────────────────────────────────────────────────────

  it('renders points as "+250 pts"', () => {
    const { getByText } = renderRow(BASE);
    expect(getByText('+250 pts')).toBeTruthy();
  });

  it('renders points badge with testID activity-feed-points-{id}', () => {
    const { getByTestId } = renderRow(BASE);
    expect(getByTestId('activity-feed-points-e1')).toBeTruthy();
  });

  // ── Icons ────────────────────────────────────────────────────────────────

  it('renders purchase icon', () => {
    const { getByTestId } = renderRow({ ...BASE, type: 'purchase' });
    expect(getByTestId('activity-feed-icon-e1')).toBeTruthy();
  });

  it('renders review icon for review type', () => {
    const { getByTestId } = renderRow({ ...BASE, type: 'review', id: 'e-rev' });
    expect(getByTestId('activity-feed-icon-e-rev')).toBeTruthy();
  });

  it('renders streak icon for streak_milestone type', () => {
    const { getByTestId } = renderRow({ ...BASE, type: 'streak_milestone', id: 'e-str' });
    expect(getByTestId('activity-feed-icon-e-str')).toBeTruthy();
  });

  it('renders challenge icon for challenge_complete type', () => {
    const { getByTestId } = renderRow({ ...BASE, type: 'challenge_complete', id: 'e-ch' });
    expect(getByTestId('activity-feed-icon-e-ch')).toBeTruthy();
  });

  it('renders quest icon for daily_quest type', () => {
    const { getByTestId } = renderRow({ ...BASE, type: 'daily_quest', id: 'e-dq' });
    expect(getByTestId('activity-feed-icon-e-dq')).toBeTruthy();
  });

  it('renders referral icon for referral type', () => {
    const { getByTestId } = renderRow({ ...BASE, type: 'referral', id: 'e-ref' });
    expect(getByTestId('activity-feed-icon-e-ref')).toBeTruthy();
  });

  // ── Date ─────────────────────────────────────────────────────────────────

  it('renders earnedAt date with testID activity-feed-date-{id}', () => {
    const { getByTestId } = renderRow(BASE);
    expect(getByTestId('activity-feed-date-e1')).toBeTruthy();
  });

  it('renders relative or formatted date string', () => {
    const { getByTestId } = renderRow(BASE);
    const dateEl = getByTestId('activity-feed-date-e1');
    expect(dateEl.props.children).toBeTruthy();
  });

  // ── Accessibility ─────────────────────────────────────────────────────────

  it('has accessibilityLabel combining description and points', () => {
    const { getByTestId } = renderRow(BASE);
    const row = getByTestId('activity-feed-row-e1');
    expect(row.props.accessibilityLabel).toContain('Ordered Blue Ridge Sectional');
    expect(row.props.accessibilityLabel).toContain('250');
  });
});
