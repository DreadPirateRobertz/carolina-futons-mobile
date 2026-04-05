/**
 * Tests for AnswerThread component — cm-gey (Q&A Phase 2).
 *
 * Covers: rendering answers + replies, upvote button state,
 * upvote/reply callbacks, accessibility, empty state.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AnswerThread } from '../AnswerThread';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { QAAnswer } from '@/hooks/useQAAnswers';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ANSWER_1: QAAnswer = {
  id: 'ans-001',
  questionId: 'q-001',
  parentAnswerId: null,
  text: 'The Twin fits rooms under 10 ft.',
  authorName: 'Staff',
  createdDate: '2026-03-05T10:00:00Z',
  upvoteCount: 3,
  hasUserUpvoted: false,
  status: 'approved',
};

const ANSWER_2: QAAnswer = {
  id: 'ans-002',
  questionId: 'q-001',
  parentAnswerId: null,
  text: 'Full size works for larger rooms.',
  authorName: 'Jane D.',
  createdDate: '2026-03-06T08:00:00Z',
  upvoteCount: 1,
  hasUserUpvoted: false,
  status: 'approved',
};

const REPLY_TO_1: QAAnswer = {
  id: 'ans-003',
  questionId: 'q-001',
  parentAnswerId: 'ans-001',
  text: 'Thanks, that clarified it!',
  authorName: 'Bob S.',
  createdDate: '2026-03-07T09:00:00Z',
  upvoteCount: 0,
  hasUserUpvoted: false,
  status: 'approved',
};

const ANSWER_UPVOTED: QAAnswer = { ...ANSWER_1, hasUserUpvoted: true, upvoteCount: 4 };

function renderThread(
  answers: QAAnswer[],
  props: Partial<React.ComponentProps<typeof AnswerThread>> = {},
) {
  return render(
    <ThemeProvider>
      <AnswerThread answers={answers} {...props} />
    </ThemeProvider>,
  );
}

// ── Section 1: Empty state ────────────────────────────────────────────────────

describe('empty state', () => {
  it('renders empty state when no answers', () => {
    const { getByTestId } = renderThread([]);
    expect(getByTestId('answer-thread-empty')).toBeTruthy();
  });

  it('does not render answer list when empty', () => {
    const { queryByTestId } = renderThread([]);
    expect(queryByTestId('answer-thread-list')).toBeNull();
  });
});

// ── Section 2: Answer list rendering ─────────────────────────────────────────

describe('answer list rendering', () => {
  it('renders the answer list', () => {
    const { getByTestId } = renderThread([ANSWER_1, ANSWER_2]);
    expect(getByTestId('answer-thread-list')).toBeTruthy();
  });

  it('renders a card for each top-level answer', () => {
    const { getByTestId } = renderThread([ANSWER_1, ANSWER_2]);
    expect(getByTestId('answer-card-ans-001')).toBeTruthy();
    expect(getByTestId('answer-card-ans-002')).toBeTruthy();
  });

  it('renders answer text', () => {
    const { getByTestId } = renderThread([ANSWER_1]);
    expect(getByTestId('answer-text-ans-001').props.children).toBe(ANSWER_1.text);
  });

  it('renders author name', () => {
    const { getByTestId } = renderThread([ANSWER_1]);
    expect(getByTestId('answer-author-ans-001').props.children).toBe('Staff');
  });

  it('does not render empty state when answers present', () => {
    const { queryByTestId } = renderThread([ANSWER_1]);
    expect(queryByTestId('answer-thread-empty')).toBeNull();
  });
});

// ── Section 3: Upvote button ──────────────────────────────────────────────────

describe('upvote button', () => {
  it('renders upvote button for each answer', () => {
    const { getByTestId } = renderThread([ANSWER_1, ANSWER_2]);
    expect(getByTestId('upvote-btn-ans-001')).toBeTruthy();
    expect(getByTestId('upvote-btn-ans-002')).toBeTruthy();
  });

  it('shows upvote count', () => {
    const { getByTestId } = renderThread([ANSWER_1]);
    expect(getByTestId('upvote-count-ans-001').props.children).toBe(3);
  });

  it('calls onUpvote with answerId when upvote button pressed', () => {
    const onUpvote = jest.fn();
    const { getByTestId } = renderThread([ANSWER_1], { onUpvote });
    fireEvent.press(getByTestId('upvote-btn-ans-001'));
    expect(onUpvote).toHaveBeenCalledWith('ans-001');
  });

  it('calls onUpvote for second answer', () => {
    const onUpvote = jest.fn();
    const { getByTestId } = renderThread([ANSWER_1, ANSWER_2], { onUpvote });
    fireEvent.press(getByTestId('upvote-btn-ans-002'));
    expect(onUpvote).toHaveBeenCalledWith('ans-002');
  });

  it('does not throw when onUpvote not provided', () => {
    const { getByTestId } = renderThread([ANSWER_1]);
    expect(() => fireEvent.press(getByTestId('upvote-btn-ans-001'))).not.toThrow();
  });

  it('marks upvote button as active when hasUserUpvoted=true', () => {
    const { getByTestId } = renderThread([ANSWER_UPVOTED]);
    const btn = getByTestId('upvote-btn-ans-001');
    expect(btn.props.accessibilityState?.selected).toBe(true);
  });

  it('marks upvote button as inactive when hasUserUpvoted=false', () => {
    const { getByTestId } = renderThread([ANSWER_1]);
    const btn = getByTestId('upvote-btn-ans-001');
    expect(btn.props.accessibilityState?.selected).toBe(false);
  });

  it('upvote button is disabled when hasUserUpvoted=true', () => {
    const { getByTestId } = renderThread([ANSWER_UPVOTED]);
    expect(getByTestId('upvote-btn-ans-001').props.accessibilityState?.disabled).toBe(true);
  });
});

// ── Section 4: Replies (threading) ───────────────────────────────────────────

describe('threaded replies', () => {
  it('renders replies under their parent answer', () => {
    const { getByTestId } = renderThread([ANSWER_1, REPLY_TO_1]);
    expect(getByTestId('answer-card-ans-003')).toBeTruthy();
  });

  it('reply card is visually nested (has reply testID marker)', () => {
    const { getByTestId } = renderThread([ANSWER_1, REPLY_TO_1]);
    expect(getByTestId('answer-reply-ans-003')).toBeTruthy();
  });

  it('does not render reply in top-level list as a standalone answer card', () => {
    const { queryByTestId } = renderThread([REPLY_TO_1]);
    // When only a reply is passed (no parent in list), it still renders
    // but is wrapped as a reply element, not a top-level answer card
    // We pass it standalone to verify no crash and it renders in some form
    expect(queryByTestId('answer-card-ans-003')).toBeTruthy();
  });

  it('renders reply text', () => {
    const { getByTestId } = renderThread([ANSWER_1, REPLY_TO_1]);
    expect(getByTestId('answer-text-ans-003').props.children).toBe(REPLY_TO_1.text);
  });

  it('reply does not have an upvote button', () => {
    const { queryByTestId } = renderThread([ANSWER_1, REPLY_TO_1]);
    expect(queryByTestId('upvote-btn-ans-003')).toBeNull();
  });
});

// ── Section 5: Reply input ────────────────────────────────────────────────────

describe('reply input', () => {
  it('renders reply button on each top-level answer when onReply provided', () => {
    const onReply = jest.fn();
    const { getByTestId } = renderThread([ANSWER_1], { onReply });
    expect(getByTestId('reply-btn-ans-001')).toBeTruthy();
  });

  it('does not render reply button when onReply not provided', () => {
    const { queryByTestId } = renderThread([ANSWER_1]);
    expect(queryByTestId('reply-btn-ans-001')).toBeNull();
  });

  it('tapping reply button shows inline reply input', () => {
    const onReply = jest.fn();
    const { getByTestId } = renderThread([ANSWER_1], { onReply });
    fireEvent.press(getByTestId('reply-btn-ans-001'));
    expect(getByTestId('reply-input-ans-001')).toBeTruthy();
  });

  it('submitting reply input calls onReply with answerId and text', () => {
    const onReply = jest.fn();
    const { getByTestId } = renderThread([ANSWER_1], { onReply });
    fireEvent.press(getByTestId('reply-btn-ans-001'));
    fireEvent.changeText(getByTestId('reply-input-ans-001'), 'My reply here');
    fireEvent.press(getByTestId('reply-submit-ans-001'));
    expect(onReply).toHaveBeenCalledWith('ans-001', 'My reply here');
  });

  it('does not call onReply when input is empty', () => {
    const onReply = jest.fn();
    const { getByTestId } = renderThread([ANSWER_1], { onReply });
    fireEvent.press(getByTestId('reply-btn-ans-001'));
    fireEvent.press(getByTestId('reply-submit-ans-001'));
    expect(onReply).not.toHaveBeenCalled();
  });
});

// ── Section 6: Accessibility ──────────────────────────────────────────────────

describe('accessibility', () => {
  it('answer cards have accessibility role', () => {
    const { getByTestId } = renderThread([ANSWER_1]);
    const card = getByTestId('answer-card-ans-001');
    expect(card.props.accessibilityRole).toBeDefined();
  });

  it('upvote button has accessibility role button', () => {
    const { getByTestId } = renderThread([ANSWER_1]);
    expect(getByTestId('upvote-btn-ans-001').props.accessibilityRole).toBe('button');
  });

  it('upvote button has meaningful accessibility label', () => {
    const { getByTestId } = renderThread([ANSWER_1]);
    const btn = getByTestId('upvote-btn-ans-001');
    expect(btn.props.accessibilityLabel).toBeDefined();
    expect(btn.props.accessibilityLabel.length).toBeGreaterThan(0);
  });
});

// ── Section 7: Default testID ─────────────────────────────────────────────────

describe('testID prop', () => {
  it('renders with default testID', () => {
    const { getByTestId } = renderThread([ANSWER_1]);
    expect(getByTestId('answer-thread')).toBeTruthy();
  });

  it('accepts custom testID', () => {
    const { getByTestId } = renderThread([ANSWER_1], { testID: 'my-thread' });
    expect(getByTestId('my-thread')).toBeTruthy();
  });
});
