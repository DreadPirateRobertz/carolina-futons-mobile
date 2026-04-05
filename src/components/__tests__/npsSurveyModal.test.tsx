/**
 * NPSSurveyModal tests — cm-5cp
 *
 * Covers:
 *  - Render: score buttons 0–10 visible, dismiss button present
 *  - Score selection: button highlights on press, submit enabled
 *  - Submit disabled when no score selected
 *  - Submit calls submitNpsSurvey with correct payload (orderId, score, comment)
 *  - Comment optional: included when non-empty, omitted when empty/whitespace
 *  - Success state shown after submission
 *  - Error state shown on Wix failure
 *  - Dismiss button fires onDismiss
 *  - Overlay tap fires onDismiss
 *  - Already-submitted guard: shows already_submitted state for seen orderId
 *  - Comment truncated at MAX_COMMENT_LENGTH
 *  - isSubmitting: spinner shown during flight, submit disabled
 *  - null wixClient: shows error state (service returns success:false)
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NPSSurveyModal, MAX_COMMENT_LENGTH } from '../NPSSurveyModal';
import { submitNpsSurvey } from '@/services/npsSurvey';
import type { StorageAdapter } from '../NPSSurveyModal';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@/services/npsSurvey', () => ({
  submitNpsSurvey: jest.fn(),
}));

jest.mock('@/services/crashReporting', () => ({
  captureException: jest.fn(),
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      espresso: '#000',
      espressoLight: '#666',
      white: '#fff',
      sandBase: '#ccc',
      sandLight: '#eee',
      sunsetCoral: '#e74',
      errorText: '#c00',
    },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
    borderRadius: { sm: 4, md: 8, lg: 16 },
  }),
}));

const mockSubmitNpsSurvey = submitNpsSurvey as jest.Mock;

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeStorage(existingKey?: string): StorageAdapter {
  const store: Record<string, string> = existingKey ? { [existingKey]: '1' } : {};
  return {
    getItem: jest.fn(async (key) => store[key] ?? null),
    setItem: jest.fn(async (key, value) => { store[key] = value; }),
  };
}

const BASE_ORDER = 'order-test-001';

function renderModal(overrides: Partial<React.ComponentProps<typeof NPSSurveyModal>> = {}) {
  const onDismiss = jest.fn();
  const onSubmitted = jest.fn();
  const storage = makeStorage();
  const result = render(
    <NPSSurveyModal
      visible
      orderId={BASE_ORDER}
      wixClient={null}
      onDismiss={onDismiss}
      onSubmitted={onSubmitted}
      storage={storage}
      {...overrides}
    />,
  );
  return { ...result, onDismiss, onSubmitted, storage };
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockSubmitNpsSurvey.mockResolvedValue({ success: true, id: 'nps-resp-1' });
});

// ── Render ────────────────────────────────────────────────────────────────────

describe('NPSSurveyModal — render', () => {
  it('renders all 11 score buttons (0–10)', () => {
    const { getByTestId } = renderModal();
    for (let i = 0; i <= 10; i++) {
      expect(getByTestId(`nps-score-${i}`)).toBeTruthy();
    }
  });

  it('renders dismiss button', () => {
    const { getByTestId } = renderModal();
    expect(getByTestId('nps-dismiss-btn')).toBeTruthy();
  });

  it('renders nothing when visible=false', () => {
    const { queryByTestId } = renderModal({ visible: false });
    expect(queryByTestId('nps-survey-modal')).toBeNull();
  });

  it('submit button is disabled when no score selected', () => {
    const { getByTestId } = renderModal();
    const submitBtn = getByTestId('nps-submit-btn');
    expect(submitBtn.props.accessibilityState.disabled).toBe(true);
  });
});

// ── Score selection ───────────────────────────────────────────────────────────

describe('NPSSurveyModal — score selection', () => {
  it('enables submit after a score is selected', () => {
    const { getByTestId } = renderModal();
    fireEvent.press(getByTestId('nps-score-7'));
    expect(getByTestId('nps-submit-btn').props.accessibilityState.disabled).toBe(false);
  });

  it('marks selected score button as selected in accessibility state', () => {
    const { getByTestId } = renderModal();
    fireEvent.press(getByTestId('nps-score-9'));
    expect(getByTestId('nps-score-9').props.accessibilityState.selected).toBe(true);
    expect(getByTestId('nps-score-8').props.accessibilityState.selected).toBe(false);
  });

  it('changes selected score when a different button is tapped', () => {
    const { getByTestId } = renderModal();
    fireEvent.press(getByTestId('nps-score-3'));
    fireEvent.press(getByTestId('nps-score-8'));
    expect(getByTestId('nps-score-8').props.accessibilityState.selected).toBe(true);
    expect(getByTestId('nps-score-3').props.accessibilityState.selected).toBe(false);
  });
});

// ── Submit ────────────────────────────────────────────────────────────────────

describe('NPSSurveyModal — submit', () => {
  it('calls submitNpsSurvey with orderId and selected score', async () => {
    const fakeClient = { insertDataItem: jest.fn() };
    const { getByTestId } = renderModal({ wixClient: fakeClient });

    fireEvent.press(getByTestId('nps-score-8'));
    await act(async () => { fireEvent.press(getByTestId('nps-submit-btn')); });

    expect(mockSubmitNpsSurvey).toHaveBeenCalledWith(
      fakeClient,
      expect.objectContaining({ orderId: BASE_ORDER, score: 8 }),
    );
  });

  it('includes createdAt ISO timestamp in submission', async () => {
    const fakeClient = { insertDataItem: jest.fn() };
    const { getByTestId } = renderModal({ wixClient: fakeClient });

    fireEvent.press(getByTestId('nps-score-5'));
    await act(async () => { fireEvent.press(getByTestId('nps-submit-btn')); });

    const [, data] = mockSubmitNpsSurvey.mock.calls[0];
    expect(data.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('includes non-empty comment in submission', async () => {
    const fakeClient = { insertDataItem: jest.fn() };
    const { getByTestId } = renderModal({ wixClient: fakeClient });

    fireEvent.press(getByTestId('nps-score-9'));
    fireEvent.changeText(getByTestId('nps-comment-input'), 'Great quality!');
    await act(async () => { fireEvent.press(getByTestId('nps-submit-btn')); });

    const [, data] = mockSubmitNpsSurvey.mock.calls[0];
    expect(data.comment).toBe('Great quality!');
  });

  it('omits comment when empty string', async () => {
    const fakeClient = { insertDataItem: jest.fn() };
    const { getByTestId } = renderModal({ wixClient: fakeClient });

    fireEvent.press(getByTestId('nps-score-6'));
    await act(async () => { fireEvent.press(getByTestId('nps-submit-btn')); });

    const [, data] = mockSubmitNpsSurvey.mock.calls[0];
    expect('comment' in data).toBe(false);
  });

  it('omits whitespace-only comment', async () => {
    const fakeClient = { insertDataItem: jest.fn() };
    const { getByTestId } = renderModal({ wixClient: fakeClient });

    fireEvent.press(getByTestId('nps-score-4'));
    fireEvent.changeText(getByTestId('nps-comment-input'), '   ');
    await act(async () => { fireEvent.press(getByTestId('nps-submit-btn')); });

    const [, data] = mockSubmitNpsSurvey.mock.calls[0];
    expect('comment' in data).toBe(false);
  });

  it('shows success state after successful submission', async () => {
    const fakeClient = { insertDataItem: jest.fn() };
    const { getByTestId } = renderModal({ wixClient: fakeClient });

    fireEvent.press(getByTestId('nps-score-10'));
    await act(async () => { fireEvent.press(getByTestId('nps-submit-btn')); });

    await waitFor(() => expect(getByTestId('nps-success-state')).toBeTruthy());
  });

  it('calls onSubmitted after successful submission', async () => {
    const fakeClient = { insertDataItem: jest.fn() };
    const { getByTestId, onSubmitted } = renderModal({ wixClient: fakeClient });

    fireEvent.press(getByTestId('nps-score-7'));
    await act(async () => { fireEvent.press(getByTestId('nps-submit-btn')); });

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledTimes(1));
  });

  it('persists submission guard to storage after success', async () => {
    const fakeClient = { insertDataItem: jest.fn() };
    const { getByTestId, storage } = renderModal({ wixClient: fakeClient });

    fireEvent.press(getByTestId('nps-score-8'));
    await act(async () => { fireEvent.press(getByTestId('nps-submit-btn')); });

    await waitFor(() => {
      expect((storage.setItem as jest.Mock)).toHaveBeenCalledWith(
        expect.stringContaining(BASE_ORDER),
        expect.any(String),
      );
    });
  });
});

// ── Error state ───────────────────────────────────────────────────────────────

describe('NPSSurveyModal — error state', () => {
  it('shows error state when Wix returns success:false', async () => {
    mockSubmitNpsSurvey.mockResolvedValue({ success: false, error: 'Server error' });
    const fakeClient = { insertDataItem: jest.fn() };
    const { getByTestId } = renderModal({ wixClient: fakeClient });

    fireEvent.press(getByTestId('nps-score-2'));
    await act(async () => { fireEvent.press(getByTestId('nps-submit-btn')); });

    await waitFor(() => expect(getByTestId('nps-error-state')).toBeTruthy());
  });

  it('null wixClient results in error state (service refuses without client)', async () => {
    // service returns { success: false } when client is null
    mockSubmitNpsSurvey.mockResolvedValue({ success: false, error: 'Wix client unavailable' });
    const { getByTestId } = renderModal({ wixClient: null });

    fireEvent.press(getByTestId('nps-score-5'));
    await act(async () => { fireEvent.press(getByTestId('nps-submit-btn')); });

    await waitFor(() => expect(getByTestId('nps-error-state')).toBeTruthy());
  });
});

// ── Dismiss ───────────────────────────────────────────────────────────────────

describe('NPSSurveyModal — dismiss', () => {
  it('calls onDismiss when dismiss button is pressed', () => {
    const { getByTestId, onDismiss } = renderModal();
    fireEvent.press(getByTestId('nps-dismiss-btn'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when overlay is tapped', () => {
    const { getByTestId, onDismiss } = renderModal();
    fireEvent.press(getByTestId('nps-modal-overlay'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

// ── Already-submitted guard ───────────────────────────────────────────────────

describe('NPSSurveyModal — already submitted guard', () => {
  it('shows already-submitted state when storage has the orderId key', async () => {
    const storage = makeStorage(`nps_submitted_${BASE_ORDER}`);
    const { getByTestId } = render(
      <NPSSurveyModal
        visible
        orderId={BASE_ORDER}
        onDismiss={jest.fn()}
        storage={storage}
      />,
    );

    await waitFor(() => expect(getByTestId('nps-already-submitted')).toBeTruthy());
  });

  it('shows survey form when storage has no record for the orderId', async () => {
    const { getByTestId } = renderModal();
    // Give storage effect time to resolve
    await act(async () => {});
    expect(getByTestId('nps-submit-btn')).toBeTruthy();
  });
});

// ── Comment max length ────────────────────────────────────────────────────────

describe('NPSSurveyModal — comment length', () => {
  it('truncates comment to MAX_COMMENT_LENGTH characters', () => {
    const { getByTestId } = renderModal();
    const longComment = 'x'.repeat(MAX_COMMENT_LENGTH + 50);
    fireEvent.changeText(getByTestId('nps-comment-input'), longComment);
    const input = getByTestId('nps-comment-input');
    // The onChangeText handler slices the value
    expect((input.props.value ?? '').length).toBeLessThanOrEqual(MAX_COMMENT_LENGTH);
  });
});

// ── Spinner during submission ─────────────────────────────────────────────────

describe('NPSSurveyModal — submitting state', () => {
  it('disables submit button while submission is in flight', async () => {
    let resolve!: (v: { success: boolean; id: string }) => void;
    mockSubmitNpsSurvey.mockImplementation(
      () => new Promise((res) => { resolve = res; }),
    );
    const fakeClient = { insertDataItem: jest.fn() };
    const { getByTestId } = renderModal({ wixClient: fakeClient });

    fireEvent.press(getByTestId('nps-score-7'));
    act(() => { fireEvent.press(getByTestId('nps-submit-btn')); });

    // While in-flight, button should be disabled
    await waitFor(() =>
      expect(getByTestId('nps-submit-btn').props.accessibilityState.disabled).toBe(true),
    );

    // Resolve and clean up
    await act(async () => { resolve({ success: true, id: 'x' }); });
  });
});
