/**
 * StyleQuizScreen edge-case tests — cm-ecy
 *
 * Covers gaps in styleQuizScreen.test.tsx / styleQuizScreen.deeper.test.tsx:
 *  - Incomplete quiz: save button hidden mid-quiz and after back-from-completion
 *  - Back navigation: save button disappears/reappears, onBack/onComplete NOT fired on nav
 *  - Network error variants: double-press save, correct payload shape, no premature save
 *  - Empty/null preferences at completion: fallback text in body
 *  - Single-option per step: every use option tested in completion body
 *  - Retake flow: second pass saves updated values
 *  - Result caching: pre-loaded style and primaryUse pre-selected on correct steps
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { StyleQuizScreen } from '../StyleQuizScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      sandBase: '#E8D5B7',
      sandLight: '#F2E8D5',
      sandDark: '#D4BC96',
      espresso: '#3A2518',
      espressoLight: '#5C4033',
      sunsetCoral: '#E8845C',
      sunsetCoralLight: '#F2A882',
      mountainBlue: '#5B8FA8',
      white: '#FFFFFF',
      muted: '#999999',
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
    borderRadius: { button: 8, pill: 9999, card: 12, md: 8 },
    typography: {
      headingFamily: 'PlayfairDisplay_700Bold',
      bodyFamily: 'SourceSans3_400Regular',
      bodyFamilySemiBold: 'SourceSans3_600SemiBold',
      heroTitle: { fontSize: 42, fontWeight: '700', lineHeight: 46 },
      h1: { fontSize: 34, fontWeight: '700', lineHeight: 39 },
      body: { fontSize: 15, fontWeight: '400', lineHeight: 24 },
      button: { fontSize: 15, fontWeight: '600', lineHeight: 15, letterSpacing: 0.6 },
    },
    shadows: { button: {}, card: {}, cardHover: {} },
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('@/services/crashReporting', () => ({
  captureException: jest.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockOnComplete = jest.fn();
const mockOnBack = jest.fn();

function renderQuiz() {
  return render(<StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />);
}

function completeQuiz(
  room = 'living-room',
  style = 'modern',
  use = 'seating',
  screen: ReturnType<typeof renderQuiz>,
) {
  const { getByTestId } = screen;
  fireEvent.press(getByTestId(`quiz-option-${room}`));
  fireEvent.press(getByTestId(`quiz-option-${style}`));
  fireEvent.press(getByTestId(`quiz-option-${use}`));
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Incomplete quiz / save button visibility ─────────────────────────────────

describe('StyleQuizScreen — save button visibility', () => {
  it('save button is absent at step 0 (no answers yet)', () => {
    const { queryByTestId } = renderQuiz();
    expect(queryByTestId('style-quiz-save-button')).toBeNull();
  });

  it('save button is absent after selecting room (step 1)', () => {
    const { getByTestId, queryByTestId } = renderQuiz();
    fireEvent.press(getByTestId('quiz-option-bedroom'));
    expect(queryByTestId('style-quiz-save-button')).toBeNull();
  });

  it('save button is absent after selecting room + style (step 2)', () => {
    const { getByTestId, queryByTestId } = renderQuiz();
    fireEvent.press(getByTestId('quiz-option-studio'));
    fireEvent.press(getByTestId('quiz-option-rustic'));
    expect(queryByTestId('style-quiz-save-button')).toBeNull();
  });

  it('save button appears only at completion (step 3)', () => {
    const screen = renderQuiz();
    const { getByTestId, queryByTestId } = screen;
    expect(queryByTestId('style-quiz-save-button')).toBeNull();
    completeQuiz('bedroom', 'classic', 'guest-bed', screen);
    expect(getByTestId('style-quiz-save-button')).toBeTruthy();
  });

  it('save button disappears after pressing back from completion to step 2', () => {
    const screen = renderQuiz();
    completeQuiz('living-room', 'modern', 'seating', screen);
    const { getByTestId, queryByTestId } = screen;
    expect(getByTestId('style-quiz-save-button')).toBeTruthy();
    fireEvent.press(getByTestId('style-quiz-back-button')); // completion → step 2
    expect(queryByTestId('style-quiz-save-button')).toBeNull();
  });

  it('save button reappears after pressing back from completion then selecting a use option', () => {
    const screen = renderQuiz();
    completeQuiz('guest-room', 'minimalist', 'kid-friendly', screen);
    const { getByTestId } = screen;
    fireEvent.press(getByTestId('style-quiz-back-button')); // completion → step 2
    fireEvent.press(getByTestId('quiz-option-dual-purpose')); // step 2 → completion
    expect(getByTestId('style-quiz-save-button')).toBeTruthy();
  });
});

// ─── Back navigation edge cases ───────────────────────────────────────────────

describe('StyleQuizScreen — back navigation edge cases', () => {
  it('pressing back from completion does not call onComplete or onBack', () => {
    const screen = renderQuiz();
    completeQuiz('bedroom', 'rustic', 'dual-purpose', screen);
    fireEvent.press(screen.getByTestId('style-quiz-back-button')); // completion → step 2
    expect(mockOnComplete).not.toHaveBeenCalled();
    expect(mockOnBack).not.toHaveBeenCalled();
  });

  it('pressing back from step 2 does not call onBack', () => {
    const { getByTestId } = renderQuiz();
    fireEvent.press(getByTestId('quiz-option-living-room'));
    fireEvent.press(getByTestId('quiz-option-modern'));
    fireEvent.press(getByTestId('style-quiz-back-button')); // step 2 → step 1
    expect(mockOnBack).not.toHaveBeenCalled();
  });

  it('step 2 is shown again after back from completion', () => {
    const screen = renderQuiz();
    completeQuiz('studio', 'classic', 'seating', screen);
    fireEvent.press(screen.getByTestId('style-quiz-back-button'));
    expect(screen.getByTestId('style-quiz-step-2')).toBeTruthy();
  });

  it('completion step is absent after pressing back from it', () => {
    const screen = renderQuiz();
    completeQuiz('guest-room', 'minimalist', 'kid-friendly', screen);
    const { getByTestId, queryByTestId } = screen;
    expect(getByTestId('style-quiz-completion')).toBeTruthy();
    fireEvent.press(getByTestId('style-quiz-back-button'));
    expect(queryByTestId('style-quiz-completion')).toBeNull();
  });
});

// ─── Network error / save edge cases ─────────────────────────────────────────

describe('StyleQuizScreen — save edge cases', () => {
  it('AsyncStorage.setItem is NOT called until save button is pressed', async () => {
    const screen = renderQuiz();
    completeQuiz('living-room', 'modern', 'seating', screen);
    // Completion reached but save not pressed
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('AsyncStorage.setItem stores the compact payload with room/style/primaryUse keys', async () => {
    const screen = renderQuiz();
    completeQuiz('bedroom', 'rustic', 'guest-bed', screen);
    fireEvent.press(screen.getByTestId('style-quiz-save-button'));
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@carolina_futons_style_preferences',
        JSON.stringify({
          room: 'bedroom',
          style: 'rustic',
          primaryUse: 'guest-bed',
        }),
      );
    });
  });

  it('pressing save twice calls onComplete twice (no double-press guard)', async () => {
    const screen = renderQuiz();
    completeQuiz('studio', 'classic', 'dual-purpose', screen);
    fireEvent.press(screen.getByTestId('style-quiz-save-button'));
    fireEvent.press(screen.getByTestId('style-quiz-save-button'));
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledTimes(2);
    });
  });

  it('AsyncStorage.setItem receives the updated selections from a retake', async () => {
    const screen = renderQuiz();
    // First pass
    completeQuiz('living-room', 'modern', 'seating', screen);
    fireEvent.press(screen.getByTestId('style-quiz-save-button'));
    await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1));

    // Go back and re-answer with different values
    fireEvent.press(screen.getByTestId('style-quiz-back-button')); // completion → step 2
    fireEvent.press(screen.getByTestId('style-quiz-back-button')); // step 2 → step 1
    fireEvent.press(screen.getByTestId('style-quiz-back-button')); // step 1 → step 0
    fireEvent.press(screen.getByTestId('quiz-option-guest-room'));
    fireEvent.press(screen.getByTestId('quiz-option-rustic'));
    fireEvent.press(screen.getByTestId('quiz-option-kid-friendly'));
    fireEvent.press(screen.getByTestId('style-quiz-save-button'));

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenLastCalledWith(
        '@carolina_futons_style_preferences',
        JSON.stringify({
          room: 'guest-room',
          style: 'rustic',
          primaryUse: 'kid-friendly',
        }),
      );
    });
  });
});

// ─── Every use-option produces correct completion body ────────────────────────

describe('StyleQuizScreen — all use options in completion body', () => {
  it('"guest-bed" use renders "guest bed" in completion body', () => {
    const screen = renderQuiz();
    completeQuiz('bedroom', 'classic', 'guest-bed', screen);
    expect(screen.getByText(/guest bed/i)).toBeTruthy();
  });

  it('"dual-purpose" use renders "dual-purpose" in completion body', () => {
    const screen = renderQuiz();
    completeQuiz('studio', 'modern', 'dual-purpose', screen);
    expect(screen.getByText(/dual-purpose/i)).toBeTruthy();
  });

  it('"kid-friendly" use renders "kid-friendly" in completion body', () => {
    const screen = renderQuiz();
    completeQuiz('guest-room', 'rustic', 'kid-friendly', screen);
    expect(screen.getByText(/kid-friendly/i)).toBeTruthy();
  });

  it('"seating" use renders "everyday seating" in completion body', () => {
    const screen = renderQuiz();
    completeQuiz('living-room', 'minimalist', 'seating', screen);
    expect(screen.getByText(/everyday seating/i)).toBeTruthy();
  });
});

// ─── All room options appear in completion body ───────────────────────────────

describe('StyleQuizScreen — all room options in completion body', () => {
  it('"bedroom" room renders "bedroom" in completion body', () => {
    const screen = renderQuiz();
    completeQuiz('bedroom', 'modern', 'seating', screen);
    expect(screen.getByText(/bedroom/i)).toBeTruthy();
  });

  it('"studio" room renders "studio" in completion body', () => {
    const screen = renderQuiz();
    completeQuiz('studio', 'rustic', 'seating', screen);
    expect(screen.getByText(/studio/i)).toBeTruthy();
  });

  it('"guest-room" room renders "guest room" in completion body', () => {
    const screen = renderQuiz();
    completeQuiz('guest-room', 'classic', 'seating', screen);
    expect(screen.getByText(/guest room/i)).toBeTruthy();
  });
});

// ─── Retake flow ──────────────────────────────────────────────────────────────

describe('StyleQuizScreen — retake flow', () => {
  it('completion body updates when retaking quiz with different selections', () => {
    const screen = renderQuiz();
    completeQuiz('living-room', 'modern', 'seating', screen);
    // Verify first completion text
    expect(screen.getByText(/modern & clean/i)).toBeTruthy();

    // Go back to Q1 and re-answer
    fireEvent.press(screen.getByTestId('style-quiz-back-button'));
    fireEvent.press(screen.getByTestId('style-quiz-back-button'));
    fireEvent.press(screen.getByTestId('style-quiz-back-button'));
    completeQuiz('bedroom', 'rustic', 'guest-bed', screen);

    // Completion body should now reflect new selections
    expect(screen.getByText(/rustic & warm/i)).toBeTruthy();
    expect(screen.getByText(/bedroom/i)).toBeTruthy();
    expect(screen.getByText(/guest bed/i)).toBeTruthy();
  });

  it('progress returns to "1 / 4" after full back-chain from completion', () => {
    const screen = renderQuiz();
    completeQuiz('studio', 'minimalist', 'kid-friendly', screen);
    fireEvent.press(screen.getByTestId('style-quiz-back-button'));
    fireEvent.press(screen.getByTestId('style-quiz-back-button'));
    fireEvent.press(screen.getByTestId('style-quiz-back-button'));
    expect(screen.getByText('1 / 4')).toBeTruthy();
  });

  it('quiz step 0 shown after full back-chain from completion', () => {
    const screen = renderQuiz();
    completeQuiz('guest-room', 'classic', 'dual-purpose', screen);
    fireEvent.press(screen.getByTestId('style-quiz-back-button'));
    fireEvent.press(screen.getByTestId('style-quiz-back-button'));
    fireEvent.press(screen.getByTestId('style-quiz-back-button'));
    expect(screen.getByTestId('style-quiz-step-0')).toBeTruthy();
  });
});

// ─── Result caching: pre-loaded preferences pre-select correct options ────────

describe('StyleQuizScreen — result caching (pre-loaded preferences)', () => {
  it('pre-loaded stylePreference is shown as selected at step 1', async () => {
    const saved = JSON.stringify({ room: 'bedroom', style: 'classic', primaryUse: 'seating' });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(saved);
    const { getByTestId } = renderQuiz();
    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalled());

    // Navigate to step 1
    fireEvent.press(getByTestId('quiz-option-bedroom')); // room select → step 1
    expect(getByTestId('quiz-option-classic').props.accessibilityState?.selected).toBe(true);
    expect(getByTestId('quiz-option-modern').props.accessibilityState?.selected).toBe(false);
  });

  it('pre-loaded primaryUse is shown as selected at step 2', async () => {
    const saved = JSON.stringify({ room: 'studio', style: 'modern', primaryUse: 'dual-purpose' });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(saved);
    const { getByTestId } = renderQuiz();
    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalled());

    // Navigate to step 2
    fireEvent.press(getByTestId('quiz-option-studio'));
    fireEvent.press(getByTestId('quiz-option-modern'));
    expect(getByTestId('quiz-option-dual-purpose').props.accessibilityState?.selected).toBe(true);
    expect(getByTestId('quiz-option-seating').props.accessibilityState?.selected).toBe(false);
  });

  it('pre-loaded room using StylePreferences shape (roomType key) pre-selects step 0 option', async () => {
    // StylePreferences shape (not compact) — uses roomType field
    const saved = JSON.stringify({
      roomType: 'guest-room',
      stylePreference: 'minimalist',
      primaryUse: 'kid-friendly',
      sizeNeeds: null,
      budgetRange: null,
    });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(saved);
    const { getByTestId } = renderQuiz();
    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalled());

    expect(getByTestId('quiz-option-guest-room').props.accessibilityState?.selected).toBe(true);
  });

  it('pre-loaded stylePreference using StylePreferences shape pre-selects step 1', async () => {
    const saved = JSON.stringify({
      roomType: 'living-room',
      stylePreference: 'minimalist',
      primaryUse: 'seating',
      sizeNeeds: null,
      budgetRange: null,
    });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(saved);
    const { getByTestId } = renderQuiz();
    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalled());

    // Navigate to step 1
    fireEvent.press(getByTestId('quiz-option-living-room'));
    expect(getByTestId('quiz-option-minimalist').props.accessibilityState?.selected).toBe(true);
    expect(getByTestId('quiz-option-rustic').props.accessibilityState?.selected).toBe(false);
  });

  it('all three pre-loaded prefs shown in completion body when user advances through each step', async () => {
    const saved = JSON.stringify({ room: 'studio', style: 'rustic', primaryUse: 'guest-bed' });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(saved);
    const { getByTestId, getByText } = renderQuiz();
    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalled());

    // Advance through each step accepting pre-loaded selections
    fireEvent.press(getByTestId('quiz-option-studio'));
    fireEvent.press(getByTestId('quiz-option-rustic'));
    fireEvent.press(getByTestId('quiz-option-guest-bed'));

    expect(getByText(/rustic & warm/i)).toBeTruthy();
    expect(getByText(/studio/i)).toBeTruthy();
    expect(getByText(/guest bed/i)).toBeTruthy();
  });
});

// ─── Completion body fallback text ────────────────────────────────────────────

describe('StyleQuizScreen — completion body fallback text', () => {
  it('"Preferences Updated" accent label is shown on completion', () => {
    const screen = renderQuiz();
    completeQuiz('living-room', 'modern', 'seating', screen);
    expect(screen.getByText('Preferences Updated')).toBeTruthy();
  });

  it('"Your style, your way" headline is shown on completion', () => {
    const screen = renderQuiz();
    completeQuiz('bedroom', 'classic', 'dual-purpose', screen);
    expect(screen.getByText(/your style/i)).toBeTruthy();
  });

  it('save button accessibility label is "Save preferences"', () => {
    const screen = renderQuiz();
    completeQuiz('studio', 'minimalist', 'kid-friendly', screen);
    expect(screen.getByTestId('style-quiz-save-button').props.accessibilityLabel).toBe(
      'Save preferences',
    );
  });
});
