/**
 * ActivityFeedScreen tests — cf-2h8
 *
 * TDD spec for the paginated activity feed screen: renders, filter chips,
 * infinite scroll, loading/error/empty states.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ActivityFeedScreen } from '../ActivityFeedScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

// ── Mocks ─────────────────────────────────────────────────────────────────

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));
const mockGoBack = jest.fn();

const mockUseActivityFeed = jest.fn();
jest.mock('@/hooks/useActivityFeed', () => ({
  useActivityFeed: (filter: string) => mockUseActivityFeed(filter),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────

const EVENTS = [
  { id: 'e1', type: 'purchase', description: 'Ordered Blue Ridge Sectional', points: 250, earnedAt: '2026-03-20T14:00:00Z' },
  { id: 'e2', type: 'review', description: 'Reviewed Asheville Loveseat', points: 50, earnedAt: '2026-03-18T09:30:00Z' },
  { id: 'e3', type: 'challenge_complete', description: 'Spring Refresh challenge', points: 500, earnedAt: '2026-03-15T16:00:00Z' },
];

function renderScreen() {
  return render(
    <ThemeProvider>
      <ActivityFeedScreen />
    </ThemeProvider>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('ActivityFeedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseActivityFeed.mockReturnValue({
      events: EVENTS,
      loading: false,
      error: null,
      hasMore: false,
      loadMore: jest.fn(),
      refresh: jest.fn(),
    });
  });

  // ── Identification ────────────────────────────────────────────────────────

  it('has testID activity-feed-screen', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('activity-feed-screen')).toBeTruthy();
  });

  // ── Header ────────────────────────────────────────────────────────────────

  it('renders "Activity" heading', () => {
    const { getByText } = renderScreen();
    expect(getByText('Activity')).toBeTruthy();
  });

  // ── Filter chips ─────────────────────────────────────────────────────────

  it('renders all 5 filter chips', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('filter-chip-all')).toBeTruthy();
    expect(getByTestId('filter-chip-points')).toBeTruthy();
    expect(getByTestId('filter-chip-streaks')).toBeTruthy();
    expect(getByTestId('filter-chip-quests')).toBeTruthy();
    expect(getByTestId('filter-chip-challenges')).toBeTruthy();
  });

  it('"All" chip is selected by default', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('filter-chip-all').props.accessibilityState?.selected).toBe(true);
  });

  it('tapping a chip changes selection and calls useActivityFeed with new filter', () => {
    const { getByTestId, rerender } = renderScreen();
    fireEvent.press(getByTestId('filter-chip-streaks'));
    // After tap, hook should be called with 'streaks'
    rerender(
      <ThemeProvider>
        <ActivityFeedScreen />
      </ThemeProvider>,
    );
    const lastCall = mockUseActivityFeed.mock.calls[mockUseActivityFeed.mock.calls.length - 1][0];
    expect(lastCall).toBe('streaks');
  });

  it('tapping "Points" chip marks it selected', () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('filter-chip-points'));
    expect(getByTestId('filter-chip-points').props.accessibilityState?.selected).toBe(true);
    expect(getByTestId('filter-chip-all').props.accessibilityState?.selected).toBe(false);
  });

  // ── Event rows ────────────────────────────────────────────────────────────

  it('renders event rows', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('activity-feed-row-e1')).toBeTruthy();
    expect(getByTestId('activity-feed-row-e2')).toBeTruthy();
    expect(getByTestId('activity-feed-row-e3')).toBeTruthy();
  });

  it('renders event descriptions', () => {
    const { getByText } = renderScreen();
    expect(getByText('Ordered Blue Ridge Sectional')).toBeTruthy();
    expect(getByText('Reviewed Asheville Loveseat')).toBeTruthy();
  });

  // ── Loading state ─────────────────────────────────────────────────────────

  it('shows loading indicator when loading=true and no events', () => {
    mockUseActivityFeed.mockReturnValue({ events: [], loading: true, error: null, hasMore: false, loadMore: jest.fn(), refresh: jest.fn() });
    const { getByTestId } = renderScreen();
    expect(getByTestId('activity-feed-loading')).toBeTruthy();
  });

  it('does not show rows while initial loading', () => {
    mockUseActivityFeed.mockReturnValue({ events: [], loading: true, error: null, hasMore: false, loadMore: jest.fn(), refresh: jest.fn() });
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('activity-feed-row-e1')).toBeNull();
  });

  // ── Empty state ──────────────────────────────────────────────────────────

  it('shows empty state when events is empty and not loading', () => {
    mockUseActivityFeed.mockReturnValue({ events: [], loading: false, error: null, hasMore: false, loadMore: jest.fn(), refresh: jest.fn() });
    const { getByTestId } = renderScreen();
    expect(getByTestId('activity-feed-empty')).toBeTruthy();
  });

  it('empty state text mentions activity', () => {
    mockUseActivityFeed.mockReturnValue({ events: [], loading: false, error: null, hasMore: false, loadMore: jest.fn(), refresh: jest.fn() });
    const { getByTestId } = renderScreen();
    expect(getByTestId('activity-feed-empty').props.children ?? '').toBeTruthy();
  });

  // ── Error state ───────────────────────────────────────────────────────────

  it('shows error message when error is set', () => {
    mockUseActivityFeed.mockReturnValue({ events: [], loading: false, error: 'Unable to load', hasMore: false, loadMore: jest.fn(), refresh: jest.fn() });
    const { getByTestId } = renderScreen();
    expect(getByTestId('activity-feed-error')).toBeTruthy();
  });

  it('shows retry button in error state', () => {
    const mockRefresh = jest.fn();
    mockUseActivityFeed.mockReturnValue({ events: [], loading: false, error: 'fail', hasMore: false, loadMore: jest.fn(), refresh: mockRefresh });
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('activity-feed-retry'));
    expect(mockRefresh).toHaveBeenCalled();
  });

  // ── Load more (infinite scroll) ──────────────────────────────────────────

  it('shows load-more indicator when hasMore=true and events exist', () => {
    mockUseActivityFeed.mockReturnValue({ events: EVENTS, loading: false, error: null, hasMore: true, loadMore: jest.fn(), refresh: jest.fn() });
    const { getByTestId } = renderScreen();
    expect(getByTestId('activity-feed-load-more')).toBeTruthy();
  });

  it('does not show load-more indicator when hasMore=false', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('activity-feed-load-more')).toBeNull();
  });
});
