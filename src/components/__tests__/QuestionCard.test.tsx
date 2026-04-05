/**
 * TDD tests for QuestionCard component — deacon-qbl.
 * Covers: answered vs awaiting rendering, answer body, meta, accessibility.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { QuestionCard } from '../QuestionCard';
import type { ProductQuestion } from '@/hooks/useProductQA';

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      espresso: '#3A2518',
      espressoLight: '#6B5B50',
      sunsetCoral: '#E8845C',
      sandDark: '#D4C4A8',
      overlay: 'rgba(0,0,0,0.15)',
    },
    borderRadius: { md: 8 },
    typography: { bodyFamilyBold: 'System', bodyFamily: 'System' },
    spacing: { sm: 8, md: 12 },
  }),
}));

const ANSWERED: ProductQuestion = {
  id: 'q-1',
  productId: 'prod-asheville-full',
  question: 'Does this come in king size?',
  answer: 'Yes, available in Full, Queen, and King.',
  authorName: 'Jane D.',
  createdDate: '2026-03-01T10:00:00Z',
  answered: true,
};

const UNANSWERED: ProductQuestion = {
  id: 'q-2',
  productId: 'prod-asheville-full',
  question: 'Is assembly required?',
  answer: '',
  authorName: 'Bob S.',
  createdDate: '2026-03-10T08:00:00Z',
  answered: false,
};

// ── Answered question ────────────────────────────────────────────────────────

describe('QuestionCard — answered', () => {
  it('renders the question text', () => {
    const { getByText } = render(<QuestionCard question={ANSWERED} />);
    expect(getByText('Does this come in king size?')).toBeTruthy();
  });

  it('renders the answer text', () => {
    const { getByText } = render(<QuestionCard question={ANSWERED} />);
    expect(getByText('Yes, available in Full, Queen, and King.')).toBeTruthy();
  });

  it('shows Answered badge', () => {
    const { getByTestId } = render(<QuestionCard question={ANSWERED} testID="qc" />);
    expect(getByTestId('qc-answered-badge')).toBeTruthy();
  });

  it('does not show Awaiting answer badge', () => {
    const { queryByTestId } = render(<QuestionCard question={ANSWERED} testID="qc" />);
    expect(queryByTestId('qc-awaiting')).toBeNull();
  });

  it('renders author name', () => {
    const { getByText } = render(<QuestionCard question={ANSWERED} />);
    expect(getByText('Jane D.')).toBeTruthy();
  });

  it('uses provided testID as root testID', () => {
    const { getByTestId } = render(<QuestionCard question={ANSWERED} testID="my-card" />);
    expect(getByTestId('my-card')).toBeTruthy();
  });
});

// ── Unanswered question ──────────────────────────────────────────────────────

describe('QuestionCard — awaiting answer', () => {
  it('renders the question text', () => {
    const { getByText } = render(<QuestionCard question={UNANSWERED} />);
    expect(getByText('Is assembly required?')).toBeTruthy();
  });

  it('shows Awaiting answer badge', () => {
    const { getByTestId } = render(<QuestionCard question={UNANSWERED} testID="qc" />);
    expect(getByTestId('qc-awaiting')).toBeTruthy();
  });

  it('does not show Answered badge', () => {
    const { queryByTestId } = render(<QuestionCard question={UNANSWERED} testID="qc" />);
    expect(queryByTestId('qc-answered-badge')).toBeNull();
  });

  it('does not render answer text when empty', () => {
    const { queryByTestId } = render(<QuestionCard question={UNANSWERED} testID="qc" />);
    expect(queryByTestId('qc-answer')).toBeNull();
  });

  it('renders author name', () => {
    const { getByText } = render(<QuestionCard question={UNANSWERED} />);
    expect(getByText('Bob S.')).toBeTruthy();
  });
});

// ── Default testID fallback ──────────────────────────────────────────────────

describe('QuestionCard — testID fallback', () => {
  it('uses question-card as default testID when none provided', () => {
    const { getByTestId } = render(<QuestionCard question={ANSWERED} />);
    expect(getByTestId('question-card')).toBeTruthy();
  });
});
