/**
 * TDD tests for NPSSummaryScreen (hq-9dq).
 *
 * Covers:
 *  - Staff gate: non-staff sees access-denied message, no stats
 *  - Loading state renders skeleton/indicator
 *  - Renders avg score, response count
 *  - Renders up to 5 recent comments
 *  - Empty state when no responses
 *  - Error state with retry
 *  - Retry button calls refresh
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NPSSummaryScreen } from '../NPSSummaryScreen';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockRefresh = jest.fn();
const mockUseNPSSummary = jest.fn();

jest.mock('@/hooks/useNPSSummary', () => ({
  useNPSSummary: () => mockUseNPSSummary(),
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      sandBase: '#E8D5B7',
      sandDark: '#D4C4A0',
      espresso: '#3B2410',
      espressoLight: '#6B4C30',
      sunsetCoral: '#E05252',
      mountainBlue: '#4A7FA5',
      offWhite: '#FAF7F2',
      success: '#2D6A4F',
      overlay: '#00000022',
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    borderRadius: { sm: 4, md: 8, lg: 12, button: 8 },
    typography: {
      headingFamily: 'System',
      bodyFamily: 'System',
      bodyFamilyBold: 'System',
    },
  }),
}));

// ── Fixtures ───────────────────────────────────────────────────────────────────

function makeComment(overrides: {
  id?: string;
  score?: number;
  comment?: string;
  createdAt?: string;
}) {
  return {
    id: overrides.id ?? 'resp-1',
    score: overrides.score ?? 9,
    comment: overrides.comment ?? 'Great product!',
    createdAt: overrides.createdAt ?? '2026-03-01T00:00:00Z',
    orderId: 'ord-1',
  };
}

function makeSummary(overrides: {
  avgScore?: number | null;
  responseCount?: number;
  recentComments?: ReturnType<typeof makeComment>[];
}) {
  return {
    avgScore: overrides.avgScore !== undefined ? overrides.avgScore : 8.5,
    responseCount: overrides.responseCount ?? 10,
    recentComments: overrides.recentComments ?? [makeComment({})],
  };
}

function makeHookResult(overrides: {
  isStaff?: boolean;
  loading?: boolean;
  error?: string | null;
  summary?: ReturnType<typeof makeSummary> | null;
}) {
  return {
    isStaff: overrides.isStaff ?? true,
    loading: overrides.loading ?? false,
    error: overrides.error ?? null,
    summary: overrides.summary ?? makeSummary({}),
    refresh: mockRefresh,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseNPSSummary.mockReturnValue(makeHookResult({}));
});

// ── Staff gate ─────────────────────────────────────────────────────────────────

describe('NPSSummaryScreen — staff gate', () => {
  it('shows access-denied message for non-staff', () => {
    mockUseNPSSummary.mockReturnValue(makeHookResult({ isStaff: false, summary: null }));
    const { getByTestId } = render(<NPSSummaryScreen />);
    expect(getByTestId('nps-access-denied')).toBeTruthy();
  });

  it('does not show stats for non-staff', () => {
    mockUseNPSSummary.mockReturnValue(makeHookResult({ isStaff: false, summary: null }));
    const { queryByTestId } = render(<NPSSummaryScreen />);
    expect(queryByTestId('nps-avg-score')).toBeNull();
  });

  it('does not show access-denied for staff', () => {
    const { queryByTestId } = render(<NPSSummaryScreen />);
    expect(queryByTestId('nps-access-denied')).toBeNull();
  });
});

// ── Loading state ──────────────────────────────────────────────────────────────

describe('NPSSummaryScreen — loading state', () => {
  it('shows loading indicator while fetching', () => {
    mockUseNPSSummary.mockReturnValue(makeHookResult({ loading: true, summary: null }));
    const { getByTestId } = render(<NPSSummaryScreen />);
    expect(getByTestId('nps-loading')).toBeTruthy();
  });

  it('hides loading indicator when done', () => {
    const { queryByTestId } = render(<NPSSummaryScreen />);
    expect(queryByTestId('nps-loading')).toBeNull();
  });
});

// ── Stats display ──────────────────────────────────────────────────────────────

describe('NPSSummaryScreen — stats', () => {
  it('renders avg score', () => {
    mockUseNPSSummary.mockReturnValue(
      makeHookResult({ summary: makeSummary({ avgScore: 8.5, responseCount: 10 }) }),
    );
    const { getByTestId } = render(<NPSSummaryScreen />);
    expect(getByTestId('nps-avg-score')).toBeTruthy();
  });

  it('displays the correct avg score value', () => {
    mockUseNPSSummary.mockReturnValue(makeHookResult({ summary: makeSummary({ avgScore: 8.5 }) }));
    const { getByText } = render(<NPSSummaryScreen />);
    expect(getByText('8.5')).toBeTruthy();
  });

  it('displays avg score as "—" when null (no responses)', () => {
    mockUseNPSSummary.mockReturnValue(
      makeHookResult({ summary: makeSummary({ avgScore: null, responseCount: 0 }) }),
    );
    const { getByTestId } = render(<NPSSummaryScreen />);
    expect(getByTestId('nps-avg-score').props.children).toBe('—');
  });

  it('renders response count', () => {
    mockUseNPSSummary.mockReturnValue(
      makeHookResult({ summary: makeSummary({ responseCount: 42 }) }),
    );
    const { getByTestId } = render(<NPSSummaryScreen />);
    expect(getByTestId('nps-response-count')).toBeTruthy();
  });

  it('displays the correct response count', () => {
    mockUseNPSSummary.mockReturnValue(
      makeHookResult({ summary: makeSummary({ responseCount: 42 }) }),
    );
    const { getByText } = render(<NPSSummaryScreen />);
    expect(getByText('42')).toBeTruthy();
  });
});

// ── Empty state ────────────────────────────────────────────────────────────────

describe('NPSSummaryScreen — empty state', () => {
  it('shows empty state when responseCount is 0', () => {
    mockUseNPSSummary.mockReturnValue(
      makeHookResult({
        summary: makeSummary({ avgScore: null, responseCount: 0, recentComments: [] }),
      }),
    );
    const { getByTestId } = render(<NPSSummaryScreen />);
    expect(getByTestId('nps-empty-state')).toBeTruthy();
  });

  it('hides empty state when there are responses', () => {
    const { queryByTestId } = render(<NPSSummaryScreen />);
    expect(queryByTestId('nps-empty-state')).toBeNull();
  });
});

// ── Recent comments ────────────────────────────────────────────────────────────

describe('NPSSummaryScreen — recent comments', () => {
  it('renders the comments section when comments exist', () => {
    const { getByTestId } = render(<NPSSummaryScreen />);
    expect(getByTestId('nps-comments-section')).toBeTruthy();
  });

  it('renders each comment item', () => {
    mockUseNPSSummary.mockReturnValue(
      makeHookResult({
        summary: makeSummary({
          recentComments: [
            makeComment({ id: 'r1', comment: 'First comment' }),
            makeComment({ id: 'r2', comment: 'Second comment' }),
            makeComment({ id: 'r3', comment: 'Third comment' }),
          ],
        }),
      }),
    );
    const { getByTestId } = render(<NPSSummaryScreen />);
    expect(getByTestId('nps-comment-r1')).toBeTruthy();
    expect(getByTestId('nps-comment-r2')).toBeTruthy();
    expect(getByTestId('nps-comment-r3')).toBeTruthy();
  });

  it('displays comment text', () => {
    mockUseNPSSummary.mockReturnValue(
      makeHookResult({
        summary: makeSummary({
          recentComments: [makeComment({ id: 'r1', comment: 'Absolutely love it!' })],
        }),
      }),
    );
    const { getByText } = render(<NPSSummaryScreen />);
    expect(getByText('Absolutely love it!')).toBeTruthy();
  });

  it('displays the score on each comment', () => {
    mockUseNPSSummary.mockReturnValue(
      makeHookResult({
        summary: makeSummary({
          recentComments: [makeComment({ id: 'r1', score: 10, comment: 'Perfect' })],
        }),
      }),
    );
    const { getByText } = render(<NPSSummaryScreen />);
    expect(getByText('10/10')).toBeTruthy();
  });

  it('hides comments section when recentComments is empty', () => {
    mockUseNPSSummary.mockReturnValue(
      makeHookResult({
        summary: makeSummary({ recentComments: [] }),
      }),
    );
    const { queryByTestId } = render(<NPSSummaryScreen />);
    expect(queryByTestId('nps-comments-section')).toBeNull();
  });
});

// ── Error state ────────────────────────────────────────────────────────────────

describe('NPSSummaryScreen — error state', () => {
  it('shows error state when error is set', () => {
    mockUseNPSSummary.mockReturnValue(makeHookResult({ error: 'Network error', summary: null }));
    const { getByTestId } = render(<NPSSummaryScreen />);
    expect(getByTestId('nps-error')).toBeTruthy();
  });

  it('displays the error message', () => {
    mockUseNPSSummary.mockReturnValue(makeHookResult({ error: 'Network error', summary: null }));
    const { getByText } = render(<NPSSummaryScreen />);
    expect(getByText('Network error')).toBeTruthy();
  });

  it('shows retry button on error', () => {
    mockUseNPSSummary.mockReturnValue(makeHookResult({ error: 'fail', summary: null }));
    const { getByTestId } = render(<NPSSummaryScreen />);
    expect(getByTestId('nps-retry-button')).toBeTruthy();
  });

  it('calls refresh when retry is tapped', () => {
    mockUseNPSSummary.mockReturnValue(makeHookResult({ error: 'fail', summary: null }));
    const { getByTestId } = render(<NPSSummaryScreen />);
    fireEvent.press(getByTestId('nps-retry-button'));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('hides error state when no error', () => {
    const { queryByTestId } = render(<NPSSummaryScreen />);
    expect(queryByTestId('nps-error')).toBeNull();
  });
});
