/**
 * StyleQuizScreen — deeper edge-case tests (cm-8wc)
 *
 * Covers flows absent from styleQuizScreen.test.tsx:
 *   1. Skip question flow (exit via back from any step)
 *   2. All questions answered → shows results (completion gating)
 *   3. Reset quiz returns to Q1 (full back-chain from completion)
 *   4. Answer selection updates progress indicator (label text)
 *   5. Back navigation from mid-quiz (step 2 → step 1, selections preserved)
 *   6. Results screen shows correct recommendations (exact body text)
 *   7. Empty/null stored preferences — no pre-selection, body not broken
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { StyleQuizScreen } from '../StyleQuizScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const mockOnComplete = jest.fn();
const mockOnBack = jest.fn();

function renderQuiz() {
  return render(<StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />);
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── 1. Skip question flow ─────────────────────────────────────────────────────

describe('skip question flow', () => {
  it('back at step 0 immediately exits the quiz', () => {
    const { getByTestId } = renderQuiz();
    fireEvent.press(getByTestId('style-quiz-back-button'));
    expect(mockOnBack).toHaveBeenCalledTimes(1);
    expect(mockOnComplete).not.toHaveBeenCalled();
  });

  it('back from step 1 then back from step 0 exits the quiz', () => {
    const { getByTestId } = renderQuiz();
    fireEvent.press(getByTestId('quiz-option-living-room')); // step 0 → 1
    fireEvent.press(getByTestId('style-quiz-back-button')); // step 1 → 0
    fireEvent.press(getByTestId('style-quiz-back-button')); // step 0 → onBack
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('full back chain from step 2 exits without completing', () => {
    const { getByTestId } = renderQuiz();
    fireEvent.press(getByTestId('quiz-option-bedroom')); // step 0 → 1
    fireEvent.press(getByTestId('quiz-option-rustic')); // step 1 → 2
    fireEvent.press(getByTestId('style-quiz-back-button')); // step 2 → 1
    fireEvent.press(getByTestId('style-quiz-back-button')); // step 1 → 0
    fireEvent.press(getByTestId('style-quiz-back-button')); // step 0 → onBack
    expect(mockOnBack).toHaveBeenCalledTimes(1);
    expect(mockOnComplete).not.toHaveBeenCalled();
  });
});

// ── 2. All questions answered → shows results ─────────────────────────────────

describe('all questions answered shows results', () => {
  it('completion container is absent until all three steps are answered', () => {
    const { getByTestId, queryByTestId } = renderQuiz();
    expect(queryByTestId('style-quiz-completion')).toBeNull();
    fireEvent.press(getByTestId('quiz-option-studio'));
    expect(queryByTestId('style-quiz-completion')).toBeNull();
    fireEvent.press(getByTestId('quiz-option-classic'));
    expect(queryByTestId('style-quiz-completion')).toBeNull();
    fireEvent.press(getByTestId('quiz-option-kid-friendly'));
    expect(getByTestId('style-quiz-completion')).toBeTruthy();
  });

  it('quiz step container is unmounted when completion is shown', () => {
    const { getByTestId, queryByTestId } = renderQuiz();
    fireEvent.press(getByTestId('quiz-option-guest-room'));
    fireEvent.press(getByTestId('quiz-option-minimalist'));
    fireEvent.press(getByTestId('quiz-option-dual-purpose'));
    expect(queryByTestId('style-quiz-step-2')).toBeNull();
    expect(getByTestId('style-quiz-completion')).toBeTruthy();
  });

  it('save button is absent on quiz steps and appears only at completion', () => {
    const { getByTestId, queryByTestId } = renderQuiz();
    expect(queryByTestId('style-quiz-save-button')).toBeNull();
    fireEvent.press(getByTestId('quiz-option-living-room'));
    expect(queryByTestId('style-quiz-save-button')).toBeNull();
    fireEvent.press(getByTestId('quiz-option-modern'));
    expect(queryByTestId('style-quiz-save-button')).toBeNull();
    fireEvent.press(getByTestId('quiz-option-seating'));
    expect(getByTestId('style-quiz-save-button')).toBeTruthy();
  });
});

// ── 3. Reset quiz returns to Q1 ───────────────────────────────────────────────

describe('reset quiz returns to Q1', () => {
  it('pressing back three times from completion returns to step 0 (Q1)', () => {
    const { getByTestId } = renderQuiz();
    fireEvent.press(getByTestId('quiz-option-living-room'));
    fireEvent.press(getByTestId('quiz-option-modern'));
    fireEvent.press(getByTestId('quiz-option-seating'));
    expect(getByTestId('style-quiz-completion')).toBeTruthy();

    fireEvent.press(getByTestId('style-quiz-back-button')); // completion → step 2
    expect(getByTestId('style-quiz-step-2')).toBeTruthy();
    fireEvent.press(getByTestId('style-quiz-back-button')); // step 2 → step 1
    expect(getByTestId('style-quiz-step-1')).toBeTruthy();
    fireEvent.press(getByTestId('style-quiz-back-button')); // step 1 → step 0
    expect(getByTestId('style-quiz-step-0')).toBeTruthy();
  });

  it('all room options are visible after returning to Q1 from completion', () => {
    const { getByTestId } = renderQuiz();
    fireEvent.press(getByTestId('quiz-option-studio'));
    fireEvent.press(getByTestId('quiz-option-rustic'));
    fireEvent.press(getByTestId('quiz-option-guest-bed'));
    fireEvent.press(getByTestId('style-quiz-back-button'));
    fireEvent.press(getByTestId('style-quiz-back-button'));
    fireEvent.press(getByTestId('style-quiz-back-button'));
    expect(getByTestId('quiz-option-living-room')).toBeTruthy();
    expect(getByTestId('quiz-option-bedroom')).toBeTruthy();
    expect(getByTestId('quiz-option-studio')).toBeTruthy();
    expect(getByTestId('quiz-option-guest-room')).toBeTruthy();
  });

  it('quiz can be re-completed with different selections after returning to Q1', () => {
    const { getByTestId } = renderQuiz();
    fireEvent.press(getByTestId('quiz-option-living-room'));
    fireEvent.press(getByTestId('quiz-option-modern'));
    fireEvent.press(getByTestId('quiz-option-seating'));
    // Return to Q1 via back chain
    fireEvent.press(getByTestId('style-quiz-back-button'));
    fireEvent.press(getByTestId('style-quiz-back-button'));
    fireEvent.press(getByTestId('style-quiz-back-button'));
    // Second pass with different selections
    fireEvent.press(getByTestId('quiz-option-bedroom'));
    fireEvent.press(getByTestId('quiz-option-rustic'));
    fireEvent.press(getByTestId('quiz-option-dual-purpose'));
    expect(getByTestId('style-quiz-completion')).toBeTruthy();
  });
});

// ── 4. Answer selection updates progress indicator ────────────────────────────

describe('answer selection updates progress indicator', () => {
  it('progress shows "1 / 4" on initial render (step 0)', () => {
    const { getByText } = renderQuiz();
    expect(getByText('1 / 4')).toBeTruthy();
  });

  it('progress shows "2 / 4" after selecting room (step 1)', () => {
    const { getByText, getByTestId } = renderQuiz();
    fireEvent.press(getByTestId('quiz-option-living-room'));
    expect(getByText('2 / 4')).toBeTruthy();
  });

  it('progress shows "3 / 4" after selecting style (step 2)', () => {
    const { getByText, getByTestId } = renderQuiz();
    fireEvent.press(getByTestId('quiz-option-bedroom'));
    fireEvent.press(getByTestId('quiz-option-classic'));
    expect(getByText('3 / 4')).toBeTruthy();
  });

  it('progress shows "4 / 4" at completion', () => {
    const { getByText, getByTestId } = renderQuiz();
    fireEvent.press(getByTestId('quiz-option-studio'));
    fireEvent.press(getByTestId('quiz-option-minimalist'));
    fireEvent.press(getByTestId('quiz-option-kid-friendly'));
    expect(getByText('4 / 4')).toBeTruthy();
  });

  it('progress decrements when navigating back', () => {
    const { getByText, getByTestId } = renderQuiz();
    fireEvent.press(getByTestId('quiz-option-guest-room'));
    fireEvent.press(getByTestId('quiz-option-rustic'));
    expect(getByText('3 / 4')).toBeTruthy();
    fireEvent.press(getByTestId('style-quiz-back-button'));
    expect(getByText('2 / 4')).toBeTruthy();
  });
});

// ── 5. Back navigation from mid-quiz ──────────────────────────────────────────

describe('back navigation from mid-quiz', () => {
  it('back from step 2 returns to step 1 with style options visible', () => {
    const { getByTestId } = renderQuiz();
    fireEvent.press(getByTestId('quiz-option-living-room'));
    fireEvent.press(getByTestId('quiz-option-modern'));
    fireEvent.press(getByTestId('style-quiz-back-button')); // step 2 → 1
    expect(getByTestId('style-quiz-step-1')).toBeTruthy();
    expect(getByTestId('quiz-option-modern')).toBeTruthy();
    expect(getByTestId('quiz-option-rustic')).toBeTruthy();
  });

  it('room selection is preserved as pre-selected after navigating back from step 1', () => {
    const { getByTestId } = renderQuiz();
    fireEvent.press(getByTestId('quiz-option-bedroom')); // selects bedroom, advances
    fireEvent.press(getByTestId('style-quiz-back-button')); // back to step 0
    expect(getByTestId('quiz-option-bedroom').props.accessibilityState?.selected).toBe(true);
  });

  it('style selection is preserved as pre-selected after navigating back from step 2', () => {
    const { getByTestId } = renderQuiz();
    fireEvent.press(getByTestId('quiz-option-studio'));
    fireEvent.press(getByTestId('quiz-option-classic')); // selects classic, advances
    fireEvent.press(getByTestId('style-quiz-back-button')); // back to step 1
    expect(getByTestId('quiz-option-classic').props.accessibilityState?.selected).toBe(true);
  });

  it('back from step 2 does not call onBack', () => {
    const { getByTestId } = renderQuiz();
    fireEvent.press(getByTestId('quiz-option-bedroom'));
    fireEvent.press(getByTestId('quiz-option-minimalist'));
    fireEvent.press(getByTestId('style-quiz-back-button'));
    expect(mockOnBack).not.toHaveBeenCalled();
  });
});

// ── 6. Results screen shows correct recommendations ───────────────────────────

describe('results screen shows correct recommendations', () => {
  it('completion body mentions the selected style label', () => {
    const { getByTestId, getByText } = renderQuiz();
    fireEvent.press(getByTestId('quiz-option-guest-room'));
    fireEvent.press(getByTestId('quiz-option-rustic')); // "Rustic & Warm"
    fireEvent.press(getByTestId('quiz-option-guest-bed'));
    expect(getByText(/rustic & warm/i)).toBeTruthy();
  });

  it('completion body mentions the selected room label', () => {
    const { getByTestId, getByText } = renderQuiz();
    fireEvent.press(getByTestId('quiz-option-studio')); // "Studio / Dorm"
    fireEvent.press(getByTestId('quiz-option-minimalist'));
    fireEvent.press(getByTestId('quiz-option-seating'));
    expect(getByText(/studio \/ dorm/i)).toBeTruthy();
  });

  it('completion body mentions the selected use label', () => {
    const { getByTestId, getByText } = renderQuiz();
    fireEvent.press(getByTestId('quiz-option-bedroom'));
    fireEvent.press(getByTestId('quiz-option-classic'));
    fireEvent.press(getByTestId('quiz-option-dual-purpose')); // "Dual-Purpose"
    expect(getByText(/dual-purpose/i)).toBeTruthy();
  });

  it('completion body shows a personalized sentence combining all three selections', () => {
    const { getByTestId, getByText } = renderQuiz();
    fireEvent.press(getByTestId('quiz-option-living-room')); // "Living Room"
    fireEvent.press(getByTestId('quiz-option-modern')); // "Modern & Clean"
    fireEvent.press(getByTestId('quiz-option-seating')); // "Everyday Seating"
    expect(getByText(/modern & clean.*living room.*everyday seating/i)).toBeTruthy();
  });
});

// ── 7. Empty/null stored preferences ──────────────────────────────────────────

describe('empty/null stored preferences', () => {
  it('no options are pre-selected at Q1 when AsyncStorage returns null', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    const { getByTestId } = renderQuiz();
    await waitFor(() =>
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@carolina_futons_style_preferences'),
    );
    expect(getByTestId('quiz-option-living-room').props.accessibilityState?.selected).toBe(false);
    expect(getByTestId('quiz-option-bedroom').props.accessibilityState?.selected).toBe(false);
    expect(getByTestId('quiz-option-studio').props.accessibilityState?.selected).toBe(false);
    expect(getByTestId('quiz-option-guest-room').props.accessibilityState?.selected).toBe(false);
  });

  it('completion body shows selected labels even when starting with no stored prefs', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    const { getByTestId, getByText } = renderQuiz();
    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalled());
    fireEvent.press(getByTestId('quiz-option-bedroom'));
    fireEvent.press(getByTestId('quiz-option-classic')); // "Classic & Cozy"
    fireEvent.press(getByTestId('quiz-option-kid-friendly')); // "Kid-Friendly"
    expect(getByText(/classic & cozy/i)).toBeTruthy();
    expect(getByText(/bedroom/i)).toBeTruthy();
    expect(getByText(/kid-friendly/i)).toBeTruthy();
  });

  it('completion body uses the selected use label — never an empty string', async () => {
    const { getByTestId, getByText, queryByText } = renderQuiz();
    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalled());
    fireEvent.press(getByTestId('quiz-option-living-room'));
    fireEvent.press(getByTestId('quiz-option-modern'));
    fireEvent.press(getByTestId('quiz-option-seating')); // "Everyday Seating"
    // useName fallback ('') would produce "optimized for ." — must not appear
    expect(queryByText(/optimized for \./i)).toBeNull();
    expect(getByText(/everyday seating/i)).toBeTruthy();
  });

  it('completion shows user selections — not unrecognized stored preference values', async () => {
    // Stored in StylePreferences shape (no 'room'/'style' keys) with unknown values
    const unknownPrefs = JSON.stringify({
      roomType: 'unknown-type',
      stylePreference: 'unknown-style',
      primaryUse: 'unknown-use',
      sizeNeeds: null,
      budgetRange: null,
    });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(unknownPrefs);
    const { getByTestId, getByText } = renderQuiz();
    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalled());
    // User overrides the bad stored values with valid selections
    fireEvent.press(getByTestId('quiz-option-guest-room')); // "Guest Room"
    fireEvent.press(getByTestId('quiz-option-rustic')); // "Rustic & Warm"
    fireEvent.press(getByTestId('quiz-option-seating')); // "Everyday Seating"
    expect(getByText(/rustic & warm/i)).toBeTruthy();
    expect(getByText(/guest room/i)).toBeTruthy();
  });
});
