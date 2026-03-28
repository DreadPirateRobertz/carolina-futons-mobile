// src/components/__tests__/FitScoreBadge.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@/hooks/useFitScore', () => ({
  useFitScore: jest.fn(),
}));
jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: { mountainBlue: '#5B8FA8', offWhite: '#FAF7F2', sandDark: '#D4BC96' },
    spacing: { xs: 4, sm: 8 },
    typography: { bodyFamily: 'System' },
    borderRadius: { sm: 4 },
  }),
}));

import { useFitScore } from '@/hooks/useFitScore';
import { FitScoreBadge } from '../FitScoreBadge';

beforeEach(() => jest.clearAllMocks());

it('renders nothing when score is null and not loading', () => {
  (useFitScore as jest.Mock).mockReturnValue({
    score: null, reasons: [], isLoading: false, error: null,
  });
  const { queryByTestId } = render(<FitScoreBadge productId="prod-1" memberId="mem-1" />);
  expect(queryByTestId('fit-score-badge')).toBeNull();
  expect(queryByTestId('fit-score-skeleton')).toBeNull();
});

it('renders skeleton when loading', () => {
  (useFitScore as jest.Mock).mockReturnValue({
    score: null, reasons: [], isLoading: true, error: null,
  });
  const { getByTestId } = render(<FitScoreBadge productId="prod-1" memberId="mem-1" />);
  expect(getByTestId('fit-score-skeleton')).toBeTruthy();
});

it('renders score badge when score is available', () => {
  (useFitScore as jest.Mock).mockReturnValue({
    score: 94, reasons: ['firm'], isLoading: false, error: null,
  });
  const { getByText, getByTestId } = render(<FitScoreBadge productId="prod-1" memberId="mem-1" />);
  expect(getByText(/94%/)).toBeTruthy();
  expect(getByTestId('fit-score-badge')).toBeTruthy();
});

it('renders nothing on error — graceful degradation', () => {
  (useFitScore as jest.Mock).mockReturnValue({
    score: null, reasons: [], isLoading: false, error: 'network',
  });
  const { queryByTestId } = render(<FitScoreBadge productId="prod-1" memberId="mem-1" />);
  expect(queryByTestId('fit-score-badge')).toBeNull();
});

it('renders nothing for guest (memberId null)', () => {
  (useFitScore as jest.Mock).mockReturnValue({
    score: null, reasons: [], isLoading: false, error: null,
  });
  const { queryByTestId } = render(<FitScoreBadge productId="prod-1" memberId={null} />);
  expect(queryByTestId('fit-score-badge')).toBeNull();
  expect(queryByTestId('fit-score-skeleton')).toBeNull();
});

it('badge has accessibilityLabel with percentage', () => {
  (useFitScore as jest.Mock).mockReturnValue({
    score: 87, reasons: [], isLoading: false, error: null,
  });
  const { getByTestId } = render(<FitScoreBadge productId="prod-1" memberId="mem-1" />);
  expect(getByTestId('fit-score-badge').props.accessibilityLabel).toContain('87');
});
