/**
 * TDD tests for NPSSurveyModal — deacon-kon2.
 *
 * Tests: rendering, score selection, submit (success/error), dismiss,
 * text comment, char-limit validation, double-tap guard, already-submitted guard.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NPSSurveyModal } from '../NPSSurveyModal';
import { submitNpsSurvey } from '@/services/npsSurvey';
import type { StorageAdapter } from '../NPSSurveyModal';

// ── Module mocks ──────────────────────────────────────────────────────────────

jest.mock('@/services/npsSurvey', () => ({
  submitNpsSurvey: jest.fn(),
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      espresso: '#2C1810',
      espressoLight: '#6B5B4F',
      sandLight: '#F5EDD8',
      sand: '#E8D5B7',
      white: '#FFFFFF',
      sunsetCoral: '#E8845C',
      success: '#4CAF50',
      errorRed: '#D32F2F',
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    borderRadius: { sm: 4, md: 8, lg: 16, pill: 20 },
    shadows: { modal: {} },
  }),
}));

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(), impactAsync: jest.fn() }));

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockSubmitNpsSurvey = submitNpsSurvey as jest.Mock;

/** Fresh storage mock for each test — injected via prop to avoid dynamic import issues. */
function makeStorage(initialRecord?: string): {
  storage: StorageAdapter;
  getItem: jest.Mock;
  setItem: jest.Mock;
} {
  const getItem = jest.fn().mockResolvedValue(initialRecord ?? null);
  const setItem = jest.fn().mockResolvedValue(undefined);
  return { storage: { getItem, setItem }, getItem, setItem };
}

const baseProps = {
  visible: true,
  orderId: 'order-001',
  onDismiss: jest.fn(),
};

function renderModal(
  props?: Partial<typeof baseProps & { onSubmitted?: () => void; storage?: StorageAdapter }>,
) {
  // Default: fresh storage with no prior submission
  const { storage } = makeStorage();
  return render(<NPSSurveyModal {...baseProps} storage={storage} {...props} />);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSubmitNpsSurvey.mockResolvedValue({ success: true, id: 'survey-xyz' });
});

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('NPSSurveyModal — rendering', () => {
  it('renders when visible=true', () => {
    const { getByTestId } = renderModal();
    expect(getByTestId('nps-survey-modal')).toBeTruthy();
  });

  it('does not render content when visible=false', () => {
    const { queryByTestId } = renderModal({ visible: false });
    expect(queryByTestId('nps-survey-modal')).toBeNull();
  });

  it('shows the NPS prompt text', () => {
    const { getByText } = renderModal();
    expect(getByText(/How likely are you to recommend/i)).toBeTruthy();
  });

  it('renders 11 score buttons (0–10)', () => {
    const { getAllByTestId } = renderModal();
    const buttons = getAllByTestId(/^nps-score-/);
    expect(buttons).toHaveLength(11);
  });

  it('renders score buttons labelled 0 through 10', () => {
    const { getByTestId } = renderModal();
    for (let i = 0; i <= 10; i++) {
      expect(getByTestId(`nps-score-${i}`)).toBeTruthy();
    }
  });

  it('renders a comment input field', () => {
    const { getByTestId } = renderModal();
    expect(getByTestId('nps-comment-input')).toBeTruthy();
  });

  it('renders submit and dismiss buttons', () => {
    const { getByTestId } = renderModal();
    expect(getByTestId('nps-submit-btn')).toBeTruthy();
    expect(getByTestId('nps-dismiss-btn')).toBeTruthy();
  });
});

// ── Score selection ───────────────────────────────────────────────────────────

describe('NPSSurveyModal — score selection', () => {
  it('submit button is disabled before a score is selected', () => {
    const { getByTestId } = renderModal();
    const btn = getByTestId('nps-submit-btn');
    expect(btn.props.accessibilityState?.disabled ?? btn.props.disabled).toBeTruthy();
  });

  it('submit button is enabled after a score is selected', () => {
    const { getByTestId } = renderModal();
    fireEvent.press(getByTestId('nps-score-8'));
    const btn = getByTestId('nps-submit-btn');
    expect(btn.props.accessibilityState?.disabled ?? btn.props.disabled).toBeFalsy();
  });

  it('marks the selected score button as active', () => {
    const { getByTestId } = renderModal();
    fireEvent.press(getByTestId('nps-score-7'));
    const btn = getByTestId('nps-score-7');
    expect(btn.props.accessibilityState?.selected ?? btn.props.selected).toBeTruthy();
  });

  it('selecting a new score deselects the previous one', () => {
    const { getByTestId } = renderModal();
    fireEvent.press(getByTestId('nps-score-5'));
    fireEvent.press(getByTestId('nps-score-9'));
    expect(
      getByTestId('nps-score-5').props.accessibilityState?.selected ??
        getByTestId('nps-score-5').props.selected,
    ).toBeFalsy();
    expect(
      getByTestId('nps-score-9').props.accessibilityState?.selected ??
        getByTestId('nps-score-9').props.selected,
    ).toBeTruthy();
  });
});

