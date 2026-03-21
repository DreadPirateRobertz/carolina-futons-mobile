/**
 * Tests for QuestionCard component — cm-wf3.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { QuestionCard } from '../QuestionCard';
import { ThemeProvider } from '@/theme/ThemeProvider';

const ANSWERED_Q = {
  id: 'q-1',
  productId: 'asheville-full',
  question: 'What size is best for a small room?',
  answer: 'We recommend the Twin for rooms under 10 feet.',
  authorName: 'Jane D.',
  createdDate: '2026-03-01T10:00:00Z',
  answered: true,
};

const UNANSWERED_Q = {
  id: 'q-2',
  productId: 'asheville-full',
  question: 'Is delivery free?',
  answer: '',
  authorName: 'Bob S.',
  createdDate: '2026-03-10T08:00:00Z',
  answered: false,
};

function renderCard(q = ANSWERED_Q) {
  return render(
    <ThemeProvider>
      <QuestionCard question={q} testID="qcard" />
    </ThemeProvider>,
  );
}

describe('QuestionCard — answered', () => {
  it('renders the question text', () => {
    const { getByTestId } = renderCard();
    expect(getByTestId('qcard-question').props.children).toContain('small room');
  });

  it('renders the answer body', () => {
    const { getByTestId } = renderCard();
    expect(getByTestId('qcard-answer').props.children).toContain('Twin');
  });

  it('renders the author name', () => {
    const { getByTestId } = renderCard();
    expect(getByTestId('qcard-author').props.children).toContain('Jane D.');
  });

  it('shows answered badge', () => {
    const { getByTestId } = renderCard();
    expect(getByTestId('qcard-answered-badge')).toBeTruthy();
  });

  it('does not show awaiting-answer label', () => {
    const { queryByTestId } = renderCard();
    expect(queryByTestId('qcard-awaiting')).toBeNull();
  });
});

describe('QuestionCard — unanswered', () => {
  it('shows awaiting-answer label', () => {
    const { getByTestId } = renderCard(UNANSWERED_Q);
    expect(getByTestId('qcard-awaiting')).toBeTruthy();
  });

  it('does not show answered badge', () => {
    const { queryByTestId } = renderCard(UNANSWERED_Q);
    expect(queryByTestId('qcard-answered-badge')).toBeNull();
  });

  it('does not render answer text element', () => {
    const { queryByTestId } = renderCard(UNANSWERED_Q);
    expect(queryByTestId('qcard-answer')).toBeNull();
  });
});
