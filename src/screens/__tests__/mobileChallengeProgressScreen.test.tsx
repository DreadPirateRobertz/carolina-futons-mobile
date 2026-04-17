/**
 * @module mobileChallengeProgressScreen.test
 *
 * TDD tests for MobileChallengeProgressScreen — renders completion counts
 * per challenge type from useMobileChallengeProgress.
 *
 * cm-1we
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { ThemeProvider } from '@/theme/ThemeProvider';
import { MobileChallengeProgressScreen } from '../MobileChallengeProgressScreen';

const mockRefresh = jest.fn();
const mockState: {
  counts: { ar_discovery: number; quiz_completion: number; social_share: number };
  loading: boolean;
  error: string | null;
  refresh: jest.Mock;
} = {
  counts: { ar_discovery: 0, quiz_completion: 0, social_share: 0 },
  loading: false,
  error: null,
  refresh: mockRefresh,
};

jest.mock('@/hooks/useMobileChallengeProgress', () => ({
  useMobileChallengeProgress: () => mockState,
}));

function renderScreen() {
  return render(
    <ThemeProvider>
      <MobileChallengeProgressScreen />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  mockRefresh.mockClear();
  mockState.counts = { ar_discovery: 0, quiz_completion: 0, social_share: 0 };
  mockState.loading = false;
  mockState.error = null;
  mockState.refresh = mockRefresh;
});

describe('MobileChallengeProgressScreen', () => {
  it('renders loading indicator when hook is loading', () => {
    mockState.loading = true;
    const { getByTestId } = renderScreen();
    expect(getByTestId('mcp-loading')).toBeTruthy();
  });

  it('renders error message with retry when hook returns an error', () => {
    mockState.error = 'Unable to load challenge progress.';
    const { getByTestId, getByText } = renderScreen();
    expect(getByTestId('mcp-error')).toBeTruthy();
    expect(getByText('Unable to load challenge progress.')).toBeTruthy();
    fireEvent.press(getByTestId('mcp-retry'));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('renders all three challenge type cards with their counts', () => {
    mockState.counts = { ar_discovery: 3, quiz_completion: 7, social_share: 2 };
    const { getByTestId } = renderScreen();
    expect(getByTestId('mcp-card-ar_discovery')).toBeTruthy();
    expect(getByTestId('mcp-count-ar_discovery').props.children).toBe(3);
    expect(getByTestId('mcp-count-quiz_completion').props.children).toBe(7);
    expect(getByTestId('mcp-count-social_share').props.children).toBe(2);
  });

  it('renders zero counts cleanly for empty state', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('mcp-count-ar_discovery').props.children).toBe(0);
    expect(getByTestId('mcp-count-quiz_completion').props.children).toBe(0);
    expect(getByTestId('mcp-count-social_share').props.children).toBe(0);
  });

  it('renders a human-readable label for each challenge type', () => {
    const { getByText } = renderScreen();
    expect(getByText('AR Discovery')).toBeTruthy();
    expect(getByText('Quiz Completion')).toBeTruthy();
    expect(getByText('Social Share')).toBeTruthy();
  });

  it('total points reflects completion counts × per-type point values', () => {
    // points map: ar_discovery=75, quiz_completion=50, social_share=100
    mockState.counts = { ar_discovery: 2, quiz_completion: 3, social_share: 1 };
    const { getByTestId } = renderScreen();
    // 2*75 + 3*50 + 1*100 = 150 + 150 + 100 = 400
    expect(getByTestId('mcp-total-points').props.children).toBe(400);
  });

  it('pull-to-refresh (refresh control) triggers hook refresh', () => {
    const { getByTestId } = renderScreen();
    const scrollView = getByTestId('mcp-scroll');
    const refreshControl = scrollView.props.refreshControl;
    refreshControl.props.onRefresh();
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});
