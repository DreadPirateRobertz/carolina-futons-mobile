/**
 * @module trailsScreen.test
 *
 * TDD tests for TrailsScreen — cm-ay9
 *
 * Covers:
 * - Trail list view (no trailId param): shows all 3 trails
 * - Per-trail view (trailId param): shows 5 challenges for the trail
 * - Completion badge when all challenges completed
 * - Unknown trailId shows error state
 * - Loading/error states
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { TrailsScreen } from '../TrailsScreen';
import { TRAIL_REGISTRY } from '@/data/trails';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      espresso: '#3A2518',
      espressoLight: '#5C4033',
      sandBase: '#E8D5B7',
      sandLight: '#F2E8D5',
      sunsetCoral: '#E8845C',
      success: '#4A7C59',
      muted: '#666666',
    },
    typography: {
      h1: { fontSize: 34, fontWeight: '700', lineHeight: 39 },
      h2: { fontSize: 26, fontWeight: '700', lineHeight: 31 },
      h3: { fontSize: 21, fontWeight: '600', lineHeight: 27 },
      body: { fontSize: 16, fontWeight: '400', lineHeight: 22 },
      caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    borderRadius: { sm: 4, md: 8, lg: 16 },
  }),
}));

function wrap(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

// ── Trail list view ───────────────────────────────────────────────────────────

describe('TrailsScreen — trail list (no trailId)', () => {
  it('renders trail list container', () => {
    const { getByTestId } = wrap(<TrailsScreen />);
    expect(getByTestId('trails-screen')).toBeTruthy();
  });

  it('shows all 3 trails', () => {
    const { getByTestId } = wrap(<TrailsScreen />);
    expect(getByTestId('trail-item-spring')).toBeTruthy();
    expect(getByTestId('trail-item-summer')).toBeTruthy();
    expect(getByTestId('trail-item-fall')).toBeTruthy();
  });

  it('shows trail names', () => {
    const { getByText } = wrap(<TrailsScreen />);
    expect(getByText('Spring Trail')).toBeTruthy();
    expect(getByText('Summer Trail')).toBeTruthy();
    expect(getByText('Fall Trail')).toBeTruthy();
  });

  it('shows trail icons', () => {
    const { getByText } = wrap(<TrailsScreen />);
    expect(getByText('🌸')).toBeTruthy();
    expect(getByText('☀️')).toBeTruthy();
    expect(getByText('🍂')).toBeTruthy();
  });

  it('shows trail descriptions', () => {
    const { getByText } = wrap(<TrailsScreen />);
    expect(getByText(TRAIL_REGISTRY[0].description)).toBeTruthy();
    expect(getByText(TRAIL_REGISTRY[1].description)).toBeTruthy();
    expect(getByText(TRAIL_REGISTRY[2].description)).toBeTruthy();
  });

  it('shows challenge count for each trail', () => {
    const { getAllByText } = wrap(<TrailsScreen />);
    // Each trail has 5 challenges
    const countLabels = getAllByText('5 challenges');
    expect(countLabels).toHaveLength(3);
  });

  it('does not show per-trail challenge list in list view', () => {
    const { queryByTestId } = wrap(<TrailsScreen />);
    expect(queryByTestId('trail-challenge-list')).toBeNull();
  });
});

// ── Per-trail view ────────────────────────────────────────────────────────────

describe('TrailsScreen — per-trail view (trailId provided)', () => {
  it('renders trail detail for spring', () => {
    const { getByTestId } = wrap(<TrailsScreen trailId="spring" />);
    expect(getByTestId('trails-screen')).toBeTruthy();
    expect(getByTestId('trail-challenge-list')).toBeTruthy();
  });

  it('shows 5 challenges for spring trail', () => {
    const { getAllByTestId } = wrap(<TrailsScreen trailId="spring" />);
    expect(getAllByTestId(/^trail-challenge-item-/)).toHaveLength(5);
  });

  it('shows challenge titles for spring', () => {
    const { getByText } = wrap(<TrailsScreen trailId="spring" />);
    expect(getByText('Fresh Eyes')).toBeTruthy();
    expect(getByText('Wishlist Builder')).toBeTruthy();
    expect(getByText('Spring Shopper')).toBeTruthy();
    expect(getByText('Style Scout')).toBeTruthy();
    expect(getByText('Share the Love')).toBeTruthy();
  });

  it('shows challenge titles for summer trail', () => {
    const { getByText } = wrap(<TrailsScreen trailId="summer" />);
    expect(getByText('Sun Seeker')).toBeTruthy();
    expect(getByText('Flash Buyer')).toBeTruthy();
    expect(getByText('Streak Starter')).toBeTruthy();
    expect(getByText('Room Planner')).toBeTruthy();
    expect(getByText('Summer Loyalist')).toBeTruthy();
  });

  it('shows challenge titles for fall trail', () => {
    const { getByText } = wrap(<TrailsScreen trailId="fall" />);
    expect(getByText('Cozy Corner')).toBeTruthy();
    expect(getByText('Review Guru')).toBeTruthy();
    expect(getByText('Comparison Shopper')).toBeTruthy();
    expect(getByText('In-Store Explorer')).toBeTruthy();
    expect(getByText('Fall Finale')).toBeTruthy();
  });

  it('shows the trail name as heading in per-trail view', () => {
    const { getByText } = wrap(<TrailsScreen trailId="fall" />);
    expect(getByText('Fall Trail')).toBeTruthy();
  });

  it('does not show other trail items when viewing a specific trail', () => {
    const { queryByTestId } = wrap(<TrailsScreen trailId="spring" />);
    expect(queryByTestId('trail-item-summer')).toBeNull();
    expect(queryByTestId('trail-item-fall')).toBeNull();
  });
});

// ── Completion badge ──────────────────────────────────────────────────────────

describe('TrailsScreen — completion badge', () => {
  const completedSpring = {
    ...TRAIL_REGISTRY[0],
    challenges: TRAIL_REGISTRY[0].challenges.map((c) => ({ ...c, completed: true })),
  };

  it('shows completion badge when all 5 challenges completed', () => {
    // Render per-trail view and inject completed trail data via testID
    const { getByTestId } = wrap(
      <TrailsScreen trailId="spring" _testTrails={[completedSpring, ...TRAIL_REGISTRY.slice(1)]} />,
    );
    expect(getByTestId('trail-completion-badge')).toBeTruthy();
  });

  it('does not show completion badge when trail is incomplete', () => {
    const { queryByTestId } = wrap(<TrailsScreen trailId="spring" />);
    expect(queryByTestId('trail-completion-badge')).toBeNull();
  });

  it('shows completion badge text', () => {
    const { getByText } = wrap(
      <TrailsScreen trailId="spring" _testTrails={[completedSpring, ...TRAIL_REGISTRY.slice(1)]} />,
    );
    expect(getByText('Trail Complete! 🏆')).toBeTruthy();
  });
});

// ── Unknown trailId ───────────────────────────────────────────────────────────

describe('TrailsScreen — unknown trailId', () => {
  it('shows not-found message for unknown trailId', () => {
    const { getByTestId } = wrap(<TrailsScreen trailId="winter" />);
    expect(getByTestId('trail-not-found')).toBeTruthy();
  });

  it('shows helpful error text for unknown trailId', () => {
    const { getByText } = wrap(<TrailsScreen trailId="winter" />);
    expect(getByText('Trail not found')).toBeTruthy();
  });
});
