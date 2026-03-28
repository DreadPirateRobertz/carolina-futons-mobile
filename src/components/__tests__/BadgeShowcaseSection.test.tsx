/**
 * BadgeShowcaseSection tests — cm-p8-social
 *
 * Horizontal badge row displayed on AchievementBadgesScreen and
 * member profile views. Fetches from useMemberBadges and renders
 * a scrollable icon grid with empty/loading/error states.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { BadgeShowcaseSection } from '../BadgeShowcaseSection';
import { ThemeProvider } from '@/theme/ThemeProvider';

import { useMemberBadges } from '@/hooks/useMemberBadges';

// ── Mock useMemberBadges ──────────────────────────────────────────────────────

jest.mock('@/hooks/useMemberBadges', () => ({ useMemberBadges: jest.fn() }));
const mockUseMemberBadges = useMemberBadges as jest.Mock;

const BADGE_1 = {
  badgeKey: 'week_wanderer',
  name: 'Week Wanderer',
  tier: 'TRAIL_BLAZER',
  earnedAt: '2026-03-22T14:00:00.000Z',
  icon: '🗺️',
};
const BADGE_2 = {
  badgeKey: 'first_step',
  name: 'First Step',
  tier: 'TRAIL_BLAZER',
  earnedAt: '2026-03-15T09:00:00.000Z',
  icon: '👣',
};

function defaultHook(overrides = {}) {
  return {
    badges: [BADGE_1, BADGE_2],
    loading: false,
    error: null,
    refreshBadges: jest.fn(),
    ...overrides,
  };
}

function renderSection(memberId = 'member-abc123') {
  return render(
    <ThemeProvider>
      <BadgeShowcaseSection memberId={memberId} />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseMemberBadges.mockReturnValue(defaultHook());
});

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('rendering', () => {
  it('renders the root container', () => {
    const { getByTestId } = renderSection();
    expect(getByTestId('badge-showcase')).toBeTruthy();
  });

  it('renders a badge item for each badge', () => {
    const { getAllByTestId } = renderSection();
    expect(getAllByTestId('badge-item')).toHaveLength(2);
  });

  it('renders badge icon text', () => {
    const { getByText } = renderSection();
    expect(getByText('🗺️')).toBeTruthy();
  });

  it('renders badge name', () => {
    const { getByText } = renderSection();
    expect(getByText('Week Wanderer')).toBeTruthy();
  });
});

// ── Loading state ─────────────────────────────────────────────────────────────

describe('loading state', () => {
  it('renders loading indicator when loading', () => {
    mockUseMemberBadges.mockReturnValue(defaultHook({ loading: true, badges: [] }));
    const { getByTestId } = renderSection();
    expect(getByTestId('badge-showcase-loading')).toBeTruthy();
  });

  it('does not render badge items while loading', () => {
    mockUseMemberBadges.mockReturnValue(defaultHook({ loading: true, badges: [] }));
    const { queryAllByTestId } = renderSection();
    expect(queryAllByTestId('badge-item')).toHaveLength(0);
  });
});

// ── Empty state ───────────────────────────────────────────────────────────────

describe('empty state', () => {
  it('renders empty message when no badges', () => {
    mockUseMemberBadges.mockReturnValue(defaultHook({ badges: [] }));
    const { getByTestId } = renderSection();
    expect(getByTestId('badge-showcase-empty')).toBeTruthy();
  });
});

// ── Error state ───────────────────────────────────────────────────────────────

describe('error state', () => {
  it('renders error message on fetch failure', () => {
    mockUseMemberBadges.mockReturnValue(defaultHook({ error: 'Network error', badges: [] }));
    const { getByTestId } = renderSection();
    expect(getByTestId('badge-showcase-error')).toBeTruthy();
  });
});

// ── Accessibility ─────────────────────────────────────────────────────────────

describe('accessibility', () => {
  it('badge showcase section has accessibility label', () => {
    const { getByTestId } = renderSection();
    expect(getByTestId('badge-showcase').props.accessibilityLabel).toBeTruthy();
  });

  it('each badge item has accessible label with name', () => {
    const { getAllByTestId } = renderSection();
    const items = getAllByTestId('badge-item');
    expect(items[0].props.accessibilityLabel).toContain('Week Wanderer');
  });
});