// ── Dismiss ───────────────────────────────────────────────────────────────────

describe('NPSSurveyModal — dismiss', () => {
  it('calls onDismiss when dismiss button pressed', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = renderModal({ onDismiss });
    fireEvent.press(getByTestId('nps-dismiss-btn'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when overlay backdrop pressed', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = renderModal({ onDismiss });
    fireEvent.press(getByTestId('nps-modal-overlay'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

// ── Submit ────────────────────────────────────────────────────────────────────

describe('NPSSurveyModal — submit', () => {
  it('calls submitNpsSurvey with orderId and selected score', async () => {
    const { getByTestId } = renderModal();
    fireEvent.press(getByTestId('nps-score-9'));
    fireEvent.press(getByTestId('nps-submit-btn'));
    await waitFor(() => {
      expect(mockSubmitNpsSurvey).toHaveBeenCalledWith(
        null,
        expect.objectContaining({ orderId: 'order-001', score: 9 }),
      );
    });
  });

  it('shows success state after successful submit', async () => {
    const { getByTestId } = renderModal();
    fireEvent.press(getByTestId('nps-score-10'));
    fireEvent.press(getByTestId('nps-submit-btn'));
    await waitFor(() => {
      expect(getByTestId('nps-success-state')).toBeTruthy();
    });
  });

  it('calls onSubmitted callback after successful submit', async () => {
    const onSubmitted = jest.fn();
    const { getByTestId } = renderModal({ onSubmitted });
    fireEvent.press(getByTestId('nps-score-10'));
    fireEvent.press(getByTestId('nps-submit-btn'));
    await waitFor(() => {
      expect(onSubmitted).toHaveBeenCalledTimes(1);
    });
  });

  it('persists submission to storage to guard against resubmit', async () => {
    const { storage, setItem } = makeStorage();
    const { getByTestId } = render(
      <NPSSurveyModal {...baseProps} storage={storage} />,
    );
    fireEvent.press(getByTestId('nps-score-8'));
    fireEvent.press(getByTestId('nps-submit-btn'));
    await waitFor(() => {
      expect(setItem).toHaveBeenCalledWith('nps_submitted_order-001', '1');
    });
  });

  it('submit includes comment when text entered', async () => {
    const { getByTestId } = renderModal();
    fireEvent.press(getByTestId('nps-score-7'));
    fireEvent.changeText(getByTestId('nps-comment-input'), 'Fast delivery!');
    fireEvent.press(getByTestId('nps-submit-btn'));
    await waitFor(() => {
      expect(mockSubmitNpsSurvey).toHaveBeenCalledWith(
        null,
        expect.objectContaining({ comment: 'Fast delivery!' }),
      );
    });
  });

  it('submit omits comment when input is empty', async () => {
    const { getByTestId } = renderModal();
    fireEvent.press(getByTestId('nps-score-6'));
    fireEvent.press(getByTestId('nps-submit-btn'));
    await waitFor(() => {
      const [, data] = mockSubmitNpsSurvey.mock.calls[0];
      expect('comment' in data).toBe(false);
    });
  });

  it('submit omits comment when input is whitespace-only', async () => {
    const { getByTestId } = renderModal();
    fireEvent.press(getByTestId('nps-score-5'));
    fireEvent.changeText(getByTestId('nps-comment-input'), '   ');
    fireEvent.press(getByTestId('nps-submit-btn'));
    await waitFor(() => {
      const [, data] = mockSubmitNpsSurvey.mock.calls[0];
      expect('comment' in data).toBe(false);
    });
  });
});

// ── Network error ─────────────────────────────────────────────────────────────

describe('NPSSurveyModal — network error', () => {
  it('shows error message when submit fails', async () => {
    mockSubmitNpsSurvey.mockResolvedValue({ success: false, error: 'Network timeout' });
    const { getByTestId, getByText } = renderModal();
    fireEvent.press(getByTestId('nps-score-3'));
    fireEvent.press(getByTestId('nps-submit-btn'));
    await waitFor(() => {
      expect(getByTestId('nps-error-state')).toBeTruthy();
      expect(getByText(/Network timeout/i)).toBeTruthy();
    });
  });

  it('shows error when submitNpsSurvey throws', async () => {
    mockSubmitNpsSurvey.mockRejectedValue(new Error('Connection refused'));
    const { getByTestId } = renderModal();
    fireEvent.press(getByTestId('nps-score-4'));
    fireEvent.press(getByTestId('nps-submit-btn'));
    await waitFor(() => {
      expect(getByTestId('nps-error-state')).toBeTruthy();
    });
  });

  it('does not show success state on error', async () => {
    mockSubmitNpsSurvey.mockResolvedValue({ success: false, error: 'Server down' });
    const { getByTestId, queryByTestId } = renderModal();
    fireEvent.press(getByTestId('nps-score-2'));
    fireEvent.press(getByTestId('nps-submit-btn'));
    await waitFor(() => {
      expect(getByTestId('nps-error-state')).toBeTruthy();
    });
    expect(queryByTestId('nps-success-state')).toBeNull();
  });

  it('re-enables submit after error so user can retry', async () => {
    mockSubmitNpsSurvey.mockResolvedValue({ success: false, error: 'Timeout' });
    const { getByTestId } = renderModal();
    fireEvent.press(getByTestId('nps-score-1'));
    fireEvent.press(getByTestId('nps-submit-btn'));
    await waitFor(() => {
      expect(getByTestId('nps-error-state')).toBeTruthy();
    });
    const btn = getByTestId('nps-submit-btn');
    expect(btn.props.accessibilityState?.disabled ?? btn.props.disabled).toBeFalsy();
  });
});

// ── Double-tap guard ──────────────────────────────────────────────────────────

describe('NPSSurveyModal — double-tap guard', () => {
  it('disables submit button while submission is in flight', async () => {
    let resolveSubmit!: (v: { success: boolean; id: string }) => void;
    mockSubmitNpsSurvey.mockImplementation(
      () => new Promise((res) => { resolveSubmit = res; }),
    );

    const { getByTestId } = renderModal();
    fireEvent.press(getByTestId('nps-score-9'));
    fireEvent.press(getByTestId('nps-submit-btn'));

    const btn = getByTestId('nps-submit-btn');
    expect(btn.props.accessibilityState?.disabled ?? btn.props.disabled).toBeTruthy();

    resolveSubmit({ success: true, id: 'x' });
    await waitFor(() => getByTestId('nps-success-state'));
  });

  it('does not call submitNpsSurvey twice on rapid double-press', async () => {
    let resolveSubmit!: (v: { success: boolean; id: string }) => void;
    mockSubmitNpsSurvey.mockImplementation(
      () => new Promise((res) => { resolveSubmit = res; }),
    );

    const { getByTestId } = renderModal();
    fireEvent.press(getByTestId('nps-score-9'));
    fireEvent.press(getByTestId('nps-submit-btn'));
    fireEvent.press(getByTestId('nps-submit-btn'));

    resolveSubmit({ success: true, id: 'x' });
    await waitFor(() => getByTestId('nps-success-state'));

    expect(mockSubmitNpsSurvey).toHaveBeenCalledTimes(1);
  });
});

// ── Already-submitted guard ───────────────────────────────────────────────────

describe('NPSSurveyModal — already-submitted guard', () => {
  it('shows already-submitted state when storage has a record for this orderId', async () => {
    const { storage } = makeStorage('1'); // pre-seeded with '1'
    const { getByTestId } = render(
      <NPSSurveyModal {...baseProps} storage={storage} />,
    );
    await waitFor(() => {
      expect(getByTestId('nps-already-submitted')).toBeTruthy();
    });
  });

  it('does not show already-submitted state when storage has no record', async () => {
    const { storage } = makeStorage(undefined); // no record
    const { queryByTestId } = render(
      <NPSSurveyModal {...baseProps} storage={storage} />,
    );
    // Give effects time to settle then confirm no already-submitted state
    await waitFor(() => {
      expect(queryByTestId('nps-already-submitted')).toBeNull();
    });
  });

  it('does not show already-submitted state when visible=false', () => {
    const { storage } = makeStorage('1');
    const { queryByTestId } = render(
      <NPSSurveyModal {...baseProps} visible={false} storage={storage} />,
    );
    expect(queryByTestId('nps-already-submitted')).toBeNull();
  });
});

// ── Comment text validation ───────────────────────────────────────────────────

describe('NPSSurveyModal — comment validation', () => {
  it('allows typing a comment up to MAX_COMMENT_LENGTH characters', () => {
    const { getByTestId } = renderModal();
    const longComment = 'a'.repeat(500);
    fireEvent.changeText(getByTestId('nps-comment-input'), longComment);
    expect(getByTestId('nps-comment-input').props.value).toBe(longComment);
  });

  it('shows character count when comment is typed', () => {
    const { getByTestId, getByText } = renderModal();
    fireEvent.changeText(getByTestId('nps-comment-input'), 'Hello');
    expect(getByText(/5\s*\/\s*500/)).toBeTruthy();
  });

  it('truncates input at MAX_COMMENT_LENGTH (500) characters', () => {
    const { getByTestId } = renderModal();
    const tooLong = 'b'.repeat(501);
    fireEvent.changeText(getByTestId('nps-comment-input'), tooLong);
    expect(getByTestId('nps-comment-input').props.value.length).toBeLessThanOrEqual(500);
  });
});
