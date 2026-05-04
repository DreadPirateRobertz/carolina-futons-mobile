/**
 * PointsHistoryScreen — cm-bt2 edge case coverage.
 *
 * Audits: skeleton/loading mutual exclusivity with error + empty states,
 * error/empty mutual exclusivity, and skeleton row count wiring.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { PointsHistoryScreen } from '../PointsHistoryScreen';
import type { PointsEvent } from '@/hooks/usePointsHistory';

const mockRefresh = jest.fn();

const MOCK_EVENTS: PointsEvent[] = [
  {
    id: 'ev-1',
    type: 'purchase',
    description: 'Ordered Ashley Sectional',
    points: 250,
    earnedAt: '2026-03-20T14:00:00Z',
  },
  {
    id: 'ev-2',
    type: 'review',
    description: 'Reviewed Blue Ridge Sofa',
    points: 50,
    earnedAt: '2026-03-18T09:00:00Z',
  },
];

const defaultState = {
  events: [] as PointsEvent[],
  loading: false,
  error: null as string | null,
  refresh: mockRefresh,
};

jest.mock('@/hooks/usePointsHistory', () => ({
  usePointsHistory: jest.fn(() => defaultState),
}));

import { usePointsHistory } from '@/hooks/usePointsHistory';
const mockUsePointsHistory = usePointsHistory as jest.Mock;

function renderScreen(props: React.ComponentProps<typeof PointsHistoryScreen> = {}) {
  return render(
    <ThemeProvider>
      <PointsHistoryScreen {...props} />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUsePointsHistory.mockReturnValue({ ...defaultState });
});

describe('PointsHistoryScreen — loading mutual exclusivity (cm-bt2)', () => {
  it('loading=true does NOT show error view even when error is set', () => {
    mockUsePointsHistory.mockReturnValue({ ...defaultState, loading: true, error: 'Stale error' });
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('points-history-error')).toBeNull();
  });

  it('loading=true does NOT show empty view', () => {
    mockUsePointsHistory.mockReturnValue({ ...defaultState, loading: true, events: [] });
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('points-history-empty')).toBeNull();
  });

  it('loading=true does NOT show the list', () => {
    mockUsePointsHistory.mockReturnValue({
      ...defaultState,
      loading: true,
      events: MOCK_EVENTS,
    });
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('points-history-list')).toBeNull();
  });

  it('loading=true shows screen root testID', () => {
    mockUsePointsHistory.mockReturnValue({ ...defaultState, loading: true });
    const { getByTestId } = renderScreen({ testID: 'pts-screen' });
    expect(getByTestId('pts-screen')).toBeTruthy();
  });
});

describe('PointsHistoryScreen — skeleton row count (cm-bt2)', () => {
  it('renders exactly 6 skeleton rows while loading', () => {
    mockUsePointsHistory.mockReturnValue({ ...defaultState, loading: true });
    const { getByTestId } = renderScreen();
    const screen = getByTestId('points-history-screen');
    // Root View has 6 SkeletonRow children (Array.from({ length: 6 }))
    expect(screen.props.children.length).toBe(6);
  });

  it('first skeleton row has testID points-history-loading', () => {
    mockUsePointsHistory.mockReturnValue({ ...defaultState, loading: true });
    const { getByTestId } = renderScreen();
    expect(getByTestId('points-history-loading')).toBeTruthy();
  });
});

describe('PointsHistoryScreen — error state mutual exclusivity (cm-bt2)', () => {
  beforeEach(() => {
    mockUsePointsHistory.mockReturnValue({
      ...defaultState,
      loading: false,
      error: 'Network error',
      events: MOCK_EVENTS,
    });
  });

  it('error state does NOT show the list', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('points-history-list')).toBeNull();
  });

  it('error state does NOT show the empty view', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('points-history-empty')).toBeNull();
  });

  it('error state does NOT show the skeleton', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('points-history-loading')).toBeNull();
  });
});

describe('PointsHistoryScreen — empty state mutual exclusivity (cm-bt2)', () => {
  beforeEach(() => {
    mockUsePointsHistory.mockReturnValue({
      ...defaultState,
      loading: false,
      error: null,
      events: [],
    });
  });

  it('empty state does NOT show the list', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('points-history-list')).toBeNull();
  });

  it('empty state does NOT show the error view', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('points-history-error')).toBeNull();
  });

  it('empty state does NOT show the skeleton', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('points-history-loading')).toBeNull();
  });
});

describe('PointsHistoryScreen — list state mutual exclusivity (cm-bt2)', () => {
  beforeEach(() => {
    mockUsePointsHistory.mockReturnValue({
      ...defaultState,
      loading: false,
      error: null,
      events: MOCK_EVENTS,
    });
  });

  it('list state does NOT show the skeleton', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('points-history-loading')).toBeNull();
  });

  it('list state does NOT show the empty view', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('points-history-empty')).toBeNull();
  });

  it('list state does NOT show the error view', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('points-history-error')).toBeNull();
  });
});
